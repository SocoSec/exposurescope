// POST /api/verify/check   { email, code, challenge }  →  { scanToken }
// ─────────────────────────────────────────────────────────────────────────────
// Step 2 of 3. Proves the browser can read the inbox: recompute the code's tag
// and compare it to the one sealed in the challenge. On success, issue a SCAN
// token that authorises one thing — breach lookups for this exact email.
// ─────────────────────────────────────────────────────────────────────────────

import { env } from "../../../../lib/config.js";
import { signToken, verifyToken, emailId, codeMatches, TTL } from "../../../../lib/tokens.js";
import { rateLimit, clientId } from "../../../../lib/ratelimit.js";
import { json, fail, tooMany, readJson, normalizeEmail } from "../../../../lib/http.js";

export const runtime = "edge";

export async function POST(req) {
  if (!env.secret) return fail("unavailable", 503);

  const body = await readJson(req, 10000);
  const email = normalizeEmail(body?.email);
  const code = String(body?.code || "").trim();
  if (!email || !/^\d{6}$/.test(code)) return fail("bad_code", 400);

  // 10 guesses per 15 minutes per client: brute-forcing a 6-digit code
  // (1,000,000 options) inside a 10-minute challenge is not realistic.
  const limit = await rateLimit("vcheck-ip", await clientId(req, env.secret), 10, 900);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const challenge = await verifyToken(env.secret, body?.challenge, "challenge");
  if (!challenge || typeof challenge.cexp !== "number" || challenge.cexp < Date.now()) return fail("expired", 400);

  const eid = await emailId(env.secret, email);
  if (challenge.eid !== eid) return fail("bad_code", 400); // challenge was for another address

  if (!(await codeMatches(env.secret, eid, code, challenge.cexp, challenge.tag))) return fail("bad_code", 400);

  const scanToken = await signToken(env.secret, { typ: "scan", eid });
  return json({ scanToken, expiresAt: Date.now() + TTL.scan });
}
