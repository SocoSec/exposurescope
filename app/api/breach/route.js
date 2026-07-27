// POST /api/breach
// Real breach lookup for an email or phone via the DeHashed v2 API, with
// Have I Been Pwned as an optional secondary source. Keys stay server-side.
// Nothing is stored. Disabled gracefully if no provider key is configured.
//
// Configure ONE of these in Vercel env vars:
//   DEHASHED_API_KEY   (+ optional DEHASHED_USERNAME for legacy basic-auth)
//   HIBP_API_KEY       (email only; paid HIBP subscription)
//
// DeHashed is pay-as-you-go (~$0.02/query) and is the source named in the
// thesis. It returns cross-field records (email, username, phone, password
// presence, source database) enabling the mosaic-style aggregation.

export const runtime = "edge";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  const dhKey = process.env.DEHASHED_API_KEY;
  const dhUser = process.env.DEHASHED_USERNAME; // optional (legacy basic auth)
  const hibpKey = process.env.HIBP_API_KEY;

  if (!dhKey && !hibpKey) {
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

  // ---- Prefer DeHashed (email + phone, cheap, thesis source) ----
  if (dhKey) {
    try {
      const field = email ? "email" : "phone";
      const val = email || phone.replace(/[^0-9+]/g, "");
      const query = field + ":" + val;

      const headers = { "content-type": "application/json", "accept": "application/json" };
      // v2 uses a DeHashed-Api-Key header; legacy uses HTTP basic auth.
      if (dhUser) {
        headers["Authorization"] = "Basic " + btoa(dhUser + ":" + dhKey);
      } else {
        headers["DeHashed-Api-Key"] = dhKey;
      }

      const res = await fetch("https://api.dehashed.com/v2/search", {
        method: "POST", headers,
        body: JSON.stringify({ query, size: 100, de_dupe: true }),
      });

      if (res.status === 401 || res.status === 403) return json({ error: "DeHashed key rejected." }, 502);
      if (res.status === 429) return json({ error: "Rate limited by DeHashed — wait and retry." }, 429);
      if (!res.ok) return json({ error: "DeHashed error.", status: res.status }, 502);

      const data = await res.json();
      const entries = data.entries || data.results || [];
      // Summarise into non-sensitive breach records. Do NOT return passwords.
      const seen = new Set();
      const breaches = [];
      let hasPassword = false;
      for (const e of entries) {
        const src = e.database_name || e.obtained_from || e.source || "Unknown source";
        if (e.password || e.hashed_password) hasPassword = true;
        if (!seen.has(src)) {
          seen.add(src);
          breaches.push({
            title: src, name: src, year: null,
            dataClasses: [
              e.email ? "Email addresses" : null,
              (e.password || e.hashed_password) ? "Passwords" : null,
              e.phone ? "Phone numbers" : null,
              e.address ? "Physical addresses" : null,
              e.username ? "Usernames" : null,
            ].filter(Boolean),
          });
        }
      }
      return json({ configured: true, source: "dehashed", count: breaches.length, hasPassword, breaches }, 200);
    } catch (e) {
      return json({ error: "DeHashed request failed.", detail: String(e?.message || e) }, 500);
    }
  }

  // ---- Fallback: HIBP (email only) ----
  if (hibpKey && email) {
    try {
      const url = "https://haveibeenpwned.com/api/v3/breachedaccount/" + encodeURIComponent(email) + "?truncateResponse=false";
      const res = await fetch(url, { headers: { "hibp-api-key": hibpKey, "user-agent": "Exposio-Research-SelfAssessment" } });
      if (res.status === 404) return json({ configured: true, source: "hibp", breaches: [], count: 0 }, 200);
      if (res.status === 401) return json({ error: "HIBP key rejected." }, 502);
      if (res.status === 429) return json({ error: "Rate limited by HIBP — wait and retry." }, 429);
      if (!res.ok) return json({ error: "HIBP error.", status: res.status }, 502);
      const data = await res.json();
      const breaches = (Array.isArray(data) ? data : []).map((b) => ({
        name: b.Name, title: b.Title, year: b.BreachDate ? b.BreachDate.slice(0, 4) : null, dataClasses: b.DataClasses || [],
      }));
      return json({ configured: true, source: "hibp", count: breaches.length, breaches }, 200);
    } catch (e) {
      return json({ error: "HIBP request failed.", detail: String(e?.message || e) }, 500);
    }
  }

  return json({ configured: false, error: "No provider available for this query type." }, 503);
}
