// lib/crypto.js
// ─────────────────────────────────────────────────────────────────────────────
// Small, dependency-free crypto helpers built on the Web Crypto API
// (globalThis.crypto). The same API exists on Vercel's Edge runtime, in every
// modern browser, and in Node 18+ — so these functions can be unit-tested
// offline with plain `node` and behave identically in production.
// ─────────────────────────────────────────────────────────────────────────────

const encoder = new TextEncoder();

// ---- base64url ------------------------------------------------------------
// Tokens travel in JSON bodies; base64url avoids "+", "/" and "=" so a token
// is a single clean string with no escaping problems anywhere.
export function b64urlEncode(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64urlDecode(text) {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (text.length % 4)) % 4);
  const binary = atob(padded); // throws on malformed input — callers catch it
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

// ---- HMAC-SHA256 -----------------------------------------------------------
// Importing a key is comparatively slow, so each secret's CryptoKey is cached.
const keyCache = new Map();

async function hmacKey(secret) {
  if (!keyCache.has(secret)) {
    keyCache.set(
      secret,
      crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"])
    );
  }
  return keyCache.get(secret);
}

// Returns the raw 32-byte signature of `message` under `secret`.
export async function hmacSign(secret, message) {
  const key = await hmacKey(secret);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

// Checks a signature. crypto.subtle.verify compares in constant time, which
// matters: a byte-by-byte `===` would leak how many leading bytes matched.
export async function hmacVerify(secret, message, signatureBytes) {
  const key = await hmacKey(secret);
  return crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(message));
}

// Keyed hash rendered as hex. Used to turn an email or IP address into an
// opaque identifier: without the server secret nobody can tell which email a
// hash belongs to, even by hashing a list of guesses (unlike plain SHA-256).
export async function keyedHashHex(secret, label, value) {
  const sig = await hmacSign(secret, label + ":" + value);
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ---- random verification codes --------------------------------------------
// Uniformly random decimal digits. Bytes >= 250 are rejected: 250 is the
// largest multiple of 10 below 256, so `byte % 10` stays perfectly unbiased.
export function randomDigits(length) {
  const digits = [];
  const buffer = new Uint8Array(1);
  while (digits.length < length) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < 250) digits.push(buffer[0] % 10);
  }
  return digits.join("");
}

// Constant-time string equality for equal-length hex strings.
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
