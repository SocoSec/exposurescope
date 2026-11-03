// lib/sources.js
// ─────────────────────────────────────────────────────────────────────────────
// Breach intelligence sources → one merged list of breach records:
//   { title, key, date: "YYYY-MM-DD" | null, dataClasses: [], sources: [] }
//
// Only METADATA leaves this module: which breach, when, which kinds of data.
// Raw leaked values (passwords, addresses, phone numbers) returned by DeHashed
// are read to detect the data class and then dropped immediately.
// ─────────────────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 8000;

// fetch with a hard timeout so one slow provider can't hang the whole scan.
async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Provider results use a small, stable shape:
//   { ok: true, breaches: [...] }  or  { ok: false, reason: "rate_limited" | "auth" | "error" }
// Reasons are codes, not provider text, so nothing internal reaches the browser.

// ---- Have I Been Pwned ------------------------------------------------------
export async function queryHIBP(email, apiKey) {
  const url = "https://haveibeenpwned.com/api/v3/breachedaccount/" + encodeURIComponent(email) + "?truncateResponse=false";
  const options = { headers: { "hibp-api-key": apiKey, "user-agent": "Exposio-Research-SelfAssessment" } };

  try {
    let res = await fetchWithTimeout(url, options);
    // HIBP allows a fixed number of requests per key per minute and says how
    // long to wait. Retry once if that wait is short; otherwise report it.
    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after")) || 2;
      if (retryAfter > 3) return { ok: false, reason: "rate_limited" };
      await wait(retryAfter * 1000 + Math.random() * 400); // jitter spreads out simultaneous retries
      res = await fetchWithTimeout(url, options);
    }
    if (res.status === 404) return { ok: true, breaches: [] }; // HIBP: 404 means "not in any breach"
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "auth" };
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    if (!res.ok) return { ok: false, reason: "error" };

    const data = await res.json();
    const breaches = (Array.isArray(data) ? data : []).map((b) => ({
      title: cleanTitle(b.Title || b.Name),
      key: baseName(b.Name || b.Title || ""),
      date: /^\d{4}-\d{2}-\d{2}$/.test(b.BreachDate || "") ? b.BreachDate : null,
      dataClasses: Array.isArray(b.DataClasses) ? b.DataClasses.map(String) : [],
      sources: ["HIBP"],
    }));
    return { ok: true, breaches };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// ---- DeHashed ---------------------------------------------------------------
// Searches ONE field, named by `kind` ("email" or "phone").
//
// Phone search was previously removed outright: nobody could prove they owned
// a number, and an unverified phone lookup is a stalking tool. It is available
// again only because SMS ownership verification now exists (lib/sms.js) — the
// reasoning changed, not the standard.
//
// `kind` is derived by the route from the VERIFIED scan token, never from the
// request body, so the query cannot be redirected to a field the caller has
// not proven they own.
// How a DeHashed entry FIELD maps to a breach "data class".
//
// lib/score.js reads data classes, never provider fields, so this table is the
// only place the two vocabularies meet. The strings on the right are HIBP's
// vocabulary, because ATTRIBUTES in lib/score.js is written against it.
//
// Why the table exists: the first version of this function read five fields
// (email, password, phone, address, username) and silently dropped every other
// one. Those five reach identity weights of 0.18, 0.14 and 0.07 only, so a
// DeHashed record could never contribute a name, a date of birth or a
// government ID — the three heaviest permanent attributes in the model. Every
// DeHashed record therefore under-reported the slow clock, and a phone lookup,
// where DeHashed is the only source, under-reported it most.
export const DEHASHED_FIELD_CLASSES = [
  { dataClass: "Email addresses", fields: ["email", "emails"] },
  { dataClass: "Passwords", fields: ["password", "passwords", "hashed_password", "hashed_passwords", "password_hash"] },
  { dataClass: "Phone numbers", fields: ["phone", "phones", "phone_number", "phone_numbers", "telephone"] },
  { dataClass: "Physical addresses", fields: ["address", "addresses", "street_address", "home_address"] },
  { dataClass: "Usernames", fields: ["username", "usernames", "user_name", "screen_name", "nickname", "handle"] },
  { dataClass: "Names", fields: ["name", "names", "full_name", "first_name", "last_name", "surname", "middle_name"] },
  { dataClass: "Dates of birth", fields: ["dob", "dobs", "birthdate", "birth_date", "date_of_birth", "birthday"] },
  { dataClass: "National IDs", fields: ["ssn", "ssns", "social_security_number", "national_id", "passport", "passport_number", "tax_id", "drivers_license", "driver_license", "license_number", "identity_card"] },
  { dataClass: "Nationalities", fields: ["nationality", "nationalities", "citizenship"] },
  { dataClass: "Genders", fields: ["gender", "genders", "sex"] },
  { dataClass: "Geographic locations", fields: ["city", "cities", "state", "province", "region", "country", "countries", "zip", "zip_code", "postal_code"] },
  { dataClass: "Credit cards", fields: ["credit_card", "credit_cards", "cc_number", "card_number", "bank_account", "iban", "payment"] },
];

const FIELD_TO_CLASS = new Map();
for (const row of DEHASHED_FIELD_CLASSES) {
  for (const field of row.fields) FIELD_TO_CLASS.set(field, row.dataClass);
}

// Fields we recognise and deliberately do NOT score, so the unmapped-field
// warning below stays meaningful. A cryptocurrency address is an account
// identifier, not a payment credential: scoring it as financial would lift the
// record to severity 0.7 on evidence that does not support it.
const DEHASHED_IGNORED_FIELDS = new Set([
  "id", "database_name", "obtained_from", "source", "hash_type",
  "ip_address", "ip_addresses", "ip",
  "vin", "license_plate", "license_plates",
  "company", "employer", "organization",
  "social", "socials", "social_media",
  "cryptocurrency_address", "crypto_address",
  "url", "urls", "domain", "raw_record", "created_at", "updated_at",
]);

// A field counts only if it carries something. Truthiness alone is not enough:
// an empty array is truthy, so `if (entry.email)` would register "Email
// addresses" for a record that holds none.
export function hasValue(value) {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.some(hasValue);
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return value;
  if (typeof value === "object") return Object.values(value).some(hasValue);
  return Boolean(value);
}

const reportedUnknownFields = new Set();

// Logs FIELD NAMES only, never values. A field added to the provider's schema
// is a silent under-count — the defect this table was written to fix — so it
// has to be visible. Once per process per name, so logs cannot flood.
function noteUnmappedFields(entry) {
  for (const field of Object.keys(entry || {})) {
    const name = field.toLowerCase();
    if (FIELD_TO_CLASS.has(name) || DEHASHED_IGNORED_FIELDS.has(name)) continue;
    if (reportedUnknownFields.has(name)) continue;
    reportedUnknownFields.add(name);
    console.warn("[dehashed] unmapped entry field: " + name + " (name only, value not logged)");
  }
}

// Presence checks only — the leaked VALUES are read to decide the data class
// and then dropped. Exported so the offline self-test can exercise it without
// a network call or an API key.
export function dehashedEntryClasses(entry) {
  const classes = new Set();
  for (const [field, value] of Object.entries(entry || {})) {
    if (!hasValue(value)) continue;
    const dataClass = FIELD_TO_CLASS.get(field.toLowerCase());
    if (dataClass) classes.add(dataClass);
  }
  return [...classes];
}

export async function queryDeHashed(identifier, apiKey, kind = "email") {
  const field = kind === "phone" ? "phone" : "email";
  // v2 accepts ONE authentication style: the DeHashed-Api-Key header.
  // Verified against the live API (2026-09-29):
  //   no header                     -> 401 {"error":"No Authorization header present"}
  //   DeHashed-Api-Key: <bad key>   -> 403 {"error":"Issue with API Key"}
  //   Authorization: Basic/Bearer   -> 401 {"error":"No Authorization header present"}
  // The old v1 API used Basic auth with email:key; sending that to v2 means the
  // key is never seen, and the failure looks exactly like a bad key. That cost
  // us several key rotations, so Basic auth support is gone for good.
  // The key is trimmed because a stray space or newline pasted into a dashboard
  // makes an invalid header value.
  const headers = {
    "content-type": "application/json",
    accept: "application/json",
    "DeHashed-Api-Key": String(apiKey || "").trim(),
  };

  try {
    const res = await fetchWithTimeout("https://api.dehashed.com/v2/search", {
      method: "POST",
      headers,
      body: JSON.stringify({ query: field + ":" + identifier, size: 100, de_dupe: true }),
    });
    // 401 and 403 mean different things and must not be collapsed:
    //   401 = DeHashed never saw an API key (wrong header / auth style)
    //   403 = it saw the key and refused it (invalid, revoked, no credits)
    if (res.status === 401) { console.error("[dehashed] 401 — no API key reached DeHashed"); return { ok: false, reason: "no_key_sent" }; }
    if (res.status === 403) { console.error("[dehashed] 403 — key refused by DeHashed"); return { ok: false, reason: "key_refused" }; }
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    if (!res.ok) { console.error("[dehashed] unexpected status " + res.status); return { ok: false, reason: "error" }; }

    const data = await res.json();
    const entries = data.entries || data.results || [];
    const bySource = new Map();

    for (const entry of entries) {
      const title = cleanTitle(entry.database_name || entry.obtained_from || entry.source || "Unknown source");
      const key = baseName(title);
      const record = bySource.get(key) || { title, key, date: null, dataClasses: new Set(), sources: ["DeHashed"] };
      for (const dataClass of dehashedEntryClasses(entry)) record.dataClasses.add(dataClass);
      noteUnmappedFields(entry);
      bySource.set(key, record);
    }
    const breaches = [...bySource.values()].map((r) => ({ ...r, dataClasses: [...r.dataClasses] }));
    return { ok: true, breaches };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// KEYLESS PROVIDERS
// ─────────────────────────────────────────────────────────────────────────────
// The three below need no API key and no subscription, so they run on every
// scan. That matters for a self-assessment tool: coverage should not depend on
// whether the researcher can pay this month.
//
// They are queried ONLY with the identifier whose ownership has already been
// proven, exactly like HIBP and DeHashed. Adding a source never widens who can
// be looked up, only what is known about the person doing the looking.
// ═════════════════════════════════════════════════════════════════════════════

// ---- LeakCheck (public endpoint, no key) ------------------------------------
// Returns `sources: [{name, date}]` and a `fields` array naming the data types
// found across the result set.
//
// IMPORTANT LIMITATION, and the reason for the shape below: `fields` is a UNION
// over every matching record, not a per-source breakdown. We cannot tell which
// breach leaked the date of birth. That maps cleanly onto the identity term,
// which is itself a union, but it CANNOT drive per-breach credential severity.
//
// So the fields are attached to one aggregate record rather than copied onto
// every source. Copying them would multiply one password exposure into N, and
// inflate the fast clock by the number of breaches the provider happens to
// know. One aggregate record under-counts instead, which is the error this
// codebase already prefers (see mergeBreaches).
const LEAKCHECK_FIELD_CLASSES = {
  password: "Passwords", name: "Names", first_name: "Names", last_name: "Names",
  middle_name: "Names", profile_name: "Names", username: "Usernames",
  dob: "Dates of birth", ssn: "National IDs", phone: "Phone numbers",
  address: "Physical addresses", zip: "Geographic locations",
  city: "Geographic locations", state: "Geographic locations",
  country: "Geographic locations", gender: "Genders",
};
const LEAKCHECK_MAX_SOURCES = 100;

export async function queryLeakCheck(email) {
  try {
    const res = await fetchWithTimeout("https://leakcheck.io/api/public?check=" + encodeURIComponent(email), {
      headers: { accept: "application/json", "user-agent": "Exposio-Research-SelfAssessment" },
    });
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    if (!res.ok) return { ok: false, reason: "error" };

    const data = await res.json();
    // The public endpoint answers 200 with success:false for "no records".
    if (!data || data.success !== true) return { ok: true, breaches: [] };

    const breaches = [];
    for (const source of (data.sources || []).slice(0, LEAKCHECK_MAX_SOURCES)) {
      const title = cleanTitle(source.name || "Unknown source");
      // Dates arrive as "YYYY-MM"; the scorer wants a full date or null.
      const date = /^\d{4}-\d{2}$/.test(source.date || "") ? source.date + "-01" : null;
      breaches.push({ title, key: baseName(title), date, dataClasses: [], sources: ["LeakCheck"] });
    }

    // The unattributable field union, as a single undated record.
    const classes = new Set();
    for (const field of data.fields || []) {
      const dataClass = LEAKCHECK_FIELD_CLASSES[String(field).toLowerCase()];
      if (dataClass) classes.add(dataClass);
    }
    if (classes.size) {
      const title = "Aggregated exposed fields";
      breaches.push({ title, key: baseName("leakcheck aggregate fields"), date: null, dataClasses: [...classes], sources: ["LeakCheck"] });
    }
    return { ok: true, breaches };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// ---- XposedOrNot (no key) ---------------------------------------------------
// Returns breach NAMES only. They carry no data classes here, so each record
// scores zero on its own; its value is coverage. A breach the other providers
// miss still appears in the list, and if HIBP also knows it the two merge and
// HIBP supplies the classes and the date.
//
// Enhancement path: /v1/breaches holds per-breach metadata including data
// classes, but that is one extra request per breach, which is why it is not
// used on the live path.
export async function queryXposedOrNot(email) {
  try {
    const res = await fetchWithTimeout("https://api.xposedornot.com/v1/check-email/" + encodeURIComponent(email), {
      headers: { accept: "application/json", "user-agent": "Exposio-Research-SelfAssessment" },
    });
    if (res.status === 404) return { ok: true, breaches: [] };
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    if (!res.ok) return { ok: false, reason: "error" };

    const data = await res.json();
    if (!data || data.Error) return { ok: true, breaches: [] }; // "Not found"

    // Shape is {"breaches": [[ "Name", "Name", ... ]]} — a list holding one list.
    const names = Array.isArray(data.breaches) ? data.breaches.flat() : [];
    const breaches = [];
    const seen = new Set();
    for (const name of names) {
      const title = cleanTitle(name);
      const key = baseName(title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      breaches.push({ title, key, date: null, dataClasses: [], sources: ["XposedOrNot"] });
    }
    return { ok: true, breaches };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// ---- Hudson Rock (free OSINT endpoint, no key) ------------------------------
// A DIFFERENT CLASS OF EXPOSURE. Everything else here reports that a company
// lost a database. This reports that THIS PERSON'S OWN MACHINE was infected by
// infostealer malware, which harvested every stored credential, cookie and
// session from the browser.
//
// OPEN MODEL QUESTION (thesis): an infection fits neither clock. It is not a
// revocable exposure decaying from a fixed date, and not an immutable attribute
// that never decays — it is ongoing until the machine is cleaned, and it
// invalidates the playbook's central advice, because changing one password is
// useless while the thief is still reading the keyboard.
//
// Until that is settled it is scored conservatively, as a credential breach
// dated at the infection date. That UNDER-states it, and the under-statement is
// deliberate and documented rather than silent.
export async function queryHudsonRock(email) {
  try {
    const url = "https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email?email=" + encodeURIComponent(email);
    const res = await fetchWithTimeout(url, {
      headers: { accept: "application/json", "user-agent": "Exposio-Research-SelfAssessment" },
    });
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    if (!res.ok) return { ok: false, reason: "error" };

    const data = await res.json();
    const stealers = Array.isArray(data && data.stealers) ? data.stealers : [];
    const breaches = stealers.map((stealer, index) => {
      const raw = stealer.date_compromised || stealer.date_uploaded || "";
      const date = /^\d{4}-\d{2}-\d{2}/.test(raw) ? String(raw).slice(0, 10) : null;
      const title = "Infostealer infection" + (stealers.length > 1 ? " #" + (index + 1) : "");
      return {
        title,
        // Distinct key per infection: two infections are two events, and they
        // must not collapse into one the way two namings of one breach should.
        key: "infostealer" + (date ? date.replace(/-/g, "") : String(index)),
        date,
        dataClasses: ["Passwords", "Usernames"],
        sources: ["Hudson Rock"],
      };
    });
    return { ok: true, breaches };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// ---- demo fixtures ----------------------------------------------------------
// Used only when devFlags.mockBreaches is on: local development, or a preview
// deployment with EXPOSIO_DEMO=1. Never on production (see lib/config.js), and
// the interface always shows a "demo data" banner when it is active.
//
// Any address returns the same mix, which exercises every scoring path
// (financial, credentials, email-only, a cross-source duplicate and an undated
// record). "clean@example.com" returns nothing, for testing the empty result.
export function mockLookup(identifier, kind = "email") {
  if (identifier === "clean@example.com") return { hibp: { ok: true, breaches: [] }, dehashed: { ok: true, breaches: [] } };
  // A phone lookup has no HIBP leg, so the fixture mirrors that asymmetry
  // rather than inventing coverage the real system does not have.
  if (kind === "phone") {
    return {
      hibp: null,
      dehashed: { ok: true, breaches: [
        { title: "Telecom combolist 2022", key: baseName("Telecom combolist 2022"), date: null, dataClasses: ["Phone numbers", "Names"], sources: ["DeHashed"] },
        { title: "Retail loyalty leak", key: baseName("Retail loyalty leak"), date: null, dataClasses: ["Phone numbers", "Physical addresses", "Email addresses"], sources: ["DeHashed"] },
      ] },
    };
  }
  const hibp = [
    { title: "Ticketmaster", key: "ticketmaster", date: "2024-05-20", dataClasses: ["Email addresses", "Names", "Passwords", "Credit card numbers"], sources: ["HIBP"] },
    { title: "LinkedIn", key: "linkedin", date: "2016-05-18", dataClasses: ["Email addresses", "Passwords"], sources: ["HIBP"] },
    { title: "Canva", key: "canva", date: "2019-05-24", dataClasses: ["Email addresses", "Names", "Usernames", "Geographic locations"], sources: ["HIBP"] },
  ];
  const dehashed = [
    { title: "linkedin.com", key: baseName("linkedin.com"), date: null, dataClasses: ["Email addresses", "Passwords", "Phone numbers"], sources: ["DeHashed"] },
    { title: "Combolist 2023", key: baseName("Combolist 2023"), date: null, dataClasses: ["Email addresses", "Passwords"], sources: ["DeHashed"] },
  ];
  return { hibp: { ok: true, breaches: hibp }, dehashed: { ok: true, breaches: dehashed } };
}

// ---- merging ----------------------------------------------------------------
// The same breach often appears in both sources under different names
// ("LinkedIn" vs "linkedin.com"). Records are merged when their base names
// match; data classes are combined and HIBP's date is kept (DeHashed has none).
//
// Known limitation: two different incidents at the same company (e.g. a 2016
// breach and a 2021 scrape) collapse into one when DeHashed has no date to tell
// them apart. That under-counts rather than double-counts — the safer error
// for a score that tells people how worried to be.
export function mergeBreaches(...lists) {
  const merged = new Map();
  for (const list of lists) {
    for (const breach of list) {
      const existing = merged.get(breach.key);
      if (!existing) {
        merged.set(breach.key, { ...breach, dataClasses: [...breach.dataClasses], sources: [...breach.sources] });
        continue;
      }
      existing.dataClasses = [...new Set([...existing.dataClasses, ...breach.dataClasses])];
      existing.sources = [...new Set([...existing.sources, ...breach.sources])];
      if (!existing.date && breach.date) existing.date = breach.date;
      if (breach.sources.includes("HIBP")) existing.title = breach.title; // HIBP titles are curated
    }
  }
  return [...merged.values()];
}

// "LinkedIn", "linkedin.com", "LinkedIn Dump 2016" → "linkedin"
//
// This is the only thing standing between five providers and a five-times
// inflated score. The credential half of the model is a SUM over records, so
// any breach that fails to collapse is counted again. The identity half is a
// set union and is unaffected, which is why this matters for the fast clock
// specifically.
//
// The TLD list is long on purpose: providers disagree about suffixes more than
// about names. HIBP says "Ticketek", LeakCheck says "Ticketek.com.au", and with
// only ".com" stripped those became "ticketek" and "ticketekau" — two records,
// one breach, double severity.
const TLDS = "com|net|org|io|co|info|biz|me|tv|cc|xyz|online|site|shop|app|dev" +
  "|de|fr|uk|ru|au|nl|br|in|it|es|pl|se|no|dk|fi|cz|hu|gr|pt|ro|ch|at|be|ua|tr" +
  "|us|ca|jp|cn|kr|mx|ar|za|nz|ie|il|sg|hk|tw|th|vn|id|ph|my";

export function baseName(name) {
  return String(name)
    .toLowerCase()
    // Repeat, so multi-part suffixes such as ".com.au" or ".co.uk" fully unwind.
    .replace(new RegExp("\\.(" + TLDS + ")\\b", "g"), "")
    .replace(new RegExp("\\.(" + TLDS + ")\\b", "g"), "")
    .replace(/\b(19|20)\d{2}\b/g, "")
    // "list" is here because providers write "combo list" as two words. Without
    // it, "Adobe combo list" normalises to "adobelist" and fails to resolve
    // against "adobe", leaving the record undated and therefore scored on an
    // assumption. Found by npm run validate, not by reading the code.
    .replace(/\b(dump|leak|leaks|leaked|breach|breaches|database|db|dataset|scrape|scraped|combo|combolist|collection|list|data|inc|ltd|llc|gmbh)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Breach titles come from third parties and later flow into an LLM prompt.
// Keep letters, digits and basic punctuation; cap the length. This removes
// markup and control characters; the prompt ALSO treats titles as untrusted.
export function cleanTitle(value) {
  const text = String(value || "")
    .replace(/[^\p{L}\p{N} .,&'()\-_:]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
  return text || "Unknown source";
}


// ---- BreachDirectory: a cipher enricher, NOT a source -----------------------
// The only service consulted that reports HOW a leaked password was stored,
// which is the one dimension the model otherwise lacks. It is deliberately not
// a provider, for two independent reasons.
//
// IT IS NOT AN INDEPENDENT SOURCE. Its own listing states that portions of its
// data come from HaveIBeenPwned, Leakcheck.io and Vigilante.pw. Two of those
// are already queried directly here. Admitting it to the registry would put
// "HIBP" and "BreachDirectory" in one record's source list and lift the
// uncorroborated penalty in lib/confidence.js, which exists precisely to
// reward agreement BETWEEN INDEPENDENT observers. Corroboration by a
// re-publisher of the same upstream feed is not corroboration at all.
//
// IT RETURNS CREDENTIAL MATERIAL. The service answers an address with the
// leaked passwords themselves: a partially censored plaintext and a SHA-1 of
// each. None of it is kept. This module extracts the ALGORITHM NAME and
// discards the rest at the boundary, because the algorithm is what the model
// needs and the credential material is what NFR2 forbids this system from
// handling. A self-test asserts no field resembling a password or hash can
// survive.
//
// So it contributes no records and no source attribution: it only annotates
// breaches the real providers already found, exactly as the bundled catalogue
// annotates them with dates.
//
// SHAPE NOT VERIFIED AGAINST THE LIVE API. Written from the published field
// names; the service sits behind bot protection and could not be inspected.
// It fails closed: an unrecognised response yields no cipher rather than a
// wrong one.
const CIPHER_FIELDS = ["hash_type", "hashType", "algorithm", "algo", "cipher", "type"];

export function cipherFromRecord(record) {
  if (!record || typeof record !== "object") return null;
  for (const f of CIPHER_FIELDS) {
    const v = record[f];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  // NOT read as a cipher: a `sha1` field here is BreachDirectory's own hash of
  // the plaintext it holds, published so a guess can be checked without the
  // password being handed over. It says nothing about how the breached service
  // stored the password, and treating it as "SHA-1 storage" would attribute a
  // weak cipher to breaches that may well have used bcrypt.
  return null;
}

// The weakest protection reported for a breach is the one that counts: if any
// copy of the password was stored in plaintext, that is the exposure.
function weaker(a, b) {
  if (!a) return b;
  if (!b) return a;
  const rank = { plaintext: 0, md5: 1, sha1: 1, ntlm: 1, sha256: 2, sha512: 2, pbkdf2: 3, bcrypt: 4, scrypt: 4, argon2: 4 };
  const r = (x) => rank[String(x).toLowerCase().replace(/[^a-z0-9]/g, "")] ?? 9;
  return r(a) <= r(b) ? a : b;
}

/** True when the service holds a usable plaintext for this record.
 *
 *  This is the signal that survives. Whether the password was stored in
 *  plaintext or was stored hashed and has since been cracked, the result is
 *  the same: the credential is recovered and usable today. Time-to-crack is a
 *  proxy for that question; a recovered plaintext is the question answered.
 *  So it maps to the maximum credential weight, and its ABSENCE means only
 *  that this service has not recovered it — never that the password is safe. */
export function credentialRecovered(record) {
  if (!record || typeof record !== "object") return false;
  return typeof record.password === "string" && record.password.trim().length > 0;
}

/** Fetch the algorithm for each breach this address appears in.
 *  Returns Map<normalised breach name, cipher>. Never returns breach records. */
export async function fetchCipherMap(email, key) {
  if (!key) return new Map();
  try {
    const url = "https://breachdirectory.p.rapidapi.com/?func=auto&term=" + encodeURIComponent(email);
    const res = await fetchWithTimeout(url, {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": "breachdirectory.p.rapidapi.com",
        accept: "application/json",
      },
    });
    if (!res.ok) return new Map();
    const data = await res.json();
    const rows = Array.isArray(data && data.result) ? data.result : [];
    const map = new Map();
    for (const row of rows) {
      const cipher = cipherFromRecord(row);
      if (!cipher) continue;
      for (const raw of String(row && row.sources ? row.sources : "").split(/[,;]/)) {
        const k = baseName(cleanTitle(raw));
        if (k) map.set(k, weaker(map.get(k), cipher));
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Annotate merged breaches in place. Adds `cipher` and nothing else. */
export function applyCiphers(breaches, cipherMap) {
  if (!cipherMap || !cipherMap.size) return { breaches, ciphersResolved: 0 };
  let n = 0;
  for (const b of breaches) {
    const c = cipherMap.get(b.key || baseName(b.title));
    if (c) { b.cipher = c; n++; }
  }
  return { breaches, ciphersResolved: n };
}


/** BreachDirectory as a SOURCE.
 *
 *  Admitted to the registry for coverage: its Vigilante.pw feed reaches
 *  breaches the other five do not. Marked non-independent in lib/confidence.js
 *  so it cannot corroborate HIBP or LeakCheck, whose data it partly
 *  re-publishes.
 *
 *  What crosses this boundary: a breach name, and one boolean saying the
 *  service holds a usable plaintext. The censored password and the SHA-1 are
 *  read to compute that boolean and then dropped. Nothing else is kept, and a
 *  self-test asserts it.
 */
export async function queryBreachDirectory(email, key) {
  if (!key) return { ok: false, reason: "no_key" };
  try {
    const url = "https://breachdirectory.p.rapidapi.com/?func=auto&term=" + encodeURIComponent(email);
    const res = await fetchWithTimeout(url, {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": "breachdirectory.p.rapidapi.com",
        accept: "application/json",
      },
    });
    if (res.status === 404) return { ok: true, breaches: [] };
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "auth" };
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    if (!res.ok) return { ok: false, reason: "error" };

    const data = await res.json();
    const rows = Array.isArray(data && data.result) ? data.result : [];
    const byKey = new Map();
    for (const row of rows) {
      const recovered = credentialRecovered(row);
      const cipher = cipherFromRecord(row);
      const names = String(row && row.sources ? row.sources : "")
        .split(/[,;]/).map((n) => cleanTitle(n)).filter(Boolean);
      for (const title of names) {
        const k = baseName(title);
        if (!k) continue;
        const prev = byKey.get(k);
        if (!prev) {
          byKey.set(k, {
            title, key: k, date: null,
            dataClasses: ["Passwords"],
            sources: ["BreachDirectory"],
            cipher: cipher || null,
            credentialRecovered: recovered,
          });
        } else {
          prev.credentialRecovered = prev.credentialRecovered || recovered;
          if (cipher && !prev.cipher) prev.cipher = cipher;
        }
      }
    }
    return { ok: true, breaches: [...byKey.values()] };
  } catch {
    return { ok: false, reason: "error" };
  }
}
