// scripts/trace.mjs
// ─────────────────────────────────────────────────────────────────────────────
// One identifier traced through every stage of the pipeline.  npm run trace
//
// WHY THIS EXISTS
// The worked examples in the thesis begin with clean records: "a user whose
// email appears in three dated breaches". That is where the arithmetic starts,
// but it is not where the data starts. Between a provider's reply and that
// tidy list there are four transformations, and each can change the score:
//
//   1  five providers answer in five different shapes
//   2  the same breach, named differently, is merged into one record
//   3  missing dates are resolved against the catalogue, or refused
//   4  data-class strings are mapped to the attributes the model weights
//
// This script runs a representative provider response set through the REAL
// library functions and prints what each stage produced, so the thesis can show
// the aggregation instead of asserting it.
//
// The input is constructed rather than live, because a live trace would publish
// somebody's actual breach history. The shapes and the naming inconsistencies
// are taken from genuine provider output.
// ─────────────────────────────────────────────────────────────────────────────

import { mergeBreaches, baseName } from "../lib/sources.js";
import { enrichFromCatalogue } from "../lib/enrich.js";
import { emailReport, attributesOf } from "../lib/score.js";

const line = (c = "-") => console.log(c.repeat(78));

// ── stage 1: what each provider returns ─────────────────────────────────────
// Four providers, four shapes, describing an overlapping set of three breaches.
const fromHIBP = [
  { name: "Adobe", title: "Adobe", key: baseName("Adobe"), date: "2013-10-04",
    dataClasses: ["Email addresses", "Password hints", "Passwords", "Usernames"], sources: ["HIBP"] },
  { name: "LinkedIn", title: "LinkedIn", key: baseName("LinkedIn"), date: "2012-05-05",
    dataClasses: ["Email addresses", "Passwords"], sources: ["HIBP"] },
];
const fromLeakCheck = [
  // same Adobe breach, different spelling, month-precision date
  { name: "adobe.com", title: "adobe.com", key: baseName("adobe.com"), date: "2013-10-01",
    dataClasses: ["Email addresses", "Passwords"], sources: ["LeakCheck"] },
  // a breach HIBP did not report, with no date at all
  { name: "Collection #1 combo list", title: "Collection #1 combo list", key: baseName("Collection #1 combo list"), date: null,
    dataClasses: ["Email addresses", "Passwords"], sources: ["LeakCheck"] },
];
const fromXposed = [
  // the LinkedIn breach again, named as a dump, no date
  { name: "LinkedIn Dump 2016", title: "LinkedIn Dump 2016", key: baseName("LinkedIn Dump 2016"), date: null,
    dataClasses: ["Email addresses", "Passwords"], sources: ["XposedOrNot"] },
];
const fromHudson = [
  // a stealer-log record carrying identity data, undated
  { name: "Stealer Log", title: "Stealer Log", key: baseName("Stealer Log"), date: null,
    dataClasses: ["Email addresses", "Phone numbers", "Physical addresses", "Dates of birth"], sources: ["Hudson Rock"] },
];

console.log("=".repeat(78));
console.log("PIPELINE TRACE: FROM PROVIDER REPLIES TO A SCORE");
console.log("=".repeat(78));

console.log("\nSTAGE 1 — what the providers returned");
line();
const inputs = [["HIBP", fromHIBP], ["LeakCheck", fromLeakCheck],
                ["XposedOrNot", fromXposed], ["Hudson Rock", fromHudson]];
let raw = 0;
for (const [who, rows] of inputs) {
  for (const r of rows) {
    raw++;
    console.log(`  ${who.padEnd(13)} ${(r.name || "").padEnd(26)} ${(r.date || "no date").padEnd(11)} ` +
                `${r.dataClasses.length} classes`);
  }
}
console.log(`\n  ${raw} records from 4 providers. Three of them describe breaches already`);
console.log(`  named by another provider, under a different spelling.`);

// ── stage 2: merge ──────────────────────────────────────────────────────────
console.log("\nSTAGE 2 — normalise the name, then merge");
line();
for (const [, rows] of inputs) {
  for (const r of rows) {
    console.log(`  ${(r.name || "").padEnd(28)} ->  ${baseName(r.name)}`);
  }
}
const merged = mergeBreaches(fromHIBP, fromLeakCheck, fromXposed, fromHudson);
console.log(`\n  ${raw} records collapse to ${merged.length}. Where two providers disagreed about a`);
console.log(`  date, the dated record wins, so a month-precision date never overwrites a`);
console.log(`  precise one.`);
for (const b of merged) {
  console.log(`    ${(b.title || b.name).padEnd(30)} ${(b.date || "no date").padEnd(11)} ` +
              `[${(b.sources || []).join(", ")}]`);
}

// ── stage 3: enrich ─────────────────────────────────────────────────────────
console.log("\nSTAGE 3 — resolve missing dates against the catalogue");
line();
const { breaches: enriched, datesResolved, flagged, ambiguousNames } = enrichFromCatalogue(merged);
for (const b of enriched) {
  const src = b.dateSource === "catalogue" ? "  <- from catalogue"
            : b.dateSource === "ambiguous" ? "  <- refused, name is ambiguous"
            : "";
  console.log(`    ${(b.title || b.name).padEnd(30)} ${(b.date || "no date").padEnd(11)}${src}`);
  if (b.flags && b.flags.length) console.log(`      flags: ${b.flags.join(", ")}`);
}
console.log(`\n  dates resolved ${datesResolved}  ·  records flagged ${flagged}  ·  names refused ${ambiguousNames || 0}`);

// ── stage 4: data classes become weighted attributes ────────────────────────
console.log("\nSTAGE 4 — map data-class strings to the attributes the model weights");
line();
for (const b of enriched) {
  const attrs = [...attributesOf(b.dataClasses || [])];
  console.log(`    ${(b.title || b.name).padEnd(30)} ${attrs.join(", ") || "(none recognised)"}`);
}

// ── stage 5: score ──────────────────────────────────────────────────────────
console.log("\nSTAGE 5 — the two clocks, and the score");
line();
const rep = emailReport(enriched, new Date(), "email");
console.log(`    credential term (fast clock, decays)     ${rep.credRaw.toFixed(4)}`);
console.log(`    identity term   (slow clock, no decay)   ${rep.identity.toFixed(4)}`);
console.log(`      over the union of: ${rep.identityAttrs.join(", ")}`);
console.log(`    combined raw                             ${rep.raw.toFixed(4)}`);
console.log(`    score                                    ${rep.score}  (${rep.level})`);

console.log("\n  Per-record contribution to the fast clock:");
for (const b of rep.breaches) {
  console.log(`    ${(b.title || b.name || "").padEnd(30)} ${(b.contribution ?? 0).toFixed(4)}`);
}

console.log();
console.log("=".repeat(78));
console.log("Reproduce: npm run trace   (deterministic, no network, no credentials)");
console.log("=".repeat(78));
