// lib/confidence.js
// ─────────────────────────────────────────────────────────────────────────────
// How much a record should be believed, separately from how bad it would be.
//
// Until now the score answered one question: if this record is true, how much
// exposure does it represent? It never asked whether the record deserves equal
// belief. A breach confirmed by four providers and verified by Have I Been
// Pwned was weighted exactly like a single uncorroborated line from an
// uncurated combolist, and a record the catalogue marks FABRICATED counted in
// full. That is a reliability defect, not a modelling preference.
//
// This module supplies one multiplier per record, applied to that record's
// contribution. Two independent signals, both already collected by the
// pipeline and neither invented for the purpose:
//
//   • verification flags from the bundled HIBP catalogue (lib/enrich.js)
//   • how many distinct providers reported the same record (lib/sources.js)
//
// MEASURED SCOPE. In the shipped catalogue of 1,047 distinct breaches, 7.2%
// carry any flag at all: unverified 4.01%, spam-list 1.53%, malware 0.86%,
// stealer-log 0.57%, fabricated 0.29%, retired 0.19%. Only the first, second,
// fifth and sixth attract a penalty here, so roughly 6% of catalogued breaches
// are affected. This is a modest correction and is presented as one; a claim
// that it transforms the score would not survive the arithmetic.
//
// MALWARE AND STEALER LOGS ARE NOT PENALISED. They mark a record as coming
// from infostealer capture rather than a company breach. That makes it more
// serious, not less credible, so treating those letters as doubt would invert
// their meaning.
// ─────────────────────────────────────────────────────────────────────────────

// Belief multipliers. Chosen, not fitted — like every other constant in the
// model — and swept in the sensitivity analysis for the same reason.
export const FLAG_CONFIDENCE = {
  fabricated: 0.25, // the catalogue states the breach was invented
  "spam-list": 0.40, // a marketing list, not evidence of a compromise
  unverified: 0.70, // plausible but never confirmed by the curator
  retired: 0.60, // withdrawn from the source after publication
};

// A record only one provider reported, where that provider is not the curated
// one, is the weakest evidence the pipeline produces. The penalty is small
// because "only one source has it" is often just coverage, not doubt.
export const UNCORROBORATED = 0.85;
export const CURATED_SOURCE = "HIBP";

// Sources that re-publish another source's data rather than collecting their
// own. BreachDirectory's listing states that portions of its data come from
// HaveIBeenPwned, Leakcheck.io and Vigilante.pw; the first two are queried
// here directly. It still earns its place in the registry, because Vigilante
// gives it coverage the others lack, but it must not count toward
// corroboration: agreement between a source and a republisher of that same
// source is one observation reported twice, not two observations.
export const NON_INDEPENDENT = new Set(["BreachDirectory"]);

export function independentSources(sources) {
  return (sources || []).filter((s) => !NON_INDEPENDENT.has(s));
}

// Confidence in a single record, in (0, 1].
export function recordConfidence(breach) {
  let c = 1;
  for (const flag of breach.flags || []) {
    const penalty = FLAG_CONFIDENCE[flag];
    if (penalty !== undefined) c = Math.min(c, penalty);
  }
  const sources = independentSources(breach.sources);
  if (sources.length <= 1 && !sources.includes(CURATED_SOURCE)) c *= UNCORROBORATED;
  return c;
}

// Confidence in a permanent ATTRIBUTE, which several records may have carried.
// The best evidence wins: one trusted record disclosing a date of birth settles
// the matter, and a second doubtful record carrying the same fact should not
// drag that belief back down.
export function attributeConfidence(breaches, key) {
  let best = 0;
  for (const b of breaches) {
    if ((b.identityAttrs || []).includes(key)) best = Math.max(best, recordConfidence(b));
  }
  return best || 1;
}
