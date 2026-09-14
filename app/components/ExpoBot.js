"use client";
// app/components/ExpoBot.js
// ─────────────────────────────────────────────────────────────────────────────
// Floating ExpoBot chat. Differences from the prototype:
//   • it sends the server-signed `reportToken`, not a report string the browser
//     wrote — so ExpoBot can only discuss a real report;
//   • a reply is { answer, actionIds }: the answer is the model's explanation,
//     and the STEPS under it are rendered from the vetted playbook by ID;
//   • errors are codes mapped to friendly, translated messages.
// The component is mounted with key={reportToken}, so each new check starts a
// fresh conversation.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from "react";
import { playbookEntry } from "../../lib/playbook.js";
import { errorText } from "../strings.js";

export default function ExpoBot({ reportToken, lang, L }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role, content, actionIds? }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(false);
  const listRef = useRef(null);

  // Keep the newest message in view.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy, open]);

  // Offer help a few seconds after the report appears (only if chat is closed).
  useEffect(() => {
    const timer = setTimeout(() => setNudge(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  async function send(text) {
    const question = (text || input).trim();
    if (!question || busy) return;
    const history = [...messages, { role: "user", content: question }];
    setMessages(history);
    setInput("");
    setBusy(true);

    let reply;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Only role + content go to the server; action IDs are display data.
        body: JSON.stringify({ reportToken, lang, messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) reply = { role: "assistant", content: data.answer, actionIds: data.actionIds || [] };
      else if (res.status === 401) reply = { role: "assistant", content: L.botExpired };
      else if (data.error === "assistant_off" || data.error === "daily_cap" || data.error === "assistant_error") reply = { role: "assistant", content: L.botOff };
      else reply = { role: "assistant", content: errorText(L, data) };
    } catch {
      reply = { role: "assistant", content: L.errors.network };
    }
    setMessages([...history, reply]);
    setBusy(false);
  }

  if (!open) {
    return (
      <>
        {nudge && (
          <div className="x-nudge">
            <button className="x-nudgex" onClick={() => setNudge(false)} aria-label="Dismiss">×</button>
            <div className="x-nudgemsg">{L.nudge}</div>
            <button className="x-nudgecta" onClick={() => { setNudge(false); setOpen(true); send(L.nudgeAsk); }}>{L.nudgeCta} →</button>
          </div>
        )}
        <button className="x-launcher" onClick={() => { setNudge(false); setOpen(true); }} aria-label={L.botTitle}>
          <span className="x-tip">{L.botTitle}</span>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v7A2.5 2.5 0 0 1 17.5 15H9l-4 4v-4H6.5A2.5 2.5 0 0 1 4 12.5v-7Z" fill="#04201A" /><circle cx="9" cy="9.2" r="1.15" fill="#38C89A" /><circle cx="12" cy="9.2" r="1.15" fill="#38C89A" /><circle cx="15" cy="9.2" r="1.15" fill="#38C89A" /></svg>
        </button>
      </>
    );
  }

  return (
    <div className="x-panel" role="dialog" aria-label={L.botTitle}>
      <div className="x-panelhead">
        <span className="x-paneltitle"><span className="x-ai">AI</span> {L.botTitle}</span>
        <button className="x-panelx" onClick={() => setOpen(false)} aria-label="Close">×</button>
      </div>
      <div className="x-chat x-chatpanel" ref={listRef}>
        <div className="x-msg bot">{L.botGreeting}</div>
        {messages.map((m, i) => (
          <div className={"x-msg " + (m.role === "user" ? "me" : "bot")} key={i}>
            {m.content}
            {m.actionIds && m.actionIds.length > 0 && (
              <div className="x-botacts">
                <div className="x-lglabel" style={{ marginBottom: 2 }}>{L.botActions}</div>
                {m.actionIds.map(playbookEntry).filter(Boolean).map((action) => (
                  <div className="x-botact" key={action.id}>
                    <b>{action.title}</b>
                    <ol>{action.steps.map((step, j) => <li key={j}>{step}</li>)}</ol>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="x-msg bot"><span className="x-spin2" />{L.thinking}</div>}
      </div>
      <div className="x-panelfoot">
        <div className="x-chips">
          {L.botChips.map((q, i) => (
            <button className="x-chip2" key={i} onClick={() => send(q)} disabled={busy}>{q}</button>
          ))}
        </div>
        <div className="x-chatin">
          <input className="x-input" value={input} maxLength={1000} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()} placeholder={L.botPlaceholder} disabled={busy} />
          <button className="x-send" onClick={() => send()} disabled={busy || !input.trim()}>{L.send}</button>
        </div>
      </div>
    </div>
  );
}
