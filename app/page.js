"use client";
// app/page.js
// ─────────────────────────────────────────────────────────────────────────────
// The Exposio screen. This file owns the FLOW (which step the user is on) and
// composes the pieces; the logic lives elsewhere:
//   lib/score.js, lib/playbook.js   scoring + residual risk (shared with server)
//   lib/content.js                  Learn-tab text
//   app/components/*                gauge/charts, action plan, ExpoBot
//   app/strings.js, app/styles.js   text in 6 languages, stylesheet
//
// Two modes:
//   Email    — form → (code emailed) → code → verified scan → report
//   Password — hashed in the browser; only 5 hash characters leave the device
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from "react";
import { LANGS, STR, fill, errorText } from "./strings.js";
import { STYLE } from "./styles.js";
import { Gauge, Bars, Timeline, FlowDiagram, LEAK_FLOW, ATTACK_FLOW } from "./components/charts.js";
import ActionPlan from "./components/ActionPlan.js";
import ExpoBot from "./components/ExpoBot.js";
import { passwordReport, TIERS, ATTRIBUTES } from "../lib/score.js";
import { residualScore } from "../lib/playbook.js";
import { howLeaked, howWeaponised, footprint } from "../lib/content.js";

const BAND_COLOR = { safe: "var(--sig)", low: "var(--sig)", medium: "var(--amber)", high: "var(--coral)" };
const TIER_SHORT = { financial: "Financial", "financial-only": "Payment", credentials: "Credentials", contact: "Contact", email: "Email" };
const EMPTY_EMAIL_REPORT = { kind: "email", score: 0, level: "safe", attrs: [], classCounts: {}, breaches: [] };

// POST JSON and always resolve (never throw), so every caller handles
// success and failure the same way.
async function postJson(url, body) {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { error: "network" } };
  }
}

async function sha1Hex(text) {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

// k-anonymity password check. The API gets the first 5 hex characters of the
// SHA-1 hash and returns every suffix in that bucket; the match happens here.
// Add-Padding makes every response a similar size, so its length reveals
// nothing about how many real matches the bucket holds.
async function pwnedCount(password) {
  const hash = await sha1Hex(password);
  const url = "https://api.pwnedpasswords.com/range/" + hash.slice(0, 5);
  let res;
  try {
    res = await fetch(url, { headers: { "Add-Padding": "true" } });
  } catch {
    res = await fetch(url); // fallback if the header were ever blocked
  }
  if (!res.ok) throw new Error("pw_service");
  const suffix = hash.slice(5);
  for (const line of (await res.text()).split("\n")) {
    const [candidate, count] = line.trim().split(":");
    if (candidate === suffix) return parseInt(count, 10) || 0; // padding rows have count 0
  }
  return 0;
}

export default function Page() {
  // ---- interface state ----
  const [lang, setLang] = useState("en");
  const L = STR[lang];
  const [mode, setMode] = useState("email"); // "email" | "password"
  const [stage, setStage] = useState("form"); // "form" | "code" | "done"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [consent, setConsent] = useState(false);

  // ---- email verification state (tokens live only in memory) ----
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [devCode, setDevCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const [password, setPassword] = useState("");

  // ---- report state ----
  const [report, setReport] = useState(null);
  const [meta, setMeta] = useState(null); // { sources, sourcesFailed, unavailable, identifier }
  const [reportToken, setReportToken] = useState(null);
  const [tab, setTab] = useState("overview");
  const [done, setDone] = useState(() => new Set()); // completed playbook actions

  // Tick once a second while waiting for a code, for the resend countdown.
  useEffect(() => {
    if (stage !== "code") return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [stage]);

  // Residual risk is derived, never stored: recomputed whenever a tick changes.
  const residual = useMemo(() => (report ? residualScore(report, done) : null), [report, done]);

  function resetAll() {
    setStage("form"); setBusy(false); setError(""); setCode(""); setChallenge(null); setDevCode("");
    setPassword(""); setReport(null); setMeta(null); setReportToken(null); setTab("overview"); setDone(new Set());
  }

  function switchMode(next) {
    resetAll();
    setMode(next);
  }

  function showReport(nextReport, nextMeta, token) {
    setReport(nextReport); setMeta(nextMeta); setReportToken(token);
    setDone(new Set()); setTab("overview"); setStage("done");
  }

  // Step 1 — ask the server to email a code.
  async function sendCode() {
    setBusy(true); setError("");
    const { ok, data } = await postJson("/api/verify/start", { email, lang });
    setBusy(false);
    if (!ok) return setError(errorText(L, data));
    setChallenge(data.challenge);
    setDevCode(data.devCode || "");
    setCode("");
    setResendAt(Date.now() + 60_000);
    setNow(Date.now());
    setStage("code");
  }

  // Steps 2 + 3 — prove the code, then run the verified scan.
  async function verifyAndScan() {
    setBusy(true); setError("");
    const check = await postJson("/api/verify/check", { email, code, challenge });
    if (!check.ok) { setBusy(false); return setError(errorText(L, check.data)); }

    const scan = await postJson("/api/breach", { email, scanToken: check.data.scanToken });
    setBusy(false);
    if (scan.ok) {
      return showReport(
        scan.data.report,
        { sources: scan.data.sources, sourcesFailed: scan.data.sourcesFailed || [], identifier: email, demo: scan.data.demo },
        scan.data.reportToken
      );
    }
    if (scan.data.error === "not_configured") {
      return showReport(EMPTY_EMAIL_REPORT, { unavailable: true, sources: [], sourcesFailed: [], identifier: email }, null);
    }
    if (scan.data.error === "unverified") setStage("form");
    setError(errorText(L, scan.data));
  }

  async function checkPassword() {
    setBusy(true); setError("");
    try {
      const count = await pwnedCount(password);
      setPassword(""); // don't keep the password in state any longer than needed
      showReport(passwordReport(count), { sources: ["Pwned Passwords"], sourcesFailed: [], identifier: null }, null);
    } catch {
      setError(L.errors.pw_service);
    }
    setBusy(false);
  }

  function toggleDone(id) {
    setDone((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const canSend = consent && !busy && email.trim().length > 3;
  const canCheckPw = consent && !busy && password.length > 0;
  const exposed = report && report.score > 0;
  const band = report ? BAND_COLOR[report.level] : "var(--sig)";
  const consentText = mode === "email" ? L.consentEmail : L.consentPw;
  const [sentBefore, sentAfter] = L.codeSent.split("{email}");

  return (
    <div className="x-root">
      {/* Injected raw: as a text child React would escape the quotes in the CSS
          (e.g. "Segoe UI") into &quot;, which <style> doesn't decode — causing a
          hydration mismatch. Safe because STYLE is a constant, never user input. */}
      <style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <div className="x-wrap">
        <div className="x-langbar">
          {LANGS.map((lg) => (
            <button key={lg.code} className={"x-langbtn" + (lang === lg.code ? " on" : "")} onClick={() => setLang(lg.code)} title={lg.name}>{lg.label}</button>
          ))}
        </div>
        <div className="x-brand">Exposio</div>
        <h1 className="x-title">{L.title}</h1>
        <p className="x-lede">{L.lede}</p>

        {/* ───────── input card ───────── */}
        {stage !== "done" && (
          <div className="x-card">
            <div className="x-modes" role="tablist">
              <button role="tab" aria-selected={mode === "email"} className={"x-mode" + (mode === "email" ? " on" : "")} onClick={() => switchMode("email")}>{L.modeEmail}</button>
              <button role="tab" aria-selected={mode === "password"} className={"x-mode" + (mode === "password" ? " on" : "")} onClick={() => switchMode("password")}>{L.modePassword}</button>
              <button role="tab" aria-selected={false} className="x-mode" disabled title="Phone checks are paused until phone ownership can be verified.">
                {L.modePhone}<span className="x-soon">{L.phoneSoon}</span>
              </button>
            </div>

            {mode === "email" && stage === "form" && (
              <form onSubmit={(e) => { e.preventDefault(); if (canSend) sendCode(); }}>
                <label className="x-label" htmlFor="x-email">{L.emailLabel}</label>
                <input id="x-email" className="x-input" type="email" autoComplete="email" value={email}
                  placeholder={L.emailPlaceholder} onChange={(e) => setEmail(e.target.value)} />
                <button type="submit" className="x-btn" disabled={!canSend}>
                  {busy ? <><span className="x-spin" />{L.sending}</> : L.sendCode}
                </button>
              </form>
            )}

            {mode === "email" && stage === "code" && (
              <form onSubmit={(e) => { e.preventDefault(); if (code.length === 6 && !busy) verifyAndScan(); }}>
                <div className="x-hint">{sentBefore}<b>{email}</b>{sentAfter}</div>
                <label className="x-label" htmlFor="x-code">{L.codeLabel}</label>
                <input id="x-code" className="x-input x-codeinput" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                  value={code} autoFocus onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                <button type="submit" className="x-btn" disabled={busy || code.length !== 6}>
                  {busy ? <><span className="x-spin" />{L.verifying}</> : L.verify}
                </button>
                <div className="x-row">
                  <button type="button" className="x-linkbtn" onClick={() => { setStage("form"); setChallenge(null); setDevCode(""); setError(""); }}>{L.changeEmail}</button>
                  <button type="button" className="x-linkbtn" disabled={busy || now < resendAt} onClick={sendCode}>
                    {now < resendAt ? fill(L.resendIn, { s: Math.ceil((resendAt - now) / 1000) }) : L.resend}
                  </button>
                </div>
                {devCode && <div className="x-dev">{fill(L.codeOnScreen, { code: devCode })}</div>}
              </form>
            )}

            {mode === "password" && (
              <form onSubmit={(e) => { e.preventDefault(); if (canCheckPw) checkPassword(); }}>
                <label className="x-label" htmlFor="x-pw">{L.pwLabel}</label>
                <input id="x-pw" className="x-input" type="password" autoComplete="off" value={password}
                  placeholder={L.pwPlaceholder} onChange={(e) => setPassword(e.target.value)} />
                <button type="submit" className="x-btn" disabled={!canCheckPw}>
                  {busy ? <><span className="x-spin" />{L.verifying}</> : L.checkPw}
                </button>
              </form>
            )}

            {error && <div className="x-err" role="alert">{error}</div>}

            {stage === "form" && (
              <label className="x-consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>
                  {consentText[0]}<b>{consentText[1]}</b>{consentText[2]}{" "}
                  <a className="x-privlink" href="/privacy" target="_blank" rel="noopener noreferrer">{L.privacy}</a>
                </span>
              </label>
            )}
          </div>
        )}

        {/* ───────── report ───────── */}
        {stage === "done" && report && (
          <>
            {/* Demo mode must never be mistaken for a real lookup. */}
            {meta.demo && <div className="x-dev" style={{ marginTop: 22 }}>{L.demoBanner}</div>}
            <div className="x-card">
              <div className="x-hero">
                {meta.unavailable ? (
                  <>
                    <div className="x-band" style={{ color: "var(--mute)", marginTop: 8 }}>Not checked</div>
                    <div className="x-hhead">Breach sources not enabled</div>
                    <div className="x-hsub">Your email was verified, but no breach-intelligence source is configured on this deployment, so nothing was checked. This is not a "safe" result.</div>
                  </>
                ) : (
                  <>
                    <div className="x-lglabel" style={{ textAlign: "center", marginBottom: 2 }}>{report.kind === "email" ? L.scoreLabel : L.modePassword}</div>
                    <Gauge score={report.score} level={report.level} />
                    <div className="x-band" style={{ color: band }}>{L.bands[report.level]}</div>
                    <div className="x-hhead">{L.heads[report.level]}</div>
                    <div className="x-hsub">
                      {!exposed
                        ? "No match in the sources checked. Keep it that way: unique passwords per site and two-step verification everywhere."
                        : report.kind === "password"
                          ? "This password is in public breach dumps. Treat it as known to attackers."
                          : "Your score reflects the breach data found. The tabs below explain the risk and what to do."}
                    </div>
                    {exposed && (
                      <div className="x-glance">
                        {report.kind === "email"
                          ? <span className="x-gchip">{report.breaches.length} {report.breaches.length === 1 ? L.breach : L.breaches}</span>
                          : <span className="x-gchip">{report.count.toLocaleString()}×</span>}
                        {report.attrs.slice(0, 4).map((k) => <span className="x-gchip" key={k}>{k}</span>)}
                      </div>
                    )}
                    {exposed && residual && (
                      <div className="x-duo">
                        <div className="x-duocell"><div className="x-duolabel">{L.exposureLabel}</div><div className="x-duonum" style={{ color: band }}>{report.score}</div></div>
                        <div className="x-duocell"><div className="x-duolabel">{L.residualLabel}</div><div className="x-duonum" style={{ color: BAND_COLOR[residual.level] }}>{residual.score}</div></div>
                      </div>
                    )}
                    {report.kind === "email" && exposed && <div className="x-scorenote">{L.scoreNote}</div>}
                    {meta.sources.length > 0 && (
                      <div className="x-src">
                        {L.sources}: {meta.sources.join(" + ")}
                        {meta.sourcesFailed.length > 0 && " · " + meta.sourcesFailed.map((f) => f.source).join(", ") + " didn't respond"}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {exposed && !meta.unavailable && (
              <>
                <div className="x-tabs">
                  {["overview", "details", "actions", "learn"].map((id) => (
                    <button key={id} className={"x-tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{L.tabs[id]}</button>
                  ))}
                </div>

                {tab === "overview" && (
                  <div className="x-panelfade">
                    {report.kind === "email" ? <ScoreModel report={report} band={band} /> : <PasswordModel report={report} band={band} />}
                  </div>
                )}

                {tab === "details" && (
                  <div className="x-panelfade">
                    <div className="x-card">
                      <div className="x-sech"><span className="x-secn">01</span><span className="x-sect">Exposure breakdown</span></div>
                      <div className="x-secd">What kinds of your data appear, and how often, across what was found.</div>
                      {report.kind === "password"
                        ? <div className="x-bar"><span className="bl">Breach dumps</span><span className="bt"><span className="bf" style={{ width: "100%", background: band }} /></span><span className="bv">{report.count.toLocaleString()}</span></div>
                        : <Bars counts={report.classCounts} color={band} />}
                    </div>
                    {report.kind === "email" && (
                      <div className="x-card">
                        <div className="x-sech"><span className="x-secn">02</span><span className="x-sect">Breach timeline</span></div>
                        <div className="x-secd">When the breaches happened. Recent breaches weigh more; older ones fade from the score.</div>
                        <Timeline breaches={report.breaches} color={band} />
                      </div>
                    )}
                    <div className="x-card">
                      <div className="x-sech"><span className="x-secn">03</span><span className="x-sect">What can be assembled about you</span></div>
                      <div className="x-secd">The mosaic effect: separate fragments combine into one identity. Highlighted items are exposed.</div>
                      <div className="x-mosaic">
                        {ATTRIBUTES.map((a) => {
                          const on = report.attrs.includes(a.key);
                          return (
                            <span className={"x-chip " + (on ? "on" : "off")} key={a.key}>
                              <span className="x-dot" style={{ background: on ? "var(--coral)" : "var(--mute)" }} />{a.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "actions" && (
                  <div className="x-panelfade">
                    <ActionPlan report={report} done={done} onToggle={toggleDone} identifier={meta.identifier} L={L} />
                  </div>
                )}

                {tab === "learn" && (
                  <div className="x-panelfade">
                    <InfoCard n="01" title="How your data leaked" desc="The path your data takes from a signup form to an aggregated profile." flow={LEAK_FLOW} color={band}
                      items={howLeaked(report.attrs, report.breaches.length)} />
                    <InfoCard n="02" title="How attackers could use it" desc="Awareness, not instructions — understanding the risk is how you defend against it." flow={ATTACK_FLOW} color={band}
                      items={howWeaponised(report.attrs)} />
                    <InfoCard n="03" title="Your public footprint" desc="Exposio doesn't fetch anyone's public profiles or posts. Use these self-checks to inspect your own footprint." color={band}
                      items={footprint(report.attrs, meta.identifier, report.kind)} />
                  </div>
                )}
              </>
            )}

            <div className="x-actions">
              <button className="x-again" onClick={resetAll}>{L.checkAnother}</button>
              {exposed && !meta.unavailable && <button className="x-print" onClick={() => window.print()}>{L.printReport}</button>}
            </div>
          </>
        )}

        <div className="x-foot">
          {L.footer1}<br />
          {L.footer2} · <a className="x-privlink" href="/privacy">{L.privacy}</a>
        </div>
      </div>

      {stage === "done" && reportToken && <ExpoBot key={reportToken} reportToken={reportToken} lang={lang} L={L} />}
    </div>
  );
}

// ---- Overview: how the email score was reached -------------------------------
function ScoreModel({ report, band }) {
  const a = report.attrs;
  const n = report.breaches.length;
  const assumedAny = report.breaches.some((b) => b.ageAssumed);

  let why;
  if (a.includes("password") || a.includes("financial")) {
    const strong = [a.includes("financial") && "payment data", a.includes("password") && "passwords"].filter(Boolean);
    why = "Your data appears in " + n + " breach" + (n === 1 ? "" : "es") + ". Because " + strong.join(" and ") + (strong.length > 1 ? " were" : " was") +
      " exposed, the risk of account takeover and fraud is what drives the score. Recent breaches count most.";
  } else {
    why = "Your data appears in " + n + " breach" + (n === 1 ? "" : "es") + ", but no passwords or payment data were exposed. That keeps account-takeover risk lower, and older breaches count for less over time.";
  }

  return (
    <div className="x-card">
      <div className="x-sech"><span className="x-secn">01</span><span className="x-sect">Score model</span></div>
      <div className="x-secd">How this score was reached: severity × recency for each breach, added up and scaled to 100.</div>
      <div className="x-explain" style={{ borderLeft: "3px solid " + band }}>{why}</div>
      <div className="x-lglabel">Severity weighting — worse data types raise the score more:</div>
      <div className="x-legend">
        {Object.entries(TIERS).map(([key, tier]) => {
          const on = report.breaches.some((b) => b.tier === key);
          return (
            <div className={"x-lgrow" + (on ? " on" : "")} key={key}>
              <span className="ll"><span className="ldot" style={{ background: on ? band : "var(--line)" }} />{tier.label}</span>
              <span className="lw">{tier.weight.toFixed(1)}{on ? " · in your result" : ""}</span>
            </div>
          );
        })}
      </div>
      <div className="x-btable">
        <div className="x-btrow x-bthead"><span>Company</span><span>Year</span><span>Type</span><span>Contribution</span></div>
        {report.breaches.map((b) => (
          <div className="x-btrow" key={b.title}>
            <span className="c" title={b.title + " — " + b.sources.join(" + ")}>{b.title}</span>
            <span className={b.ageAssumed ? "x-assumed" : ""}>{b.ageAssumed ? "undated*" : b.year}</span>
            <span>{TIER_SHORT[b.tier]}</span>
            <span className="contrib">
              <span className="cbar" style={{ width: 8 + (b.contribution / Math.max(report.breaches[0].contribution, 0.0001)) * 46 + "px", background: band }} />
              {b.contribution.toFixed(3)}
            </span>
          </div>
        ))}
      </div>
      <div className="x-btfoot"><span>Sum of contributions (B raw)</span><span>{report.raw.toFixed(3)}</span></div>
      <div className="x-btfoot"><span>Breach Risk score</span><span style={{ color: band }}>{report.score} / 100</span></div>
      {assumedAny && <div className="x-secd" style={{ marginTop: 10 }}>* This source gives no breach date, so its age is assumed to be 2 years.</div>}
    </div>
  );
}

// ---- Overview: how the password score was reached ----------------------------
function PasswordModel({ report, band }) {
  return (
    <div className="x-card">
      <div className="x-sech"><span className="x-secn">01</span><span className="x-sect">Score model</span></div>
      <div className="x-explain" style={{ borderLeft: "3px solid " + band }}>
        This exact password appears {report.count.toLocaleString()} times in breach dumps. Any appearance means attackers have it on their lists;
        the more common it is, the earlier it gets tried. The score runs from 35 (seen once) to 70 (extremely common).
      </div>
      <div className="x-secd" style={{ margin: 0 }}>Only the first 5 characters of the password's SHA-1 hash left your browser. The comparison happened on this device.</div>
    </div>
  );
}

// ---- Learn tab card ------------------------------------------------------------
function InfoCard({ n, title, desc, flow, color, items }) {
  return (
    <div className="x-card">
      <div className="x-sech"><span className="x-secn">{n}</span><span className="x-sect">{title}</span></div>
      <div className="x-secd">{desc}</div>
      {flow && <FlowDiagram steps={flow} color={color} />}
      {items.map((it, i) => (
        <div className="x-info" key={i}>
          <div className="x-infot">{it.title}</div>
          <div className="x-infob">{it.body}</div>
          {it.action && <a className="x-fplink" href={it.action.url} target="_blank" rel="noopener noreferrer">{it.action.label} ↗</a>}
        </div>
      ))}
    </div>
  );
}
