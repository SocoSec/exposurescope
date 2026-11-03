// scripts/undated-scenarios.mjs
// ─────────────────────────────────────────────────────────────────────────────
// What happens when a breach has no date?
//
//   npm run undated
//
// A date is missing far more often than people assume. DeHashed returns none
// at all, LeakCheck returns month precision, XposedOrNot returns names only,
// and combination lists have no meaningful date even in principle. The model
// therefore has to say what it does in that case, and the honest answer has
// three parts, which this script separates:
//
//   1. the pipeline tries to RECOVER the date before assuming anything
//   2. the fast clock falls back to a stated assumption, UNDATED_AGE_DAYS
//   3. the slow clock does not use dates at all, so it is unaffected
//
// The third point is why the two-clock revision mattered beyond the headline
// result: it removed half the score from the reach of the assumption.
// ─────────────────────────────────────────────────────────────────────────────

import { emailReport, DECAY_PER_DAY, UNDATED_AGE_DAYS, B_MAX } from "../lib/score.js";
import { enrichFromCatalogue } from "../lib/enrich.js";

const NOW = new Date("2026-10-28");
const recency = (days) => Math.exp(-DECAY_PER_DAY * days);
const pts = (raw) => ((raw / B_MAX) * 100).toFixed(1);

console.log("");
console.log("UNDATED BREACHES — WHAT THE MODEL DOES");
console.log("=".repeat(78));

// ── 1 ────────────────────────────────────────────────────────────────────────
console.log("");
console.log("1. THE ORDER OF PREFERENCE: A DATE IS ASSUMED ONLY AS A LAST RESORT");
console.log("-".repeat(78));
const ladder = [
  ["provider gives an exact date", "HIBP", "used as given"],
  ["provider gives month precision", "LeakCheck", "first of that month"],
  ["provider gives no date, catalogue knows the breach", "XposedOrNot, DeHashed", "recovered from the bundled catalogue"],
  ["no date anywhere", "combination lists", "assumed: " + UNDATED_AGE_DAYS + " days"],
];
for (const [situation, who, outcome] of ladder) {
  console.log("   " + situation.padEnd(52) + outcome);
  console.log("      " + who);
}
// Keys are omitted so the lookup falls back to the title, exactly as the live
// pipeline does when a provider supplies only a name.
const probe = enrichFromCatalogue([
  { title: "Collection #1", date: null, dataClasses: [], sources: ["XposedOrNot"] },
  { title: "LinkedIn", date: null, dataClasses: [], sources: ["XposedOrNot"] },
  { title: "Adobe", date: null, dataClasses: [], sources: ["XposedOrNot"] },
  { title: "Some private combolist", date: null, dataClasses: [], sources: ["LeakCheck"] },
]);
console.log("");
console.log("   worked example, three undated records in:");
for (const b of probe.breaches) {
  console.log("      " + String(b.title).padEnd(24) + (b.date ? "recovered " + b.date : "still undated -> assumption applies"));
}

// ── 2 ────────────────────────────────────────────────────────────────────────
console.log("");
console.log("2. WHAT THE ASSUMPTION IS WORTH ON THE FAST CLOCK");
console.log("-".repeat(78));
console.log("   A credential breach keeps severity x e^(-lambda*age). At the assumed age:");
console.log("");
console.log("   assumed age   recency   a 0.7 credential breach contributes");
for (const d of [180, 365, UNDATED_AGE_DAYS, 1460, 2920]) {
  const mark = d === UNDATED_AGE_DAYS ? "  <- current" : "";
  console.log("   " + (d + "d").padStart(9) + "     " + recency(d).toFixed(4) +
    "    " + pts(0.7 * recency(d)).padStart(5) + " points" + mark);
}
console.log("");
console.log("   So the choice spans " + pts(0.7 * recency(180)) + " points down to " +
  pts(0.7 * recency(2920)) + " points for the SAME record.");
console.log("   That range is why the assumption is stated in the interface rather than hidden.");

// ── 3 ────────────────────────────────────────────────────────────────────────
console.log("");
console.log("3. THE SLOW CLOCK IGNORES DATES ENTIRELY");
console.log("-".repeat(78));
const identityOnly = [{ title: "Undated registry leak", date: null, sources: ["DeHashed"], flags: [],
  dataClasses: ["Email addresses", "Names", "Dates of birth", "Physical addresses", "Nationalities"] }];
const r = emailReport(identityOnly, NOW);
console.log("   An undated record exposing name, date of birth, address and nationality:");
console.log("      credential half : " + r.credRaw.toFixed(4) + "  (" + pts(r.credRaw) + " points)");
console.log("      permanent half  : " + r.identityRaw.toFixed(4) + "  (" + pts(r.identityRaw) + " points)");
console.log("      score           : " + r.score + "  (" + r.level + ")");
console.log("");
console.log("   The score is entirely permanent, and no date assumption touched it.");
console.log("   Under the previous single-clock model the same record would have been");
console.log("   discounted by the assumed age like everything else, and would have");
console.log("   scored close to nothing.");

// ── 4 ────────────────────────────────────────────────────────────────────────
console.log("");
console.log("4. THE FOUR CASES, SIDE BY SIDE");
console.log("-".repeat(78));
const cases = [
  ["dated, credentials only", [{ title: "A", date: "2025-06-01", dataClasses: ["Email addresses", "Passwords"], sources: ["HIBP"], flags: [] }]],
  ["UNDATED, credentials only", [{ title: "A", date: null, dataClasses: ["Email addresses", "Passwords"], sources: ["HIBP"], flags: [] }]],
  ["dated, identity only", [{ title: "A", date: "2025-06-01", dataClasses: ["Email addresses", "Names", "Dates of birth"], sources: ["HIBP"], flags: [] }]],
  ["UNDATED, identity only", [{ title: "A", date: null, dataClasses: ["Email addresses", "Names", "Dates of birth"], sources: ["HIBP"], flags: [] }]],
];
console.log("   case                          score   fades   permanent");
for (const [label, recs] of cases) {
  const rep = emailReport(recs, NOW);
  console.log("   " + label.padEnd(28) + String(rep.score).padStart(4) + "    " +
    pts(rep.credRaw).padStart(5) + "    " + pts(rep.identityRaw).padStart(5));
}
console.log("");
console.log("   Reading: losing the date costs the credential half most of its weight,");
console.log("   and costs the permanent half nothing. A record whose damage is permanent");
console.log("   is therefore scored correctly even when nobody knows when it happened,");
console.log("   which is the common case for the sources that supply no dates.");

console.log("");
console.log("=".repeat(78));
console.log("Reproduce: npm run undated");
console.log("");
