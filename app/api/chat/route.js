// POST /api/chat  — ExpoBot: a report-aware personal-security advisor.
// Receives the user's own exposure-report context plus the conversation so far,
// and returns grounded, actionable, defensive advice. Anthropic key stays
// server-side. Nothing is stored.

export const runtime = "edge";

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

const SYSTEM_BASE =
  "You are ExpoBot, a friendly, practical personal-security advisor built into a digital-exposure self-assessment tool. " +
  "You are given the user's OWN exposure report. Answer their questions with specific, actionable, defensive advice grounded in that report. " +
  "Prioritise the highest-impact steps first (unique passwords, a password manager, app-based two-factor authentication, monitoring). " +
  "Be concise, warm, and plain-spoken — short paragraphs or tight bullet points, no jargon dumps. " +
  "NEVER provide instructions for attacking others, exploiting breaches, accessing accounts that aren't the user's, or any offensive technique. " +
  "Do not invent breaches or facts not present in the report. If asked something outside personal security, gently steer back. " +
  "If the user seems distressed, be reassuring and focus on concrete next steps.";

export async function POST(req) {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
  if (!key) return json({ error: "The assistant is not enabled on this deployment (no Anthropic key)." }, 503);

  let context = "", messages = [];
  try {
    const body = await req.json();
    context = (body?.context || "").toString().slice(0, 2000);
    messages = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }
  if (messages.length === 0) return json({ error: "No message provided." }, 400);

  // Keep only role/content, cap history length, cap each message.
  const clean = messages.slice(-12).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: (m.content || "").toString().slice(0, 1500),
  }));

  const system = SYSTEM_BASE + "\n\nUSER'S EXPOSURE REPORT:\n" + context;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 800, system, messages: clean }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return json({ error: "Assistant provider error.", status: res.status, detail: detail.slice(0, 200) }, 502);
    }
    const data = await res.json();
    const reply = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    return json({ reply: reply || "I'm not sure how to answer that — try rephrasing." }, 200);
  } catch (e) {
    return json({ error: "Request failed.", detail: String(e?.message || e) }, 500);
  }
}
