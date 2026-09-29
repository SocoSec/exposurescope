// app/components/Trust.js
// ─────────────────────────────────────────────────────────────────────────────
// The trust layer: the parts of the interface whose job is to let someone
// decide whether to type their email address at all.
//
// The rule for everything in this file: a claim may only appear here if it is
// enforced somewhere in the code, and a reader could check it. So there are no
// certification badges, no padlock seals, no "bank-level encryption", no
// invented audit logos — the things that look like trust and aren't. What is
// here instead is specific and falsifiable: no database, a one-time code before
// any lookup, five characters of a hash for password checks, a public repo.
//
// Text lives in TRUST in app/strings.js, alongside a note on which file backs
// each claim, so the wording and the behaviour are changed together.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

export const REPO_URL = "https://github.com/SocoSec/exposurescope";
const HIBP_URL = "https://haveibeenpwned.com";

// ── the three signals under the headline ─────────────────────────────────────
// First screen, before the input: what happens to your data, in one line each.
export function TrustStrip({ T }) {
  return (
    <div className="x-trust">
      {T.signals.map((s) => (
        <div className="x-tsig" key={s.k}>
          <span className="x-tico"><Icon name={s.k} /></span>
          <div>
            <div className="x-tsigt">{s.t}</div>
            <div className="x-tsigd">{s.d}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── the guarantee inside the input card ──────────────────────────────────────
// Shown next to the field itself, because that is the moment of the decision.
// The password wording is the stronger claim, and it is the true one: the
// plaintext never leaves the browser (see checkPassword in app/page.js).
export function SafetyNote({ mode, T }) {
  return (
    <div className="x-safety">
      <span className="x-tico"><Icon name={mode === "password" ? "shield" : "store"} /></span>
      <span>{mode === "password" ? T.safetyPw : T.safetyEmail}</span>
    </div>
  );
}

// ── how it works, in three steps ─────────────────────────────────────────────
export function HowItWorks({ T }) {
  return (
    <section className="x-how" aria-label={T.howTitle}>
      <h2 className="x-howt">{T.howTitle}</h2>
      <div className="x-steps">
        {T.steps.map((s) => (
          <div className="x-step" key={s.n}>
            <span className="x-stepn">{s.n}</span>
            <div className="x-stept">{s.t}</div>
            <div className="x-stepd">{s.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── what it never does ───────────────────────────────────────────────────────
// A promise is easier to check when it is stated as a limit. Each line here
// corresponds to something the code refuses to do, not to an intention.
export function NeverDoes({ T }) {
  return (
    <section className="x-never" aria-label={T.neverTitle}>
      <h2 className="x-nevert">{T.neverTitle}</h2>
      <ul className="x-neverl">
        {T.never.map((item) => (
          <li key={item}><span className="x-neverx" aria-hidden="true">✕</span>{item}</li>
        ))}
      </ul>
    </section>
  );
}

// ── provenance ───────────────────────────────────────────────────────────────
// Where the data comes from, where the code is, and who is behind it. Links
// open in a new tab so a check in progress is never lost.
export function TrustSeals({ T }) {
  return (
    <div className="x-seals">
      <a className="x-seal" href={HIBP_URL} target="_blank" rel="noopener noreferrer">
        <Icon name="db" /> {T.sealSources}
      </a>
      <a className="x-seal" href={REPO_URL} target="_blank" rel="noopener noreferrer">
        <Icon name="code" /> {T.sealCode}
      </a>
      <span className="x-seal x-sealflat">
        <Icon name="study" /> {T.sealResearch}
      </span>
    </div>
  );
}

// ── icons ────────────────────────────────────────────────────────────────────
// Line icons, drawn inline so the page loads no icon font or sprite — one less
// third party watching who visits a breach-checking tool.
function Icon({ name }) {
  const base = {
    viewBox: "0 0 24 24", width: 16, height: 16, fill: "none",
    stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round",
    "aria-hidden": "true",
  };
  switch (name) {
    case "store": // a crossed-out database: nothing is kept
      return (
        <svg {...base}>
          <ellipse cx="11" cy="6" rx="6.5" ry="2.6" />
          <path d="M4.5 6v10c0 1.4 2.9 2.6 6.5 2.6 1 0 2-.1 2.8-.3" />
          <path d="M4.5 11c0 1.4 2.9 2.6 6.5 2.6 .7 0 1.4 0 2-.1" />
          <path d="M16 16.5l5 5M21 16.5l-5 5" />
        </svg>
      );
    case "code": // the one-time code: an envelope with a tick
      return (
        <svg {...base}>
          <path d="M3.5 6.5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z" />
          <path d="M2.8 7.2l7.2 5 7.2-5" />
          <path d="M15.4 17.6l1.9 1.9 3.4-3.9" />
        </svg>
      );
    case "open": // source code: proof you can read it yourself
      return <svg {...base}><path d="M9 7l-5 5 5 5M15 7l5 5-5 5" /></svg>;
    case "shield": // the password never leaves
      return <svg {...base}><path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 8.5-4.1-.9-7-4.3-7-8.5V6z" /><path d="M9.2 12.2l2 2 3.6-4" /></svg>;
    case "db":
      return <svg {...base}><ellipse cx="12" cy="6" rx="6.5" ry="2.6" /><path d="M5.5 6v11c0 1.5 2.9 2.6 6.5 2.6s6.5-1.1 6.5-2.6V6" /><path d="M5.5 11.5c0 1.5 2.9 2.6 6.5 2.6s6.5-1.1 6.5-2.6" /></svg>;
    case "study":
      return <svg {...base}><path d="M12 4l9 4.5-9 4.5-9-4.5z" /><path d="M7 11v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V11" /></svg>;
    default:
      return null;
  }
}
