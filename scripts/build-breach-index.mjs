// scripts/build-breach-index.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Builds lib/breach-index.json from Have I Been Pwned's public breach
// catalogue, and audits lib/score.js against their data-class vocabulary.
//
//   npm run build:index
//
// Two endpoints, neither of which needs an API key:
//   GET /api/v3/breaches      the full catalogue (~1,050 breaches, all dated)
//   GET /api/v3/dataclasses   every data-class string HIBP uses
//
// WHY A SNAPSHOT RATHER THAN A LIVE CALL
// The catalogue is ~1.1 MB and identical for every user. Fetching it per scan
// would add a megabyte and a round trip to a request that must stay fast, and
// the API routes run on the edge runtime with no disk to cache it on. It
// changes when a breach is added, which is a deploy-time concern, not a
// request-time one.
//
// WHAT THE INDEX IS FOR
// Only two things, and deliberately not a third:
//   • dates   — a breach happened when it happened, whoever is in it. Sources
//               that return no date (DeHashed) or a coarse one can be resolved
//               against curated data. This is the model's most consequential
//               free parameter (sensitivity analysis, section 5).
//   • flags   — HIBP marks some records fabricated, spam lists or retired.
//               Scoring those identically to verified breaches overstates risk.
//
// NOT data classes. HIBP reports which classes a BREACH exposed; for a record
// found by another provider we observed which fields THAT RECORD held. Copying
// the catalogue's classes onto it would turn an observation into an inference
// and inflate the identity union. Dates do not have that problem.
//
// Attribution: breach data is Have I Been Pwned's, CC BY 4.0.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { baseName } from "../lib/sources.js";
import { ATTRIBUTES, attributesOf } from "../lib/score.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = { "user-agent": "Exposio-Research-SelfAssessment" };

async function getJSON(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(url + " -> HTTP " + res.status);
  return res.json();
}

console.log("fetching the HIBP catalogue (no API key required) ...");
const [catalogue, vocabulary] = await Promise.all([
  getJSON("https://haveibeenpwned.com/api/v3/breaches"),
  getJSON("https://haveibeenpwned.com/api/v3/dataclasses"),
]);
console.log("  breaches: " + catalogue.length + "   data classes: " + vocabulary.length);

// ── the index ────────────────────────────────────────────────────────────────
// Keyed by baseName() so lookups use the same normalisation as mergeBreaches:
// "LinkedIn", "linkedin.com" and "LinkedIn Dump 2016" all collapse to "linkedin".
//
// Collisions are real: "Chess.com (2023)" and "Chess.com (2026)" both reduce
// to "chess", because the normaliser strips years in order to match the way
// providers append them.
//
// This previously kept the EARLIER date, on the reasoning that treating an
// exposure as older under-states the score and under-stating is the safer
// error. Under the two-clock model of section 5.8 that reasoning inverts. The
// fast clock exists to say whether a leaked credential is still likely live, so
// dating a 2026 credential breach to 2023 discounts a current password leak as
// historical — which is the dangerous direction, not the safe one.
//
// A key that maps to breaches with DIFFERENT dates is therefore marked
// ambiguous and carries no date at all. The record then falls through to
// UNDATED_AGE_DAYS and is flagged as resting on that assumption, which is
// honest, whereas a confidently wrong date is not. Refusing to guess costs a
// date on a handful of keys; guessing wrong mis-scores silently.
// Two maps, consulted in order, because the two failure modes pull in opposite
// directions. The fuzzy key has to be aggressive enough to match the mangled
// spellings providers emit ("Adobe combo list 2013"), and that same aggression
// merges distinct breaches ("LinkedIn" with "LinkedIn Scraped Data (2021)").
//
//   exact   lowercase, alphanumerics only. No year or filler stripping, so
//           "LinkedIn" and "LinkedIn Scraped Data (2021)" stay separate and a
//           provider quoting a canonical name gets the right breach.
//   fuzzy   baseName(), for provider strings that no exact key will match.
//           Keys that merge breaches with different dates are marked ambiguous
//           and carry no date.
//
// A bare "LinkedIn" therefore resolves exactly and keeps its 2012 date, while
// only genuinely unidentifiable strings fall through to the ambiguous path.
const exact = {};
const index = {};
let collisions = 0;
let ambiguous = 0;

const strictName = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

// Each map gets its OWN copy of the entry. They share a source object, and the
// ambiguity marking below mutates it: without the copy, a fuzzy-key collision
// would strip the date from the exact entry as well, which is how "LinkedIn"
// and "Chess.com (2023)" silently lost their dates the first time.
function addExact(key, entry) {
  if (!key) return;
  const existing = exact[key];
  if (!existing) { exact[key] = { ...entry }; return; }
  if (existing.d === entry.d) return;
  if (!existing.a) { existing.a = 1; }
  delete existing.d;
}

function add(key, entry) {
  if (!key) return;
  const existing = index[key];
  if (!existing) { index[key] = { ...entry }; return; }
  collisions++;

  // Same breach reached by two aliases (Name, Title and Domain all normalise
  // alike) — not a conflict, nothing to decide.
  if (existing.d === entry.d) return;

  if (!existing.a) { ambiguous++; existing.a = 1; }
  delete existing.d;
}

for (const b of catalogue) {
  const flags =
    (b.IsVerified ? "" : "u") +      // unverified
    (b.IsFabricated ? "f" : "") +    // fabricated
    (b.IsSpamList ? "s" : "") +      // spam list, not a breach
    (b.IsRetired ? "r" : "") +       // retired from the system
    (b.IsMalware ? "m" : "") +       // malware-sourced
    (b.IsStealerLog ? "l" : "");     // infostealer log
  const entry = { d: b.BreachDate || null, t: b.Title || b.Name };
  if (flags) entry.x = flags;
  for (const alias of [b.Name, b.Title, b.Domain]) {
    addExact(strictName(alias || ""), entry);
    add(baseName(alias || ""), entry);
  }
}

const dated = Object.values(index).filter((e) => e.d).length;
const datedExact = Object.values(exact).filter((e) => e.d).length;
console.log("  exact keys: " + Object.keys(exact).length + " (" + datedExact + " dated)");
console.log("  fuzzy keys: " + Object.keys(index).length + " (" + dated + " dated, "
  + collisions + " alias collisions, " + ambiguous + " keys left undated as ambiguous)");

writeFileSync(
  join(ROOT, "lib", "breach-index.json"),
  JSON.stringify({
    source: "Have I Been Pwned, https://haveibeenpwned.com (CC BY 4.0)",
    built: new Date().toISOString().slice(0, 10),
    breaches: catalogue.length,
    exact,
    index,
  }) + "\n",
);
console.log("  wrote lib/breach-index.json");

// ── the audit ────────────────────────────────────────────────────────────────
// Every class HIBP can emit that ATTRIBUTES cannot read scores as nothing.
// This is how the "Government issued IDs" gap was found.
const usage = new Map();
for (const b of catalogue) for (const dc of b.DataClasses || []) usage.set(dc, (usage.get(dc) || 0) + 1);

const unmatched = vocabulary
  .filter((dc) => attributesOf([dc]).size === 0)
  .map((dc) => [dc, usage.get(dc) || 0])
  .sort((a, b) => b[1] - a[1]);

const permanentLooking = unmatched.filter(([dc]) =>
  /name|birth|gender|nationalit|ethnic|citizen|government|passport|social security|marital|famil|spouse|place|security question/i.test(dc));

console.log("\nATTRIBUTES audit");
console.log("  vocabulary: " + vocabulary.length + "   matched: " + (vocabulary.length - unmatched.length) + "   unmatched: " + unmatched.length);
console.log("  unmatched classes that look like PERMANENT identity attributes:");
if (permanentLooking.length === 0) console.log("    (none)");
for (const [dc, n] of permanentLooking) console.log("    " + String(n).padStart(4) + "  " + dc);
console.log("\n  Most unmatched classes are correctly ignored (Purchases, Job titles,");
console.log("  Website activity). Review the list above when the vocabulary changes.");
console.log("  ATTRIBUTES patterns in lib/score.js: " + ATTRIBUTES.length);
