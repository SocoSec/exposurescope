// lib/mailer.js
// ─────────────────────────────────────────────────────────────────────────────
// Sends the 6-digit verification code. Resend is used because it is a single
// HTTPS call (works on the Edge runtime, no SDK needed). To switch provider,
// only `sendViaResend` changes — the API routes call `sendVerificationCode`.
//
// Production requirement: EXPOSIO_FROM_EMAIL must be an address on a domain
// verified in Resend. Resend's shared test sender only delivers to the Resend
// account owner, so real users would never receive codes without a domain.
// ─────────────────────────────────────────────────────────────────────────────

import { env, devFlags } from "./config.js";

const TEMPLATES = {
  en: { subject: "Your Exposio verification code", line: "Your verification code is", note: "It expires in 10 minutes. If you didn't request it, ignore this email — nothing happens without the code." },
  fr: { subject: "Votre code de vérification Exposio", line: "Votre code de vérification est", note: "Il expire dans 10 minutes. Si vous ne l'avez pas demandé, ignorez cet e-mail — rien ne se passe sans le code." },
  de: { subject: "Ihr Exposio-Bestätigungscode", line: "Ihr Bestätigungscode lautet", note: "Er läuft in 10 Minuten ab. Falls Sie ihn nicht angefordert haben, ignorieren Sie diese E-Mail — ohne den Code passiert nichts." },
  es: { subject: "Tu código de verificación de Exposio", line: "Tu código de verificación es", note: "Caduca en 10 minutos. Si no lo solicitaste, ignora este correo: sin el código no ocurre nada." },
  it: { subject: "Il tuo codice di verifica Exposio", line: "Il tuo codice di verifica è", note: "Scade tra 10 minuti. Se non l'hai richiesto, ignora questa e-mail: senza il codice non succede nulla." },
  cs: { subject: "Váš ověřovací kód Exposio", line: "Váš ověřovací kód je", note: "Platnost vyprší za 10 minut. Pokud jste o něj nežádali, e-mail ignorujte — bez kódu se nic nestane." },
};

// Returns { ok: true } when sent, { ok: true, devCode } in local dev mode,
// or { ok: false } when email isn't configured (the route then fails closed).
export async function sendVerificationCode(to, code, lang) {
  if (env.resendKey && env.fromEmail) {
    return { ok: await sendViaResend(to, code, TEMPLATES[lang] || TEMPLATES.en) };
  }
  if (devFlags.showCode) {
    return { ok: true, devCode: code }; // local development only (see config.js)
  }
  return { ok: false };
}

async function sendViaResend(to, code, t) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.resendKey, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.fromEmail,
        to: [to],
        subject: t.subject,
        // Plain text AND a minimal HTML version; the code is the only dynamic
        // value and is always 6 digits, so there is nothing to escape.
        text: t.line + ": " + code + "\n\n" + t.note,
        html:
          '<p style="font-family:sans-serif">' + t.line + ":</p>" +
          '<p style="font-family:monospace;font-size:28px;letter-spacing:6px;margin:8px 0">' + code + "</p>" +
          '<p style="font-family:sans-serif;color:#555">' + t.note + "</p>",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
