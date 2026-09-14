"use client";
// app/components/ActionPlan.js
// ─────────────────────────────────────────────────────────────────────────────
// The Actions tab. Reads everything from the vetted playbook (lib/playbook.js):
//   • one card per applicable action, with the points it removes on its own
//     (computed by the residual model, not guessed; "minor" when it helps by
//     under one point for this report, "preventive" when it has no factor),
//   • an "I've done this" tick that feeds the residual score,
//   • GDPR access/erasure letter drafts for each breached company.
//
// The ticks are React state owned by page.js — held in memory only, gone on
// refresh. Nothing about what a user has or hasn't fixed is stored anywhere.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { applicableActions, estimatedReduction } from "../../lib/playbook.js";
import { gdprLetter } from "../../lib/gdpr.js";
import { fill } from "../strings.js";

export default function ActionPlan({ report, done, onToggle, identifier, L }) {
  const actions = applicableActions(report);

  return (
    <div className="x-card">
      <div className="x-sech"><span className="x-secn">01</span><span className="x-sect">Actions to take</span></div>
      <div className="x-secd">Vetted steps, most important first. Tick the ones you've finished to see the risk that's left.</div>

      {actions.map((action) => {
        const points = estimatedReduction(report, action.id);
        const isDone = done.has(action.id);
        return (
          <div className={"x-remcard" + (isDone ? " isdone" : "")} key={action.id}>
            <div className="x-remtop">
              <span className="x-remcat">{action.category}</span>
              <span className="x-remred">{points > 0 ? fill(L.pts, { n: points }) : action.mitigates.length ? L.minor : L.preventive}</span>
            </div>
            <div className="x-infot" style={{ marginBottom: 6 }}>{action.title}</div>
            <div className="x-remfind">{action.finding(report)}</div>
            <ol className="x-remsteps">{action.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
            {action.id === "GDPR_REQUEST" && <Letters report={report} identifier={identifier} />}
            <label className="x-done">
              <input type="checkbox" checked={isDone} onChange={() => onToggle(action.id)} />
              {L.markDone}
            </label>
          </div>
        );
      })}
    </div>
  );
}

// Letter drafts. The text is filled locally from lib/gdpr.js; the user copies
// it and sends it from their own mailbox.
function Letters({ report, identifier }) {
  const [open, setOpen] = useState(null); // { title, year, type } | null
  const [copied, setCopied] = useState(false);

  const letter = open ? gdprLetter(open.type, { company: open.title, email: identifier, year: open.year }) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false); // clipboard blocked: the text is still selectable in the box
    }
  }

  return (
    <div className="x-letters">
      {report.breaches.slice(0, 12).map((b) => {
        const isOpen = (type) => open && open.title === b.title && open.type === type;
        const toggle = (type) => setOpen(isOpen(type) ? null : { title: b.title, year: b.year, type });
        return (
          <div className="x-letterrow" key={b.title}>
            <span className="n" title={b.title}>{b.title}</span>
            <span style={{ display: "flex", gap: 6 }}>
              <button className={"x-mini" + (isOpen("access") ? " on" : "")} onClick={() => toggle("access")}>Art. 15 access</button>
              <button className={"x-mini" + (isOpen("erasure") ? " on" : "")} onClick={() => toggle("erasure")}>Art. 17 erasure</button>
            </span>
          </div>
        );
      })}
      {open && (
        <>
          <textarea className="x-letter" readOnly value={letter} aria-label="GDPR request letter" />
          <div className="x-row" style={{ marginTop: 6 }}>
            <span className="x-secd" style={{ margin: 0 }}>Find the company's privacy or DPO contact on its website, then send this from your own email.</span>
            <button className="x-mini" onClick={copy}>{copied ? "Copied ✓" : "Copy letter"}</button>
          </div>
        </>
      )}
    </div>
  );
}
