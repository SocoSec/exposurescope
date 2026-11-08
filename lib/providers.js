// lib/providers.js
// ─────────────────────────────────────────────────────────────────────────────
// One pipeline for every breach-intelligence source.
//
// Each provider used to be hand-wired into the breach route: its own entry in
// a Promise.all, its own ternary deciding whether it applied, its own position
// in a parallel array that had to stay aligned with a second list of names.
// Adding a sixth source meant touching four places and keeping two arrays in
// the same order. That is how a provider ends up queried but never reported,
// or reported under the wrong name.
//
// So the sources are declared instead. One row per provider says what it is
// called, which identifiers it can answer, what it needs in order to run, and
// how to call it. `queryAll` does the rest: it selects the applicable rows,
// runs them in parallel, and sorts the answers into the ones that replied and
// the ones that did not.
//
// WHAT THIS DELIBERATELY DOES NOT DO. It does not fall back to a cached copy,
// and it does not retry a provider that refused. A source that fails is
// reported as having failed, because the alternative is showing a person
// "no breaches found" for a check that never actually ran.
// ─────────────────────────────────────────────────────────────────────────────

import {
  queryBreachDirectory, queryHIBP, queryDeHashed, queryIntelX, queryLeakCheck, queryXposedOrNot, queryHudsonRock,
} from "./sources.js";

// `kinds`    which identifier types this provider can answer at all
// `keyed`    the env field it needs; null means no key, so it always runs
// `run`      (identifier, kind, env) -> { ok, breaches } | { ok: false, reason }
//
// Order is display order: the curated source first, then the keyed one, then
// the keyless ones. It has no effect on the merge, which is keyed by breach.
export const PROVIDERS = [
  {
    name: "HIBP",
    kinds: ["email"],
    keyed: "hibpKey",
    run: (id, kind, env) => queryHIBP(id, env.hibpKey),
  },
  {
    name: "DeHashed",
    kinds: ["email", "phone"],
    keyed: "dehashedKey",
    run: (id, kind, env) => queryDeHashed(id, env.dehashedKey, kind),
  },
  {
    // Admitted for coverage: its Vigilante.pw feed reaches breaches the other
    // five do not. Flagged non-independent in lib/confidence.js, because it
    // re-publishes HIBP and LeakCheck and must not corroborate them.
    name: "BreachDirectory",
    kinds: ["email"],
    keyed: "breachDirectoryKey",
    independent: false,
    run: (id, kind, env) => queryBreachDirectory(id, env.breachDirectoryKey),
  },
  {
    // Intelligence X — searches the leaks.public bucket for the verified
    // identifier. Returns leak archive names and dates; data classes cannot be
    // inferred from file metadata alone, so IntelX contributes coverage
    // (breaches the other sources missed) and the merge fills in classes where
    // HIBP or LeakCheck also know the breach. Free tier: 50 searches/day.
    name: "IntelX",
    kinds: ["email"],
    keyed: "intelxKey",
    // Its leaks.public bucket indexes the publicly circulating archives that
    // HIBP and LeakCheck already cover, so a record shared with them is a
    // republication and not a second observation. Flagged like
    // BreachDirectory so it cannot corroborate a corpus it merely reprints.
    independent: false,
    run: (id, kind, env) => queryIntelX(id, env.intelxKey),
  },
  {
    name: "LeakCheck",
    kinds: ["email"],
    keyed: null,
    run: (id) => queryLeakCheck(id),
  },
  {
    name: "XposedOrNot",
    kinds: ["email"],
    keyed: null,
    run: (id) => queryXposedOrNot(id),
  },
  {
    name: "Hudson Rock",
    kinds: ["email"],
    keyed: null,
    run: (id) => queryHudsonRock(id),
  },
];

// Which providers could answer this identifier at all, given what is configured.
export function applicableProviders(kind, env) {
  return PROVIDERS.filter((p) => p.kinds.includes(kind) && (!p.keyed || Boolean(env[p.keyed])));
}

// True when nothing at all can answer, which is the only case the route should
// refuse outright. An email lookup reaches this only if the keyless providers
// were somehow removed, so in practice it is the phone path without DeHashed.
export function noProviderFor(kind, env) {
  return applicableProviders(kind, env).length === 0;
}

// Run every applicable provider in parallel and sort the answers.
//
// A provider that throws is treated exactly like one that returned an error:
// the scan continues with whatever else replied. One misbehaving source must
// not take down a report the others could have produced.
export async function queryAll(identifier, kind, env) {
  const chosen = applicableProviders(kind, env);

  const settled = await Promise.all(chosen.map(async (p) => {
    try {
      return [p.name, await p.run(identifier, kind, env)];
    } catch {
      return [p.name, { ok: false, reason: "error" }];
    }
  }));

  const sources = [];
  const sourcesFailed = [];
  const lists = [];
  for (const [name, result] of settled) {
    if (!result) continue;
    if (result.ok) {
      sources.push(name);
      lists.push(result.breaches);
    } else {
      sourcesFailed.push({ source: name, reason: result.reason });
    }
  }
  return { sources, sourcesFailed, lists };
}
