// POST /api/breach   { email | phone, scanToken }  →  { report, sources, … }
// ─────────────────────────────────────────────────────────────────────────────
// Step 3 of 3. Looks up a VERIFIED identifier in the breach sources, merges the
// results, computes the Breach Risk score on the server, and returns the report
// plus a signed REPORT token that unlocks ExpoBot for this report only.
//
// Order of checks is deliberate — cheapest and most restrictive first, paid
// API calls last:  body → token ownership → rate limits → daily cap → lookups.
//
// The identifier KIND comes from the signed scan token, never from the request
// body. A caller cannot submit a phone number alongside a token issued for an
// email address and have it searched as a phone: the keyed hash would not
// match, and nor would the kind.
// ─────────────────────────────────────────────────────────────────────────────

import { env, devFlags, phoneAvailable } from "../../../lib/config.js";
import { signToken, verifyToken, identifierId } from "../../../lib/tokens.js";
import { rateLimit, clientId } from "../../../lib/ratelimit.js";
import { json, fail, tooMany, readJson, normalizeIdentifier } from "../../../lib/http.js";
import { queryHIBP, queryDeHashed, mockLookup, mergeBreaches } from "../../../lib/sources.js";
import { emailReport } from "../../../lib/score.js";
import { applicableIds } from "../../../lib/playbook.js";
import { compactReport } from "../../../lib/expobot.js";

export const runtime = "edge";

export async function POST(req) {
  if (!env.secret) return fail("unavailable", 503);

  const body = await readJson(req, 10000);
  const id = normalizeIdentifier(body);
  if (!id) return fail(body && body.phone ? "invalid_phone" : "invalid_email", 400);
  if (id.kind === "phone" && !phoneAvailable) return fail("phone_unavailable", 503);

  // Ownership: the scan token must exist, be unexpired, belong to THIS
  // identifier, and have been issued for THIS kind.
  const scan = await verifyToken(env.secret, body?.scanToken, "scan");
  const kind = scan && scan.k === "phone" ? "phone" : "email";
  const eid = await identifierId(env.secret, id.kind, id.value);
  if (!scan || scan.eid !== eid || kind !== id.kind) return fail("unverified", 401);

  const perClient = await rateLimit("breach-ip", await clientId(req, env.secret), 10, 3600);
  if (!perClient.ok) return tooMany(perClient.retryAfter);
  const perIdentifier = await rateLimit("breach-id", eid, 5, 3600);
  if (!perIdentifier.ok) return tooMany(perIdentifier.retryAfter);
  const daily = await rateLimit("breach-global", "all", env.dailyScanCap, 86400);
  if (!daily.ok) return fail("daily_cap", 503);

  // Which sources are on? Mock data only exists on a developer machine.
  // HIBP has no phone endpoint, so a phone lookup is DeHashed-only — an
  // asymmetry the interface reports rather than hides.
  let hibp = null;
  let dehashed = null;
  if (devFlags.mockBreaches) {
    ({ hibp, dehashed } = mockLookup(id.value, kind));
  } else {
    const hibpUsable = kind === "email" && env.hibpKey;
    if (!hibpUsable && !env.dehashedKey) return fail("not_configured", 503);
    // Both providers are queried in parallel; total time ≈ the slower one.
    [hibp, dehashed] = await Promise.all([
      hibpUsable ? queryHIBP(id.value, env.hibpKey) : null,
      env.dehashedKey ? queryDeHashed(id.value, env.dehashedKey, kind) : null,
    ]);
  }

  const sources = [];
  const sourcesFailed = [];
  const lists = [];
  for (const [name, result] of [["HIBP", hibp], ["DeHashed", dehashed]]) {
    if (!result) continue; // not configured, or not applicable to this kind
    if (result.ok) {
      sources.push(name);
      lists.push(result.breaches);
    } else {
      sourcesFailed.push({ source: name, reason: result.reason });
    }
  }
  // If nothing answered, say so — never show "no breaches" for a check that didn't run.
  if (sources.length === 0) return fail("sources_down", 503, { sourcesFailed });

  // In demo mode the data didn't come from HIBP or DeHashed — say so.
  if (devFlags.mockBreaches) { sources.length = 0; sources.push("Demo data"); }

  const report = emailReport(mergeBreaches(...lists), new Date(), kind);
  const ids = applicableIds(report);
  const reportToken = await signToken(env.secret, { typ: "report", r: compactReport(report, ids, sources) });

  // `demo` tells the browser to show the "example data" banner.
  return json({ report, sources, sourcesFailed, reportToken, demo: devFlags.mockBreaches });
}
