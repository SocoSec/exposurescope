// POST /api/chat   { reportToken, messages, lang }  →  { answer, actionIds }
// ─────────────────────────────────────────────────────────────────────────────
// ExpoBot. Only answers about a report the SERVER produced (signed token), so
// it can't be used as a free general-purpose chatbot on the project's API key,
// and a user can't feed it a fake report. All guard rails live in
// lib/expobot.js; this file does validation, limits and the API call.
// ─────────────────────────────────────────────────────────────────────────────

import { env } from "../../../lib/config.js";
import { verifyToken } from "../../../lib/tokens.js";
import { rateLimit, clientId } from "../../../lib/ratelimit.js";
import { json, fail, tooMany, readJson, normalizeLang } from "../../../lib/http.js";
import { buildSystemPrompt, responseTool, cleanMessages, finalizeReply } from "../../../lib/expobot.js";

export const runtime = "edge";

export async function POST(req) {
  if (!env.secret) return fail("unavailable", 503);

  const body = await readJson(req, 20000);
  const token = await verifyToken(env.secret, body?.reportToken, "report");
  if (!token) return fail("unverified", 401);

  const messages = cleanMessages(body?.messages);
  if (!messages.length) return fail("no_message", 400);
  const lang = normalizeLang(body?.lang);

  const perClient = await rateLimit("chat-ip", await clientId(req, env.secret), 30, 3600);
  if (!perClient.ok) return tooMany(perClient.retryAfter);
  const daily = await rateLimit("chat-global", "all", env.dailyChatCap, 86400);
  if (!daily.ok) return fail("daily_cap", 503);

  // No key → the browser shows the vetted action plan instead of a chat reply.
  if (!env.anthropicKey) return fail("assistant_off", 503);

  const report = token.r;
  // MONITOR applies to every report, so the enum is never empty.
  const allowedIds = report.ids.length ? report.ids : ["MONITOR"];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: env.chatModel,
        max_tokens: 700,
        system: buildSystemPrompt({ ...report, ids: allowedIds }, lang),
        messages,
        tools: [responseTool(allowedIds)],
        tool_choice: { type: "tool", name: "respond" }, // forces the structured reply
      }),
    });
    if (!res.ok) return fail("assistant_error", 502);

    const data = await res.json();
    const call = (data.content || []).find((block) => block.type === "tool_use" && block.name === "respond");
    const reply = finalizeReply(call && call.input, allowedIds);
    if (!reply) return fail("assistant_error", 502);

    return json(reply);
  } catch {
    return fail("assistant_error", 502);
  }
}
