// lib/enrich.js
// ─────────────────────────────────────────────────────────────────────────────
// Resolves missing breach dates against a snapshot of the Have I Been Pwned
// catalogue (lib/breach-index.json, rebuilt by npm run build:index).
//
// WHY THIS EXISTS
// The scoring model discounts revocable exposure by age. A record with no date
// is scored on an assumption, UNDATED_AGE_DAYS, and the sensitivity analysis
// names that assumption the model's most consequential free parameter: 18% of
// records carry no date and every one of them is scored on it. DeHashed
// returns no dates at all; LeakCheck returns month precision for about 90% of
// its sources.
//
// A breach happened when it happened, independently of who is in it, so
// resolving a date from curated catalogue data is an observation, not an
// inference. Data classes are different and are deliberately NOT copied over:
// HIBP reports what a BREACH exposed, whereas another provider told us what
// THIS RECORD held. See scripts/build-breach-index.mjs.
//
// Every enriched record is marked, so the interface and the thesis can always
// separate a date a provider reported from a date this module supplied.
// ─────────────────────────────────────────────────────────────────────────────

import catalogue from "./breach-index.json" with { type: "json" };
import { baseName } from "./sources.js";

export const CATALOGUE_BUILT = catalogue.built;
export const CATALOGUE_SIZE = catalogue.breaches;

// Flag letters written by the build script. Kept short because the index ships
// in the edge bundle.
const FLAG_LABELS = {
  u: "unverified",
  f: "fabricated",
  s: "spam-list",
  r: "retired",
  m: "malware",
  l: "stealer-log",
};

// Exact first, fuzzy second. A provider quoting a canonical breach name must
// land on that breach rather than on whatever its aggressive normalisation
// collides with: "LinkedIn" is the 2012 credential breach, not an ambiguous
// merge of that and the 2021 scrape. Only strings no exact key matches fall
// through to baseName(). See scripts/build-breach-index.mjs.
const strictName = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

export function catalogueEntry(name) {
  const raw = name || "";
  const hit = catalogue.exact && catalogue.exact[strictName(raw)];
  if (hit && hit.d) return hit;
  return catalogue.index[baseName(raw)] || hit || null;
}

// Adds `date` where a provider gave none, and attaches HIBP's quality flags.
//
// Scoring is deliberately left alone: a fabricated or spam-list record still
// scores exactly as before. Whether to discount those is a model decision with
// consequences for every published figure, so the flags are surfaced here and
// the decision is made elsewhere, on purpose.
export function enrichFromCatalogue(breaches) {
  let datesResolved = 0;
  let flagged = 0;
  let ambiguousNames = 0;

  const enriched = (breaches || []).map((breach) => {
    const entry = catalogueEntry(breach.key || breach.title);
    if (!entry) return breach;

    const next = { ...breach };
    if (!next.date && entry.d) {
      next.date = entry.d;
      next.dateSource = "catalogue"; // never silently pass this off as the provider's
      datesResolved++;
    } else if (!next.date && entry.a) {
      // The name normalises onto two or more catalogued breaches carrying
      // different dates, so the catalogue cannot say which of them this record
      // belongs to. Scoring falls through to UNDATED_AGE_DAYS and the record
      // says why, rather than being given a date that may belong to the other
      // breach. See the rationale in scripts/build-breach-index.mjs.
      next.dateSource = "ambiguous";
      ambiguousNames++;
    }
    if (entry.x) {
      next.flags = entry.x.split("").map((letter) => FLAG_LABELS[letter]).filter(Boolean);
      flagged++;
    }
    return next;
  });

  return { breaches: enriched, datesResolved, flagged, ambiguousNames };
}
