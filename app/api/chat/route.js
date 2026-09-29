// POST /api/chat   { reportToken, messages, lang }  →  { answer, actionIds, letters, used }
// ─────────────────────────────────────────────────────────────────────────────
// ExpoBot v2 — a bounded agent.
//
// v1 made one model call and took the answer. v2 lets the model call tools
// (lib/agent.js) to look things up in the user's SIGNED report before it
// answers, so a statement like "this removes 18 points" is computed by
// lib/playbook.js rather than guessed.
//
// This file is only transport: token check, rate limits, and the function that
// actually talks to Anthropic. The agent loop and every guard rail live in
// lib/agent.js, so scripts/redteam.mjs can attack the same code that runs here.
//
// Cost per question is bounded at MAX_TOOL_ROUNDS + 1 model calls.
// ─────────────────────────────────────────────────────────────────────────────

import { env } from "../../../lib/config.js";
import { verifyToken } from "../../../lib/tokens.js";
import { rateLimit, clientId } from "../../../lib/ratelimit.js";
import { json, fail, tooMany, readJson, normalizeLang } from "../../../lib/http.js";
import { cleanMessages } from "../../../lib/expobot.js";
import { runAgent } from "../../../lib/agent.js";

export const runtime = "edge";

const API = "https://api.anthropic.com/v1/messages";

export async function POST(req) {
  if (!env.secret) return fail("unavailable", 503);

  const body = await readJson(req, 20000);
  const token = await verifyToken(env.secret, body?.reportToken, "report");
  if (!token) return fail("unverified", 401);

  const messages = cleanMessages(body?.messages);
  if (!messages.length) return fail("no_message", 400);
  const lang = normalizeLang(body?.lang);

  // One question now costs up to MAX_TOOL_ROUNDS + 1 model calls, so the
  // per-client allowance is lower than it was for single-call v1.
  const perClient = await rateLimit("chat-ip", await clientId(req, env.secret), 20, 3600);
  if (!perClient.ok) return tooMany(perClient.retryAfter);
  const daily = await rateLimit("chat-global", "all", env.dailyChatCap, 86400);
  if (!daily.ok) return fail("daily_cap", 503);

  // No key → the browser falls back to the vetted action plan, no chat.
  if (!env.anthropicKey) return fail("assistant_off", 503);

  // The only thing this route injects into the agent: how to reach the model.
  async function callModel({ system, messages: convo, tools, tool_choice }) {
    const res = await fetch(API, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": env.anthropicKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: env.chatModel, max_tokens: 900, system, messages: convo, tools, tool_choice }),
    });
    if (!res.ok) throw new Error("upstream " + res.status);
    const data = await res.json();
    return Array.isArray(data.content) ? data.content : [];
  }

  try {
    const result = await runAgent({ report: token.r, lang, messages, callModel });
    return result.ok ? json(result.reply) : fail(result.error, 502);
  } catch {
    return fail("assistant_error", 502);
  }
}
