// POST /api/breach
// Real breach lookup across BOTH Have I Been Pwned and DeHashed, dispatched in
// parallel and merged (deduplicated by breach/source name), per the thesis MVP
// dual-source design. Keys stay server-side. Nothing is stored.
//
// Configure in Vercel env vars (either or both):
//   HIBP_API_KEY                         email only (paid HIBP subscription)
//   DEHASHED_API_KEY (+ DEHASHED_USERNAME optional)   email + phone (~$0.02/query)
//
// If neither key is set, the endpoint reports "not enabled" and the UI shows an
// honest "not checked" state rather than a misleading "safe".

export const runtime = "edge";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---- HIBP (email only) ----
async function queryHIBP(email, key) {
  if (!key || !email) return { ok: false, reason: "n/a" };
  try {
    const url = "https://haveibeenpwned.com/api/v3/breachedaccount/" + encodeURIComponent(email) + "?truncateResponse=false";
    const res = await fetch(url, { headers: { "hibp-api-key": key, "user-agent": "Exposio-Research-SelfAssessment" } });
    if (res.status === 404) return { ok: true, breaches: [] };
    if (res.status === 401) return { ok: false, reason: "HIBP key rejected" };
    if (res.status === 429) return { ok: false, reason: "HIBP rate limited" };
    if (!res.ok) return { ok: false, reason: "HIBP error " + res.status };
    const data = await res.json();
    const breaches = (Array.isArray(data) ? data : []).map((b) => ({
      source: "HIBP",
      title: b.Title || b.Name,
      key: (b.Name || b.Title || "").toLowerCase(),
      year: b.BreachDate ? b.BreachDate.slice(0, 4) : null,
      dataClasses: b.DataClasses || [],
    }));
    return { ok: true, breaches };
  } catch (e) {
    return { ok: false, reason: "HIBP failed" };
  }
}

// ---- DeHashed (email + phone) ----
async function queryDeHashed(email, phone, key, username) {
  if (!key || (!email && !phone)) return { ok: false, reason: "n/a" };
  try {
    const field = email ? "email" : "phone";
    const val = email || phone.replace(/[^0-9+]/g, "");
    const headers = { "content-type": "application/json", "accept": "application/json" };
    if (username) headers["Authorization"] = "Basic " + btoa(username + ":" + key);
    else headers["DeHashed-Api-Key"] = key;

    const res = await fetch("https://api.dehashed.com/v2/search", {
      method: "POST", headers,
      body: JSON.stringify({ query: field + ":" + val, size: 100, de_dupe: true }),
    });
    if (res.status === 401 || res.status === 403) return { ok: false, reason: "DeHashed key rejected" };
    if (res.status === 429) return { ok: false, reason: "DeHashed rate limited" };
    if (!res.ok) return { ok: false, reason: "DeHashed error " + res.status };

    const data = await res.json();
    const entries = data.entries || data.results || [];
    const seen = new Set();
    const breaches = [];
    for (const e of entries) {
      const src = e.database_name || e.obtained_from || e.source || "Unknown source";
      const k = src.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      breaches.push({
        source: "DeHashed",
        title: src,
        key: k,
        year: null,
        dataClasses: [
          e.email ? "Email addresses" : null,
          (e.password || e.hashed_password) ? "Passwords" : null,
          e.phone ? "Phone numbers" : null,
          e.address ? "Physical addresses" : null,
          e.username ? "Usernames" : null,
        ].filter(Boolean),
      });
    }
    return { ok: true, breaches };
  } catch (e) {
    return { ok: false, reason: "DeHashed failed" };
  }
}

export async function POST(req) {
  const hibpKey = process.env.HIBP_API_KEY;
  const dhKey = process.env.DEHASHED_API_KEY;
  const dhUser = process.env.DEHASHED_USERNAME;

  if (!hibpKey && !dhKey) {
    return json({ configured: false, error: "Breach lookup is not enabled on this deployment." }, 503);
  }

  let email = "", phone = "";
  try {
    const body = await req.json();
    email = (body?.email || "").toString().trim().toLowerCase();
    phone = (body?.phone || "").toString().trim();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (email && !EMAIL_RE.test(email)) return json({ error: "Enter a valid email address." }, 400);
  if (!email && !phone) return json({ error: "Provide an email or phone number." }, 400);

  // Fan out to both sources at once.
  const [hibp, dh] = await Promise.all([
    queryHIBP(email, hibpKey),
    queryDeHashed(email, phone, dhKey, dhUser),
  ]);

  // Merge + dedupe by normalised breach/source name.
  const merged = [];
  const seen = new Set();
  const sourcesQueried = [];
  const sourcesFailed = [];

  for (const [name, r] of [["HIBP", hibp], ["DeHashed", dh]]) {
    if (r.ok) {
      sourcesQueried.push(name);
      for (const b of r.breaches) {
        if (b.key && seen.has(b.key)) continue;
        if (b.key) seen.add(b.key);
        merged.push(b);
      }
    } else if (r.reason && r.reason !== "n/a") {
      sourcesFailed.push({ source: name, reason: r.reason });
    }
  }

  // If every applicable source failed (no successful query), report unavailable.
  if (sourcesQueried.length === 0) {
    return json({
      configured: false,
      error: sourcesFailed.map((f) => f.source + ": " + f.reason).join("; ") || "No source available for this query.",
      sourcesFailed,
    }, 503);
  }

  const hasPassword = merged.some((b) => (b.dataClasses || []).some((d) => /password/i.test(d)));

  return json({
    configured: true,
    count: merged.length,
    hasPassword,
    sources: sourcesQueried,
    sourcesFailed,
    breaches: merged,
  }, 200);
}
