// lib/score.js
// ─────────────────────────────────────────────────────────────────────────────
// The Breach Risk component (B) of the thesis Exposure Score model, as PURE
// functions: no network, no storage, no React. The server uses them to build
// reports; the browser uses them for the password check; the self-test runs
// them offline. One implementation, three callers, identical numbers.
//
//   B_raw = Σ_i  severity_i × recency_i          (thesis §5.3.1)
//   recency_i = exp(−λ × age_days_i),  λ = 0.002
//   B = min(1, B_raw / B_MAX) × 100,   B_MAX = 0.8
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

// Build the report for an email lookup from merged breach records
// ({ title, date|null, dataClasses[], sources[] }).
export function emailReport(breaches, now = new Date()) {
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

    return {
      title: breach.title,
      date: breach.date || null,
      year: breach.date ? breach.date.slice(0, 4) : null,
      sources: breach.sources || [],
      dataClasses: breach.dataClasses || [],
      attrs: [...breachAttrs],
      tier,
      severity,
      ageDays: age,
      ageAssumed: knownAge === null,
      recency,
      contribution: severity * recency,
    };
  });

  scored.sort((a, b) => b.contribution - a.contribution);
  const raw = scored.reduce((sum, b) => sum + b.contribution, 0);
  const exposed = scored.length > 0;
  const score = normalise(raw, exposed);

  return { kind: "email", score, level: bandFor(score, exposed), raw, attrs: [...attrs], classCounts, breaches: scored };
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
