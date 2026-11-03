// scripts/confidence-effect.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Does weighting records by how much they deserve to be believed change the
// answer, and by how much?
//
//   npm run confidence
//
// The question is reliability, not severity. The scoring model already uses
// every source; what it ignored was whether a record is corroborated and
// whether the curator has flagged it. This script measures the consequence of
// no longer ignoring that, over a synthetic corpus.
//
// WHAT IS MEASURED AND WHAT IS ASSUMED. The flag rates are not invented: they
// are counted directly from the bundled catalogue of 1,047 distinct breaches,
// so the proportion of records attracting a penalty reflects the real corpus.
// The source multiplicity is an assumption, because no public dataset records
// how often independent breach providers report the same incident — that is
// exactly the measurement the inter-source agreement study would supply, and
// until it exists this figure is a projection rather than an observation.
// It is swept below for that reason.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { emailReport, bandFor } from "../lib/score.js";

const N = 2000;
const SEED = 20261028;
const NOW = new Date("2026-10-28");

// ---- deterministic generator ------------------------------------------------
let seed = SEED;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

// ---- measured flag rates ----------------------------------------------------
const catalogue = JSON.parse(readFileSync(new URL("../lib/breach-index.json", import.meta.url)));
const distinct = new Map();
for (const key of Object.keys(catalogue.index)) {
  const e = catalogue.index[key];
  distinct.set(e.t, e);
}
const LETTER = { u: "unverified", f: "fabricated", s: "spam-list", r: "retired", m: "malware", l: "stealer-log" };
const flagCount = {};
for (const e of distinct.values()) {
  for (const ch of e.x || "") flagCount[LETTER[ch]] = (flagCount[LETTER[ch]] || 0) + 1;
}
const total = distinct.size;
const FLAG_RATE = Object.fromEntries(Object.entries(flagCount).map(([k, v]) => [k, v / total]));

// ---- corpus -----------------------------------------------------------------
const CLASSES = [
  ["Email addresses", 1.0], ["Passwords", 0.28], ["Phone numbers", 0.39],
  ["Physical addresses", 0.14], ["Credit cards", 0.04], ["Names", 0.52],
  ["Dates of birth", 0.17], ["Genders", 0.11], ["Geographic locations", 0.09],
  ["Nationalities", 0.06], ["National IDs", 0.02],
];
const PROVIDERS = ["HIBP", "LeakCheck", "XposedOrNot", "Hudson Rock", "DeHashed"];

function makeSources(pHibp, pExtra) {
  const out = [];
  if (rnd() < pHibp) out.push("HIBP");
  for (const p of PROVIDERS.slice(1)) if (rnd() < pExtra) out.push(p);
  if (out.length === 0) out.push(PROVIDERS[1 + Math.floor(rnd() * 4)]);
  return out;
}

function makeCorpus(pHibp, pExtra) {
  const people = [];
  for (let i = 0; i < N; i++) {
    const n = Math.min(25, 1 + Math.floor(-Math.log(1 - rnd()) * 3));
    const recs = [];
    for (let j = 0; j < n; j++) {
      const dataClasses = CLASSES.filter(([, p]) => rnd() < p).map(([c]) => c);
      if (!dataClasses.length) dataClasses.push("Email addresses");
      const undated = rnd() < 0.18;
      const year = 2007 + Math.floor(rnd() * 19);
      const flags = [];
      for (const [name, rate] of Object.entries(FLAG_RATE)) if (rnd() < rate) flags.push(name);
      recs.push({
        title: "b" + i + "_" + j,
        date: undated ? null : year + "-06-15",
        dataClasses,
        sources: makeSources(pHibp, pExtra),
        flags,
      });
    }
    people.push(recs);
  }
  return people;
}

// ---- statistics -------------------------------------------------------------
function ranks(xs) {
  const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
}
function spearman(a, b) {
  const ra = ranks(a), rb = ranks(b);
  const n = a.length;
  const ma = ra.reduce((s, v) => s + v, 0) / n, mb = rb.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const x = ra[i] - ma, y = rb[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  return num / Math.sqrt(da * db);
}
const mean = (xs) => xs.reduce((s, v) => s + v, 0) / xs.length;

// ---- run --------------------------------------------------------------------
console.log("");
console.log("SOURCE CONFIDENCE — EFFECT ON THE SCORE");
console.log("=".repeat(78));
console.log("Corpus: " + N + " synthetic identities, seed " + SEED + ", reference date 2026-10-28");
console.log("");
console.log("1. FLAG RATES, COUNTED FROM THE BUNDLED CATALOGUE");
console.log("-".repeat(78));
console.log("   distinct breaches: " + total);
for (const [k, v] of Object.entries(FLAG_RATE).sort((a, b) => b[1] - a[1])) {
  const penalised = k !== "malware" && k !== "stealer-log";
  console.log("   " + k.padEnd(13) + (100 * v).toFixed(2).padStart(5) + "%   " +
    (penalised ? "penalised" : "NOT penalised (severity, not doubt)"));
}
const penalisedRate = Object.entries(FLAG_RATE)
  .filter(([k]) => k !== "malware" && k !== "stealer-log")
  .reduce((s, [, v]) => s + v, 0);
console.log("");
console.log("   records attracting any penalty: " + (100 * penalisedRate).toFixed(2) + "%");
console.log("   This bounds the effect: the weighting cannot move what it never touches.");

console.log("");
console.log("2. EFFECT AT THE DEFAULT SOURCE MULTIPLICITY");
console.log("-".repeat(78));
const corpus = makeCorpus(0.55, 0.35);
const off = corpus.map((r) => emailReport(r, NOW).score);
const on = corpus.map((r) => emailReport(r, NOW, "email", { useConfidence: true }).score);
const sameBand = corpus.filter((_, i) => bandFor(off[i], off[i] > 0) === bandFor(on[i], on[i] > 0)).length;
const moved = corpus.filter((_, i) => off[i] !== on[i]).length;
console.log("   mean score, weighting off: " + mean(off).toFixed(1));
console.log("   mean score, weighting on:  " + mean(on).toFixed(1));
console.log("   Spearman rho between them: " + spearman(off, on).toFixed(3));
console.log("   identities whose score changed at all: " + (100 * moved / N).toFixed(1) + "%");
console.log("   identities whose BAND is unchanged:    " + (100 * sameBand / N).toFixed(1) + "%");

console.log("");
console.log("3. SENSITIVITY TO THE SOURCE-MULTIPLICITY ASSUMPTION");
console.log("-".repeat(78));
console.log("   p(HIBP)  p(other)   mean off   mean on    rho     band unchanged");
for (const [ph, pe] of [[0.3, 0.2], [0.55, 0.35], [0.8, 0.5], [0.95, 0.7]]) {
  seed = SEED;
  const c = makeCorpus(ph, pe);
  const a = c.map((r) => emailReport(r, NOW).score);
  const b = c.map((r) => emailReport(r, NOW, "email", { useConfidence: true }).score);
  const sb = c.filter((_, i) => bandFor(a[i], a[i] > 0) === bandFor(b[i], b[i] > 0)).length;
  console.log("   " + ph.toFixed(2).padStart(5) + "    " + pe.toFixed(2).padStart(5) + "     " +
    mean(a).toFixed(1).padStart(6) + "     " + mean(b).toFixed(1).padStart(6) + "   " +
    spearman(a, b).toFixed(3) + "        " + (100 * sb / N).toFixed(1) + "%");
}

console.log("");
console.log("   Reading: the weighting lowers scores, never raises them, and leaves the");
console.log("   ordering largely intact. Its value is therefore not a different ranking");
console.log("   but a defensible one: a fabricated or uncorroborated record no longer");
console.log("   counts as heavily as a verified, corroborated one. The size of the effect");
console.log("   depends on how often providers corroborate each other, which has not yet");
console.log("   been measured and is swept above rather than assumed.");
console.log("");
console.log("=".repeat(78));
console.log("Reproduce: npm run confidence   (deterministic, seed " + SEED + ")");
console.log("");
