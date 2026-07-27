// POST /api/breach
// Looks up whether an email address OR phone number appears in known breaches,
// via the Have I Been Pwned v3 API. The HIBP key stays server-side. Nothing is
// stored. Disabled unless HIBP_API_KEY is set (HIBP account lookups need a paid
// key). Only enable live lookups under an approved ethics protocol.

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

  // Determine the identifier to search. HIBP's breachedaccount endpoint takes an
  // account (email); phone numbers are searchable only for a small set of
  // breaches and are queried the same way, digits only.
  let account = "";
  if (email) {
    if (!EMAIL_RE.test(email)) return json({ error: "Enter a valid email address." }, 400);
    account = email;
  } else if (phone) {
    account = phone.replace(/[^0-9]/g, "");
    if (account.length < 7) return json({ error: "Enter a valid phone number." }, 400);
  } else {
    return json({ error: "Provide an email or phone number." }, 400);
  }

  try {
    const url =
      "https://haveibeenpwned.com/api/v3/breachedaccount/" +
      encodeURIComponent(account) + "?truncateResponse=false";
    const res = await fetch(url, {
      headers: { "hibp-api-key": key, "user-agent": "ExposureScope-Research-SelfAssessment" },
    });

    if (res.status === 404) return json({ configured: true, breaches: [], count: 0 }, 200);
    if (res.status === 401) return json({ error: "HIBP key rejected." }, 502);
    if (res.status === 429) return json({ error: "Rate limited by HIBP — wait and retry." }, 429);
    if (!res.ok) return json({ error: "HIBP error.", status: res.status }, 502);

    const data = await res.json();
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
