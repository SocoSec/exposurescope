// lib/sms.js
// ─────────────────────────────────────────────────────────────────────────────
// Sends the 6-digit verification code by SMS, so that a phone number can be
// checked only by the person holding the handset. Same shape as lib/mailer.js:
// to change provider, only `sendViaTwilio` is replaced.
//
// WHY SMS IS USED HERE WHILE THE PLAYBOOK ADVISES AGAINST IT
// ----------------------------------------------------------
// lib/playbook.js tells users to move two-step verification OFF SMS, because
// SMS can be intercepted by SIM-swap. Using SMS here is not a contradiction,
// because the two uses have different threat models:
//
//   Authentication (what PHONE_PIN warns about) protects a standing account.
//   An attacker who swaps the SIM gains persistent access to everything.
//
//   Ownership verification (what this does) protects a single read of public
//   breach metadata about that number. An attacker who swaps the SIM can learn
//   which breaches the number appears in — data they could already obtain from
//   the breach source directly, since they now control the number.
//
// So SMS is weak for authentication and adequate for this. It is still the
// weakest link in the system, which is why the phone path is rate-limited more
// tightly than email and why the thesis reports it as a limitation rather than
// presenting verification as uniform across identifier types.
//
// COST IS A SECURITY PROPERTY HERE
// Each message costs money and is sent to a number the requester chooses,
// which makes this endpoint a target for SMS pumping (artificially inflating
// traffic to premium-rate ranges). The caller applies per-number and global
// daily caps before reaching this file.
// ─────────────────────────────────────────────────────────────────────────────

import { env, devFlags } from "./config.js";

const TEMPLATES = {
  en: (code) => "Exposio: your verification code is " + code + ". It expires in 10 minutes. If you didn't request it, ignore this message.",
  fr: (code) => "Exposio : votre code de vérification est " + code + ". Il expire dans 10 minutes. Si vous ne l'avez pas demandé, ignorez ce message.",
  de: (code) => "Exposio: Ihr Bestätigungscode lautet " + code + ". Er läuft in 10 Minuten ab. Falls Sie ihn nicht angefordert haben, ignorieren Sie diese Nachricht.",
  es: (code) => "Exposio: tu código de verificación es " + code + ". Caduca en 10 minutos. Si no lo solicitaste, ignora este mensaje.",
  it: (code) => "Exposio: il tuo codice di verifica è " + code + ". Scade tra 10 minuti. Se non l'hai richiesto, ignora questo messaggio.",
  cs: (code) => "Exposio: váš ověřovací kód je " + code + ". Platnost vyprší za 10 minut. Pokud jste o něj nežádali, zprávu ignorujte.",
};

// Returns { ok: true } when sent, { ok: true, devCode } in local dev mode, or
// { ok: false } when SMS isn't configured — the route then fails closed, which
// keeps the phone path disabled by default on any deployment without keys.
export async function sendVerificationSms(to, code, lang) {
  if (env.smsSid && env.smsToken && env.smsFrom) {
    return { ok: await sendViaTwilio(to, (TEMPLATES[lang] || TEMPLATES.en)(code)) };
  }
  if (devFlags.showCode) {
    return { ok: true, devCode: code }; // local development only (see config.js)
  }
  console.error("[sms] not configured: TWILIO_ACCOUNT_SID " + (env.smsSid ? "set" : "MISSING") +
    ", TWILIO_AUTH_TOKEN " + (env.smsToken ? "set" : "MISSING") +
    ", TWILIO_FROM_NUMBER " + (env.smsFrom ? "set" : "MISSING"));
  return { ok: false };
}

async function sendViaTwilio(to, body) {
  try {
    // Twilio's REST API is form-encoded with HTTP Basic auth, so it works on
    // the Edge runtime with fetch alone — no SDK, no Node built-ins.
    const credentials = btoa(env.smsSid + ":" + env.smsToken);
    const res = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + encodeURIComponent(env.smsSid) + "/Messages.json", {
      method: "POST",
      headers: {
        authorization: "Basic " + credentials,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: env.smsFrom, Body: body }).toString(),
    });
    if (!res.ok) {
      // Log the status and Twilio's numeric code only. Never the message body
      // or the response text: both can contain the recipient's number, and the
      // privacy notice promises numbers do not go into logs.
      let code = "unknown";
      try { code = String((await res.json()).code || code).replace(/[^0-9]/g, "") || "unknown"; } catch { /* non-JSON */ }
      console.error("[sms] Twilio rejected the message: status=" + res.status + " code=" + code);
    }
    return res.ok;
  } catch {
    console.error("[sms] Twilio request failed (network error or timeout)");
    return false;
  }
}
