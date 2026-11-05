"use client";

import { brief } from "../../lib/explain.js";
import { scoreInterval } from "../../lib/interval.js";

// app/components/ScoreNote.js
// ─────────────────────────────────────────────────────────────────────────────
// The sentence under the number, and the note behind "How is this calculated?".
//
// WHY THIS IS GENERATED AND NOT WRITTEN
// There was a hand-written version of this, in Horizon.js, and it drifted: it
// described two halves of the score at a time when the model had three, and it
// never learned about the cryptographic weight at all. That is the predictable
// fate of prose kept next to a number it does not read. Everything here comes
// out of brief() in lib/explain.js, computed from the same report object the
// score was computed from, so the words cannot contradict the figure above
// them. The self-test asserts that, and it forbids the vocabulary of the model
// — clock, half-life, decay, percentile — from appearing in it at all.
//
// The register is deliberately plain. A person who has just been told their
// data is in three breaches is not reading for the derivation; the derivation
// is a tab away, in Audit, for anyone who wants it.
// ─────────────────────────────────────────────────────────────────────────────

export function ScoreNote({ report }) {
  if (!report || report.kind === "password") return null;
  const b = brief(report);

  // The interval is reported only where it means something: with no exposure
  // there is nothing to be uncertain about.
  let iv = null;
  if (report.breaches && report.breaches.length) {
    try {
      iv = scoreInterval(report);
    } catch {
      iv = null;   // the note is worth showing even if the interval fails
    }
  }

  return (
    <>
      <div className="x-hsub">{b.found}</div>
      <details className="x-hzcalc x-scorenote">
        <summary>How is this calculated?</summary>
        <div className="x-hzcalcbody">
          <p>{b.how}</p>
          {iv && (
            <p>
              Every number here is a judgement rather than a measurement. If all of them were
              wrong by up to {Math.round(iv.spread * 100)}%, this score would still land between{" "}
              <b>{iv.lo}</b> and <b>{iv.hi}</b>, and stay in the same band{" "}
              {iv.bandStable}% of the time.
            </p>
          )}
        </div>
      </details>
    </>
  );
}
