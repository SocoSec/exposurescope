// lib/score.js
// ─────────────────────────────────────────────────────────────────────────────
// The Breach Risk component (B) of the thesis Exposure Score model, as PURE
// functions: no network, no storage, no React. The server uses them to build
// reports; the browser uses them for the password check; the self-test runs
// them offline. One implementation, three callers, identical numbers.
//
// TWO CLOCKS. A password can be changed, so the risk from a leaked one really
// does expire; a date of birth cannot be changed, so the risk from a leaked one
// never expires. Running both on a single decay curve was a category error: it
// discounted a permanent identity dossier to nothing because time had passed,
// when nothing about that exposure had changed. See thesis §5.8.
//
//   B_cred = Σ_i  sev_cred_i × exp(−λ × age_i)      λ = 0.002  (half-life 347d)
//   I      = 1 − Π_k (1 − w_k)  over the UNION of identity classes, no decay
//   B      = min(1, (B_cred + W_IDENTITY·I) / B_MAX) × 100
//
// The identity term is a union, not a sum: two breaches leaking the same date
// of birth expose ONE unchanged fact, not two. Summing it per breach would
// count the same thing twice. Credentials stay a per-breach sum, because two
// passwords at two services genuinely are two problems.
//
// What the UI shows is B on a 0–100 scale, labelled as the Breach Risk score.
// The full thesis score E = w1·B + w2·O + w3·S + w4·M + w5·L needs four more
// components that are not measured yet, so the app must not call B "E".
// ─────────────────────────────────────────────────────────────────────────────

export const DECAY_PER_DAY = 0.002; // λ: weight halves roughly every 347 days
export const B_MAX = 0.8;           // normaliser from the thesis

// Records with no breach date (e.g. DeHashed results) get an explicit, visible
// assumption instead of a silent default. Provisional — calibrate in the study.
export const UNDATED_AGE_DAYS = 730;

// ---- the volatile clock -----------------------------------------------------
// A third clock, for what an infostealer takes that neither of the other two
// describes. A corporate dump yields a password, which the owner may revoke;
// an infostealer yields the live session as well — cookies, autofill, tokens
// already authenticated — and that material is not revoked by the owner at
// all. It expires by itself, when the session dies.
//
// So it needs a decay of its own, and a much faster one. Browser sessions are
// measured in days to weeks, not months, so the half-life here is 30 days
// against the fast clock's 347. The credentials and identity attributes that
// the same record also exposed keep their normal treatment on the other two
// clocks: this term is the live-session surcharge, not a replacement.
//
// Everything is additive, so a profile with no infostealer record scores
// exactly what it scored before this clock existed. That is asserted in the
// self-test, and it is why adopting this changed no published figure.
export const VOLATILE_HALF_LIFE_DAYS = 30;
export const DECAY_VOLATILE = Math.log(2) / VOLATILE_HALF_LIFE_DAYS; // 0.0231/day

// Weight of a live session at the moment of capture. Chosen, not fitted, and
// anchored on the case it has to represent: a single infection inside its
// first month must reach the High band on its own.
export const W_STEALER = 0.60;

// ---- the cryptographic dimension -------------------------------------------
// How well the password was protected, where a source is willing to say.
//
// Two breaches can expose "Passwords" and mean entirely different things: a
// plaintext dump is usable the moment it leaks, while an Argon2id hash may
// never be cracked at all. The model has been blind to that distinction
// because no source it consulted reported the algorithm. A source that does
// report it (BreachDirectory labels the cipher) supplies the missing term.
//
// kappa multiplies the CREDENTIAL TERM ONLY. It must never multiply the whole
// record: a breach that leaked a date of birth and no password has no cipher,
// and scaling its identity contribution by a cryptographic weight would be a
// category error of the same kind the two clocks were introduced to fix.
//
// UNKNOWN DEFAULTS TO 1.0. The overwhelming majority of records carry no
// cipher information, and defaulting to "assume the worst" keeps the model
// identical to its published behaviour until a source actually tells us
// otherwise. Coverage is reported alongside the score so the reader knows how
// often this term did anything at all.
export const CIPHER_WEIGHTS = {
  plaintext: 1.00,   // usable immediately; no work required
  md5: 0.80,         // broken; rainbow tables and GPU throughput in seconds
  sha1: 0.80,        // likewise broken for password hashing
  ntlm: 0.80,
  sha256: 0.40,      // fast hash, not designed for passwords; dictionary-feasible
  sha512: 0.40,
  pbkdf2: 0.15,      // deliberately slow, but parallelises on GPUs
  bcrypt: 0.05,      // memory and time hard; mass cracking is impractical
  scrypt: 0.05,
  argon2: 0.05,
};

export function cipherWeight(cipher) {
  if (!cipher) return 1.0;
  const key = String(cipher).toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [name, w] of Object.entries(CIPHER_WEIGHTS)) {
    if (key.startsWith(name)) return w;
  }
  return 1.0;   // an algorithm we do not recognise is not evidence of safety
}

// A record is infostealer-derived if the catalogue says so, if the provider
// that reported it only reports infections, or if its title says so. Three
// independent signals, because any one of them can be absent.
export function isStealerRecord(breach) {
  const flags = breach.flags || [];
  if (flags.includes("stealer-log") || flags.includes("malware")) return true;
  if ((breach.sources || []).includes("Hudson Rock")) return true;
  return /infostealer|stealer log/i.test(breach.title || "");
}

// Severity tiers (thesis §5.3.1). "financial-only" is NOT in the thesis: card or
// bank data without passwords wasn't specified, and it enables direct fraud, so
// it gets the credentials weight here. Flagged as provisional.
import { recordConfidence, attributeConfidence } from "./confidence.js";

export const TIERS = {
  financial: { weight: 1.0, label: "Financial (passwords + payment data)" },
  "financial-only": { weight: 0.7, label: "Payment data (no passwords) — provisional" },
  credentials: { weight: 0.7, label: "Credentials (passwords, no payment data)" },
  contact: { weight: 0.4, label: "Contact (phone or physical address)" },
  email: { weight: 0.2, label: "Email only" },
};

// ---- the slow clock ---------------------------------------------------------
// Identity attributes you cannot change, or cannot change easily. Each weight
// is the share of identity risk that attribute carries on its own.
//
// These are CHOSEN, not fitted — the same honesty the tier weights require —
// and scripts/sensitivity.mjs perturbs them to show what the ranking does when
// they are wrong. The ordering is the defensible part: a passport number is
// categorically worse than a stated gender, because one opens an account in
// your name and the other narrows a guess.
//
// `email` is deliberately absent. It is the lookup key, so it is present in
// 100% of results by construction; including it would add the same constant to
// everyone and distinguish nobody.
export const IDENTITY_WEIGHTS = {
  govid: 0.60,        // passport, national ID, SSN — opens accounts in your name
  dob: 0.28,          // immutable, and a standard identity-check question
  address: 0.18,      // changeable in principle, rarely in practice
  phone: 0.14,        // SIM-swap target; portable but sticky
  name: 0.08,         // weak alone, a multiplier with everything else
  username: 0.07,     // links profiles across platforms
  location: 0.05,     // city or region, not a street address
  nationality: 0.04,
  gender: 0.03,
  // Added with the vocabulary audit. Provisional, and swept like the rest.
  biometric: 0.65,   // a face or a fingerprint cannot be reissued at all
  geoprecise: 0.24,  // a coordinate pair is a home, not a city
  birthplace: 0.22,  // immutable, and a standard identity-check question
  maidenname: 0.20,  // immutable, and the classic account-recovery answer
  sensitive: 0.25,   // GDPR Art. 9 categories: health, beliefs, orientation
  ethnicity: 0.10,   // immutable, and a special category
  deviceid: 0.12,    // an IMEI outlives most passwords
  relations: 0.06,   // weak alone, a multiplier for social engineering
};

// How much of the ceiling a COMPLETE permanent dossier is worth, with no
// credential exposure at all. Set so that such a person scores 75: severe, and
// short of 100, because the top of the scale is reserved for "and they have
// your password and your card number right now". Stated, not fitted.
export const W_IDENTITY = 0.7;

// Credential severity for the fast clock. The old tiers mixed credential and
// identity data into one per-breach number; here the fast clock carries only
// what can be revoked, and everything else moves to the slow clock.
export function credentialSeverity(attrs) {
  // "secret" is treated as a password: an auth token or a security answer
  // opens the account the same way, and both can be revoked.
  const hasCredential = attrs.has("password") || attrs.has("secret");
  if (hasCredential && attrs.has("financial")) return 1.0;
  if (attrs.has("financial")) return 0.7;
  if (hasCredential) return 0.7;
  return 0;   // contact- and email-only breaches are scored by the slow clock
}

// I = 1 − Π(1 − w_k). Bounded below 1, monotonic in the number of attributes,
// with diminishing returns — which is the mosaic effect stated as arithmetic:
// the first few fragments carry most of the identification power.
export function identityTerm(attrs) {
  let keep = 1;
  for (const key of attrs) {
    const w = IDENTITY_WEIGHTS[key];
    if (w) keep *= (1 - w);
  }
  return 1 - keep;
}

// The same union, with each attribute's weight scaled by how much the records
// carrying it deserve to be believed. With every confidence at 1 this is
// identical to identityTerm, which the self-test asserts.
export function identityTermWeighted(attributes, confidenceOf) {
  let keep = 1;
  for (const key of attributes) {
    const w = IDENTITY_WEIGHTS[key];
    if (w) keep *= 1 - w * confidenceOf(key);
  }
  return 1 - keep;
}

// How a breach "data class" string maps to an attribute of your identity.
// Careful patterns: the old app matched /address/ and therefore counted
// "Email addresses" and "IP addresses" as a home address.
export const ATTRIBUTES = [
  { key: "email", label: "Email", match: /^email addresses$|email address/i },
  { key: "password", label: "Password", match: /^passwords?$|historical passwords|password histories|password hashes/i },
  // Credential-EQUIVALENT secrets. A session token or a security answer gets
  // an attacker into the account as surely as the password does, and each can
  // be revoked, so they belong on the fast clock beside it. Scoring them zero
  // treated a leaked auth token as harmless.
  { key: "secret", label: "Other secret", match: /auth tokens|security questions|password hints|^pins$|mnemonic phrases|encrypted keys|private keys|recovery codes/i },
  { key: "phone", label: "Phone", match: /phone/i },
  { key: "address", label: "Address", match: /^addresses$|(physical|postal|home|street) address/i },
  { key: "username", label: "Username", match: /username|user name|screen name|nickname/i },
  { key: "financial", label: "Financial", match: /credit card|bank|payment|financial|iban|credit scores|credit status|income levels|net worths|taxation records|loan information|account balances|earnings/i },
  // Permanent identity attributes. The old vocabulary stopped at the six above,
  // so a breach of dates of birth and nationalities registered as "email only".
  { key: "dob", label: "Date of birth", match: /date(s)? of birth|birthdate|^dobs?$/i },
  { key: "name", label: "Name", match: /^names$|full name|real name|first name|last name|surname/i },
  // "Government issued IDs" is HIBP's own canonical string, used by 30 breaches
  // in their catalogue. This pattern listed the specific document types and
  // missed the generic one, so govid — the heaviest weight in the model — never
  // fired for those records. Found by auditing ATTRIBUTES against the live
  // /api/v3/dataclasses vocabulary; scripts/build-breach-index.mjs re-runs it.
  { key: "govid", label: "Government ID", match: /government issued id|national id|passport|social security|^ssns?$|tax id|driver'?s licen[cs]e|identity card|identification number/i },
  { key: "nationality", label: "Nationality", match: /nationalit|citizenship/i },
  { key: "gender", label: "Gender", match: /^genders$|^sexes$/i },
  { key: "location", label: "Location", match: /geographic location|^cities$|city of residence|^countries$/i },
  // Added after auditing the full published vocabulary: of 166 data classes,
  // 136 mapped to nothing and therefore scored zero. These are the ones whose
  // absence was indefensible. Their weights are provisional, chosen on the
  // same reasoning as the originals and swept with them.
  { key: "biometric", label: "Biometric data", match: /biometric/i },
  { key: "geoprecise", label: "Precise location", match: /latitude and longitude/i },
  { key: "birthplace", label: "Place of birth", match: /places? of birth/i },
  { key: "maidenname", label: "Mother’s maiden name", match: /maiden name/i },
  { key: "sensitive", label: "Special-category data", match: /hiv status|personal health data|health insurance|disabilities|sexual orientation|sexual fetish|religions|political views|political donations/i },
  { key: "ethnicity", label: "Ethnicity", match: /^races$|ethnicit/i },
  { key: "deviceid", label: "Device identifier", match: /imei numbers|imsi numbers|mac addresses|device serial numbers/i },
  { key: "relations", label: "Family and relationships", match: /family members|spouses names|marital statuses|social connections/i },
];

export function attributesOf(dataClasses) {
  const found = new Set();
  for (const dataClass of dataClasses || []) {
    for (const attribute of ATTRIBUTES) if (attribute.match.test(dataClass)) found.add(attribute.key);
  }
  return found;
}

export function tierOf(attrs) {
  const credential = attrs.has("password") || attrs.has("secret");
  if (credential && attrs.has("financial")) return "financial";
  if (attrs.has("financial")) return "financial-only";
  if (credential) return "credentials";
  if (attrs.has("phone") || attrs.has("address")) return "contact";
  return "email";
}

// Whole days between a "YYYY-MM-DD" date and `now`; null when unusable.
export function ageInDays(date, now) {
  const time = Date.parse(String(date || "") + "T00:00:00Z");
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((now.getTime() - time) / 86400000));
}

export function bandFor(score, exposed) {
  if (!exposed) return "safe";
  if (score <= 35) return "low";
  if (score <= 65) return "medium";
  return "high";
}

// Turn a raw B sum into the 0–100 score. Any exposure scores at least 1, so a
// user with only ancient breaches never sees "0" next to a list of breaches.
export function normalise(raw, exposed) {
  if (!exposed) return 0;
  return Math.max(1, Math.round(Math.min(1, raw / B_MAX) * 100));
}

// Re-score an ALREADY SCORED profile under a different set of weights.
//
// Everything that does not depend on a weight — which breaches exist, how old
// each one is, which attributes each exposed — is fixed by the time a report
// exists. Only the severity tiers and the identity weights are judgements, and
// those are exactly what a sensitivity analysis has to move. This function is
// the one place that turns weights into a score, so the interval reported in
// lib/interval.js and the number reported by emailReport() cannot disagree.
//
// With no overrides it reproduces emailReport().score exactly; the self-test
// asserts that, because the whole point of having one scorer is lost if the
// two paths are allowed to drift.
export function scoreFromScored(scored, { tiers, identityWeights, wStealer = W_STEALER } = {}) {
  const T = tiers || Object.fromEntries(Object.entries(TIERS).map(([k, v]) => [k, v.weight]));
  const W = identityWeights || IDENTITY_WEIGHTS;

  let cred = 0;
  const union = new Set();
  for (const b of scored) {
    const attrs = b.attrs || [];
    const has = (k) => attrs.includes(k);
    const hasCredential = has("password") || has("secret");
    // The combined case reads T.financial rather than a literal 1.0, so that a
    // perturbation moves every severity weight and not merely two of three.
    let sev = 0;
    if (hasCredential && has("financial")) sev = T.financial;
    else if (has("financial")) sev = T["financial-only"];
    else if (hasCredential) sev = T.credentials;
    cred += sev * (b.recency || 0) * (b.kappa ?? 1);
    for (const k of b.identityAttrs || []) union.add(k);
  }

  let keep = 1;
  for (const k of union) keep *= 1 - (W[k] || 0);
  const vol = scored.reduce((t, b) => t + (b.volatileRecency || 0), 0);
  return normalise(cred + W_IDENTITY * (1 - keep) + wStealer * vol, scored.length > 0);
}

// Build the report for an identifier lookup (email or phone) from merged
// breach records ({ title, date|null, dataClasses[], sources[] }).
//
// Scoring is identical for both kinds: severity comes from the data classes a
// breach exposed, not from which field was searched. Only `kind` differs, and
// it is carried so the interface and the playbook can describe accurately what
// was checked.
// `options.useConfidence` turns on the belief weighting in lib/confidence.js.
// It is OFF by default and deliberately so: switching it on changes every
// published figure, and a model under examination should not move underneath
// the numbers already written about it. It is measured in the sensitivity
// analysis and adopted, or not, as a separate decision.
export function emailReport(breaches, now = new Date(), kind = "email", options = {}) {
  const useConfidence = options.useConfidence === true;
  const attrs = new Set();
  const classCounts = {};

  const scored = breaches.map((breach) => {
    const breachAttrs = attributesOf(breach.dataClasses);
    breachAttrs.forEach((a) => attrs.add(a));
    for (const dataClass of breach.dataClasses || []) classCounts[dataClass] = (classCounts[dataClass] || 0) + 1;

    const tier = tierOf(breachAttrs);
    const knownAge = breach.date ? ageInDays(breach.date, now) : null;
    const age = knownAge ?? UNDATED_AGE_DAYS;
    const recency = Math.exp(-DECAY_PER_DAY * age);
    const severity = TIERS[tier].weight;
    const credSeverity = credentialSeverity(breachAttrs);

    return {
      title: breach.title,
      date: breach.date || null,
      year: breach.date ? breach.date.slice(0, 4) : null,
      // Provenance, carried through from lib/enrich.js. A date resolved from
      // the HIBP catalogue must stay distinguishable from one the provider
      // actually reported, both in the interface and in anything the thesis
      // quotes; dropping these here silently merged the two.
      dateSource: breach.dateSource || "provider",
      flags: breach.flags || [],
      sources: breach.sources || [],
      dataClasses: breach.dataClasses || [],
      attrs: [...breachAttrs],
      tier,
      severity,
      ageDays: age,
      ageAssumed: knownAge === null,
      recency,
      // What this breach adds on the fast clock. Zero for a breach that leaked
      // no credentials: its content is counted once, in the identity term.
      credSeverity,
      // Belief in the record, from its catalogue flags and how many providers
      // reported it. 1 when the weighting is off, so the arithmetic below is
      // unchanged unless it is explicitly enabled.
      confidence: 1,
      contribution: credSeverity * recency *
        (breach.credentialRecovered === true ? 1.0 : cipherWeight(breach.cipher)),
      // Volatile clock. Non-zero only for infostealer-derived records, and
      // decaying roughly eleven times faster than the fast clock.
      // Cryptographic weight, applied to the credential term alone. 1.0 when no
      // source reported the algorithm, which is still the common case.
      cipher: breach.cipher || null,
      // A password a service already holds in the clear is recovered, whatever
      // it was stored under. Recovery therefore overrides the cipher: a cracked
      // bcrypt hash is not protected by having once been bcrypt.
      credentialRecovered: breach.credentialRecovered === true,
      kappa: breach.credentialRecovered === true ? 1.0 : cipherWeight(breach.cipher),
      stealer: isStealerRecord(breach),
      volatileRecency: isStealerRecord(breach) ? Math.exp(-DECAY_VOLATILE * age) : 0,
      // The identity classes this breach contributed to the union, so the
      // interface can say WHICH breach put a date of birth into the open even
      // though the union counts it only once.
      identityAttrs: [...breachAttrs].filter((a) => IDENTITY_WEIGHTS[a]),
      // Filled in below, once the union is known. Display only.
      identityShare: 0,
      weight: 0,
    };
  });

  if (useConfidence) {
    for (const b of scored) {
      b.confidence = recordConfidence(b);
      b.contribution = b.credSeverity * b.recency * b.kappa * b.confidence;
    }
  }

  scored.sort((a, b) => b.contribution - a.contribution);

  // Fast clock: a per-breach sum, because two leaked passwords are two problems.
  const credRaw = scored.reduce((sum, b) => sum + b.contribution, 0);
  // Slow clock: one union over everything, because one date of birth leaked
  // twice is still one date of birth.
  const identity = useConfidence
    ? identityTermWeighted(attrs, (k) => attributeConfidence(scored, k))
    : identityTerm(attrs);
  const identityRaw = W_IDENTITY * identity;
  // Volatile clock: a per-record sum like the fast clock, because two
  // infections are two compromised machines, not one fact seen twice.
  const volatile_ = scored.reduce((sum, b) => sum + b.volatileRecency, 0);
  const volatileRaw = W_STEALER * volatile_;
  const raw = credRaw + identityRaw + volatileRaw;

  // ---- presentational attribution ------------------------------------------
  // The identity term belongs to no single breach: it is a union, which is the
  // whole point. But a chart that sizes a breach by its credential
  // contribution alone would draw the record that leaked a date of birth, a
  // name and an address as a dot, because that record leaked no password. That
  // would contradict, in the picture, what the score says in the number.
  //
  // So the identity term is SPREAD back over the breaches for display only:
  // each attribute's share of the term is split equally between the breaches
  // that exposed it. The totals still add to B_raw, and `contribution` is left
  // untouched so the remediation model keeps scoring the revocable half alone.
  const weightSum = [...attrs].reduce((t, k) => t + (IDENTITY_WEIGHTS[k] || 0), 0);
  if (weightSum > 0 && identityRaw > 0) {
    for (const key of attrs) {
      const w = IDENTITY_WEIGHTS[key];
      if (!w) continue;
      const carriers = scored.filter((b) => b.identityAttrs.includes(key));
      if (carriers.length === 0) continue;
      const each = (identityRaw * (w / weightSum)) / carriers.length;
      for (const b of carriers) b.identityShare += each;
    }
  }
  for (const b of scored) b.weight = b.contribution + b.identityShare;
  scored.sort((a, b) => b.weight - a.weight);

  const exposed = scored.length > 0;
  const score = normalise(raw, exposed);

  return {
    kind: kind === "phone" ? "phone" : "email",
    score, level: bandFor(score, exposed), raw,
    // Both halves are reported so the interface can show the split, and so a
    // reader can recompute the total by hand.
    credRaw, identity, identityRaw,
    volatile: volatile_, volatileRaw,
    // How often a source actually told us the algorithm. Reported because a
    // term that almost never fires should not be presented as if it did.
    cipherCoverage: (() => {
      const withCred = scored.filter((b) => b.credSeverity > 0);
      if (!withCred.length) return null;
      return withCred.filter((b) => b.cipher).length / withCred.length;
    })(),
    identityAttrs: [...attrs].filter((a) => IDENTITY_WEIGHTS[a]),
    attrs: [...attrs], classCounts, breaches: scored,
  };
}

// Build the report for a password found `count` times in Pwned Passwords.
// (Unchanged from the prototype: 35–70 depending on how widespread it is.)
export function passwordReport(count) {
  const exposed = count > 0;
  const prevalence = Math.min(1, Math.log10(count + 1) / 7);
  const score = exposed ? Math.round(0.7 * (0.5 + 0.5 * prevalence) * 100) : 0;
  return {
    kind: "password", score, level: bandFor(score, exposed), count,
    attrs: exposed ? ["password"] : [], classCounts: {}, breaches: [],
  };
}
