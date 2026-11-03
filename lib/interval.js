// lib/interval.js
// ─────────────────────────────────────────────────────────────────────────────
// How much the score would move if every weight in the model were wrong.
//
// WHY THIS EXISTS
// Every weight in lib/score.js is chosen, not fitted. That is stated honestly
// throughout the thesis, and Section 5.5 shows the ORDERING of subjects is
// robust to perturbing them. But a reader is not shown a ranking; a user is
// shown a number. Reporting 63 as though it were exact, when its inputs are
// judgements, overstates what the model knows.
//
// So the score is reported with the interval it occupies when every severity
// tier and every identity weight is perturbed independently by up to ±30% —
// the same perturbation Section 5.5 reports. A subject is told not only their
// score but how much of it survives the possibility that the model is wrong.
//
// WHY IT LIVES HERE AND NOT IN THE INTERFACE
// It used to live in app/components/Audit.js, which reimplemented the severity
// function and the scorer in order to perturb them. Two implementations of one
// model drift, and a panel whose job is to explain the number is the worst
// place for a second opinion about it. scoreFromScored() in lib/score.js is now
// the single scorer, and assertion 4 of the self-test checks that it reproduces
// emailReport() exactly at default weights.
// ─────────────────────────────────────────────────────────────────────────────

import { TIERS, IDENTITY_WEIGHTS, scoreFromScored, bandFor } from "./score.js";

export const SPREAD = 0.30;   // ±30%, as reported in the sensitivity analysis
export const SAMPLES = 400;   // enough for a stable 5th/95th percentile
export const LO_Q = 0.05;
export const HI_Q = 0.95;

// A deterministic generator. The same report must yield the same interval on
// every render and in every run, or the figure would change each time anyone
// looked at it, and the thesis could not quote it.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function seedOf(report) {
  return (report.breaches?.length || 0) * 7919 + Math.round((report.raw || 0) * 1e6);
}

/**
 * Perturb every weight independently and report where the score lands.
 *
 * Returns { lo, hi, bandStable, samples, spread } where lo and hi are the 5th
 * and 95th percentile scores and bandStable is the percentage of draws that
 * kept the subject in the band their unperturbed score falls in.
 */
export function scoreInterval(report, { spread = SPREAD, samples = SAMPLES } = {}) {
  const scored = report.breaches || [];
  if (!scored.length || report.score === 0) {
    return { lo: report.score || 0, hi: report.score || 0, bandStable: 100, samples: 0, spread };
  }

  const baseTiers = Object.fromEntries(Object.entries(TIERS).map(([k, v]) => [k, v.weight]));
  const rand = rng(seedOf(report));
  const jitter = (v) => v * (1 + (rand() * 2 - 1) * spread);

  const scores = [];
  let sameBand = 0;
  for (let i = 0; i < samples; i++) {
    const tiers = Object.fromEntries(Object.entries(baseTiers).map(([k, v]) => [k, jitter(v)]));
    const idw = Object.fromEntries(Object.entries(IDENTITY_WEIGHTS).map(([k, v]) => [k, jitter(v)]));
    const s = scoreFromScored(scored, { tiers, identityWeights: idw });
    scores.push(s);
    if (bandFor(s, s > 0) === report.level) sameBand++;
  }
  scores.sort((a, b) => a - b);
  return {
    lo: scores[Math.floor(samples * LO_Q)],
    hi: scores[Math.floor(samples * HI_Q)],
    bandStable: Math.round((sameBand / samples) * 100),
    samples,
    spread,
  };
}
