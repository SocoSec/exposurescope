"use client";

import React, { useState, useMemo } from "react";

// Exposio — an ephemeral orchestration layer over Have I Been Pwned and
// related breach-intelligence sources. Enter an email, phone, or password
// (your own) and receive one Exposure Score verdict. Zero storage: the
// password never leaves the browser (k-anonymity); everything else is
// processed in-session and discarded.
//
// Scoring follows the thesis MVP: the Breach Risk component B drives the
// score, with severity weighting (financial credentials 1.0, credentials
// 0.7, contact 0.4, email-only 0.2) and bands Low [0-35], Medium [36-65],
// High [66-100].

const STYLE = `
.x-root{--bg:#080B12;--card:#0F1521;--line:#1C2636;--ink:#DBE4F1;--mute:#67748B;
  --sig:#38C89A;--amber:#E6B057;--coral:#E56A5A;
  background:var(--bg);color:var(--ink);min-height:100vh;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  display:flex;align-items:flex-start;justify-content:center;}
.x-wrap{width:100%;max-width:540px;padding:66px 22px 80px;}
.x-brand{font-family:ui-monospace,"JetBrains Mono",Menlo,monospace;font-size:12px;
  letter-spacing:.34em;text-transform:uppercase;color:var(--sig);text-align:center;}
.x-title{font-size:29px;font-weight:650;letter-spacing:-.02em;text-align:center;margin:12px 0 8px;}
.x-lede{color:var(--mute);font-size:13.5px;line-height:1.55;text-align:center;max-width:46ch;margin:0 auto;}
.x-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:26px 24px;margin-top:32px;}
.x-label{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin-bottom:10px;display:block;}
.x-input{width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--line);border-radius:11px;
  padding:15px 16px;color:var(--ink);font-size:15px;font-family:ui-monospace,monospace;outline:none;transition:border-color .15s;}
.x-input:focus{border-color:var(--sig);}
.x-kind{font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);margin-top:9px;min-height:15px;letter-spacing:.03em;}
.x-kind b{color:var(--sig);}
.x-btn{width:100%;margin-top:16px;background:var(--sig);color:#04201A;border:none;border-radius:11px;
  padding:15px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.03em;
  font-family:ui-monospace,monospace;text-transform:uppercase;transition:transform .1s,opacity .15s;}
.x-btn:hover:not(:disabled){transform:translateY(-1px);}
.x-btn:disabled{opacity:.4;cursor:not-allowed;}
.x-consent{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--mute);cursor:pointer;margin-top:18px;}
.x-consent input{margin-top:2px;width:15px;height:15px;accent-color:var(--sig);flex-shrink:0;}
.x-consent b{color:var(--ink);font-weight:600;}
.x-verdict{border-radius:14px;padding:28px 22px 24px;text-align:center;border:1px solid var(--line);animation:x-in .4s ease;}
@keyframes x-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
.x-scorewrap{position:relative;width:118px;height:118px;margin:0 auto 14px;}
.x-scoreval{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.x-scorenum{font-family:ui-monospace,monospace;font-size:34px;font-weight:700;line-height:1;}
.x-scoreof{font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);margin-top:2px;}
.x-state{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;}
.x-headline{font-size:18px;font-weight:650;margin:8px 0 6px;letter-spacing:-.01em;}
.x-detail{color:var(--mute);font-size:13px;line-height:1.55;max-width:42ch;margin:0 auto;}
.x-rows{margin-top:16px;border-top:1px solid var(--line);}
.x-row{display:flex;justify-content:space-between;align-items:center;padding:11px 2px;border-bottom:1px solid var(--line);font-size:13px;}
.x-row .k{color:var(--mute);font-family:ui-monospace,monospace;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;}
.x-tag{font-family:ui-monospace,monospace;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;letter-spacing:.03em;}
.x-again{margin-top:16px;background:none;border:1px solid var(--line);color:var(--mute);border-radius:10px;
  padding:11px;width:100%;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:border-color .15s,color .15s;}
.x-again:hover{border-color:var(--sig);color:var(--sig);}
.x-err{color:var(--coral);font-size:12.5px;margin-top:12px;font-family:ui-monospace,monospace;text-align:center;}
.x-spin{display:inline-block;width:13px;height:13px;border:2px solid #04201A;border-top-color:transparent;border-radius:50%;animation:x-rot .7s linear infinite;vertical-align:-1px;margin-right:8px;}
@keyframes x-rot{to{transform:rotate(360deg);}}
.x-foot{margin-top:24px;color:var(--mute);font-size:10.5px;line-height:1.6;text-align:center;font-family:ui-monospace,monospace;}
`;

async function sha1Hex(str) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s\-().]{6,}$/;

function classify(v) {
  const s = v.trim();
  if (!s) return "empty";
  if (EMAIL_RE.test(s)) return "email";
  if (PHONE_RE.test(s)) return "phone";
  return "password";
}
const KIND_LABEL = { email: "email address", phone: "phone number", password: "password", empty: "" };

// Severity from a breach's DataClasses (thesis 5.3.1 hierarchy).
function severityFor(dataClasses) {
  const dc = (dataClasses || []).map((s) => s.toLowerCase());
  const hasPw = dc.some((s) => s.includes("password"));
  const hasFin = dc.some((s) => s.includes("credit card") || s.includes("bank") || s.includes("payment") || s.includes("financial"));
  const hasContact = dc.some((s) => s.includes("phone") || s.includes("address"));
  if (hasPw && hasFin) return 1.0;
  if (hasPw) return 0.7;
  if (hasContact) return 0.4;
  return 0.2;
}

export default function Page() {
  const [consent, setConsent] = useState(false);
  const [value, setValue] = useState("");
  const [state, setState] = useState("idle");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const kind = useMemo(() => classify(value), [value]);
  const reset = () => { setValue(""); setState("idle"); setResult(null); setErr(""); };

  const run = async () => {
    if (!value.trim()) return;
    setState("loading"); setErr(""); setResult(null);
    try {
      let credLeaked = null, acctLeaked = null;
      let credCount = 0, acctCount = 0, acctBreaches = [], acctUnavailable = false;

      if (kind === "password") {
        const hash = await sha1Hex(value);
        const res = await fetch("https://api.pwnedpasswords.com/range/" + hash.slice(0, 5));
        if (!res.ok) throw new Error("Password service unreachable.");
        const body = await res.text();
        const suffix = hash.slice(5);
        for (const line of body.split("\n")) {
          const [suf, c] = line.trim().split(":");
          if (suf === suffix) { credCount = parseInt(c, 10) || 0; break; }
        }
        credLeaked = credCount > 0;
      } else {
        const res = await fetch("/api/breach", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: kind === "email" ? value.trim() : undefined, phone: kind === "phone" ? value.trim() : undefined }),
        });
        const data = await res.json();
        if (res.status === 503 || data.configured === false) acctUnavailable = true;
        else if (!res.ok) throw new Error(data.error || "Lookup failed.");
        else { acctCount = data.count || 0; acctBreaches = data.breaches || []; acctLeaked = acctCount > 0; }
      }

      // ---- Exposure Score (MVP: Breach Risk component B, 0-100) ----
      // Password path: severity 0.7 (credential), scaled by prevalence in dumps.
      // Account path: sum severity x recency over breaches, normalised (Bmax=0.8).
      let B = 0;
      if (kind === "password" && credLeaked) {
        const prevalence = Math.min(1, Math.log10(credCount + 1) / 7); // 0..1
        B = 0.7 * (0.5 + 0.5 * prevalence); // credential severity, prevalence-weighted
      }
      if ((kind === "email" || kind === "phone") && acctLeaked) {
        let raw = 0;
        for (const b of acctBreaches) {
          const sev = severityFor(b.dataClasses);
          const ageDays = b.year ? Math.max(0, (new Date().getFullYear() - parseInt(b.year, 10)) * 365) : 1000;
          const rec = Math.exp(-0.002 * ageDays);
          raw += sev * rec;
        }
        B = Math.min(1, raw / 0.8);
      }
      // If both dimensions were present and leaked, combine (weighted, capped).
      const both = credLeaked === true && acctLeaked === true;
      if (both) B = Math.min(1, B + 0.25);

      const score = Math.round(B * 100);
      let level;
      if (score <= 35) level = "low";
      else if (score <= 65) level = "medium";
      else level = "high";
      // If nothing leaked at all, force the reassuring "safe" state.
      const anyLeak = credLeaked === true || acctLeaked === true;
      if (!anyLeak) level = "safe";

      setResult({ level, score: anyLeak ? Math.max(score, 1) : 0, kind, credLeaked, acctLeaked, credCount, acctCount, acctBreaches, acctUnavailable });
      setState("done");
      if (kind === "password") setValue("");
    } catch (e) {
      setErr(String(e.message || e)); setState("error");
    }
  };

  const V = {
    safe:   { color: "var(--sig)",   state: "Safe",   head: "No exposure found" },
    low:    { color: "var(--sig)",   state: "Low",    head: "Limited exposure" },
    medium: { color: "var(--amber)", state: "Medium", head: "Notable exposure" },
    high:   { color: "var(--coral)", state: "High",   head: "Significant exposure" },
  };

  const detail = (r) => {
    if (r.level === "safe") {
      if (r.acctUnavailable) return "The account source needs its key to run — nothing was verified. Still, keep yourself safe: unique passwords per site and two-factor authentication everywhere.";
      return "No match in the breach sources checked. Keep yourself safe: use a password manager, a unique password per site, and two-factor authentication everywhere.";
    }
    if (r.level === "high") return "Significant multi-vector exposure — immediate remediation required. Change the affected password everywhere it was reused and enable app-based two-factor authentication now.";
    if (r.level === "medium") {
      if (r.kind === "password") return "This password is present in breach dumps and heavily targeted. Stop using it, change it wherever it was reused, and move to unique passwords via a manager.";
      return "This account appears in known breaches. Change any reused passwords tied to it and enable two-factor authentication.";
    }
    // low
    return "Limited discoverable exposure — standard precautions are sufficient. Maintain unique passwords and two-factor authentication.";
  };

  const tag = (leaked, unavailable) => {
    if (unavailable) return <span className="x-tag" style={{ background: "rgba(103,116,139,.18)", color: "var(--mute)" }}>not enabled</span>;
    if (leaked === null) return <span className="x-tag" style={{ background: "rgba(103,116,139,.18)", color: "var(--mute)" }}>—</span>;
    return leaked
      ? <span className="x-tag" style={{ background: "rgba(229,106,90,.16)", color: "var(--coral)" }}>leaked</span>
      : <span className="x-tag" style={{ background: "rgba(56,200,154,.16)", color: "var(--sig)" }}>clear</span>;
  };

  const ringStyle = (r) => {
    const c = V[r.level].color;
    const pct = r.level === "safe" ? 100 : r.score;
    return {
      borderRadius: "50%", width: "100%", height: "100%",
      background: `conic-gradient(${c} ${pct * 3.6}deg, var(--line) 0deg)`,
      WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 9px))",
      mask: "radial-gradient(farthest-side, transparent calc(100% - 9px), #000 calc(100% - 9px))",
    };
  };

  return (
    <div className="x-root">
      <style>{STYLE}</style>
      <div className="x-wrap">
        <div className="x-brand">Exposio</div>
        <h1 className="x-title">Check your exposure</h1>
        <p className="x-lede">One check across breach intelligence. Enter an email, phone, or password — your own — and get a single Exposure Score. Nothing is stored.</p>

        <div className="x-card">
          {state !== "done" ? (
            <>
              <label className="x-label">Email · phone · password</label>
              <input
                className="x-input"
                type={kind === "password" ? "password" : "text"}
                value={value}
                placeholder="Enter one to check"
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && consent && run()}
                autoComplete="off"
                disabled={!consent}
              />
              <div className="x-kind">{value.trim() ? <>Detected: <b>{KIND_LABEL[kind]}</b></> : "\u00A0"}</div>
              <button className="x-btn" onClick={run} disabled={!consent || state === "loading" || !value.trim()}>
                {state === "loading" ? <><span className="x-spin" />Checking</> : "Run check"}
              </button>
              {state === "error" && <div className="x-err">{err}</div>}
              <label className="x-consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>I'm checking <b>my own</b> data. Zero storage — the password never leaves my browser, and the rest is processed in-session only.</span>
              </label>
            </>
          ) : (
            <>
              <div className="x-verdict" style={{ borderColor: V[result.level].color }}>
                <div className="x-scorewrap">
                  <div style={ringStyle(result)} />
                  <div className="x-scoreval">
                    <span className="x-scorenum" style={{ color: V[result.level].color }}>{result.score}</span>
                    <span className="x-scoreof">/ 100</span>
                  </div>
                </div>
                <div className="x-state" style={{ color: V[result.level].color }}>{V[result.level].state}</div>
                <div className="x-headline">{V[result.level].head}</div>
                <div className="x-detail">{detail(result)}</div>
              </div>

              <div className="x-rows">
                <div className="x-row">
                  <span className="k">Password</span>
                  {result.kind === "password" ? tag(result.credLeaked) : tag(null)}
                </div>
                <div className="x-row">
                  <span className="k">{result.kind === "phone" ? "Phone" : "Email"} account</span>
                  {result.kind === "email" || result.kind === "phone" ? tag(result.acctLeaked, result.acctUnavailable) : tag(null)}
                </div>
                {result.kind === "password" && result.credLeaked && (
                  <div className="x-row"><span className="k">Breach appearances</span>
                    <span style={{ fontFamily: "ui-monospace,monospace", color: "var(--coral)" }}>{result.credCount.toLocaleString()}</span></div>
                )}
                {(result.kind === "email" || result.kind === "phone") && result.acctLeaked && (
                  <div className="x-row"><span className="k">Breaches</span>
                    <span style={{ fontFamily: "ui-monospace,monospace", color: "var(--coral)" }}>{result.acctCount}</span></div>
                )}
              </div>
              <button className="x-again" onClick={reset}>Check another</button>
            </>
          )}
        </div>

        <div className="x-foot">
          Exposio · ephemeral orchestration layer over Have I Been Pwned &amp; breach sources<br />
          Zero-storage · self-assessment only · MSc thesis prototype, Óbuda University
        </div>
      </div>
    </div>
  );
}
