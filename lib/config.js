// lib/config.js
// ─────────────────────────────────────────────────────────────────────────────
// ONE place that reads environment variables. Every API route imports `env`
// from here instead of touching process.env directly, so:
//   • the full list of what production needs lives in one file, and
//   • dev-only switches (mock data, showing the code on screen) are gated in
//     one spot and can never switch on in a deployed build.
// ─────────────────────────────────────────────────────────────────────────────

// `next dev` sets NODE_ENV=development. Every Vercel deployment (preview AND
// production) and `next start` run with NODE_ENV=production. So devMode is
// true ONLY on a developer's own machine.
export const devMode = process.env.NODE_ENV === "development";

// Vercel sets VERCEL_ENV to "production", "preview" or "development".
// Preview deployments sit behind Vercel's login, so the testing switches below
// may be used there — but NEVER on production, whatever the variables say.
const isVercelProduction = process.env.VERCEL_ENV === "production";
const testingAllowed = !isVercelProduction && (devMode || process.env.VERCEL_ENV === "preview");

// A fixed secret for local development only, so `npm run dev` works without
// any setup. It is useless in production because devMode is false there.
const DEV_SECRET = "exposio-local-dev-secret-do-not-use-in-production-0000";

export const env = {
  // Signs every token (challenge, scan, report). Must be long and random in
  // production — generate with:  openssl rand -hex 32
  secret: process.env.EXPOSIO_SECRET || (devMode ? DEV_SECRET : ""),

  // Breach intelligence sources. Either, both, or none may be configured.
  // (DEHASHED_USERNAME is deliberately NOT read: the v2 API has no Basic auth.)
  hibpKey: process.env.HIBP_API_KEY || "",
  dehashedKey: process.env.DEHASHED_API_KEY || "",
  // BreachDirectory (via RapidAPI). Queried for ONE field only: the name of
  // the algorithm a leaked password was stored under. See the parser in
  // lib/sources.js — the password and hash values it returns are discarded at
  // the boundary and never enter a report, a log or a model prompt.
  breachDirectoryKey: process.env.BREACHDIRECTORY_API_KEY || "",

  // Intelligence X (IntelX) — searches the leaks.public bucket for the
  // verified identifier. Returns leak/archive names and dates; data classes
  // cannot be inferred from file metadata and are left empty, so IntelX
  // contributes coverage (a breach the other providers missed) but not
  // per-class severity on its own. Free tier: 50 /intelligent/search calls/day.
  intelxKey: process.env.INTELX_API_KEY || "",

  // ExpoBot. Haiku is the default: the chat is short, high-volume and
  // constrained to a fixed action library, so a small fast model fits.
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  chatModel: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",

  // Transactional email for the 6-digit verification code (Resend).
  resendKey: process.env.RESEND_API_KEY || "",
  fromEmail: process.env.EXPOSIO_FROM_EMAIL || "",

  // SMS for the phone path (Twilio). Absent by default, and all three are
  // required: without them the phone path stays closed, so no deployment
  // gains the ability to look up phone numbers merely by being redeployed.
  smsSid: process.env.TWILIO_ACCOUNT_SID || "",
  smsToken: process.env.TWILIO_AUTH_TOKEN || "",
  smsFrom: process.env.TWILIO_FROM_NUMBER || "",

  // Optional shared rate-limit store. Without it, limits are per server
  // instance (weaker, but still blocks naive abuse).
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL || "",
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",

  // Daily cost ceilings across ALL users (only exact with Upstash configured).
  dailyScanCap: toInt(process.env.EXPOSIO_DAILY_SCAN_CAP, 300),
  dailyChatCap: toInt(process.env.EXPOSIO_DAILY_CHAT_CAP, 1500),
  // SMS costs real money per message, so it gets its own, much lower ceiling.
  dailySmsCap: toInt(process.env.EXPOSIO_DAILY_SMS_CAP, 100),
};

// True only when every SMS credential is present. On a real deployment the
// phone path is gated on this, so "phone lookups are available" and "we can
// prove you own the number" can never come apart.
export const phoneEnabled = Boolean(env.smsSid && env.smsToken && env.smsFrom);

// Testing switches for local development and PREVIEW deployments only.
// They let the whole flow be demonstrated before the email and breach-data
// accounts are paid for. On production they are always off: `testingAllowed`
// is false there, so setting the variables in Vercel Production does nothing.
//
// Whenever either is on, the interface says so — a code shown on screen or
// example breach data must never be mistaken for the real thing.
export const devFlags = {
  // Serve fixture breaches for *@example.com instead of calling real APIs.
  mockBreaches: testingAllowed && (process.env.EXPOSIO_DEMO === "1" || process.env.EXPOSIO_MOCK === "1"),
  // Return the verification code in the response instead of emailing it.
  showCode: testingAllowed && (process.env.EXPOSIO_SHOW_CODE === "1" || process.env.EXPOSIO_DEV_SHOW_CODE === "1"),
};

// Whether the phone path may be used at all. Real SMS, or the on-screen code
// used for development and preview demos — and `showCode` is itself gated to
// dev/preview, so this can never open the phone path on production without
// genuine SMS credentials. Without this the feature would be impossible to
// demonstrate or test without buying an SMS account, which is how features
// end up shipped unexercised.
export const phoneAvailable = phoneEnabled || devFlags.showCode;

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
