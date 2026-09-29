// lib/http.js
// ─────────────────────────────────────────────────────────────────────────────
// Response and request helpers shared by every API route.
//
// Error policy: routes return { error: <code> } with a short, stable code such
// as "rate_limited" or "bad_code". The browser maps the code to a message in
// the user's language. Provider responses, stack traces and exception text are
// NEVER sent to the client — they can reveal keys' status, model names, or
// internals an attacker can use.
// ─────────────────────────────────────────────────────────────────────────────

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store", // personal results must never sit in a browser or CDN cache
      ...extraHeaders,
    },
  });
}

export function fail(code, status, extra = {}) {
  return json({ error: code, ...extra }, status);
}

export function tooMany(retryAfter) {
  return json({ error: "rate_limited", retryAfter }, 429, { "retry-after": String(retryAfter) });
}

// Read a JSON body with a hard size cap. The cap is checked on the raw text,
// before JSON.parse, so a huge body can't burn CPU. Returns null when invalid.
export async function readJson(req, maxBytes) {
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

// Emails: trimmed, lower-cased, RFC-length-capped, simple shape check. Deep
// validation is pointless — the verification email is the real test.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

// Languages the UI offers. Anything else falls back to English, so this value
// can be safely placed into a prompt or email template.
export const LANGUAGE_NAMES = { en: "English", fr: "French", de: "German", es: "Spanish", it: "Italian", cs: "Czech" };
export function normalizeLang(value) {
  return Object.prototype.hasOwnProperty.call(LANGUAGE_NAMES, value) ? value : "en";
}
