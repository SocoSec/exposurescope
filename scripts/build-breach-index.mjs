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
// Collisions are real (two breaches can share a base name). The older date
// wins, because assuming an exposure is older under-states the fast clock, and
// under-stating is the safer error for a score that tells people how worried
// to be. Colliding entries are counted and reported.
const index = {};
let collisions = 0;

function add(key, entry) {
  if (!key) return;
  const existing = index[key];
  if (!existing) { index[key] = entry; return; }
  collisions++;
  if (entry.d && existing.d && entry.d < existing.d) index[key] = entry;
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
  for (const alias of [b.Name, b.Title, b.Domain]) add(baseName(alias || ""), entry);
}

const dated = Object.values(index).filter((e) => e.d).length;
console.log("  index keys: " + Object.keys(index).length + " (" + dated + " dated, " + collisions + " alias collisions)");

writeFileSync(
  join(ROOT, "lib", "breach-index.json"),
  JSON.stringify({
    source: "Have I Been Pwned, https://haveibeenpwned.com (CC BY 4.0)",
    built: new Date().toISOString().slice(0, 10),
    breaches: catalogue.length,
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
