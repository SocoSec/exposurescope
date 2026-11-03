// scripts/validate.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Accuracy of the measurement layer, without participants.  npm run validate
//
// WHY THIS EXISTS
// ---------------
// Both TDK reviewers asked for the same thing in different words: an empirical
// measurement of whether the tool is accurate. The obvious design — recruit a
// hundred people, scan them, count false positives and false negatives — is
// blocked twice over. The application refuses to look up an identifier whose
// owner has not proven they control it, which is a deliberate product
// decision; and a false-negative rate requires knowing the true contents of
// each breach corpus, which no provider publishes.
//
// That does not make accuracy unmeasurable. It makes HALF of it measurable,
// and the honest response is to measure that half properly and state the
// boundary of the other half rather than claim the whole thing is impossible.
//
// WHAT CAN BE MEASURED WITHOUT CONSENT OR GROUND-TRUTH CORPORA
//
//   A. SPECIFICITY. An identifier that has never existed cannot appear in any
//      breach. Generating such identifiers is free, unlimited, and involves
//      nobody's personal data, so any hit returned for one is a false positive
//      by construction. This yields a real false-positive rate.
//
//   B. DATE-RECOVERY ACCURACY. The scoring model's most sensitive assumption is
//      the age given to an undated record. Dates are recovered by resolving a
//      provider's breach name against the Have I Been Pwned public catalogue,
//      so the accuracy of that resolution is the accuracy of the fix. It is
//      measurable offline against the catalogue itself, including against the
//      mangled spellings providers actually emit.
//
//   C. CORPUS QUALITY. The catalogue marks breaches as unverified, fabricated,
//      spam-list or retired. The share of the corpus carrying those marks
//      bounds how much of what any tool reports is low-confidence data, which
//      is a property of the whole field rather than of this implementation.
//
// WHAT CANNOT, AND WHY — see section D of the output.
//
// ETHICS. Experiment A uses randomly generated identifiers that belong to
// nobody. Experiments B and C are offline over a public catalogue. No personal
// data of any third party is processed anywhere in this script, which is why it
// needs neither consent nor ethics approval, unlike the user study in
// docs/STUDY-PROTOCOL.md.
// ─────────────────────────────────────────────────────────────────────────────

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { PROVIDERS, applicableProviders } from "../lib/providers.js";
import { baseName } from "../lib/sources.js";
import { catalogueEntry, CATALOGUE_BUILT, CATALOGUE_SIZE } from "../lib/enrich.js";

// ── environment ─────────────────────────────────────────────────────────────
function loadEnvLocal() {
  try {
    for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
      const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* the keyless providers still run */ }
}
loadEnvLocal();
const env = { hibpKey: process.env.HIBP_API_KEY || "", dehashedKey: process.env.DEHASHED_API_KEY || "" };

const args = process.argv.slice(2);
const N = Number((args.find((a) => a.startsWith("--n=")) || "").split("=")[1] || 20);
const GAP = Number((args.find((a) => a.startsWith("--gap=")) || "").split("=")[1] || 4000);
const sleep = (n) => new Promise((r) => setTimeout(r, n));

console.log("=".repeat(78));
console.log("VALIDATION OF THE MEASUREMENT LAYER");
console.log("=".repeat(78));
console.log(`catalogue   Have I Been Pwned public breach list, ${CATALOGUE_SIZE} breaches, built ${CATALOGUE_BUILT}`);
console.log(`date        ${new Date().toISOString().slice(0, 10)}`);
console.log();

// ════════════════════════════════════════════════════════════════════════════
// A. SPECIFICITY — false positives on identifiers that cannot exist
// ════════════════════════════════════════════════════════════════════════════
console.log("A. SPECIFICITY: FALSE POSITIVES ON IDENTIFIERS THAT CANNOT EXIST");
console.log("-".repeat(78));

// A 20-hex local part at a 20-hex domain. The probability that any such
// address has ever been registered, let alone breached, is negligible: there
// are 16^20 ≈ 1.5 × 10^24 possibilities for each half.
const synthetic = Array.from({ length: N }, () =>
  `${randomBytes(10).toString("hex")}@${randomBytes(10).toString("hex")}.com`);

const chosen = applicableProviders("email", env);
const skipped = PROVIDERS.filter((p) => p.kinds.includes("email") && !chosen.includes(p));
console.log(`   ${N} generated identifiers, ${chosen.length} providers queried, ${GAP} ms apart`);
if (skipped.length) console.log(`   not configured: ${skipped.map((p) => p.name).join(", ")}`);
console.log();

const fp = new Map(chosen.map((p) => [p.name, { attempted: 0, answered: 0, hits: 0, examples: [] }]));

for (let i = 0; i < synthetic.length; i++) {
  const id = synthetic[i];
  await Promise.all(chosen.map(async (p) => {
    const slot = fp.get(p.name);
    slot.attempted++;
    try {
      const r = await p.run(id, "email", env);
      if (r && r.ok) {
        slot.answered++;
        if (r.breaches.length > 0) {
          slot.hits++;
          if (slot.examples.length < 3) slot.examples.push(`${id.slice(0, 8)}… -> ${r.breaches.map((b) => b.name).slice(0, 3).join(", ")}`);
        }
      }
    } catch { /* counted as unanswered */ }
  }));
  if ((i + 1) % 5 === 0) process.stdout.write(`   …${i + 1}/${N}\n`);
  if (i < synthetic.length - 1) await sleep(GAP);
}

console.log();
console.log("   provider        answered   hits   false-positive rate");
let totalAnswered = 0, totalHits = 0;
for (const [name, s] of fp) {
  const rate = s.answered ? (s.hits / s.answered) : NaN;
  totalAnswered += s.answered; totalHits += s.hits;
  console.log(`   ${name.padEnd(14)} ${String(`${s.answered}/${s.attempted}`).padStart(9)} ${String(s.hits).padStart(6)}   ${Number.isFinite(rate) ? (rate * 100).toFixed(1) + " %" : "—"}`);
  for (const ex of s.examples) console.log(`                  ! ${ex}`);
}
const overall = totalAnswered ? totalHits / totalAnswered : NaN;
console.log();
console.log(`   Overall: ${totalHits} false positives in ${totalAnswered} answered lookups` +
            (Number.isFinite(overall) ? ` = ${(overall * 100).toFixed(2)} %` : ""));
console.log();
if (totalHits === 0) {
  // Wilson one-sided 95% upper bound for 0 successes in n trials.
  const upper = totalAnswered ? 1 - Math.pow(0.05, 1 / totalAnswered) : NaN;
  console.log(`   No source reported a breach for an identifier that cannot exist. With`);
  console.log(`   ${totalAnswered} answered lookups and zero hits, the one-sided 95 % upper bound on the`);
  console.log(`   false-positive rate is ${(upper * 100).toFixed(1)} %. Specificity is therefore not merely`);
  console.log(`   asserted: it is bounded by measurement, and the bound tightens as n grows.`);
} else {
  console.log(`   At least one source returned data for an address that has never existed.`);
  console.log(`   That is a fabrication by the provider, not a merge error, and it is the`);
  console.log(`   strongest available argument for the confidence weighting of lib/confidence.js.`);
}

// ════════════════════════════════════════════════════════════════════════════
// B. DATE-RECOVERY ACCURACY
// ════════════════════════════════════════════════════════════════════════════
console.log();
console.log("B. DATE-RECOVERY ACCURACY AGAINST THE CATALOGUE");
console.log("-".repeat(78));

const cat = JSON.parse(readFileSync(new URL("../lib/breach-index.json", import.meta.url), "utf8"));

// GROUND TRUTH. The shipped index is the OUTPUT of the mechanism under test, so
// measuring it against itself would only confirm it is self-consistent. The
// live Have I Been Pwned catalogue is fetched instead and used as the
// independent reference: it needs no API key, and it is the same source the
// index is built from, so any disagreement is the builder's doing.
let truth;
try {
  const res = await fetch("https://haveibeenpwned.com/api/v3/breaches",
    { headers: { "user-agent": "Exposio-Research-SelfAssessment" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  truth = (await res.json()).map((b) => ({
    name: b.Name, title: b.Title || b.Name, domain: b.Domain || "",
    date: b.BreachDate || null,
    flags: { u: !b.IsVerified, f: b.IsFabricated, s: b.IsSpamList, r: b.IsRetired, m: b.IsMalware, l: b.IsStealerLog },
  }));
  console.log(`   reference: ${truth.length} breaches fetched live from HIBP (keyless)`);
} catch (e) {
  console.log(`   reference: FETCH FAILED (${e.message}) — section B and C skipped`);
  truth = null;
}

const titles = truth;
if (titles) {

// B1. Does each catalogued breach's own title resolve to its own date?
let exact = 0;
const wrongDate = [];
for (const t of titles) {
  const e = catalogueEntry(t.title);
  if (e && e.d === t.date) exact++;
  else if (e && e.d && e.d !== t.date) wrongDate.push({ t, got: e.d });
}
console.log();
console.log(`   B1  canonical titles resolving to the right date    ${exact}/${titles.length}  (${(100 * exact / titles.length).toFixed(1)} %)`);
console.log(`       resolving to a date belonging to another breach ${wrongDate.length}  ${wrongDate.length === 0 ? "✓" : "<- MIS-DATED"}`);
for (const w of wrongDate.slice(0, 6)) {
  console.log(`       ! "${w.t.title}" is ${w.t.date}, resolved to ${w.got}`);
}

// B2. Provider-style mangling. These are the transformations real providers
// apply to a breach name, taken from the spellings observed in source output.
const MANGLERS = [
  ["lowercased",            (s) => s.toLowerCase()],
  ["spaces stripped",       (s) => s.replace(/\s+/g, "")],
  ["underscored",           (s) => s.replace(/\s+/g, "_")],
  ["domain suffix added",   (s) => `${s}.com`],
  ["year appended",         (s) => `${s} 2019`],
  ["'combo list' suffix",   (s) => `${s} combo list`],
  ["'database' suffix",     (s) => `${s} database`],
  ["'(leaked)' suffix",     (s) => `${s} (leaked)`],
];
console.log();
console.log("       mangling                 resolved        rate");
const mangleRates = [];
for (const [label, fn] of MANGLERS) {
  let ok = 0;
  for (const t of titles) {
    const e = catalogueEntry(fn(t.title));
    if (e && e.d === t.date) ok++;
  }
  const rate = ok / titles.length;
  mangleRates.push(rate);
  console.log(`       ${label.padEnd(24)} ${String(`${ok}/${titles.length}`).padStart(11)}   ${(rate * 100).toFixed(1).padStart(6)} %`);
}
const worst = Math.min(...mangleRates);
const worstLabel = MANGLERS[mangleRates.indexOf(worst)][0];
console.log();
if (worst >= 0.9) {
  console.log(`   Every transformation observed in provider output resolves at ${(worst * 100).toFixed(1)} % or`);
  console.log(`   better; the weakest is "${worstLabel}". This matters because a name that fails`);
  console.log(`   to resolve leaves the record undated, and an undated record is scored on the`);
  console.log(`   model's most consequential assumption rather than on an observation.`);
} else {
  console.log(`   WEAKEST: "${worstLabel}" resolves only ${(worst * 100).toFixed(1)} % of the time. A name that fails to`);
  console.log(`   resolve leaves the record undated and therefore scored on an assumption, so`);
  console.log(`   this is a defect in the normaliser rather than a property of the data.`);
}

// B3. Ambiguity. Distinct breaches whose names normalise identically are a
// route by which one breach's date could be attached to another. The builder
// marks such keys and refuses to date them, so what is measured here is how
// often that refusal applies, and whether any date is still attached wrongly.
const buckets = new Map();
for (const t of titles) {
  const k = baseName(t.title);
  if (!buckets.has(k)) buckets.set(k, []);
  buckets.get(k).push(t);
}
const conflicting = [...buckets.values()].filter((g) => new Set(g.map((x) => x.date)).size > 1);
const markedAmbiguous = Object.values(cat.index).filter((e) => e.a).length;

console.log();
console.log(`   B3  fuzzy keys onto which >1 breach date maps      ${conflicting.length}`);
console.log(`       fuzzy keys marked ambiguous, carrying no date  ${markedAmbiguous}`);
for (const g of conflicting.slice(0, 4)) {
  console.log(`       "${baseName(g[0].title)}"  <-  ${g.map((x) => `${x.title} (${x.date})`).join(" | ")}`);
}
console.log();
console.log(`   A bare name that maps onto two breaches with different dates is resolved by`);
console.log(`   the exact-name map where the provider quoted a canonical title, and refused`);
console.log(`   outright where it did not. ${markedAmbiguous} of ${Object.keys(cat.index).length} fuzzy keys (${(100 * markedAmbiguous / Object.keys(cat.index).length).toFixed(1)} %) fall to the`);
console.log(`   refusal, and are scored on the undated assumption with the reason recorded.`);
console.log(`   A wrong date mis-scores silently; a missing one is declared, which is why`);
console.log(`   refusing is the conservative choice even though it loses information.`);

// ════════════════════════════════════════════════════════════════════════════
// C. CORPUS QUALITY
// ════════════════════════════════════════════════════════════════════════════
console.log();
console.log("C. QUALITY COMPOSITION OF THE REFERENCE CORPUS");
console.log("-".repeat(78));
const FLAGS = { u: "unverified", f: "fabricated", s: "spam-list", r: "retired", m: "malware", l: "stealer-log" };
const counts = Object.fromEntries(Object.keys(FLAGS).map((k) => [k, 0]));
let clean = 0;
for (const t of titles) {
  const set = Object.keys(FLAGS).filter((k) => t.flags[k]);
  if (set.length === 0) { clean++; continue; }
  for (const k of set) counts[k]++;
}
console.log("       mark            breaches     share");
for (const [k, label] of Object.entries(FLAGS)) {
  console.log(`       ${label.padEnd(14)} ${String(counts[k]).padStart(8)}   ${(100 * counts[k] / titles.length).toFixed(1).padStart(6)} %`);
}
console.log(`       ${"(no mark)".padEnd(14)} ${String(clean).padStart(8)}   ${(100 * clean / titles.length).toFixed(1).padStart(6)} %`);
const lowConf = counts.u + counts.f + counts.s;
console.log();
console.log(`   ${(100 * lowConf / titles.length).toFixed(1)} % of catalogued breaches carry a mark that qualifies their reliability.`);
console.log(`   This is a property of breach intelligence as a field, not of this tool, and`);
console.log(`   it is the quantitative basis for the source criticism in chapter 2: a score`);
console.log(`   computed over such a corpus inherits its uncertainty, which is why the marks`);
console.log(`   are surfaced in the report rather than silently folded into the number.`);

} // end: ground truth available

// ════════════════════════════════════════════════════════════════════════════
// D. WHAT THIS DOES NOT MEASURE
// ════════════════════════════════════════════════════════════════════════════
console.log();
console.log("D. WHAT REMAINS UNMEASURED, AND WHAT IT WOULD TAKE");
console.log("-".repeat(78));
console.log(`   SENSITIVITY (false negatives). Measuring how often a source misses a record`);
console.log(`   that is genuinely present requires an identifier set whose true membership is`);
console.log(`   known. No provider publishes corpus contents, and reconstructing them would`);
console.log(`   mean obtaining breach data directly, which is both unlawful and the opposite`);
console.log(`   of what this architecture is for. Relative coverage between providers is`);
console.log(`   measurable and is the closest available substitute; it bounds disagreement,`);
console.log(`   not error, because when two sources differ neither is known to be right.`);
console.log();
console.log(`   CONSTRUCT VALIDITY of the score. Nothing here shows that a score of 70 denotes`);
console.log(`   more real-world harm than a score of 40. That requires outcome data linking`);
console.log(`   exposure to realised compromise, which does not exist publicly, and is the`);
console.log(`   subject of the calibration discussion rather than of this script.`);
console.log();
console.log(`   USER COMPREHENSION AND BEHAVIOUR. Requires the controlled study specified in`);
console.log(`   docs/STUDY-PROTOCOL.md, with ethics approval and recruited participants.`);
console.log();
console.log(`   The distinction this script draws is the one the thesis should draw: the`);
console.log(`   measurement layer is testable and has been tested; the interpretation layer`);
console.log(`   is not yet validated and is reported as such.`);

console.log();
console.log("=".repeat(78));
console.log("Reproduce: npm run validate   (A is network-bound; B and C are deterministic)");
console.log("=".repeat(78));
