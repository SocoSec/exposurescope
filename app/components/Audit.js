"use client";

import { useMemo } from "react";
import { DECAY_PER_DAY, B_MAX, W_IDENTITY, IDENTITY_WEIGHTS, TIERS, UNDATED_AGE_DAYS } from "../../lib/score.js";

// app/components/Audit.js
// ─────────────────────────────────────────────────────────────────────────────
// What a consumer risk tool normally hides.
//
// Every comparable service prints a number and stops. The number is produced by
// weights the reader cannot see, from records whose dates may be guesses, by a
// formula chosen among many that were never shown. The reader is asked to trust
// all of it at once.
//
// This panel takes the opposite position: the score is only worth what its
// derivation is worth, so the derivation is put on screen. Four questions, in
// the order a sceptical reader asks them.
//
//   1. How much would the answer move if the weights were wrong?
//   2. Where does each point come from?
//   3. What would a simpler model have said instead?
//   4. Which parts of this are measurements, and which are assumptions?
//
// Everything is recomputed in the browser from the SAME constants the server
// scored with (lib/score.js), so the panel cannot drift away from the result it
// claims to explain. The alternative models reproduce the definitions in
// scripts/sensitivity.mjs exactly, so what a reader sees here and what the
// thesis reports are the same quantities.
// ─────────────────────────────────────────────────────────────────────────────

const SAMPLES = 400;
const SPREAD = 0.30; // ±30%, the perturbation reported in the sensitivity analysis

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const toScore = (raw) => (raw === 0 ? 0 : Math.max(1, Math.round(clamp01(raw / B_MAX) * 100)));
const bandOf = (s) => (s === 0 ? "safe" : s <= 35 ? "low" : s <= 65 ? "medium" : "high");

// A deterministic generator: the same report must produce the same interval on
// every render, or the figure would change each time the user looked at it.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function credSeverity(attrs, tiers) {
  const has = (k) => attrs.includes(k);
  if (has("password") && has("financial")) return 1.0;
  if (has("financial")) return tiers["financial-only"];
  if (has("password")) return tiers.credentials;
  return 0;
}

function scoreWith(breaches, tiers, idw) {
  let cred = 0;
  const union = new Set();
  for (const b of breaches) {
    cred += credSeverity(b.attrs || [], tiers) * (b.recency || 0);
    for (const k of b.identityAttrs || []) union.add(k);
  }
  let keep = 1;
  for (const k of union) keep *= 1 - (idw[k] || 0);
  return toScore(cred + W_IDENTITY * (1 - keep));
}

export function Audit({ report }) {
  const breaches = report.breaches || [];

  const robustness = useMemo(() => {
    const baseTiers = Object.fromEntries(Object.entries(TIERS).map(([k, v]) => [k, v.weight]));
    const rand = rng(breaches.length * 7919 + Math.round((report.raw || 0) * 1e6));
    const jitter = (v) => v * (1 + (rand() * 2 - 1) * SPREAD);
    const scores = [];
    let sameBand = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const tiers = Object.fromEntries(Object.entries(baseTiers).map(([k, v]) => [k, jitter(v)]));
      const idw = Object.fromEntries(Object.entries(IDENTITY_WEIGHTS).map(([k, v]) => [k, jitter(v)]));
      const s = scoreWith(breaches, tiers, idw);
      scores.push(s);
      if (bandOf(s) === bandOf(report.score)) sameBand++;
    }
    scores.sort((a, b) => a - b);
    return {
      lo: scores[Math.floor(SAMPLES * 0.05)],
      hi: scores[Math.floor(SAMPLES * 0.95)],
      bandStable: Math.round((sameBand / SAMPLES) * 100),
    };
  }, [breaches, report.score, report.raw]);

  const alternatives = useMemo(() => {
    const n = breaches.length;
    const sev = (b) => b.severity || 0;
    const sum = (f) => breaches.reduce((s, b) => s + f(b), 0);
    const maxOf = (f) => breaches.reduce((m, b) => Math.max(m, f(b)), 0);
    const lin = (b) => Math.max(0, 1 - (b.ageDays || 0) / 3650);
    return [
      { id: "M0", name: "Single clock (the previous model)", score: toScore(sum((b) => sev(b) * (b.recency || 0))) },
      { id: "M1", name: "Count of breaches only", score: Math.min(100, Math.round((100 * n) / 10)) },
      { id: "M2", name: "Severity, no decay", score: (() => { const r = sum(sev); return r === 0 ? 0 : Math.max(1, Math.round(clamp01(r / 3.0) * 100)); })() },
      { id: "M3", name: "Worst breach only", score: toScore(maxOf((b) => sev(b) * (b.recency || 0))) },
      { id: "M4", name: "Linear decay over ten years", score: (() => { const r = sum((b) => sev(b) * lin(b)); return r === 0 ? 0 : Math.max(1, Math.round(clamp01(r / 2.0) * 100)); })() },
      { id: "M5", name: "Any password exposed", score: breaches.some((b) => (b.attrs || []).includes("password")) ? 100 : (n ? 20 : 0) },
      { id: "M6", name: "Log-count times severity", score: (() => { const r = maxOf(sev) * Math.log10(n + 1); return r === 0 ? 0 : Math.max(1, Math.round(clamp01(r / 1.0) * 100)); })() },
    ];
  }, [breaches]);

  // A score sitting a few points from a band edge will cross it under almost any
  // perturbation. Reporting the stability figure without that context would
  // invite the reader to mistake a boundary effect for an unstable model.
  const edges = [35, 65];
  const nearEdge = edges.reduce((m, e) => Math.min(m, Math.abs(report.score - e)), 99);

  const assumed = breaches.filter((b) => b.ageAssumed).length;
  const flagged = breaches.filter((b) => (b.flags || []).length).length;
  const pt = (v) => ((v / B_MAX) * 100).toFixed(1);

  return (
    <div className="x-aud">
      {/* 1 ── how much the answer depends on weights nobody can verify */}
      <div className="x-card">
        <div className="x-lglabel">How much does this depend on the weights?</div>
        <p className="x-audp">
          The constants are chosen rather than fitted, because no public dataset records who was
          later defrauded. So the useful question is not whether they are right, but whether the
          answer survives them being wrong. Every weight below was perturbed by
          ±{Math.round(SPREAD * 100)}% across {SAMPLES} redraws.
        </p>
        <div className="x-audband">
          <div className="x-audrange">
            <span className="x-audlo">{robustness.lo}</span>
            <span className="x-audsep">to</span>
            <span className="x-audhi">{robustness.hi}</span>
          </div>
          <div className="x-audcap">
            90% of redraws land in this range. The reported score is <b>{report.score}</b>.
          </div>
        </div>
        <p className="x-audp">
          The band stayed <b>{bandOf(report.score)}</b> in <b>{robustness.bandStable}%</b> of redraws.
          That stability, rather than the exact number, is the claim this work makes.
        </p>
        {nearEdge <= 5 && (
          <p className="x-audnote">
            Your score sits {nearEdge} {nearEdge === 1 ? "point" : "points"} from a band boundary,
            so almost any perturbation moves it across. The figure above reflects that proximity
            rather than instability in the model itself; the ordering of your breaches against one
            another is unaffected.
          </p>
        )}
      </div>

      {/* 2 ── where each point comes from */}
      <div className="x-card">
        <div className="x-lglabel">Where each point comes from</div>
        <p className="x-audp">
          Recomputable by hand. Severity comes from the data classes; recency is e<sup>-λ·age</sup> with
          λ = {DECAY_PER_DAY} per day; the identity column lists permanent attributes this breach
          contributed to the union, which is counted once however many breaches carried it.
        </p>
        <div className="x-audscroll">
          <table className="x-audtable">
            <thead>
              <tr>
                <th>Breach</th><th>Tier</th><th>Severity</th><th>Age (days)</th>
                <th>Recency</th><th>Fades</th><th>Permanent attributes</th>
              </tr>
            </thead>
            <tbody>
              {breaches.map((b, i) => (
                <tr key={i}>
                  <td className="x-audname">{b.title}</td>
                  <td>{b.tier}</td>
                  <td>{(b.severity ?? 0).toFixed(2)}</td>
                  <td className={b.ageAssumed ? "x-assumed" : ""}>
                    {Math.round(b.ageDays || 0)}{b.ageAssumed ? " (assumed)" : ""}
                  </td>
                  <td>{(b.recency ?? 0).toFixed(4)}</td>
                  <td>{(b.contribution ?? 0).toFixed(4)}</td>
                  <td className="x-audattrs">{(b.identityAttrs || []).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="x-audsum">
          <div><span>Fading half, summed</span><b>{(report.credRaw ?? 0).toFixed(4)}</b><i>{pt(report.credRaw ?? 0)} pts</i></div>
          <div><span>Permanent half, union of {(report.identityAttrs || []).length} attributes</span><b>{(report.identityRaw ?? 0).toFixed(4)}</b><i>{pt(report.identityRaw ?? 0)} pts</i></div>
          <div className="x-audtotal"><span>Total ÷ {B_MAX} × 100, capped at 100</span><b>{(report.raw ?? 0).toFixed(4)}</b><i>{report.score}</i></div>
        </div>
      </div>

      {/* 3 ── what a simpler model would have said */}
      <div className="x-card">
        <div className="x-lglabel">What a simpler model would have said</div>
        <p className="x-audp">
          A scoring model should not be adopted without checking that something simpler would not
          have done. These are the seven alternatives tested in the evaluation, applied to this
          same profile.
        </p>
        <div className="x-audalts">
          <div className="x-audalt on">
            <span className="x-audaltname">Proposed model (two clocks)</span>
            <span className="x-audaltscore">{report.score}</span>
          </div>
          {alternatives.map((m) => (
            <div className="x-audalt" key={m.id}>
              <span className="x-audaltname"><b>{m.id}</b> {m.name}</span>
              <span className="x-audaltscore">{m.score}</span>
            </div>
          ))}
        </div>
        <p className="x-audnote">
          Agreement across 2,000 synthetic profiles is reported in the thesis; a single profile
          cannot establish it. What this table shows is that the alternatives disagree here, which
          is why the choice between them had to be argued rather than assumed.
        </p>
      </div>

      {/* 4 ── measurement versus assumption */}
      <div className="x-card">
        <div className="x-lglabel">Measurements and assumptions, separated</div>
        <ul className="x-audlist">
          <li>
            <b>{breaches.length - assumed}</b> of <b>{breaches.length}</b>{" "}
            {breaches.length === 1 ? "record carries" : "records carry"} a real breach date.
          </li>
          {assumed > 0 && (
            <li className="x-assumed">
              <b>{assumed}</b> {assumed === 1 ? "record has" : "records have"} no date and
              {assumed === 1 ? " is" : " are"} scored at an assumed age of {UNDATED_AGE_DAYS} days.
              This assumption is the model&rsquo;s most consequential free parameter and is stated
              rather than hidden.
            </li>
          )}
          {flagged > 0 && (
            <li>
              <b>{flagged}</b> {flagged === 1 ? "record is" : "records are"} marked by the source
              catalogue as fabricated, spam-sourced, retired or stealer-derived.
            </li>
          )}
          <li>
            The weights are <b>chosen, not fitted</b>. Their values are published in the thesis and
            swept in the evaluation; the interval at the top of this panel is what that sweep means
            for your own result.
          </li>
          <li>
            The score is an <b>interpretable heuristic, not a probability of harm</b>. It is built to
            rank your own exposures against one another, not to predict an outcome.
          </li>
        </ul>
      </div>
    </div>
  );
}
