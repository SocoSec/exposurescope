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

// A fixed secret for local development only, so `npm run dev` works without
// any setup. It is useless in production because devMode is false there.
const DEV_SECRET = "exposio-local-dev-secret-do-not-use-in-production-0000";

export const env = {
  // Signs every token (challenge, scan, report). Must be long and random in
  // production — generate with:  openssl rand -hex 32
  secret: process.env.EXPOSIO_SECRET || (devMode ? DEV_SECRET : ""),

  // Breach intelligence sources. Either, both, or none may be configured.
  hibpKey: process.env.HIBP_API_KEY || "",
  dehashedKey: process.env.DEHASHED_API_KEY || "",
  dehashedUser: process.env.DEHASHED_USERNAME || "",

  // ExpoBot. Haiku is the default: the chat is short, high-volume and
  // constrained to a fixed action library, so a small fast model fits.
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  chatModel: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",

  // Transactional email for the 6-digit verification code (Resend).
  resendKey: process.env.RESEND_API_KEY || "",
  fromEmail: process.env.EXPOSIO_FROM_EMAIL || "",

  // Optional shared rate-limit store. Without it, limits are per server
  // instance (weaker, but still blocks naive abuse).
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL || "",
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",

  // Daily cost ceilings across ALL users (only exact with Upstash configured).
  dailyScanCap: toInt(process.env.EXPOSIO_DAILY_SCAN_CAP, 300),
  dailyChatCap: toInt(process.env.EXPOSIO_DAILY_CHAT_CAP, 1500),
};

// Dev-only switches. Both require devMode, so setting them on Vercel does nothing.
export const devFlags = {
  // Serve fixture breaches for *@example.com instead of calling real APIs.
  mockBreaches: devMode && process.env.EXPOSIO_MOCK === "1",
  // Return the verification code in the API response instead of emailing it.
  showCode: devMode && process.env.EXPOSIO_DEV_SHOW_CODE === "1",
};

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
