// lib/ratelimit.js
// ─────────────────────────────────────────────────────────────────────────────
// Fixed-window rate limiting: "at most N requests per identity per window".
//
// Why it matters here: every breach lookup costs money (DeHashed per query,
// HIBP per key), every ExpoBot message costs Anthropic tokens, and every
// verification email lands in a real inbox. Without limits, anyone can drain
// the keys or email-bomb a stranger with codes.
//
// Two storage modes:
//   • Upstash Redis (if UPSTASH_* env vars are set) — counts are shared by
//     every server instance, so limits and daily caps are exact.
//   • In-memory Map (fallback) — each edge instance counts on its own. Weaker,
//     but still stops a single client hammering one instance.
//
// Privacy: identities are keyed hashes (see crypto.keyedHashHex), never raw IPs
// or emails, and every counter expires with its window (at most 24 h).
// ─────────────────────────────────────────────────────────────────────────────

import { env } from "./config.js";
import { keyedHashHex } from "./crypto.js";

const memory = new Map(); // key -> count, for the fallback mode
let memorySweepAt = 0;

// Count one request for `id` in `bucket`; allow at most `max` per `windowSec`.
// Returns { ok, retryAfter } — retryAfter is seconds until the window resets.
export async function rateLimit(bucket, id, max, windowSec, now = Date.now()) {
  const windowIndex = Math.floor(now / (windowSec * 1000));
  const key = "rl:" + bucket + ":" + id + ":" + windowIndex;
  const retryAfter = Math.ceil(((windowIndex + 1) * windowSec * 1000 - now) / 1000);

  let count = null;
  if (env.upstashUrl && env.upstashToken) count = await upstashIncrement(key, windowSec);
  if (count === null) count = memoryIncrement(key, now);

  return { ok: count <= max, retryAfter };
}

// INCR creates the counter at 1 or adds 1; EXPIRE makes Redis delete it when
// the window ends. Both run in one round-trip via the REST pipeline endpoint.
async function upstashIncrement(key, windowSec) {
  try {
    const res = await fetch(env.upstashUrl.replace(/\/$/, "") + "/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.upstashToken, "content-type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, String(windowSec)]]),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const value = Number(data?.[0]?.result);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null; // store unreachable → fall back to memory rather than fail open
  }
}

function memoryIncrement(key, now) {
  // Old windows are never read again; drop everything once in a while so the
  // Map can't grow without bound on a long-lived instance.
  if (now - memorySweepAt > 10 * 60 * 1000 || memory.size > 5000) {
    memory.clear();
    memorySweepAt = now;
  }
  const next = (memory.get(key) || 0) + 1;
  memory.set(key, next);
  return next;
}

// Opaque per-client identifier from the request IP. On Vercel the platform
// sets x-forwarded-for; its first entry is the real client address.
export async function clientId(req, secret) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return (await keyedHashHex(secret, "ip", ip)).slice(0, 32);
}

// Test hook: reset the in-memory counters between unit tests.
export function _resetMemoryLimiter() {
  memory.clear();
}
