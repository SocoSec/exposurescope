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

// Severity tiers (thesis §5.3.1). "financial-only" is NOT in the thesis: card or
// bank data without passwords wasn't specified, and it enables direct fraud, so
// it gets the credentials weight here. Flagged as provisional.
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
  if (attrs.has("password") && attrs.has("financial")) return 1.0;
  if (attrs.has("financial")) return 0.7;
  if (attrs.has("password")) return 0.7;
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

// How a breach "data class" string maps to an attribute of your identity.
// Careful patterns: the old app matched /address/ and therefore counted
// "Email addresses" and "IP addresses" as a home address.
export const ATTRIBUTES = [
  { key: "email", label: "Email", match: /^email addresses$|email address/i },
  { key: "password", label: "Password", match: /^passwords?$|historical passwords|password histories|password hashes/i },
  { key: "phone", label: "Phone", match: /phone/i },
  { key: "address", label: "Address", match: /^addresses$|(physical|postal|home|street) address/i },
  { key: "username", label: "Username", match: /username|user name|screen name|nickname/i },
  { key: "financial", label: "Financial", match: /credit card|bank|payment|financial|iban/i },
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
];

export function attributesOf(dataClasses) {
  const found = new Set();
  for (const dataClass of dataClasses || []) {
    for (const attribute of ATTRIBUTES) if (attribute.match.test(dataClass)) found.add(attribute.key);
  }
  return found;
}

export function tierOf(attrs) {
  if (attrs.has("password") && attrs.has("financial")) return "financial";
  if (attrs.has("financial")) return "financial-only";
  if (attrs.has("password")) return "credentials";
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

// Build the report for an identifier lookup (email or phone) from merged
// breach records ({ title, date|null, dataClasses[], sources[] }).
//
// Scoring is identical for both kinds: severity comes from the data classes a
// breach exposed, not from which field was searched. Only `kind` differs, and
// it is carried so the interface and the playbook can describe accurately what
// was checked.
export function emailReport(breaches, now = new Date(), kind = "email") {
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
      contribution: credSeverity * recency,
      // The identity classes this breach contributed to the union, so the
      // interface can say WHICH breach put a date of birth into the open even
      // though the union counts it only once.
      identityAttrs: [...breachAttrs].filter((a) => IDENTITY_WEIGHTS[a]),
      // Filled in below, once the union is known. Display only.
      identityShare: 0,
      weight: 0,
    };
  });

  scored.sort((a, b) => b.contribution - a.contribution);

  // Fast clock: a per-breach sum, because two leaked passwords are two problems.
  const credRaw = scored.reduce((sum, b) => sum + b.contribution, 0);
  // Slow clock: one union over everything, because one date of birth leaked
  // twice is still one date of birth.
  const identity = identityTerm(attrs);
  const identityRaw = W_IDENTITY * identity;
  const raw = credRaw + identityRaw;

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
