// scripts/clocks.mjs
// ─────────────────────────────────────────────────────────────────────────────
// What the slow clock sees that a single decay curve does not.
//
// Section 5.2 discounts every breach by one exponential. Section 5.8 argues
// that is a category error, because a password can be revoked and a date of
// birth cannot. The argument is easy to state and easy to doubt, so this
// script measures it: one profile, three real breaches, scored once a year by
// each model, with nothing changing between the two columns except which
// question the model asks about the same records.
//
// The deployed figures come from emailReport() in lib/score.js — the code the
// live service runs — so nothing here is a reimplementation. The comparison
// column is the single-clock formulation exactly as Section 5.2 defines it:
//   B = min(1, Σ_i sev(tier_i) · exp(−λ · age_i) / B_MAX) × 100
// with the tier weights of Table 3, which is the form this work started from.
//
//   node scripts/clocks.mjs
//
// Output feeds docs/figures/make_chart_clocks.py, which draws Figure 7.
// ─────────────────────────────────────────────────────────────────────────────

import {
  emailReport, attributesOf, tierOf, ageInDays, bandFor,
  TIERS, DECAY_PER_DAY, B_MAX, normalise,
} from "../lib/score.js";

// Three breaches that really happened, with the dates and data classes Have I
// Been Pwned publishes for them. They are chosen to be ordinary rather than
// extreme: two credential dumps and one marketing-data aggregation, which is
// the commonest shape a real profile takes.
const PROFILE = [
  {
    title: "LinkedIn",
    date: "2012-05-05",
    dataClasses: ["Email addresses", "Passwords"],
  },
  {
    title: "MyFitnessPal",
    date: "2018-02-01",
    dataClasses: ["Email addresses", "IP addresses", "Passwords", "Usernames"],
  },
  {
    // No password at all. Under one clock this record fades like the others;
    // under two it is the part that never fades.
    title: "Exactis",
    date: "2018-06-01",
    dataClasses: [
      "Dates of birth", "Email addresses", "Ethnicities", "Genders",
      "Marital statuses", "Names", "Phone numbers", "Physical addresses",
      "Religions", "Spoken languages",
    ],
  },
];

// The model of Section 5.2: one tier weight per breach, one decay curve.
function singleClock(breaches, now) {
  let raw = 0;
  for (const b of breaches) {
    const age = b.date ? ageInDays(b.date, now) : 730;
    raw += TIERS[tierOf(attributesOf(b.dataClasses))].weight * Math.exp(-DECAY_PER_DAY * age);
  }
  return normalise(raw, breaches.length > 0);
}

const years = [];
for (let y = 2019; y <= 2029; y++) years.push(y);

const rows = years.map((y) => {
  const now = new Date(Date.UTC(y, 10, 1));          // 1 November of each year
  const r = emailReport(PROFILE, now);
  const one = singleClock(PROFILE, now);
  const permShare = r.raw > 0 ? (r.identityRaw / r.raw) * 100 : 0;
  return { y, one, oneBand: bandFor(one, true), three: r.score, threeBand: r.level, permShare };
});

const pad = (s, n) => String(s).padStart(n);
console.log("year   single clock      three clocks     permanent share");
for (const r of rows) {
  console.log(`${r.y}   ${pad(r.one, 3)} ${r.oneBand.padEnd(10)}   ${pad(r.three, 3)} ${r.threeBand.padEnd(8)}  ${r.permShare.toFixed(0)}%`);
}

const gap = rows.find((r) => r.y === 2026);
console.log(`\nIn ${gap.y} the two models differ by ${gap.three - gap.one} points `
  + `(${gap.oneBand} against ${gap.threeBand}).`);
console.log("SINGLE = [" + rows.map((r) => r.one).join(", ") + "]");
console.log("THREE  = [" + rows.map((r) => r.three).join(", ") + "]");
console.log("PERM%  = [" + rows.map((r) => r.permShare.toFixed(0)).join(", ") + "]");
