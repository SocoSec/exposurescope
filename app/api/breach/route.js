// POST /api/breach
// Looks up whether an email address appears in known breaches, via the
// Have I Been Pwned v3 API. The HIBP key stays server-side. Nothing is stored.
//
// This endpoint is DISABLED unless HIBP_API_KEY is set, because HIBP email
// lookups require a paid key. Enabling live email lookups on a public
// deployment means processing personal data — only do so under an approved
// ethics protocol, and design your consent flow accordingly.

export const runtime = "edge";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  const key = process.env.HIBP_API_KEY;
  if (!key) {
    return json(
      { configured: false, error: "Email breach lookup is not enabled on this deployment." },
      503
    );
  }

  let email = "";
  try {
    const body = await req.json();
    email = (body?.email || "").toString().trim().toLowerCase();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (!EMAIL_RE.test(email)) return json({ error: "Enter a valid email address." }, 400);

  try {
    const url =
      "https://haveibeenpwned.com/api/v3/breachedaccount/" +
      encodeURIComponent(email) +
      "?truncateResponse=false";
    const res = await fetch(url, {
      headers: {
        "hibp-api-key": key,
        "user-agent": "ExposureScope-Research-SelfAssessment",
      },
    });

    // HIBP returns 404 when the account is not found in any breach.
    if (res.status === 404) return json({ configured: true, breaches: [], count: 0 }, 200);
    if (res.status === 401) return json({ error: "HIBP key rejected." }, 502);
    if (res.status === 429) return json({ error: "Rate limited by HIBP — wait and retry." }, 429);
    if (!res.ok) return json({ error: "HIBP error.", status: res.status }, 502);

    const data = await res.json();
    // Return only a minimal, non-sensitive summary. No storage.
    const breaches = (Array.isArray(data) ? data : []).map((b) => ({
      name: b.Name,
      title: b.Title,
      year: b.BreachDate ? b.BreachDate.slice(0, 4) : null,
      dataClasses: b.DataClasses || [],
    }));
    return json({ configured: true, count: breaches.length, breaches }, 200);
  } catch (e) {
    return json({ error: "Request failed.", detail: String(e?.message || e) }, 500);
  }
}
