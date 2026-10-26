// lib/tokens.js
// ─────────────────────────────────────────────────────────────────────────────
// Stateless signed tokens — how a zero-storage server still "remembers".
//
// Instead of saving "alice@x.com verified at 10:02" in a database, the server
// hands the browser a note saying exactly that, SIGNED with a secret only the
// server knows. On the next request the browser sends the note back; the
// server checks the signature and the expiry. Nothing is stored anywhere, and
// a forged or edited note fails the signature check.
//
// Format:  v1.<payload as base64url JSON>.<HMAC-SHA256 signature as base64url>
//
// Three token types (field `typ`), each unlocking exactly one next step:
//   challenge  (10 min) — "a code was emailed to this email"   → /api/verify/check
//   scan       (15 min) — "this browser proved it owns email"   → /api/breach
//   report     (60 min) — "the server produced this report"     → /api/chat
// ─────────────────────────────────────────────────────────────────────────────

import { b64urlEncode, b64urlDecode, hmacSign, hmacVerify, keyedHashHex } from "./crypto.js";

const VERSION = "v1";
const MAX_TOKEN_LENGTH = 8000; // reject absurdly large inputs before any work

export const TTL = {
  challenge: 10 * 60 * 1000,
  scan: 15 * 60 * 1000,
  report: 60 * 60 * 1000,
};

// Create a token. `payload` must include `typ`; the expiry is added here.
export async function signToken(secret, payload, now = Date.now()) {
  if (!secret) throw new Error("signing secret missing");
  const body = { ...payload, exp: now + TTL[payload.typ] };
  const encoded = b64urlEncode(new TextEncoder().encode(JSON.stringify(body)));
  const signature = await hmacSign(secret, VERSION + "." + encoded);
  return VERSION + "." + encoded + "." + b64urlEncode(signature);
}

// Verify a token. Returns the payload, or null for ANY problem (bad format,
// bad signature, wrong type, expired). Callers only ever need "valid or not",
// and returning null for everything avoids telling an attacker which check failed.
export async function verifyToken(secret, token, expectedType, now = Date.now()) {
  try {
    if (!secret || typeof token !== "string" || token.length > MAX_TOKEN_LENGTH) return null;
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== VERSION) return null;
    const ok = await hmacVerify(secret, VERSION + "." + parts[1], b64urlDecode(parts[2]));
    if (!ok) return null; // signature first: never parse data an attacker wrote
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
    if (payload.typ !== expectedType) return null; // a scan token can't be used as a report token
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

// Opaque, keyed identifier. Tokens carry this instead of the address or number
// itself, and rate limits count against it.
//
// The KIND is the hash context, so the two namespaces cannot collide: a scan
// token issued for a phone number can never satisfy the check for an email
// address, even if the two strings were somehow equal. Without this, adding a
// second identifier type would quietly weaken the binding the whole
// verification design rests on.
export function identifierId(secret, kind, value) {
  return keyedHashHex(secret, kind === "phone" ? "phone" : "email", value);
}

// Kept for the email path and existing callers.
export function emailId(secret, email) {
  return identifierId(secret, "email", email);
}

// The challenge token must NOT contain the code (the browser holds the token).
// It holds a keyed tag of (email, code, expiry) instead. Checking a guess means
// recomputing the tag on the server — so guessing is impossible offline and
// every attempt hits the rate-limited /api/verify/check endpoint.
export function codeMessage(eid, code, exp) {
  return "code:" + eid + ":" + code + ":" + exp;
}

export async function codeTag(secret, eid, code, exp) {
  return b64urlEncode(await hmacSign(secret, codeMessage(eid, code, exp)));
}

export async function codeMatches(secret, eid, code, exp, tag) {
  try {
    return await hmacVerify(secret, codeMessage(eid, code, exp), b64urlDecode(tag));
  } catch {
    return false;
  }
}
