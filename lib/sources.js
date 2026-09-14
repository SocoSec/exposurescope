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
// Email searches only. Phone searches were removed: nobody can prove they own a
// phone number here yet, and an unverified phone lookup is a stalking tool.
export async function queryDeHashed(email, apiKey, username) {
  const headers = { "content-type": "application/json", accept: "application/json" };
  if (username) headers.Authorization = "Basic " + btoa(username + ":" + apiKey);
  else headers["DeHashed-Api-Key"] = apiKey;

  try {
    const res = await fetchWithTimeout("https://api.dehashed.com/v2/search", {
      method: "POST",
      headers,
      body: JSON.stringify({ query: "email:" + email, size: 100, de_dupe: true }),
    });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "auth" };
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    if (!res.ok) return { ok: false, reason: "error" };

    const data = await res.json();
    const entries = data.entries || data.results || [];
    const bySource = new Map();

    for (const entry of entries) {
      const title = cleanTitle(entry.database_name || entry.obtained_from || entry.source || "Unknown source");
      const key = baseName(title);
      const record = bySource.get(key) || { title, key, date: null, dataClasses: new Set(), sources: ["DeHashed"] };
      // Presence checks only — the leaked VALUES are never copied anywhere.
      if (entry.email) record.dataClasses.add("Email addresses");
      if (entry.password || entry.hashed_password) record.dataClasses.add("Passwords");
      if (entry.phone) record.dataClasses.add("Phone numbers");
      if (entry.address) record.dataClasses.add("Physical addresses");
      if (entry.username) record.dataClasses.add("Usernames");
      bySource.set(key, record);
    }
    const breaches = [...bySource.values()].map((r) => ({ ...r, dataClasses: [...r.dataClasses] }));
    return { ok: true, breaches };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// ---- local development fixtures --------------------------------------------
// Used only when devFlags.mockBreaches is on (never in a deployed build).
// "clean@example.com" → no breaches; any other @example.com address → a mix
// that exercises every scoring path, including a cross-source duplicate and
// an undated record.
export function mockLookup(email) {
  if (!email.endsWith("@example.com")) return { hibp: { ok: true, breaches: [] }, dehashed: { ok: true, breaches: [] } };
  if (email === "clean@example.com") return { hibp: { ok: true, breaches: [] }, dehashed: { ok: true, breaches: [] } };
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
export function baseName(name) {
  return String(name)
    .toLowerCase()
    .replace(/\.(com|net|org|io|co|info|biz|de|fr|uk|ru)\b/g, "")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\b(dump|leak|breach|database|db|scrape|combo|data)\b/g, "")
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
