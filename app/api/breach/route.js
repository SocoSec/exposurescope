// POST /api/breach   { email, scanToken }  →  { report, sources, sourcesFailed, reportToken }
// ─────────────────────────────────────────────────────────────────────────────
// Step 3 of 3. Looks up a VERIFIED email in the breach sources, merges the
// results, computes the Breach Risk score on the server, and returns the report
// plus a signed REPORT token that unlocks ExpoBot for this report only.
//
// Order of checks is deliberate — cheapest and most restrictive first, paid
// API calls last:  body → token ownership → rate limits → daily cap → lookups.
// ─────────────────────────────────────────────────────────────────────────────

import { env, devFlags } from "../../../lib/config.js";
import { signToken, verifyToken, emailId } from "../../../lib/tokens.js";
import { rateLimit, clientId } from "../../../lib/ratelimit.js";
import { json, fail, tooMany, readJson, normalizeEmail } from "../../../lib/http.js";
import { queryHIBP, queryDeHashed, mockLookup, mergeBreaches } from "../../../lib/sources.js";
import { emailReport } from "../../../lib/score.js";
import { applicableIds } from "../../../lib/playbook.js";
import { compactReport } from "../../../lib/expobot.js";

export const runtime = "edge";

export async function POST(req) {
  if (!env.secret) return fail("unavailable", 503);

  const body = await readJson(req, 10000);
  if (body?.phone) return fail("phone_paused", 400); // see lib/sources.js
  const email = normalizeEmail(body?.email);
  if (!email) return fail("invalid_email", 400);

  // Ownership: the scan token must exist, be unexpired, and belong to THIS email.
  const scan = await verifyToken(env.secret, body?.scanToken, "scan");
  const eid = await emailId(env.secret, email);
  if (!scan || scan.eid !== eid) return fail("unverified", 401);

  const perClient = await rateLimit("breach-ip", await clientId(req, env.secret), 10, 3600);
  if (!perClient.ok) return tooMany(perClient.retryAfter);
  const perEmail = await rateLimit("breach-email", eid, 5, 3600);
  if (!perEmail.ok) return tooMany(perEmail.retryAfter);
  const daily = await rateLimit("breach-global", "all", env.dailyScanCap, 86400);
  if (!daily.ok) return fail("daily_cap", 503);

  // Which sources are on? Mock data only exists on a developer machine.
  let hibp = null;
  let dehashed = null;
  if (devFlags.mockBreaches) {
    ({ hibp, dehashed } = mockLookup(email));
  } else {
    if (!env.hibpKey && !env.dehashedKey) return fail("not_configured", 503);
    // Both providers are queried in parallel; total time ≈ the slower one.
    [hibp, dehashed] = await Promise.all([
      env.hibpKey ? queryHIBP(email, env.hibpKey) : null,
      env.dehashedKey ? queryDeHashed(email, env.dehashedKey, env.dehashedUser) : null,
    ]);
  }

  const sources = [];
  const sourcesFailed = [];
  const lists = [];
  for (const [name, result] of [["HIBP", hibp], ["DeHashed", dehashed]]) {
    if (!result) continue; // not configured
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

  const report = emailReport(mergeBreaches(...lists));
  const ids = applicableIds(report);
  const reportToken = await signToken(env.secret, { typ: "report", r: compactReport(report, ids, sources) });

  // `demo` tells the browser to show the "example data" banner.
  return json({ report, sources, sourcesFailed, reportToken, demo: devFlags.mockBreaches });
}
