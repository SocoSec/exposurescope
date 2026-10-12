// POST /api/verify/check   { email | phone, code, challenge }  →  { scanToken }
// ─────────────────────────────────────────────────────────────────────────────
// Step 2 of 3. Proves the browser can read the inbox or the handset: recompute
// the code's tag and compare it with the one sealed in the challenge. On
// success, issue a SCAN token authorising exactly one thing — a breach lookup
// for this identifier, of this kind.
// ─────────────────────────────────────────────────────────────────────────────

import { env } from "../../../../lib/config.js";
import { signToken, verifyToken, identifierId, codeMatches, TTL } from "../../../../lib/tokens.js";
import { rateLimit, clientId } from "../../../../lib/ratelimit.js";
import { json, fail, tooMany, readJson, normalizeIdentifier } from "../../../../lib/http.js";

export const runtime = "edge";

export async function POST(req) {
  if (!env.secret) return fail("unavailable", 503);

  const body = await readJson(req, 10000);
  const id = normalizeIdentifier(body);
  const code = String(body?.code || "").trim();
  if (!id || !/^\d{6}$/.test(code)) return fail("bad_code", 400);

  // 10 guesses per 15 minutes per client: brute-forcing a 6-digit code
  // (1,000,000 options) inside a 10-minute challenge is not realistic.
  const limit = await rateLimit("vcheck-ip", await clientId(req, env.secret), 10, 900);
  if (!limit.ok) return tooMany(limit.retryAfter);

  const challenge = await verifyToken(env.secret, body?.challenge, "challenge");
  if (!challenge || typeof challenge.cexp !== "number" || challenge.cexp < Date.now()) return fail("expired", 400);

  // The challenge must match this identifier AND this kind. The hash context
  // already separates the two namespaces, so the kind check is belt and
  // braces — but it means a mismatch fails on an explicit comparison rather
  // than resting on a hash collision being impossible.
  const kind = challenge.k === "phone" ? "phone" : "email";
  if (kind !== id.kind) return fail("bad_code", 400);

  const eid = await identifierId(env.secret, id.kind, id.value);
  if (challenge.eid !== eid) return fail("bad_code", 400); // challenge was for another identifier

  if (!(await codeMatches(env.secret, eid, code, challenge.cexp, challenge.tag))) return fail("bad_code", 400);

  const scanToken = await signToken(env.secret, { typ: "scan", eid, k: kind });
  return json({ scanToken, expiresAt: Date.now() + TTL.scan });
}
