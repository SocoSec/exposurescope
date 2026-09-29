// POST /api/verify/start   { email, lang }  →  { challenge, devCode? }
// ─────────────────────────────────────────────────────────────────────────────
// Step 1 of 3. Emails a 6-digit code to the address and returns a signed
// CHALLENGE token. The token holds a keyed tag of the code, never the code
// itself, so the browser holding it learns nothing; only someone who can read
// that inbox can finish step 2.
// ─────────────────────────────────────────────────────────────────────────────

import { env } from "../../../../lib/config.js";
import { randomDigits } from "../../../../lib/crypto.js";
import { signToken, emailId, codeTag, TTL } from "../../../../lib/tokens.js";
import { rateLimit, clientId } from "../../../../lib/ratelimit.js";
import { sendVerificationCode } from "../../../../lib/mailer.js";
import { json, fail, tooMany, readJson, normalizeEmail, normalizeLang } from "../../../../lib/http.js";

export const runtime = "edge";

export async function POST(req) {
  // Fail closed: without a signing secret no token could be trusted.
  if (!env.secret) return fail("unavailable", 503);

  const body = await readJson(req, 2000);
  const email = normalizeEmail(body?.email);
  if (!email) return fail("invalid_email", 400);
  const lang = normalizeLang(body?.lang);

  // Two limits: per client (stops one person scanning many addresses) and per
  // email (stops anyone flooding one victim's inbox with codes).
  const eid = await emailId(env.secret, email);
  const perClient = await rateLimit("vstart-ip", await clientId(req, env.secret), 5, 900);
  if (!perClient.ok) return tooMany(perClient.retryAfter);
  const perEmail = await rateLimit("vstart-email", eid, 3, 900);
  if (!perEmail.ok) return tooMany(perEmail.retryAfter);

  const code = randomDigits(6);
  const exp = Date.now() + TTL.challenge;
  const sent = await sendVerificationCode(email, code, lang);
  if (!sent.ok) return fail("email_unavailable", 503);

  // The challenge's own expiry is set by signToken from the same TTL; the tag
  // is computed over `exp` so the code can't be reused after it expires.
  const challenge = await signToken(env.secret, { typ: "challenge", eid, cexp: exp, tag: await codeTag(env.secret, eid, code, exp) });

  return json({ challenge, expiresAt: exp, ...(sent.devCode ? { devCode: sent.devCode } : {}) });
}
