// app/privacy/page.js
// ─────────────────────────────────────────────────────────────────────────────
// The privacy notice, served at /privacy and linked from the check form and
// footer. It describes what the CODE in this repository actually does. When the
// code changes what it sends where, this page must change in the same commit.
//
// Two facts only the operator can supply are read from environment variables
// and shown as "not yet set" until configured — nothing is invented:
//   EXPOSIO_CONTACT_EMAIL   who data subjects can write to
//   EXPOSIO_ETHICS_REF      the university ethics approval reference
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = {
  title: "Privacy notice — Exposio",
  robots: { index: false, follow: false },
};

const contact = process.env.EXPOSIO_CONTACT_EMAIL || "";
const ethicsRef = process.env.EXPOSIO_ETHICS_REF || "";

const S = {
  root: { background: "#080B12", color: "#DBE4F1", minHeight: "100vh", fontFamily: 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif' },
  wrap: { maxWidth: 720, margin: "0 auto", padding: "56px 22px 90px", lineHeight: 1.65, fontSize: 15 },
  brand: { fontFamily: "ui-monospace,monospace", fontSize: 12, letterSpacing: ".34em", textTransform: "uppercase", color: "#38C89A" },
  h1: { fontSize: 30, fontWeight: 650, letterSpacing: "-.02em", margin: "10px 0 6px" },
  meta: { color: "#67748B", fontSize: 13, margin: "0 0 28px" },
  h2: { fontSize: 18, fontWeight: 650, margin: "34px 0 8px" },
  p: { margin: "8px 0", color: "#C3CDDC" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5, margin: "10px 0" },
  th: { textAlign: "left", color: "#67748B", fontWeight: 600, borderBottom: "1px solid #1C2636", padding: "8px 10px 8px 0", fontFamily: "ui-monospace,monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" },
  td: { borderBottom: "1px solid #1C2636", padding: "10px 10px 10px 0", verticalAlign: "top", color: "#C3CDDC" },
  missing: { color: "#E6B057" },
  a: { color: "#38C89A" },
};

const PROCESSING = [
  {
    what: "Your email address — verification",
    where: "Resend (email delivery provider), EU region — Ireland",
    why: "To send you a one-time code proving the address is yours. The code itself is never stored; your browser holds a signed, expiring token instead. Mail is sent from exposio.eu, authenticated with SPF, DKIM and DMARC, and processed inside the EU.",
  },
  {
    what: "Your phone number — verification (only if you use the phone check)",
    where: "Twilio (SMS delivery provider)",
    why: "To send you a one-time code by SMS proving the number is yours. The number is used for that message and the lookup, and is never stored. Phone checks are only possible on deployments where SMS is configured.",
  },
  {
    what: "Your verified email address or phone number — breach lookup",
    where: "Have I Been Pwned (email only); DeHashed (only if enabled on this deployment)",
    why: "To find which known breaches include the identifier. Only breach names, dates and the TYPES of data exposed are used; leaked values are never shown or kept. Have I Been Pwned has no phone search, so a phone check uses DeHashed alone and the report says so.",
  },
  {
    what: "A 5-character fragment of your password's hash",
    where: "Pwned Passwords (Have I Been Pwned, served via Cloudflare)",
    why: "Your password is hashed in your browser. Only the first 5 characters of the hash are sent; the full hash and the password never leave your device.",
  },
  {
    what: "Your report summary and chat messages — ExpoBot",
    where: "Anthropic (AI model provider)",
    why: "To answer your questions. ExpoBot receives your score, the breached company names, the exposed data types and your messages — not your email address.",
  },
  {
    what: "A keyed hash of your IP address and email address",
    where: "Exposio servers; Upstash (only if enabled)",
    why: "To limit how often any one person can request codes, run checks or chat (protection against abuse). Counters expire automatically within 24 hours and can't be turned back into an address without the server's secret key.",
  },
  {
    what: "Standard request data (IP address, time, page requested)",
    where: "Vercel (hosting provider)",
    why: "Needed to deliver the website and keep it secure. Exposio does not add your email, password or results to these logs.",
  },
];

export default function PrivacyPage() {
  return (
    <main style={S.root}>
      <div style={S.wrap}>
        <div style={S.brand}>Exposio</div>
        <h1 style={S.h1}>Privacy notice</h1>
        <p style={S.meta}>Research prototype · last updated October 2026</p>

        <h2 style={S.h2}>Who runs this tool</h2>
        <p style={S.p}>
          Exposio is a research prototype built by Abdullah Esmail Mohammed Salem, MSc Cyber Security Engineering student at Óbuda University,
          Budapest, Hungary, supervised by Balázsné Dr. Kail Eszter. It lets you assess <b>your own</b> digital exposure. It is not a commercial
          security service.
        </p>
        <p style={S.p}>
          Contact: {contact ? <a style={S.a} href={"mailto:" + contact}>{contact}</a> : <span style={S.missing}>not yet set</span>}
          <br />
          Ethics approval reference: {ethicsRef || <span style={S.missing}>not yet set</span>}
        </p>

        <h2 style={S.h2}>What is processed, where, and why</h2>
        <table style={S.table}>
          <thead>
            <tr><th style={S.th}>Data</th><th style={S.th}>Sent to</th><th style={S.th}>Purpose</th></tr>
          </thead>
          <tbody>
            {PROCESSING.map((row) => (
              <tr key={row.what}><td style={S.td}>{row.what}</td><td style={S.td}>{row.where}</td><td style={S.td}>{row.why}</td></tr>
            ))}
          </tbody>
        </table>

        <h2 style={S.h2}>What is stored</h2>
        <p style={S.p}>
          Exposio has no database. Your results exist only in your browser tab and disappear when you close it or start a new check. Verification
          and report tokens are signed, held in your browser's memory, and expire after 10, 15 and 60 minutes. The only server-side traces are the
          short-lived abuse-protection counters described above.
        </p>
        <p style={S.p}>
          The providers listed above keep their own records under their own privacy policies — for example, the email provider records that a
          message was sent to your address.
        </p>

        <h2 style={S.h2}>Legal basis</h2>
        <p style={S.p}>
          Running a check is based on your consent (GDPR Article 6(1)(a)), which you give with the checkbox before starting and can withdraw at any
          time by not continuing. The abuse-protection counters are based on legitimate interests (Article 6(1)(f)): keeping the service available
          and preventing it from being used against other people.
        </p>

        <h2 style={S.h2}>Transfers outside the EU</h2>
        <p style={S.p}>
          Some providers (including Anthropic and Resend) are based in the United States. Transfers rely on the safeguards each provider offers,
          such as Standard Contractual Clauses; see their privacy policies for details.
        </p>

        <h2 style={S.h2}>Only your own data</h2>
        <p style={S.p}>
          Check only email addresses you control and passwords you use. Email checks require a code sent to that inbox for exactly this reason.
          Exposio does not look up phone numbers, social media profiles, or anyone else's information.
        </p>

        <h2 style={S.h2}>Your rights</h2>
        <p style={S.p}>
          You have the rights of access, rectification, erasure, restriction and objection under the GDPR. Because Exposio keeps no personal data,
          there is usually nothing held to access or delete; write to the contact above with any question. You can also complain to the Hungarian
          data protection authority (NAIH, naih.hu) or the authority in your country.
        </p>

        <p style={{ ...S.p, marginTop: 36 }}><a style={S.a} href="/">← Back to Exposio</a></p>
      </div>
    </main>
  );
}
