"use client";
// app/components/ExpoBot.js
// ─────────────────────────────────────────────────────────────────────────────
// Floating ExpoBot chat. Differences from the prototype:
//   • it sends the server-signed `reportToken`, not a report string the browser
//     wrote — so ExpoBot can only discuss a real report;
//   • a reply is { answer, actionIds, letters, used }: the answer is the
//     model's explanation, and everything rendered under it — steps, GDPR
//     letters — is built locally from the vetted playbook and lib/gdpr.js,
//     looked up by ID or company name, never from model text;
//   • `used` lists the tools the agent ran, shown so the user can see that a
//     number was looked up rather than guessed;
//   • errors are codes mapped to friendly, translated messages.
// The component is mounted with key={reportToken}, so each new check starts a
// fresh conversation.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from "react";
import { playbookEntry } from "../../lib/playbook.js";
import { gdprLetter } from "../../lib/gdpr.js";
import { errorText } from "../strings.js";

// What each agent tool did, in words the user can check against the report.
const TOOL_LABELS = {
  list_actions: "read your action list",
  simulate_fixes: "calculated the score change",
  breach_details: "looked up your breach records",
};

export default function ExpoBot({ reportToken, report, identifier, lang, L }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role, content, actionIds?, letters?, used? }
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
      if (res.ok) reply = { role: "assistant", content: data.answer, actionIds: data.actionIds || [], letters: data.letters || [], used: data.used || [] };
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
            {m.letters && m.letters.length > 0 && report && (
              <BotLetters companies={m.letters} report={report} identifier={identifier} />
            )}
            {m.used && m.used.length > 0 && <ToolTrace used={m.used} />}
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

// GDPR letters the agent offered. It only chose WHICH companies (from an enum
// of the user's own breaches); the letter text is generated here by lib/gdpr.js.
// Labels stay English like the Actions tab's letter drafts: the letters
// themselves are English legal wording, so translating only the buttons would
// promise a translation that isn't there.
function BotLetters({ companies, report, identifier }) {
  const [copied, setCopied] = useState("");

  async function copy(company, type) {
    const breach = (report.breaches || []).find((b) => b.title === company);
    const text = gdprLetter(type, { company, email: identifier, year: breach && breach.year });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(company + type);
      setTimeout(() => setCopied(""), 2000);
    } catch { /* clipboard blocked — the Actions tab has the full drafts */ }
  }

  return (
    <div className="x-botacts">
      <div className="x-lglabel" style={{ marginBottom: 2 }}>GDPR request letters</div>
      {companies.map((company) => (
        <div className="x-botact" key={company}>
          <b>{company}</b>
          <div className="x-botletterrow">
            <button className="x-mini" onClick={() => copy(company, "access")}>
              {copied === company + "access" ? "Copied ✓" : "Art. 15 access"}
            </button>
            <button className="x-mini" onClick={() => copy(company, "erasure")}>
              {copied === company + "erasure" ? "Copied ✓" : "Art. 17 erasure"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// "Checked: read your action list · calculated the score change" — the agent's
// working, so a figure in the answer can be traced to a tool that produced it.
function ToolTrace({ used }) {
  const labels = [...new Set(used)].map((name) => TOOL_LABELS[name]).filter(Boolean);
  if (!labels.length) return null;
  return <div className="x-bottrace">Checked: {labels.join(" · ")}</div>;
}
