"use client";

import React, { useState, useMemo } from "react";

// ExposureScope — self-assessment instrument for personal digital exposure.
// Assess YOUR OWN data only. Nothing is stored; all state is in-memory.
// Password check uses HIBP k-anonymity (only a 5-char hash prefix leaves the
// browser). Inference and email lookup go through server routes that keep API
// keys server-side and store nothing.

const STYLE = `
.es-root{--bg:#0E1420;--panel:#161F30;--panel2:#1B2740;--line:#26344F;
  --ink:#E7EEF8;--mute:#8A9AB4;--sig:#4AD6C0;--amber:#E7B15A;--coral:#E86F5B;
  --grid:rgba(74,214,192,.05);
  background:var(--bg);color:var(--ink);min-height:100vh;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);
  background-size:44px 44px;}
.es-wrap{max-width:840px;margin:0 auto;padding:40px 22px 80px;}
.es-mono{font-family:ui-monospace,"JetBrains Mono",Menlo,monospace;}
.es-eyebrow{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:var(--sig);}
.es-title{font-size:40px;font-weight:700;letter-spacing:-.02em;margin:10px 0 6px;line-height:1.02;}
.es-sub{color:var(--mute);font-size:15px;max-width:60ch;line-height:1.5;}
.es-ethics{margin-top:18px;border:1px solid var(--line);border-left:3px solid var(--sig);
  background:rgba(74,214,192,.04);border-radius:8px;padding:12px 15px;font-size:13px;color:var(--mute);line-height:1.5;}
.es-ethics b{color:var(--ink);font-weight:600;}
.es-panel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px;margin-top:22px;}
.es-panel.locked{opacity:.5;pointer-events:none;}
.es-phead{display:flex;align-items:baseline;gap:12px;margin-bottom:4px;}
.es-pnum{font-family:ui-monospace,monospace;font-size:12px;color:var(--sig);letter-spacing:.1em;}
.es-ph{font-size:18px;font-weight:650;letter-spacing:-.01em;}
.es-pdesc{color:var(--mute);font-size:13.5px;line-height:1.5;margin:2px 0 16px;}
.es-inrow{display:flex;gap:10px;flex-wrap:wrap;}
.es-input{flex:1;min-width:220px;background:var(--bg);border:1px solid var(--line);border-radius:9px;
  padding:12px 14px;color:var(--ink);font-size:14px;font-family:ui-monospace,monospace;outline:none;transition:border-color .15s;}
.es-input:focus{border-color:var(--sig);}
.es-ta{width:100%;box-sizing:border-box;min-height:120px;resize:vertical;background:var(--bg);
  border:1px solid var(--line);border-radius:9px;padding:12px 14px;color:var(--ink);font-size:14px;line-height:1.5;outline:none;font-family:inherit;transition:border-color .15s;}
.es-ta:focus{border-color:var(--sig);}
.es-btn{background:var(--sig);color:#06221D;border:none;border-radius:9px;padding:12px 20px;font-size:13.5px;
  font-weight:650;cursor:pointer;letter-spacing:.02em;font-family:ui-monospace,monospace;text-transform:uppercase;transition:transform .1s,opacity .15s;white-space:nowrap;}
.es-btn:hover:not(:disabled){transform:translateY(-1px);}
.es-btn:disabled{opacity:.45;cursor:not-allowed;}
.es-readout{margin-top:16px;border:1px solid var(--line);border-radius:10px;overflow:hidden;}
.es-rline{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:12px 15px;border-bottom:1px solid var(--line);font-size:13.5px;}
.es-rline:last-child{border-bottom:none;}
.es-rk{color:var(--mute);font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.05em;}
.es-rv{font-family:ui-monospace,monospace;font-weight:600;}
.es-pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-family:ui-monospace,monospace;font-weight:600;letter-spacing:.04em;text-transform:uppercase;}
.es-note{font-size:12px;color:var(--mute);line-height:1.5;margin-top:12px;padding-left:14px;border-left:2px solid var(--line);}
.es-infcard{border:1px solid var(--line);border-radius:10px;padding:14px 15px;margin-top:10px;background:var(--panel2);}
.es-inftop{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px;}
.es-infattr{font-weight:650;font-size:14.5px;}
.es-infguess{color:var(--sig);font-family:ui-monospace,monospace;font-size:13px;}
.es-infcue{color:var(--mute);font-size:13px;line-height:1.5;}
.es-infcue em{color:var(--ink);font-style:normal;background:rgba(231,177,90,.12);padding:1px 4px;border-radius:3px;}
.es-breach{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px dashed var(--line);font-size:13px;}
.es-breach:last-child{border-bottom:none;}
.es-breach .dc{color:var(--mute);font-size:11.5px;font-family:ui-monospace,monospace;text-align:right;max-width:55%;}
.es-metertop{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:10px;}
.es-score{font-family:ui-monospace,monospace;font-size:52px;font-weight:700;line-height:1;}
.es-scoremax{font-family:ui-monospace,monospace;font-size:18px;color:var(--mute);}
.es-band{font-family:ui-monospace,monospace;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;padding:5px 12px;border-radius:6px;}
.es-track{position:relative;height:14px;background:var(--bg);border:1px solid var(--line);border-radius:8px;overflow:hidden;}
.es-fill{position:absolute;top:0;left:0;bottom:0;border-radius:7px;transition:width .7s cubic-bezier(.2,.7,.2,1),background .4s;}
.es-ticks{display:flex;justify-content:space-between;margin-top:6px;}
.es-tick{font-family:ui-monospace,monospace;font-size:10px;color:var(--mute);}
.es-factors{margin-top:14px;display:flex;flex-direction:column;gap:0;}
.es-factor{display:flex;justify-content:space-between;font-size:13px;padding:8px 0;border-bottom:1px dashed var(--line);}
.es-factor:last-child{border-bottom:none;}
.es-rem{display:flex;gap:11px;padding:11px 0;border-bottom:1px solid var(--line);font-size:14px;line-height:1.5;}
.es-rem:last-child{border-bottom:none;}
.es-remdot{color:var(--sig);font-family:ui-monospace,monospace;flex-shrink:0;margin-top:1px;}
.es-empty{color:var(--mute);font-size:13.5px;font-style:italic;padding:8px 0;}
.es-err{color:var(--coral);font-size:13px;margin-top:12px;font-family:ui-monospace,monospace;}
.es-spin{display:inline-block;width:13px;height:13px;border:2px solid #06221D;border-top-color:transparent;border-radius:50%;animation:es-rot .7s linear infinite;vertical-align:-1px;margin-right:7px;}
@keyframes es-rot{to{transform:rotate(360deg);}}
.es-consent{display:flex;gap:12px;align-items:flex-start;font-size:14px;line-height:1.55;cursor:pointer;}
.es-consent input{margin-top:3px;width:17px;height:17px;accent-color:var(--sig);flex-shrink:0;}
.es-consent a{color:var(--sig);}
.es-foot{margin-top:30px;color:var(--mute);font-size:11.5px;line-height:1.6;text-align:center;font-family:ui-monospace,monospace;}
@media(max-width:560px){.es-title{font-size:31px;}.es-score{font-size:42px;}}
`;

const CONF_W = { low: 1, medium: 2.6, high: 4.2 };

async function sha1Hex(str) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

const REM_MAP = [
  { k: /location|city|country|region|address|geo/i, r: "Location cues: review posts for place names, commute mentions, and photo backgrounds; strip geotags before sharing images." },
  { k: /employ|job|company|work|occupation/i, r: "Employer exposure: keep professional details on one controlled profile; avoid confirming role and location together in public posts." },
  { k: /age|birth|born|year/i, r: "Age/DOB: remove birth year from public bios; date of birth plus location plus name is a re-identification triple." },
  { k: /income|salary|wealth|financ/i, r: "Financial signals: avoid public mentions that imply income bracket, purchases, or assets." },
  { k: /gender|sex/i, r: "Attribute inference: recognise that pronouns and topic patterns leak inferred attributes even when unstated." },
  { k: /email|username|handle|account/i, r: "Reused handles enable cross-source linkage: use distinct usernames across platforms you want kept separate." },
  { k: /health|medical|condition|mental/i, r: "Sensitive health cues: treat any health-related posting as high-risk; consider removing or restricting it." },
  { k: /relationship|family|partner|child/i, r: "Relationship/family data expands exposure to people around you; limit tagging and shared detail." },
];

function pill(bg, txt, label) {
  return <span className="es-pill" style={{ background: bg, color: txt }}>{label}</span>;
}

export default function Page() {
  const [consent, setConsent] = useState(false);

  const [pwd, setPwd] = useState("");
  const [credState, setCredState] = useState("idle");
  const [credResult, setCredResult] = useState(null);
  const [credErr, setCredErr] = useState("");

  const [email, setEmail] = useState("");
  const [breachState, setBreachState] = useState("idle");
  const [breachResult, setBreachResult] = useState(null);
  const [breachErr, setBreachErr] = useState("");

  const [text, setText] = useState("");
  const [infState, setInfState] = useState("idle");
  const [inferences, setInferences] = useState(null);
  const [infErr, setInfErr] = useState("");

  const runCred = async () => {
    if (!pwd) return;
    setCredState("loading"); setCredErr("");
    try {
      const hash = await sha1Hex(pwd);
      const prefix = hash.slice(0, 5), suffix = hash.slice(5);
      const res = await fetch("https://api.pwnedpasswords.com/range/" + prefix);
      if (!res.ok) throw new Error("range request failed (" + res.status + ")");
      const body = await res.text();
      let count = 0;
      for (const line of body.split("\n")) {
        const [suf, c] = line.trim().split(":");
        if (suf === suffix) { count = parseInt(c, 10) || 0; break; }
      }
      setCredResult({ pwned: count > 0, count });
      setCredState("done");
      setPwd("");
    } catch (e) {
      setCredErr(String(e.message || e)); setCredState("error");
    }
  };

  const runBreach = async () => {
    if (!email.trim()) return;
    setBreachState("loading"); setBreachErr("");
    try {
      const res = await fetch("/api/breach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBreachErr(data.error || "Lookup failed.");
        setBreachState(data.configured === false ? "disabled" : "error");
        return;
      }
      setBreachResult(data);
      setBreachState("done");
    } catch (e) {
      setBreachErr(String(e.message || e)); setBreachState("error");
    }
  };

  const runInference = async () => {
    if (!text.trim()) return;
    setInfState("loading"); setInfErr("");
    try {
      const res = await fetch("/api/infer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) { setInfErr(data.error || "Analysis failed."); setInfState("error"); return; }
      setInferences(data);
      setInfState("done");
    } catch (e) {
      setInfErr(String(e.message || e)); setInfState("error");
    }
  };

  const index = useMemo(() => {
    let cred = 0, infer = 0, link = 0, breach = 0;
    if (credResult?.pwned) cred = Math.min(30, 15 + 5 * Math.log10(credResult.count + 1));
    if (breachResult?.count) breach = Math.min(25, 8 + 4 * breachResult.count);
    if (inferences?.inferences?.length) {
      for (const it of inferences.inferences) infer += CONF_W[(it.confidence || "low").toLowerCase()] || 1;
      infer = Math.min(35, infer * 3.0);
    }
    if (inferences?.linkage && !/no|none|unlikely|minimal/i.test(inferences.linkage)) link = 10;
    const total = Math.min(100, Math.round(cred + breach + infer + link));
    let band, color;
    if (total < 20) { band = "Low"; color = "var(--sig)"; }
    else if (total < 45) { band = "Moderate"; color = "var(--amber)"; }
    else if (total < 70) { band = "Elevated"; color = "var(--coral)"; }
    else { band = "High"; color = "var(--coral)"; }
    const ran = credState === "done" || infState === "done" || breachState === "done";
    return { total, band, color, cred: Math.round(cred), breach: Math.round(breach), infer: Math.round(infer), link, ran };
  }, [credResult, breachResult, inferences, credState, infState, breachState]);

  const remediation = useMemo(() => {
    const out = [];
    if (credResult?.pwned) {
      out.push("This exact password appears in known breach corpora — stop using it everywhere, change it now, and switch to a password manager generating unique passwords per site.");
      out.push("Enable two-factor authentication on the accounts that used it; a breached password is only dangerous where it still unlocks something.");
    } else if (credState === "done") {
      out.push("This password was not found in breach corpora — good, but uniqueness per site and 2FA matter more than password strength alone.");
    }
    if (breachResult?.count) {
      out.push("Your email appears in " + breachResult.count + " known breach" + (breachResult.count > 1 ? "es" : "") + ". Change any reused passwords tied to it and enable 2FA on the affected services.");
    }
    if (inferences?.inferences?.length) {
      const seen = new Set();
      for (const it of inferences.inferences) {
        for (const m of REM_MAP) {
          if (m.k.test(it.attribute) && !seen.has(m.r)) { out.push(m.r); seen.add(m.r); }
        }
      }
    }
    if (index.link) out.push("Cross-source linkage risk detected: the same identifiers or writing style could tie separate profiles together. Separate the identities you want kept apart.");
    return out;
  }, [credResult, breachResult, inferences, credState, index.link]);

  const locked = !consent ? "locked" : "";

  return (
    <div className="es-root">
      <style>{STYLE}</style>
      <div className="es-wrap">
        <div className="es-eyebrow">Personal Digital Exposure · Self-Assessment</div>
        <h1 className="es-title">ExposureScope</h1>
        <p className="es-sub">
          A diagnostic instrument for your own digital exposure. It checks whether a credential appears in known
          breaches, shows what a language model could infer about you from your public text, and combines both into
          an illustrative exposure index with remediation.
        </p>
        <div className="es-ethics">
          <b>Assess your own data only.</b> The password check uses a k-anonymity protocol — only the first 5
          characters of a one-way hash ever leave your browser, never the password. Text and email you enter are
          processed for this session and <b>never stored, logged, or shared</b>. Do not enter other people's data.
        </div>

        {/* 00 Consent gate */}
        <div className="es-panel">
          <div className="es-phead"><span className="es-pnum">00</span><span className="es-ph">Consent &amp; scope</span></div>
          <p className="es-pdesc">This is a research prototype. Confirm before using the tools below.</p>
          <label className="es-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I confirm I am assessing <b>my own</b> data, I understand this is a research prototype that stores
              nothing, and I consent to my inputs being processed in-session for this assessment.</span>
          </label>
        </div>

        {/* 01 Credential exposure */}
        <div className={"es-panel " + locked}>
          <div className="es-phead"><span className="es-pnum">01</span><span className="es-ph">Credential exposure</span></div>
          <p className="es-pdesc">Check whether a password of yours appears in breach corpora (via Have I Been Pwned's free k-anonymity API).</p>
          <div className="es-inrow">
            <input className="es-input" type="password" value={pwd} placeholder="Enter a password of yours"
              onChange={(e) => setPwd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runCred()} autoComplete="off" />
            <button className="es-btn" onClick={runCred} disabled={credState === "loading" || !pwd}>
              {credState === "loading" ? <><span className="es-spin" />Checking</> : "Run check"}
            </button>
          </div>
          {credState === "error" && <div className="es-err">{credErr}</div>}
          {credState === "done" && credResult && (
            <div className="es-readout">
              <div className="es-rline"><span className="es-rk">STATUS</span>
                {credResult.pwned ? pill("rgba(232,111,91,.15)", "var(--coral)", "Exposed") : pill("rgba(74,214,192,.15)", "var(--sig)", "Not found")}</div>
              <div className="es-rline"><span className="es-rk">BREACH APPEARANCES</span>
                <span className="es-rv" style={{ color: credResult.pwned ? "var(--coral)" : "var(--sig)" }}>{credResult.count.toLocaleString()}</span></div>
              <div className="es-rline"><span className="es-rk">DATA TRANSMITTED</span>
                <span className="es-rv" style={{ color: "var(--mute)" }}>5-char hash prefix only</span></div>
            </div>
          )}
          <p className="es-note">A high count means the password is common in breach dumps and heavily targeted — not that your account was breached, but that this secret offers no protection.</p>
        </div>

        {/* 02 Account exposure (email breach lookup) */}
        <div className={"es-panel " + locked}>
          <div className="es-phead"><span className="es-pnum">02</span><span className="es-ph">Account exposure</span></div>
          <p className="es-pdesc">Check whether your email address appears in known breaches. Requires an HIBP key to be configured on the server; otherwise this section stays disabled.</p>
          <div className="es-inrow">
            <input className="es-input" type="email" value={email} placeholder="your.email@example.com"
              onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runBreach()} autoComplete="off" />
            <button className="es-btn" onClick={runBreach} disabled={breachState === "loading" || !email.trim()}>
              {breachState === "loading" ? <><span className="es-spin" />Checking</> : "Check email"}
            </button>
          </div>
          {breachState === "disabled" && <div className="es-note" style={{ marginTop: 14 }}>Email breach lookup is not enabled on this deployment. Set an <span className="es-mono">HIBP_API_KEY</span> to enable it — and only under an approved ethics protocol.</div>}
          {breachState === "error" && <div className="es-err">{breachErr}</div>}
          {breachState === "done" && breachResult && (
            <div style={{ marginTop: 14 }}>
              <div className="es-rline" style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 15px" }}>
                <span className="es-rk">BREACHES FOUND</span>
                <span className="es-rv" style={{ color: breachResult.count ? "var(--coral)" : "var(--sig)" }}>{breachResult.count}</span>
              </div>
              {breachResult.breaches?.map((b, i) => (
                <div className="es-breach" key={i}>
                  <span><b>{b.title || b.name}</b>{b.year ? " · " + b.year : ""}</span>
                  <span className="dc">{(b.dataClasses || []).slice(0, 4).join(", ")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 03 Inference surface */}
        <div className={"es-panel " + locked}>
          <div className="es-phead"><span className="es-pnum">03</span><span className="es-ph">Inference surface</span></div>
          <p className="es-pdesc">Paste text you've written publicly (a bio, a few posts). A language model shows what could be inferred about you — the core capability behind modern exposure risk.</p>
          <textarea className="es-ta" value={text} placeholder="Paste your own public text here…" onChange={(e) => setText(e.target.value)} />
          <div style={{ marginTop: 12 }}>
            <button className="es-btn" onClick={runInference} disabled={infState === "loading" || !text.trim()}>
              {infState === "loading" ? <><span className="es-spin" />Analysing</> : "Analyse text"}
            </button>
          </div>
          {infState === "error" && <div className="es-err">{infErr}</div>}
          {infState === "done" && inferences && (
            <div style={{ marginTop: 6 }}>
              {(!inferences.inferences || inferences.inferences.length === 0) && <div className="es-empty">No confident inferences drawn from this text.</div>}
              {(inferences.inferences || []).map((it, i) => (
                <div className="es-infcard" key={i}>
                  <div className="es-inftop">
                    <span className="es-infattr">{it.attribute}</span>
                    {(() => {
                      const c = (it.confidence || "low").toLowerCase();
                      const map = { low: ["rgba(138,154,180,.18)", "var(--mute)"], medium: ["rgba(231,177,90,.15)", "var(--amber)"], high: ["rgba(232,111,91,.15)", "var(--coral)"] };
                      return pill(map[c]?.[0] || map.low[0], map[c]?.[1] || map.low[1], c);
                    })()}
                  </div>
                  {it.guess && <div className="es-infguess">→ {it.guess}</div>}
                  {it.cue && <div className="es-infcue" style={{ marginTop: 6 }}>leaked by: <em>{it.cue}</em></div>}
                </div>
              ))}
              {inferences.linkage && (
                <p className="es-note" style={{ marginTop: 14 }}>
                  <span style={{ color: "var(--sig)", fontFamily: "ui-monospace,monospace" }}>LINKAGE · </span>{inferences.linkage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 04 Exposure index */}
        <div className={"es-panel " + locked}>
          <div className="es-phead"><span className="es-pnum">04</span><span className="es-ph">Exposure index</span></div>
          <p className="es-pdesc">A combined, illustrative score — heuristic, not a calibrated probability. Building a properly calibrated version is exactly the open research problem this instrument prototypes.</p>
          {!index.ran ? <div className="es-empty">Run a check above to compute your index.</div> : (
            <div>
              <div className="es-metertop">
                <div><span className="es-score" style={{ color: index.color }}>{index.total}</span><span className="es-scoremax"> / 100</span></div>
                <span className="es-band" style={{ background: "rgba(255,255,255,.04)", color: index.color, border: "1px solid var(--line)" }}>{index.band}</span>
              </div>
              <div className="es-track"><div className="es-fill" style={{ width: index.total + "%", background: index.color }} /></div>
              <div className="es-ticks"><span className="es-tick">0</span><span className="es-tick">LOW</span><span className="es-tick">MODERATE</span><span className="es-tick">ELEVATED</span><span className="es-tick">100</span></div>
              <div className="es-factors">
                <div className="es-factor"><span style={{ color: "var(--mute)" }}>Credential exposure</span><span className="es-mono">+{index.cred}</span></div>
                <div className="es-factor"><span style={{ color: "var(--mute)" }}>Account exposure</span><span className="es-mono">+{index.breach}</span></div>
                <div className="es-factor"><span style={{ color: "var(--mute)" }}>Attribute inference</span><span className="es-mono">+{index.infer}</span></div>
                <div className="es-factor"><span style={{ color: "var(--mute)" }}>Cross-source linkage</span><span className="es-mono">+{index.link}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* 05 Remediation */}
        <div className={"es-panel " + locked}>
          <div className="es-phead"><span className="es-pnum">05</span><span className="es-ph">Remediation</span></div>
          <p className="es-pdesc">Prioritised actions derived from your findings.</p>
          {remediation.length === 0 ? <div className="es-empty">Recommendations will appear here once you've run a check.</div> : (
            <div>{remediation.map((r, i) => <div className="es-rem" key={i}><span className="es-remdot">›</span><span>{r}</span></div>)}</div>
          )}
        </div>

        <div className="es-foot">
          PROTOTYPE · self-assessment only · k-anonymity credential check · in-session analysis, no storage<br />
          Research demonstrator for personal digital exposure assessment · not a commercial security product.
        </div>
      </div>
    </div>
  );
}
