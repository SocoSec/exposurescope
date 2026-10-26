// POST /api/verify/start   { email | phone, lang }  →  { challenge, devCode? }
// ─────────────────────────────────────────────────────────────────────────────
// Step 1 of 3. Sends a 6-digit code to the identifier — by email, or by SMS for
// a phone number — and returns a signed CHALLENGE token. The token holds a
// keyed tag of the code, never the code itself, so the browser holding it
// learns nothing; only someone who can read that inbox or handset can finish
// step 2.
//
// The challenge records WHICH KIND of identifier was verified, so the scan
// token issued in step 2 authorises a lookup of that kind only.
// ─────────────────────────────────────────────────────────────────────────────

import { env, phoneAvailable } from "../../../../lib/config.js";
import { randomDigits } from "../../../../lib/crypto.js";
import { signToken, identifierId, codeTag, TTL } from "../../../../lib/tokens.js";
import { rateLimit, clientId } from "../../../../lib/ratelimit.js";
import { sendVerificationCode } from "../../../../lib/mailer.js";
import { sendVerificationSms } from "../../../../lib/sms.js";
import { json, fail, tooMany, readJson, normalizeIdentifier, normalizeLang } from "../../../../lib/http.js";

export const runtime = "edge";

export async function POST(req) {
  // Fail closed: without a signing secret no token could be trusted.
  if (!env.secret) return fail("unavailable", 503);

  const body = await readJson(req, 2000);
  const id = normalizeIdentifier(body);
  if (!id) return fail(body && body.phone ? "invalid_phone" : "invalid_email", 400);
  const lang = normalizeLang(body?.lang);

  // The phone path stays closed unless a code can actually be delivered —
  // real SMS, or the on-screen code of a dev/preview build. Without this the
  // route would send nothing yet still issue a challenge, making a number
  // "verifiable" by anyone willing to guess six digits.
  if (id.kind === "phone" && !phoneAvailable) return fail("phone_unavailable", 503);

  // Two limits: per client (stops one person scanning many identifiers) and per
  // identifier (stops anyone flooding one victim's inbox or handset).
  const eid = await identifierId(env.secret, id.kind, id.value);
  const perClient = await rateLimit("vstart-ip", await clientId(req, env.secret), 5, 900);
  if (!perClient.ok) return tooMany(perClient.retryAfter);
  const perIdentifier = await rateLimit("vstart-id", eid, 3, 900);
  if (!perIdentifier.ok) return tooMany(perIdentifier.retryAfter);

  // SMS costs money per message and goes to a number the requester chooses,
  // which makes this endpoint a target for SMS pumping. Email carries no
  // comparable per-message cost, so only the phone path has a global ceiling.
  if (id.kind === "phone") {
    const daily = await rateLimit("vstart-sms-global", "all", env.dailySmsCap, 86400);
    if (!daily.ok) return fail("daily_cap", 503);
  }

  const code = randomDigits(6);
  const exp = Date.now() + TTL.challenge;
  const sent = id.kind === "phone"
    ? await sendVerificationSms(id.value, code, lang)
    : await sendVerificationCode(id.value, code, lang);
  if (!sent.ok) return fail(id.kind === "phone" ? "sms_unavailable" : "email_unavailable", 503);

  // The challenge's own expiry is set by signToken from the same TTL; the tag
  // is computed over `exp` so the code can't be reused after it expires.
  // `k` binds the challenge to the identifier kind.
  const challenge = await signToken(env.secret, {
    typ: "challenge", eid, k: id.kind, cexp: exp,
    tag: await codeTag(env.secret, eid, code, exp),
  });

  return json({ challenge, expiresAt: exp, ...(sent.devCode ? { devCode: sent.devCode } : {}) });
}
