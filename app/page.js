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
import { LANGS, STR, fill, errorText, trustFor } from "./strings.js";
import { STYLE } from "./styles.js";
import { BrandHeader } from "./components/Brand.js";
import { TrustStrip, SafetyNote, MoreAbout, TrustSeals } from "./components/Trust.js";
import { Gauge } from "./components/charts.js";
import { Horizon } from "./components/Horizon.js";
import { Sources } from "./components/Sources.js";
import { Audit } from "./components/Audit.js";
import { ScoreNote } from "./components/ScoreNote.js";
import { IdentityDossier, ByCompany, ByDataType } from "./components/Dossier.js";
import { TwoClockForecast } from "./components/Forecast.js";
import BreachExplorer from "./components/BreachMap.js";
import ExposureMatrix from "./components/DataMatrix.js";
import { StoryStrip, LessonCard } from "./components/Explain.js";
import ActionPlan from "./components/ActionPlan.js";
import ExpoBot from "./components/ExpoBot.js";
import { IDENTITY_WEIGHTS, passwordReport, TIERS, ATTRIBUTES } from "../lib/score.js";
import { residualScore, applicableIds } from "../lib/playbook.js";
import { LEAK_STORY, howWeaponised, footprint } from "../lib/content.js";

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
  const T = trustFor(lang); // trust copy; see the note above TRUST in strings.js
  const [mode, setMode] = useState("email"); // "email" | "password" | "phone"
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

  const [phone, setPhone] = useState("");

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
  // The score this report can be driven down to with every applicable action
  // completed. Before anyone ticks anything the residual tile would simply
  // repeat the exposure figure beside it, which tells the reader nothing; the
  // floor tells them what the plan is worth, and what it cannot reach.
  const bestCase = useMemo(
    () => (report ? residualScore(report, applicableIds(report)) : null),
    [report]);

  function resetAll() {
    setStage("form"); setBusy(false); setError(""); setCode(""); setChallenge(null); setDevCode("");
    setPassword(""); setPhone(""); setReport(null); setMeta(null); setReportToken(null); setTab("overview"); setDone(new Set());
  }

  function switchMode(next) {
    resetAll();
    setMode(next);
  }

  function showReport(nextReport, nextMeta, token) {
    setReport(nextReport); setMeta(nextMeta); setReportToken(token);
    setDone(new Set()); setTab("overview"); setStage("done");
  }

  // The one identifier this check is about. Exactly one of the two fields is
  // sent, because the server rejects a body carrying both.
  function identifierBody() {
    return mode === "phone" ? { phone: phone.trim() } : { email };
  }
  const identifierValue = () => (mode === "phone" ? phone.trim() : email);

  // Step 1 — ask the server to send a code, by email or SMS.
  async function sendCode() {
    setBusy(true); setError("");
    const { ok, data } = await postJson("/api/verify/start", { ...identifierBody(), lang });
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
    const check = await postJson("/api/verify/check", { ...identifierBody(), code, challenge });
    if (!check.ok) { setBusy(false); return setError(errorText(L, check.data)); }

    const scan = await postJson("/api/breach", { ...identifierBody(), scanToken: check.data.scanToken });
    setBusy(false);
    if (scan.ok) {
      return showReport(
        scan.data.report,
        { sources: scan.data.sources, sourcesFailed: scan.data.sourcesFailed || [], identifier: identifierValue(), demo: scan.data.demo },
        scan.data.reportToken
      );
    }
    if (scan.data.error === "not_configured") {
      return showReport(EMPTY_EMAIL_REPORT, { unavailable: true, sources: [], sourcesFailed: [], identifier: identifierValue() }, null);
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

  const canSend = consent && !busy &&
    (mode === "phone" ? /^\+[1-9][0-9\s()./-]{6,}$/.test(phone.trim()) : email.trim().length > 3);
  const canCheckPw = consent && !busy && password.length > 0;
  const exposed = report && report.score > 0;
  // The time canvas replaces the gauge whenever there is something to place on
  // a timeline. A password check has no dates and no permanent half, so it
  // keeps the gauge.
  const useHorizon =
    exposed && report.kind !== "password" &&
    (report.breaches || []).some((x) => typeof x.ageDays === "number");
  const band = report ? BAND_COLOR[report.level] : "var(--sig)";
  const consentText = mode === "password" ? L.consentPw : mode === "phone" ? L.consentPhone : L.consentEmail;
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
        <BrandHeader />
        <h1 className="x-title">{L.title}</h1>
        <p className="x-lede">{L.lede}</p>

        {/* ───────── input card ───────── */}
        {stage !== "done" && (
          <div className="x-card">
            <div className="x-modes" role="tablist">
              <button role="tab" aria-selected={mode === "email"} className={"x-mode" + (mode === "email" ? " on" : "")} onClick={() => switchMode("email")}>{L.modeEmail}</button>
              <button role="tab" aria-selected={mode === "password"} className={"x-mode" + (mode === "password" ? " on" : "")} onClick={() => switchMode("password")}>{L.modePassword}</button>
              <button role="tab" aria-selected={mode === "phone"} className={"x-mode" + (mode === "phone" ? " on" : "")} onClick={() => switchMode("phone")}>{L.modePhone}</button>
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

            {mode === "phone" && stage === "form" && (
              <form onSubmit={(e) => { e.preventDefault(); if (canSend) sendCode(); }}>
                <label className="x-label" htmlFor="x-phone">{L.phoneLabel}</label>
                {/* type="tel" brings up the numeric keypad; the country code is
                    required because guessing it would check a different person. */}
                <input id="x-phone" className="x-input" type="tel" autoComplete="tel" value={phone}
                  placeholder={L.phonePlaceholder} onChange={(e) => setPhone(e.target.value)} />
                <div className="x-kind">{L.phoneHint}</div>
                <button type="submit" className="x-btn" disabled={!canSend}>
                  {busy ? <><span className="x-spin" />{L.sending}</> : L.sendCodeSms}
                </button>
              </form>
            )}

            {mode !== "password" && stage === "code" && (
              <form onSubmit={(e) => { e.preventDefault(); if (code.length === 6 && !busy) verifyAndScan(); }}>
                <div className="x-hint">{sentBefore}<b>{mode === "phone" ? phone.trim() : email}</b>{sentAfter}</div>
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

            {/* The mode-specific guarantee, next to the field it applies to.
                For passwords this is the strong claim, and it is the true one:
                checkPassword() below never sends the password itself. */}
            {stage === "form" && <SafetyNote mode={mode} T={T} />}

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
                    {useHorizon
                      ? <Horizon report={report} bands={L.bands} heads={L.heads} bandColor={BAND_COLOR} />
                      : <Gauge score={report.score} level={report.level} />}
                    {!useHorizon && <div className="x-band" style={{ color: band }}>{L.bands[report.level]}</div>}
                    {!useHorizon && <div className="x-hhead">{L.heads[report.level]}</div>}
                    {!exposed || report.kind === "password" ? (
                      <div className="x-hsub">
                        {!exposed
                          ? "No match in the sources checked. Keep it that way: unique passwords per site and two-step verification everywhere."
                          : "This password is in public breach dumps. Treat it as known to attackers."}
                      </div>
                    ) : (
                      <ScoreNote report={report} />
                    )}
                    {exposed && (
                      <div className="x-glance">
                        {report.kind === "email"
                          ? <span className="x-gchip">{report.breaches.length} {report.breaches.length === 1 ? L.breach : L.breaches}</span>
                          : <span className="x-gchip">{report.count.toLocaleString()}×</span>}
                        {report.attrs.slice(0, 4).map((k) => <span className="x-gchip" key={k}>{k}</span>)}
                      </div>
                    )}
                    {exposed && residual && !useHorizon && (
                      <div className="x-duo">
                        <div className="x-duocell"><div className="x-duolabel">{L.exposureLabel}</div><div className="x-duonum" style={{ color: band }}>{report.score}</div></div>
                        <div className="x-duocell">
                          <div className="x-duolabel">{done.size === 0 ? L.bestCaseLabel : L.residualLabel}</div>
                          <div className="x-duonum" style={{ color: BAND_COLOR[(done.size === 0 ? bestCase : residual).level] }}>
                            {(done.size === 0 ? bestCase : residual).score}
                          </div>
                        </div>
                      </div>
                    )}
                    {exposed && residual && !useHorizon && done.size === 0 && <div className="x-scorenote">{L.bestCaseHint}</div>}
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

            {exposed && !meta.unavailable && report.kind === "email" && (
              <div className="x-card">
                <div className="x-lglabel" style={{ marginBottom: 10 }}>If you change nothing</div>
                <TwoClockForecast report={report} />
              </div>
            )}

            {exposed && !meta.unavailable && (
              <>
                <div className="x-tabs">
                  {["overview", "details", "actions", "audit", "learn"].map((id) => (
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
                      <div className="x-sech"><span className="x-secn">01</span><span className="x-sect">Every kind of data that leaked</span></div>
                      <div className="x-secd">Each row is one kind of your data; each column is one breach. A dot means that breach exposed it.</div>
                      {report.kind === "password"
                        ? <div className="x-bar"><span className="bl">Breach dumps</span><span className="bt"><span className="bf" style={{ width: "100%", background: band }} /></span><span className="bv">{report.count.toLocaleString()}</span></div>
                        : <ExposureMatrix breaches={report.breaches} />}
                    </div>
                    {report.kind !== "password" && report.breaches.length > 0 && (
                      <div className="x-card">
                        <div className="x-sech"><span className="x-secn">02</span><span className="x-sect">Where your exposure comes from</span></div>
                        <div className="x-secd">Each breach plotted by when it happened and what class of data it exposed; the bubble is sized by how much it contributes to your score. Select one to highlight it below.</div>
                        <BreachExplorer breaches={report.breaches} />
                      </div>
                    )}
                    <div className="x-card">
                      <div className="x-sech"><span className="x-secn">03</span><span className="x-sect">The file someone can open on you</span></div>
                      <div className="x-secd">Not which company was breached, but what can now be written down about you. Redacted fields are the ones these breaches did not expose.</div>
                      <IdentityDossier report={report} />
                    </div>
                    {report.kind !== "password" && report.breaches.length > 0 && (
                      <div className="x-card">
                        <div className="x-sech"><span className="x-secn">04</span><span className="x-sect">Who exposed you, and how much</span></div>
                        <div className="x-secd">Each bar is one breach, split where the part you can still undo ends and the permanent part begins.</div>
                        <ByCompany breaches={report.breaches} />
                      </div>
                    )}
                    {report.kind !== "password" && report.breaches.length > 0 && (
                      <div className="x-card">
                        <div className="x-sech"><span className="x-secn">05</span><span className="x-sect">Which kinds of data, and how often</span></div>
                        <div className="x-secd">How many of your breaches exposed each kind of data.</div>
                        <ByDataType report={report} />
                      </div>
                    )}
                  </div>
                )}

                {tab === "actions" && (
                  <div className="x-panelfade">
                    <ActionPlan report={report} done={done} onToggle={toggleDone} identifier={meta.identifier} L={L} />
                  </div>
                )}

                {tab === "audit" && (
                  <div className="x-panelfade">
                    <Audit report={report} />
                  </div>
                )}

                {tab === "learn" && (
                  <div className="x-panelfade">
                    <div className="x-card">
                      <div className="x-sech"><span className="x-secn">01</span><span className="x-sect">How your data got out</span></div>
                      <div className="x-secd">The whole thing in four steps. None of them were yours to prevent.</div>
                      <StoryStrip panels={LEAK_STORY} accent={band} />
                    </div>
                    <LessonCard n="02" title="What someone could try" accent={band}
                      desc="Based on what actually leaked in your result. Awareness, not instructions — open a row for the precise version."
                      items={howWeaponised(report.attrs)} />
                    <LessonCard n="03" title="What you can check yourself" accent={band}
                      desc="Exposio looks up nobody's public profiles. These are checks you run on your own footprint."
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

        {/* Below the input, for the reader who wants more before deciding.
            Hidden once a report is on screen — by then they have decided, and
            the page's job is the result, not the pitch. */}
        {stage === "form" && (
          <>
            <TrustStrip T={T} />
            <MoreAbout T={T} />
          </>
        )}

        {stage !== "done" && <TrustSeals T={T} />}

        <Sources T={L} active={meta && meta.sources} />

        <div className="x-foot">
          {L.footer1}<br />
          {L.footer2} · <a className="x-privlink" href="/privacy">{L.privacy}</a>
        </div>
      </div>

      {stage === "done" && reportToken && (
        // `report` and `identifier` are only for rendering GDPR letters the
        // agent offers — the agent itself works from the signed token.
        <ExpoBot key={reportToken} reportToken={reportToken} report={report} identifier={meta.identifier} lang={lang} L={L} />
      )}
    </div>
  );
}

// ---- Overview: how the email score was reached -------------------------------
function ScoreModel({ report, band }) {
  const n = report.breaches.length;
  const assumedAny = report.breaches.some((b) => b.ageAssumed);
  // The fast clock lists only breaches that leaked something revocable.
  const credBreaches = report.breaches.filter((b) => b.credSeverity > 0);
  const idAttrs = report.identityAttrs || [];
  const maxContrib = Math.max(...credBreaches.map((b) => b.contribution), 0.0001);

  return (
    <div className="x-card">
      <div className="x-sech"><span className="x-secn">01</span><span className="x-sect">Score model</span></div>
      <div className="x-secd">
        Two clocks. What you can change loses weight as it ages; what you cannot change does not.
      </div>
      <div className="x-explain" style={{ borderLeft: "3px solid " + band }}>
        Your data appears in {n} breach{n === 1 ? "" : "es"}.{" "}
        {credBreaches.length > 0
          ? "Passwords or payment data were exposed, so part of this score falls as those are changed."
          : "No passwords or payment data were exposed, so nothing here falls with time."}{" "}
        {idAttrs.length > 0
          ? "The rest comes from details you cannot change, and that part stays."
          : "Nothing permanent about your identity was exposed."}
      </div>

      <div className="x-lglabel">What can be changed — severity × recency, per breach:</div>
      {credBreaches.length > 0 ? (
        <div className="x-btable">
          <div className="x-btrow x-bthead"><span>Company</span><span>Year</span><span>Type</span><span>Contribution</span></div>
          {credBreaches.map((b) => (
            <div className="x-btrow" key={b.title}>
              <span className="c" title={b.title + " — " + b.sources.join(" + ")}>{b.title}</span>
              <span className={b.ageAssumed ? "x-assumed" : ""}>{b.ageAssumed ? "undated*" : b.year}</span>
              <span>{TIER_SHORT[b.tier]}</span>
              <span className="contrib">
                <span className="cbar" style={{ width: 8 + (b.contribution / maxContrib) * 46 + "px", background: band }} />
                {b.contribution.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="x-secd" style={{ margin: "6px 0 0" }}>
          No breach exposed a password or a payment detail, so this half of the score is zero.
        </div>
      )}
      <div className="x-btfoot"><span>B_cred</span><span>{(report.credRaw || 0).toFixed(3)}</span></div>

      <div className="x-lglabel" style={{ marginTop: 18 }}>
        What cannot be changed — counted once, however many breaches leaked it:
      </div>
      {idAttrs.length > 0 ? (
        <div className="x-btable">
          <div className="x-btrow x-bthead x-idrow"><span>Detail</span><span>Leaked by</span><span>Weight</span></div>
          {idAttrs
            .slice()
            .sort((a, b) => (IDENTITY_WEIGHTS[b] || 0) - (IDENTITY_WEIGHTS[a] || 0))
            .map((key) => {
              const label = (ATTRIBUTES.find((a) => a.key === key) || {}).label || key;
              const from = report.breaches.filter((b) => (b.identityAttrs || []).includes(key));
              return (
                <div className="x-btrow x-idrow" key={key}>
                  <span className="c">{label}</span>
                  <span className="x-idfrom" title={from.map((b) => b.title).join(", ")}>
                    {from.length === 1 ? from[0].title : from.length + " breaches"}
                  </span>
                  <span>{(IDENTITY_WEIGHTS[key] || 0).toFixed(2)}</span>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="x-secd" style={{ margin: "6px 0 0" }}>Nothing permanent was exposed.</div>
      )}
      <div className="x-btfoot">
        <span>Identity term I</span><span>{(report.identity || 0).toFixed(3)}</span>
      </div>
      <div className="x-btfoot"><span>× W_identity (0.70)</span><span>{(report.identityRaw || 0).toFixed(3)}</span></div>

      <div className="x-btfoot x-bttotal"><span>B_raw = B_cred + identity</span><span>{report.raw.toFixed(3)}</span></div>
      <div className="x-btfoot"><span>Breach Risk score</span><span style={{ color: band }}>{report.score} / 100</span></div>

      {assumedAny && <div className="x-secd" style={{ marginTop: 10 }}>* This source gives no breach date, so its age is assumed to be 2 years.</div>}
      {idAttrs.length > 0 && (
        <div className="x-secd" style={{ marginTop: 8 }}>
          The permanent half is why &ldquo;left after your fixes&rdquo; stops at a floor: changing a password
          revokes a password, and nothing revokes a date of birth that someone already holds.
        </div>
      )}
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

