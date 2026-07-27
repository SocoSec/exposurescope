// POST /api/infer
// Runs LLM attribute inference on the user's OWN pasted text.
// The Anthropic API key stays server-side (Vercel env var) and is never
// exposed to the browser. No input or output is logged or stored.

export const runtime = "edge";

const SYSTEM =
  "You are a privacy exposure analyst. The user is analysing THEIR OWN text to learn what an adversary could infer about them. " +
  "Given the text, list personal attributes that are plausibly inferable. For each give: attribute, guess (the inferred value), " +
  "confidence (low|medium|high), and cue (the exact short phrase from the text that leaks it). " +
  "Also assess whether the text alone would help link this person across different online sources (linkage). " +
  'Respond ONLY with minified JSON, no markdown fences and no preamble: ' +
  '{"inferences":[{"attribute":"","guess":"","confidence":"low|medium|high","cue":""}],"linkage":"short assessment","summary":"one sentence"}';

export async function POST(req) {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
  if (!key) {
    return json({ error: "Server is not configured with an Anthropic API key." }, 503);
  }

  let text = "";
  try {
    const body = await req.json();
    text = (body?.text || "").toString().slice(0, 4000);
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (!text.trim()) return json({ error: "No text provided." }, 400);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: "user", content: "TEXT:\n" + text }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: "Inference provider error.", status: res.status, detail: detail.slice(0, 300) }, 502);
    }

    const data = await res.json();
    const raw = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return json({ error: "Could not parse model output.", raw: clean.slice(0, 400) }, 502);
    }
    return json(parsed, 200);
  } catch (e) {
    return json({ error: "Request failed.", detail: String(e?.message || e) }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
