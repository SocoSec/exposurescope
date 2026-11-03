// scripts/scale.mjs
// ─────────────────────────────────────────────────────────────────────────────
// How much breached data actually exists, measured instead of quoted.
//   npm run scale
//
// WHY THIS EXISTS
// The thesis states the scale of breach exposure using figures from an annual
// industry report. Section 2.7 criticises that reliance, so leaving the headline
// numbers resting on it is inconsistent. The Have I Been Pwned catalogue is
// public, needs no API key, and is the corpus this system actually queries, so
// the same quantities can be measured directly.
//
// The measurement disagrees with the report, and the disagreement is the
// interesting part. Industry telemetry samples INCIDENTS disclosed to
// contributing organisations. This catalogue samples BREACH CORPORA that someone
// took the trouble to collect and publish. A password is far more likely to
// appear in the second population than the first, which is why the share of
// breaches containing credentials is roughly twice as high here.
//
// Neither figure is wrong. They count different things, and a tool that scores
// an individual against breach corpora should use the number drawn from breach
// corpora.
//
// Attribution: breach data is Have I Been Pwned's, CC BY 4.0.
// ─────────────────────────────────────────────────────────────────────────────

const UA = { "user-agent": "Exposio-Research-SelfAssessment" };
const API = "https://haveibeenpwned.com/api/v3/breaches";

const fmt = (n) => n.toLocaleString("en-US");
const pct = (a, b) => ((100 * a) / b).toFixed(1);

const res = await fetch(API, { headers: UA });
if (!res.ok) { console.error(`HIBP returned HTTP ${res.status}`); process.exit(1); }
const breaches = await res.json();

const counts = breaches.map((b) => b.PwnCount || 0).sort((a, b) => a - b);
const total = counts.reduce((a, b) => a + b, 0);
const median = counts[Math.floor(counts.length / 2)];
const mean = total / counts.length;

console.log("=".repeat(78));
console.log("THE SCALE OF BREACH EXPOSURE, MEASURED");
console.log("=".repeat(78));
console.log(`source      Have I Been Pwned public catalogue (CC BY 4.0), no API key`);
console.log(`retrieved   ${new Date().toISOString().slice(0, 10)}`);
console.log();
console.log(`  breaches catalogued                 ${fmt(breaches.length)}`);
console.log(`  accounts across them                ${fmt(total)}   (${(total / 1e9).toFixed(2)} billion)`);
console.log(`  median breach                       ${fmt(median)} accounts`);
console.log(`  mean breach                         ${fmt(Math.round(mean))} accounts`);
console.log(`  breaches above 1 million accounts   ${counts.filter((c) => c > 1e6).length}`);
console.log(`  breaches above 100 million          ${counts.filter((c) => c > 1e8).length}`);
console.log();
console.log(`  The mean is ${(mean / median).toFixed(0)}x the median, so the distribution is dominated by a`);
console.log(`  small number of very large corpora. Reporting an average breach size`);
console.log(`  would therefore describe almost none of them.`);

// ── what a breach actually contains ─────────────────────────────────────────
const dc = new Map();
for (const b of breaches) for (const c of b.DataClasses || []) dc.set(c, (dc.get(c) || 0) + 1);
const ranked = [...dc].sort((a, b) => b[1] - a[1]);

console.log();
console.log("SHARE OF BREACHES CONTAINING EACH DATA CLASS");
console.log("-".repeat(78));
for (const [name, n] of ranked.slice(0, 12)) {
  const bar = "#".repeat(Math.round((n / breaches.length) * 46));
  console.log(`  ${pct(n, breaches.length).padStart(5)}%  ${name.padEnd(22)} ${bar}`);
}

// ── the ones that drive the score ───────────────────────────────────────────
const get = (k) => dc.get(k) || 0;
console.log();
console.log("THE CLASSES THIS MODEL WEIGHTS");
console.log("-".repeat(78));
console.log(`  credential-bearing (Passwords)       ${pct(get("Passwords"), breaches.length)}%`);
console.log(`  permanent identity (Dates of birth)  ${pct(get("Dates of birth"), breaches.length)}%`);
console.log(`  contact (Phone numbers)              ${pct(get("Phone numbers"), breaches.length)}%`);
console.log(`  lookup key (Email addresses)         ${pct(get("Email addresses"), breaches.length)}%`);
console.log();
console.log(`  Passwords appear in ${pct(get("Passwords"), breaches.length)}% of catalogued breaches. Industry telemetry`);
console.log(`  reports roughly 28%. The two populations differ: incidents reported by`);
console.log(`  firms, against corpora collected and published. A tool scoring an`);
console.log(`  individual against corpora should use the corpus figure.`);

// ── growth ──────────────────────────────────────────────────────────────────
const byYear = new Map();
for (const b of breaches) {
  const y = (b.BreachDate || "").slice(0, 4);
  if (y) byYear.set(y, (byYear.get(y) || 0) + 1);
}
const years = [...byYear].filter(([y]) => y >= "2015").sort();
console.log();
console.log("BREACHES BY YEAR OF OCCURRENCE");
console.log("-".repeat(78));
for (const [y, n] of years) console.log(`  ${y}  ${String(n).padStart(4)}  ${"#".repeat(n)}`);
console.log();
console.log(`  Recent years under-count, because a breach enters the catalogue only`);
console.log(`  once it is discovered, verified and published. The last two columns`);
console.log(`  should be read as incomplete, not as a decline.`);

console.log();
console.log("=".repeat(78));
console.log("Reproduce: npm run scale   (figures move as the catalogue grows)");
console.log("=".repeat(78));
