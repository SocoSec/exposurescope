"use client";

import React, { useState, useMemo } from "react";

// Exposio — ephemeral orchestration layer over Have I Been Pwned & DeHashed.
// Enter your own email, phone, or password and receive a full Exposure Report:
// score, breakdown, timeline, remediation (ExpoBot), how the data leaked, how
// it can be weaponised, and a mosaic view of what an attacker could assemble.
// Zero storage: password never leaves the browser (k-anonymity); the rest is
// processed in-session and discarded.

const STYLE = `
.x-root{--bg:#080B12;--card:#0F1521;--card2:#131B29;--line:#1C2636;--ink:#DBE4F1;--mute:#67748B;
  --sig:#38C89A;--amber:#E6B057;--coral:#E56A5A;
  background:var(--bg);color:var(--ink);min-height:100vh;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
  display:flex;align-items:flex-start;justify-content:center;}
.x-wrap{width:100%;max-width:620px;padding:60px 22px 90px;}
.x-brand{font-family:ui-monospace,"JetBrains Mono",Menlo,monospace;font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:var(--sig);text-align:center;}
.x-title{font-size:29px;font-weight:650;letter-spacing:-.02em;text-align:center;margin:12px 0 8px;}
.x-lede{color:var(--mute);font-size:13.5px;line-height:1.55;text-align:center;max-width:46ch;margin:0 auto;}
.x-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:24px;margin-top:22px;}
.x-label{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin-bottom:10px;display:block;}
.x-input{width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--line);border-radius:11px;padding:15px 16px;color:var(--ink);font-size:15px;font-family:ui-monospace,monospace;outline:none;transition:border-color .15s;}
.x-input:focus{border-color:var(--sig);}
.x-kind{font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);margin-top:9px;min-height:15px;letter-spacing:.03em;}
.x-kind b{color:var(--sig);}
.x-btn{width:100%;margin-top:16px;background:var(--sig);color:#04201A;border:none;border-radius:11px;padding:15px;font-size:14px;font-weight:700;cursor:pointer;letter-spacing:.03em;font-family:ui-monospace,monospace;text-transform:uppercase;transition:transform .1s,opacity .15s;}
.x-btn:hover:not(:disabled){transform:translateY(-1px);}
.x-btn:disabled{opacity:.4;cursor:not-allowed;}
.x-consent{display:flex;gap:10px;align-items:flex-start;font-size:12.5px;line-height:1.5;color:var(--mute);cursor:pointer;margin-top:18px;}
.x-consent input{margin-top:2px;width:15px;height:15px;accent-color:var(--sig);flex-shrink:0;}
.x-consent b{color:var(--ink);font-weight:600;}
.x-err{color:var(--coral);font-size:12.5px;margin-top:12px;font-family:ui-monospace,monospace;text-align:center;}
.x-spin{display:inline-block;width:13px;height:13px;border:2px solid #04201A;border-top-color:transparent;border-radius:50%;animation:x-rot .7s linear infinite;vertical-align:-1px;margin-right:8px;}
@keyframes x-rot{to{transform:rotate(360deg);}}

/* report */
.x-hero{text-align:center;padding:8px 0 4px;}
.x-gauge{position:relative;width:150px;height:150px;margin:0 auto 14px;}
.x-gnum{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.x-gval{font-family:ui-monospace,monospace;font-size:42px;font-weight:700;line-height:1;}
.x-gof{font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);margin-top:3px;}
.x-band{font-family:ui-monospace,monospace;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;}
.x-hhead{font-size:19px;font-weight:650;margin:6px 0 6px;letter-spacing:-.01em;}
.x-hsub{color:var(--mute);font-size:13px;line-height:1.55;max-width:46ch;margin:0 auto;}
.x-sec{margin-top:20px;}
.x-sech{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
.x-secn{font-family:ui-monospace,monospace;font-size:11px;color:var(--sig);letter-spacing:.12em;}
.x-sect{font-size:15px;font-weight:650;letter-spacing:-.01em;}
.x-secd{color:var(--mute);font-size:12.5px;line-height:1.5;margin:-6px 0 14px;}
.x-bar{display:flex;align-items:center;gap:10px;margin-bottom:9px;font-size:12.5px;}
.x-bar .bl{width:118px;flex-shrink:0;color:var(--mute);font-family:ui-monospace,monospace;font-size:11px;text-transform:uppercase;letter-spacing:.03em;}
.x-bar .bt{flex:1;height:9px;background:var(--bg);border-radius:6px;overflow:hidden;}
.x-bar .bf{height:100%;border-radius:6px;}
.x-bar .bv{width:20px;text-align:right;font-family:ui-monospace,monospace;color:var(--ink);}
.x-mosaic{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;}
.x-chip{display:flex;align-items:center;gap:7px;padding:8px 12px;border-radius:10px;border:1px solid var(--line);font-size:12.5px;font-family:ui-monospace,monospace;}
.x-chip.on{border-color:var(--coral);background:rgba(229,106,90,.09);color:var(--ink);}
.x-chip.off{color:var(--mute);opacity:.5;}
.x-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.x-remcard{border:1px solid var(--line);border-radius:12px;padding:15px 16px;margin-top:10px;background:var(--card2);}
.x-remtop{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;}
.x-remcat{font-family:ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sig);}
.x-remred{font-family:ui-monospace,monospace;font-size:11px;color:var(--sig);white-space:nowrap;}
.x-remfind{font-size:13px;line-height:1.5;margin-bottom:8px;}
.x-remsteps{margin:0;padding-left:18px;color:var(--mute);font-size:12.5px;line-height:1.6;}
.x-info{border-left:2px solid var(--line);padding:2px 0 2px 14px;margin-top:12px;}
.x-infot{font-size:13px;font-weight:650;margin-bottom:3px;}
.x-infob{color:var(--mute);font-size:12.5px;line-height:1.55;}
.x-actions{display:flex;gap:10px;margin-top:22px;}
.x-again,.x-print{flex:1;background:none;border:1px solid var(--line);color:var(--mute);border-radius:10px;padding:12px;font-family:ui-monospace,monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:border-color .15s,color .15s;}
.x-again:hover,.x-print:hover{border-color:var(--sig);color:var(--sig);}
.x-tag{font-family:ui-monospace,monospace;font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;letter-spacing:.03em;}
.x-src{margin-top:12px;text-align:center;font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);letter-spacing:.04em;}
.x-foot{margin-top:26px;color:var(--mute);font-size:10.5px;line-height:1.6;text-align:center;font-family:ui-monospace,monospace;}
.x-formula{font-family:ui-monospace,monospace;font-size:11px;color:var(--mute);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:9px 11px;margin-bottom:14px;letter-spacing:.02em;text-align:center;}
.x-btable{border-top:1px solid var(--line);}
.x-btrow{display:grid;grid-template-columns:1.7fr .6fr 1fr 1.1fr;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);font-size:12px;}
.x-btrow .c{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.x-bthead{color:var(--mute);font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;}
.x-btrow .contrib{display:flex;align-items:center;gap:7px;font-family:ui-monospace,monospace;font-size:11px;justify-content:flex-end;}
.x-btrow .cbar{height:6px;border-radius:4px;flex:0 0 auto;}
.x-btfoot{display:flex;justify-content:space-between;padding:9px 2px;font-size:12.5px;border-bottom:1px solid var(--line);font-family:ui-monospace,monospace;color:var(--mute);}
.x-btfoot:last-child{border-bottom:none;font-weight:700;color:var(--ink);}
.x-fpfound{border:1px dashed var(--line);border-radius:12px;padding:14px 15px;margin-bottom:14px;background:rgba(103,116,139,.05);}
.x-fpfoundh{font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin-bottom:6px;}
.x-fpfoundb{color:var(--mute);font-size:12.5px;line-height:1.55;}
.x-fplink{display:inline-block;margin-top:8px;font-family:ui-monospace,monospace;font-size:12px;color:var(--sig);text-decoration:none;border:1px solid var(--line);border-radius:8px;padding:6px 11px;transition:border-color .15s;}
.x-fplink:hover{border-color:var(--sig);}
@media print{.x-actions,.x-foot,.x-consent{display:none;}.x-root{background:#fff;}}
`;

async function sha1Hex(str) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9][0-9\s\-().]{6,}$/;
function classify(v) {
  const s = v.trim();
  if (!s) return "empty";
  if (EMAIL_RE.test(s)) return "email";
  if (PHONE_RE.test(s)) return "phone";
  return "password";
}
const KIND_LABEL = { email: "email address", phone: "phone number", password: "password", empty: "" };

function severityFor(dataClasses) {
  const dc = (dataClasses || []).map((s) => s.toLowerCase());
  const hasPw = dc.some((s) => s.includes("password"));
  const hasFin = dc.some((s) => s.includes("credit") || s.includes("bank") || s.includes("payment") || s.includes("financial"));
  const hasContact = dc.some((s) => s.includes("phone") || s.includes("address"));
  if (hasPw && hasFin) return 1.0;
  if (hasPw) return 0.7;
  if (hasContact) return 0.4;
  return 0.2;
}

// Aggregate what identity attributes are exposed across breaches (mosaic).
const ATTR_DEFS = [
  { key: "email", label: "Email", match: /email/i },
  { key: "password", label: "Password", match: /password/i },
  { key: "phone", label: "Phone", match: /phone/i },
  { key: "address", label: "Address", match: /address/i },
  { key: "username", label: "Username", match: /username|handle|screen/i },
  { key: "financial", label: "Financial", match: /credit|bank|payment|financial/i },
];

function buildReport(kind, opts) {
  const { credLeaked, credCount, acctLeaked, breaches } = opts;
  const attrs = new Set();
  const classCounts = {};
  let score = 0;

  if (kind === "password" && credLeaked) {
    attrs.add("password");
    const prevalence = Math.min(1, Math.log10(credCount + 1) / 7);
    score = Math.round(0.7 * (0.5 + 0.5 * prevalence) * 100);
  }

  const scored = [];
  if ((kind === "email" || kind === "phone") && acctLeaked) {
    let raw = 0;
    const nowY = new Date().getFullYear();
    for (const b of breaches) {
      for (const dc of b.dataClasses || []) {
        classCounts[dc] = (classCounts[dc] || 0) + 1;
        for (const a of ATTR_DEFS) if (a.match.test(dc)) attrs.add(a.key);
      }
      const sev = severityFor(b.dataClasses);
      const year = b.year ? parseInt(b.year, 10) : null;
      const ageDays = year ? Math.max(0, (nowY - year) * 365) : 1500;
      const rec = Math.exp(-0.002 * ageDays);
      const contribution = sev * rec;
      raw += contribution;
      scored.push({ ...b, sev, rec, contribution, year });
    }
    score = Math.round(Math.min(1, raw / 0.8) * 100);
  }

  score = Math.max(score, (credLeaked || acctLeaked) ? 1 : 0);
  let level;
  if (!(credLeaked || acctLeaked)) level = "safe";
  else if (score <= 35) level = "low";
  else if (score <= 65) level = "medium";
  else level = "high";

  return { score, level, attrs, classCounts, scored };
}

// ---- ExpoBot rule-based remediation (thesis format) ----
function remediation(attrs, meta) {
  const out = [];
  if (attrs.has("password")) out.push({
    category: "Credential Security",
    finding: "Passwords tied to your identity appear in breach data — the leading vector for account takeover via reuse.",
    steps: ["Change this password everywhere it was used.", "Use a password manager to generate a unique passphrase per site.", "Enable app-based two-factor authentication (not SMS).", "Never reuse a breached password again."],
    reduction: "high impact",
  });
  if (attrs.has("financial")) out.push({
    category: "Financial Protection",
    finding: "Payment or financial data was exposed, enabling fraud and unauthorised charges.",
    steps: ["Review recent card and bank statements for unfamiliar charges.", "Request a replacement card if anything looks wrong.", "Consider a credit freeze with the credit bureaus."],
    reduction: "high impact",
  });
  if (attrs.has("email")) out.push({
    category: "Phishing Defence",
    finding: "Your email is exposed and can be targeted with tailored phishing that references real breach details.",
    steps: ["Treat unexpected messages with urgency or links as suspect.", "Verify senders independently before acting.", "Consider an email alias for sign-ups."],
    reduction: "medium impact",
  });
  if (attrs.has("phone")) out.push({
    category: "SIM & Smishing Defence",
    finding: "Your phone number is exposed, enabling SIM-swap attacks and text-based (smishing) fraud.",
    steps: ["Add a SIM-swap / port-out PIN with your mobile carrier.", "Prefer app-based 2FA over SMS codes.", "Ignore unsolicited texts asking you to click or call."],
    reduction: "medium impact",
  });
  if (attrs.has("address") || attrs.has("username")) out.push({
    category: "Identity & Linkage",
    finding: "Address or username fragments let separate profiles be linked into one identity.",
    steps: ["Use distinct usernames across accounts you want kept separate.", "Limit public sharing of your home address.", "Search your name periodically to see what's discoverable."],
    reduction: "low–medium impact",
  });
  out.push({
    category: "Ongoing Monitoring",
    finding: "Exposure changes over time as new breaches surface.",
    steps: ["Turn on breach notifications for your key email addresses.", "Re-check your exposure periodically.", "Rotate credentials on a schedule for critical accounts."],
    reduction: "preventive",
  });
  return out;
}

function howLeaked(attrs, count) {
  const items = [{
    title: "Database breaches",
    body: "Companies you had accounts with were compromised and their user databases stolen. Your data appears because you had an account there — not because you did anything wrong.",
  }];
  if (attrs.has("password")) items.push({
    title: "Credential dumps & stealer logs",
    body: "Exposed passwords are collected into massive combolists and traded. Info-stealer malware on infected devices also harvests saved credentials directly from browsers.",
  });
  items.push({
    title: "Aggregation over time",
    body: `Your identity surfaces across ${count > 1 ? count + " separate breaches" : "breach sources"}. Individually minor, together they form a fuller picture — the effect this report measures.`,
  });
  return items;
}

function howWeaponised(attrs) {
  const items = [];
  if (attrs.has("password")) items.push({
    title: "Credential stuffing → account takeover",
    body: "Attackers replay leaked email+password pairs against banking, email, and shopping sites, betting on reuse. One reused password can unlock many accounts.",
  });
  if (attrs.has("email")) items.push({
    title: "Targeted phishing",
    body: "Knowing which services you use, attackers craft convincing messages that impersonate those exact brands to steal logins or payment details.",
  });
  if (attrs.has("phone")) items.push({
    title: "SIM swapping",
    body: "With your number and some personal detail, an attacker can socially engineer your carrier into moving your number to their SIM — intercepting SMS 2FA codes.",
  });
  if (attrs.has("financial")) items.push({
    title: "Payment fraud & identity theft",
    body: "Financial data supports direct fraud and, combined with your name and address, opening accounts or loans in your name.",
  });
  items.push({
    title: "Mosaic re-identification",
    body: "The real risk is combination: fragments from different breaches are linked to build a single, detailed profile of you — the basis of modern targeted attacks.",
  });
  return items;
}

// Self-check footprint guidance. The app does NOT profile anyone or fetch
// third-party data — it shows the user how to inspect their own public footprint,
// consistent with the thesis scope (no automated third-party data processing).
function footprint(attrs, identifier, kind) {
  const items = [];
  if ((kind === "email" || kind === "phone") && identifier) {
    items.push({
      title: "Search engines",
      body: "See what a search engine surfaces for your " + kind + ". Attackers start here to connect your identifier to public profiles and posts.",
      action: { label: "Search my " + kind, url: "https://www.google.com/search?q=" + encodeURIComponent('"' + identifier + '"') },
    });
  }
  if (attrs.has("username")) items.push({
    title: "Username reuse",
    body: "Your usernames appear in breach data. If you reuse the same handle across platforms, those profiles can be linked together. Search the platforms you use for your handles and diversify the ones you want kept separate.",
  });
  if (attrs.has("email")) items.push({
    title: "Connected accounts",
    body: "Many sites reveal whether an email has an account during password reset. Review which services are tied to this email and close the ones you no longer use.",
  });
  items.push({
    title: "Data brokers",
    body: "People-search and broker sites compile public records with breach data into profiles. Search the major brokers for your name and use their opt-out forms to request removal.",
  });
  items.push({
    title: "Photos & metadata",
    body: "Public photos can carry GPS metadata and enable reverse-image linkage. Strip EXIF data before posting and review images you're tagged in.",
  });
  return items;
}

const BAND = {
  safe: { c: "var(--sig)", label: "Safe", head: "No exposure found" },
  low: { c: "var(--sig)", label: "Low", head: "Limited exposure" },
  medium: { c: "var(--amber)", label: "Medium", head: "Notable exposure" },
  high: { c: "var(--coral)", label: "High", head: "Significant exposure" },
};

function sevLabel(sv) { return sv >= 1 ? "Financial" : sv >= 0.7 ? "Credentials" : sv >= 0.4 ? "Contact" : "Email"; }

function Gauge({ score, level }) {
  const S = level === "safe" ? 0 : Math.max(0, Math.min(100, Math.round(score)));
  const Cx = 160, Cy = 150, R = 118, SW = 24, N = 9, gap = 2.4, seg = 180 / N;
  const ramp = ["#2FBF71", "#57C559", "#8CCB44", "#C0CE3B", "#E7C93B", "#E9A93C", "#E8843F", "#E76A45", "#E5544A"];
  const P = (ang, r = R) => { const t = ang * Math.PI / 180; return [Cx + r * Math.cos(t), Cy - r * Math.sin(t)]; };
  const arcs = [];
  for (let k = 0; k < N; k++) {
    const a0 = 180 - k * seg - gap / 2;
    const a1 = 180 - (k + 1) * seg + gap / 2;
    const [x0, y0] = P(a0), [x1, y1] = P(a1);
    arcs.push(<path key={k} d={"M " + x0.toFixed(1) + " " + y0.toFixed(1) + " A " + R + " " + R + " 0 0 1 " + x1.toFixed(1) + " " + y1.toFixed(1)} stroke={ramp[k]} strokeWidth={SW} fill="none" strokeLinecap="round" />);
  }
  const nAng = 180 - (S / 100) * 180;
  const [tx, ty] = P(nAng, R - 4);
  const [b1x, b1y] = P(nAng + 90, 7);
  const [b2x, b2y] = P(nAng - 90, 7);
  const bandColor = ramp[Math.min(N - 1, Math.floor((S / 100) * N))];
  return (
    <svg viewBox="0 0 320 224" style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }}>
      <defs><filter id="nsh" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.55" /></filter></defs>
      {arcs}
      <polygon points={tx.toFixed(1) + "," + ty.toFixed(1) + " " + b1x.toFixed(1) + "," + b1y.toFixed(1) + " " + b2x.toFixed(1) + "," + b2y.toFixed(1)} fill="#EAF1FA" filter="url(#nsh)" />
      <circle cx={Cx} cy={Cy} r="13" fill="#0F1521" stroke={bandColor} strokeWidth="3.5" />
      <circle cx={Cx} cy={Cy} r="4.5" fill={bandColor} />
      <text x={Cx} y="200" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="38" fontWeight="700" fill={bandColor}>{S}</text>
      <text x={Cx} y="216" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="10" fill="#67748B">/ 100</text>
      <text x="30" y="176" fontFamily="ui-monospace,monospace" fontSize="9" fill="#2FBF71">SAFE</text>
      <text x="290" y="176" textAnchor="end" fontFamily="ui-monospace,monospace" fontSize="9" fill="#E5544A">CRITICAL</text>
    </svg>
  );
}

function Bars({ counts, color }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map((e) => e[1]));
  return (
    <div>
      {entries.map(([label, n]) => (
        <div className="x-bar" key={label}>
          <span className="bl">{label.replace(/ addresses| numbers/i, "")}</span>
          <span className="bt"><span className="bf" style={{ width: (n / max * 100) + "%", background: color }} /></span>
          <span className="bv">{n}</span>
        </div>
      ))}
    </div>
  );
}

function Timeline({ scored, color }) {
  const dated = scored.filter((b) => b.year);
  if (dated.length === 0) return <div className="x-secd">Breach dates weren't available from this source.</div>;
  const years = dated.map((b) => b.year);
  const min = Math.min(...years, new Date().getFullYear() - 1);
  const max = new Date().getFullYear();
  const span = Math.max(1, max - min);
  return (
    <svg viewBox="0 0 100 22" style={{ width: "100%", height: 60 }} preserveAspectRatio="none">
      <line x1="2" y1="14" x2="98" y2="14" stroke="var(--line)" strokeWidth="0.4" />
      {[min, Math.round((min + max) / 2), max].map((y, i) => (
        <text key={i} x={2 + (i * 48)} y="21" fontSize="3" fill="var(--mute)" fontFamily="monospace">{y}</text>
      ))}
      {dated.map((b, i) => {
        const x = 2 + ((b.year - min) / span) * 96;
        const r = 1.4 + b.sev * 1.6;
        return <circle key={i} cx={x} cy="14" r={r} fill={color} opacity="0.85" />;
      })}
    </svg>
  );
}

export default function Page() {
  const [consent, setConsent] = useState(false);
  const [value, setValue] = useState("");
  const [state, setState] = useState("idle");
  const [report, setReport] = useState(null);
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState("");

  const kind = useMemo(() => classify(value), [value]);
  const reset = () => { setValue(""); setState("idle"); setReport(null); setMeta(null); setErr(""); };

  const run = async () => {
    if (!value.trim()) return;
    setState("loading"); setErr(""); setReport(null);
    try {
      let credLeaked = null, credCount = 0, acctLeaked = null, breaches = [], sources = [], unavailable = false;

      if (kind === "password") {
        const hash = await sha1Hex(value);
        const res = await fetch("https://api.pwnedpasswords.com/range/" + hash.slice(0, 5));
        if (!res.ok) throw new Error("Password service unreachable.");
        const body = await res.text();
        const suffix = hash.slice(5);
        for (const line of body.split("\n")) {
          const [suf, c] = line.trim().split(":");
          if (suf === suffix) { credCount = parseInt(c, 10) || 0; break; }
        }
        credLeaked = credCount > 0;
      } else {
        const res = await fetch("/api/breach", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: kind === "email" ? value.trim() : undefined, phone: kind === "phone" ? value.trim() : undefined }),
        });
        const data = await res.json();
        if (res.status === 503 || data.configured === false) unavailable = true;
        else if (!res.ok) throw new Error(data.error || "Lookup failed.");
        else { breaches = data.breaches || []; acctLeaked = breaches.length > 0; sources = data.sources || []; }
      }

      const r = buildReport(kind, { credLeaked, credCount, acctLeaked, breaches });
      setReport(r);
      setMeta({ kind, credCount, count: breaches.length, sources, unavailable, credLeaked, acctLeaked, identifier: kind === "password" ? null : value.trim() });
      setState("done");
      if (kind === "password") setValue("");
    } catch (e) {
      setErr(String(e.message || e)); setState("error");
    }
  };

  const leaked = report && (meta.credLeaked || meta.acctLeaked);
  const band = report ? BAND[report.level] : null;

  return (
    <div className="x-root">
      <style>{STYLE}</style>
      <div className="x-wrap">
        <div className="x-brand">Exposio</div>
        <h1 className="x-title">Check your exposure</h1>
        <p className="x-lede">One check across breach intelligence — Have I Been Pwned and DeHashed. Enter an email, phone, or password (your own) for a full Exposure Report. Nothing is stored.</p>

        {state !== "done" && (
          <div className="x-card">
            <label className="x-label">Email · phone · password</label>
            <input className="x-input" type={kind === "password" ? "password" : "text"} value={value}
              placeholder="Enter one to check" onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && consent && run()} autoComplete="off" disabled={!consent} />
            <div className="x-kind">{value.trim() ? <>Detected: <b>{KIND_LABEL[kind]}</b></> : "\u00A0"}</div>
            <button className="x-btn" onClick={run} disabled={!consent || state === "loading" || !value.trim()}>
              {state === "loading" ? <><span className="x-spin" />Checking</> : "Run check"}
            </button>
            {state === "error" && <div className="x-err">{err}</div>}
            <label className="x-consent">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>I'm checking <b>my own</b> data. Zero storage — the password never leaves my browser, and the rest is processed in-session only.</span>
            </label>
          </div>
        )}

        {state === "done" && report && (
          <>
            {/* Hero: score */}
            <div className="x-card">
              <div className="x-hero">
                {meta.unavailable ? (
                  <>
                    <div className="x-gauge"><div style={{ borderRadius: "50%", width: "100%", height: "100%", background: "var(--line)", WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 11px))", mask: "radial-gradient(farthest-side, transparent calc(100% - 11px), #000 calc(100% - 11px))" }} /><div className="x-gnum"><span className="x-gval" style={{ color: "var(--mute)" }}>–</span><span className="x-gof">/ 100</span></div></div>
                    <div className="x-band" style={{ color: "var(--mute)" }}>Not checked</div>
                    <div className="x-hhead">Breach source not enabled</div>
                    <div className="x-hsub">No breach-intelligence key is configured, so this address wasn't checked. Add a DeHashed or HIBP key to enable real lookups. Meanwhile, check free at haveibeenpwned.com.</div>
                  </>
                ) : (
                  <>
                    <Gauge score={report.score} color={band.c} level={report.level} />
                    <div className="x-band" style={{ color: band.c }}>{band.label}</div>
                    <div className="x-hhead">{band.head}</div>
                    <div className="x-hsub">
                      {leaked
                        ? "Your Exposure Score reflects the breach data found. The sections below explain the risk and what to do."
                        : "No match in the breach sources checked. Keep yourself safe: unique passwords per site and two-factor authentication everywhere."}
                    </div>
                    {meta.sources && meta.sources.length > 0 && <div className="x-src">Sources checked: {meta.sources.join(" + ")}</div>}
                  </>
                )}
              </div>
            </div>

            {leaked && !meta.unavailable && (
              <>
                {/* Score model (transparent breakdown) */}
                {meta.kind !== "password" && report.scored.length > 0 && (() => {
                  const rows = [...report.scored].sort((a, b) => b.contribution - a.contribution);
                  const maxC = Math.max(...rows.map((r) => r.contribution), 0.0001);
                  return (
                    <div className="x-card">
                      <div className="x-sech"><span className="x-secn">01</span><span className="x-sect">Score model</span></div>
                      <div className="x-secd">How your score is calculated. The MVP uses the Breach Risk component (B): each breach contributes by severity \u00d7 recency, normalised to 0\u2013100.</div>
                      <div className="x-formula">E = 0.30\u00b7B + 0.20\u00b7O + 0.20\u00b7S + 0.15\u00b7M + 0.15\u00b7L &nbsp;\u2014&nbsp; MVP: B active</div>
                      <div className="x-btable">
                        <div className="x-btrow x-bthead"><span>Company</span><span>Year</span><span>Type</span><span>Weight</span></div>
                        {rows.map((b, i) => (
                          <div className="x-btrow" key={i}>
                            <span className="c" title={b.title}>{b.title}</span>
                            <span>{b.year || "\u2014"}</span>
                            <span>{sevLabel(b.sev)}</span>
                            <span className="contrib"><span className="cbar" style={{ width: (8 + (b.contribution / maxC) * 46) + "px", background: band.c }} />{b.contribution.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="x-btfoot"><span>Breaches found</span><span>{rows.length}</span></div>
                      <div className="x-btfoot"><span>Exposure Score E</span><span style={{ color: band.c }}>{report.score} / 100</span></div>
                    </div>
                  );
                })()}

                {/* Breakdown */}
                <div className="x-card">
                  <div className="x-sech"><span className="x-secn">02</span><span className="x-sect">Exposure breakdown</span></div>
                  <div className="x-secd">What kinds of your data appear, and how often, across the breaches found.</div>
                  {meta.kind === "password" ? (
                    <div className="x-bar"><span className="bl">Breach dumps</span><span className="bt"><span className="bf" style={{ width: "100%", background: band.c }} /></span><span className="bv">{meta.credCount.toLocaleString()}</span></div>
                  ) : (
                    <Bars counts={report.classCounts} color={band.c} />
                  )}
                </div>

                {/* Timeline (email/phone only) */}
                {meta.kind !== "password" && (
                  <div className="x-card">
                    <div className="x-sech"><span className="x-secn">03</span><span className="x-sect">Breach timeline</span></div>
                    <div className="x-secd">When the breaches occurred. Recent breaches weigh more — older ones decay in the score.</div>
                    <Timeline scored={report.scored} color={band.c} />
                  </div>
                )}

                {/* Mosaic */}
                <div className="x-card">
                  <div className="x-sech"><span className="x-secn">04</span><span className="x-sect">What can be assembled about you</span></div>
                  <div className="x-secd">The mosaic effect: separate fragments combine into one identity. Highlighted items are exposed.</div>
                  <div className="x-mosaic">
                    {ATTR_DEFS.map((a) => {
                      const on = report.attrs.has(a.key);
                      return (
                        <span className={"x-chip " + (on ? "on" : "off")} key={a.key}>
                          <span className="x-dot" style={{ background: on ? "var(--coral)" : "var(--mute)" }} />{a.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* ExpoBot remediation */}
                <div className="x-card">
                  <div className="x-sech"><span className="x-secn">05</span><span className="x-sect">Actions to take</span></div>
                  <div className="x-secd">Prioritised, specific steps — each with its likely impact on your score.</div>
                  {remediation(report.attrs, meta).map((r, i) => (
                    <div className="x-remcard" key={i}>
                      <div className="x-remtop"><span className="x-remcat">{r.category}</span><span className="x-remred">{r.reduction}</span></div>
                      <div className="x-remfind">{r.finding}</div>
                      <ol className="x-remsteps">{r.steps.map((s, j) => <li key={j}>{s}</li>)}</ol>
                    </div>
                  ))}
                </div>

                {/* How it leaked */}
                <div className="x-card">
                  <div className="x-sech"><span className="x-secn">06</span><span className="x-sect">How your data leaked</span></div>
                  {howLeaked(report.attrs, meta.count).map((it, i) => (
                    <div className="x-info" key={i}><div className="x-infot">{it.title}</div><div className="x-infob">{it.body}</div></div>
                  ))}
                </div>

                {/* Attacker view */}
                <div className="x-card">
                  <div className="x-sech"><span className="x-secn">07</span><span className="x-sect">How attackers could use it</span></div>
                  <div className="x-secd">Awareness, not instructions — understanding the risk is how you defend against it.</div>
                  {howWeaponised(report.attrs).map((it, i) => (
                    <div className="x-info" key={i}><div className="x-infot">{it.title}</div><div className="x-infob">{it.body}</div></div>
                  ))}
                </div>

                {/* Your public footprint (self-check, no auto-profiling) */}
                <div className="x-card">
                  <div className="x-sech"><span className="x-secn">08</span><span className="x-sect">Your public footprint</span></div>
                  <div className="x-secd">What an attacker could piece together from public sources — and how to check it yourself.</div>
                  <div className="x-fpfound">
                    <div className="x-fpfoundh">Public information found</div>
                    <div className="x-fpfoundb">None retrieved. Exposio does not automatically profile people or fetch anyone's social posts or activity — that would process others' personal data. This stays blank by design; use the self-checks below to inspect your own footprint.</div>
                  </div>
                  {footprint(report.attrs, meta.identifier, meta.kind).map((it, i) => (
                    <div className="x-info" key={i}>
                      <div className="x-infot">{it.title}</div>
                      <div className="x-infob">{it.body}</div>
                      {it.action && <a className="x-fplink" href={it.action.url} target="_blank" rel="noopener noreferrer">{it.action.label} ↗</a>}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="x-actions">
              <button className="x-again" onClick={reset}>Check another</button>
              {leaked && !meta.unavailable && <button className="x-print" onClick={() => window.print()}>Save / print report</button>}
            </div>
          </>
        )}

        <div className="x-foot">
          Exposio · ephemeral orchestration layer over Have I Been Pwned &amp; DeHashed<br />
          Zero-storage · self-assessment only · MSc thesis prototype, Óbuda University
        </div>
      </div>
    </div>
  );
}
