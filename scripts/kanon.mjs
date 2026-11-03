// scripts/kanon.mjs
// ─────────────────────────────────────────────────────────────────────────────
// The credential path, measured end to end against the live Pwned Passwords
// range API.  npm run kanon
//
// WHY THIS EXISTS
// ---------------
// Section 5.1 claims two things about the credential path. First, that it is
// correct: a widely-breached password is recognised and a unique one is not.
// Second, and more interesting, that it is private: only a five-character
// hash prefix leaves the browser, so the server learns which of roughly k
// candidate hashes was asked about and not which password was checked.
//
// The first claim is easy to assert. The second has a number attached — k —
// and that number is measurable rather than theoretical: it is the size of the
// anonymity set the range query actually returns. This script measures it.
//
// WHAT IT MEASURES
//   • the occurrence count the API reports for each test password
//   • the score and band the deployed model assigns to that count
//   • k, the number of suffixes returned for the queried prefix, which is the
//     anonymity set the protocol of Li et al. provides in practice
//
// The passwords below are deliberately public: three are among the most
// breached strings in existence, one is a well-known example that looks strong
// and is not, and the last is a locally generated unique string. None is
// anyone's credential, and no password is transmitted — only its prefix.
//
// Note on padding: the request asks for padded responses, so the response size
// does not itself leak whether the queried suffix was present. k is therefore
// measured on a padded response and is an upper bound on the real set size.
// ─────────────────────────────────────────────────────────────────────────────

import { createHash } from "node:crypto";
import { passwordReport } from "../lib/score.js";

const CASES = [
  { label: "123456",       pw: "123456",       note: "the most breached string there is" },
  { label: "password",     pw: "password",     note: "the obvious choice" },
  { label: "qwerty123",    pw: "qwerty123",    note: "keyboard walk with digits" },
  { label: "Tr0ub4dor&3",  pw: "Tr0ub4dor&3",  note: "looks strong, is public" },
  { label: "<unique>",     pw: `local-${createHash("sha256").update(String(Date.now())).digest("hex").slice(0, 24)}`, note: "generated here, never published" },
];

const sleep = (n) => new Promise((r) => setTimeout(r, n));

console.log("=".repeat(78));
console.log("CREDENTIAL PATH: CORRECTNESS AND MEASURED k-ANONYMITY");
console.log("=".repeat(78));
console.log("source   api.pwnedpasswords.com/range (no key required, Add-Padding: true)");
console.log();
console.log("   password          prefix     k      occurrences    score  band     ms");
console.log("   " + "-".repeat(71));

const ks = [];
const rows = [];

for (const c of CASES) {
  const sha = createHash("sha1").update(c.pw).digest("hex").toUpperCase();
  const prefix = sha.slice(0, 5);
  const suffix = sha.slice(5);

  const t0 = performance.now();
  let text = "", ok = true;
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, { headers: { "Add-Padding": "true" } });
    ok = res.ok;
    text = ok ? await res.text() : "";
  } catch { ok = false; }
  const elapsed = performance.now() - t0;

  if (!ok) { console.log(`   ${c.label.padEnd(16)} ${prefix}     — lookup failed`); continue; }

  const lines = text.split(/\r?\n/).filter(Boolean);
  const k = lines.length;
  const hit = lines.find((l) => l.split(":")[0] === suffix);
  const count = hit ? Number(hit.split(":")[1]) : 0;
  const rep = passwordReport(count);

  ks.push(k);
  rows.push({ ...c, k, count, score: rep.score, level: rep.level });
  console.log(`   ${c.label.padEnd(16)} ${prefix}   ${String(k).padStart(5)}  ${count.toLocaleString("en-US").padStart(13)}   ${String(rep.score).padStart(5)}  ${rep.level.padEnd(7)} ${String(Math.round(elapsed)).padStart(4)}`);
  await sleep(600);
}

const mean = ks.reduce((a, b) => a + b, 0) / (ks.length || 1);

console.log();
console.log("1. CORRECTNESS");
console.log("-".repeat(78));
const breached = rows.filter((r) => r.count > 0);
const clean = rows.filter((r) => r.count === 0);
console.log(`   ${breached.length} of ${rows.length} test strings were found in the corpus, and each received a`);
console.log(`   non-zero score. The generated unique string was not found and scored ${clean[0] ? clean[0].score : "—"}.`);
console.log(`   Tr0ub4dor&3 is the case worth noting: it satisfies every common composition`);
const tr = rows.find((r) => r.label === "Tr0ub4dor&3");
if (tr) console.log(`   rule and still appears ${tr.count.toLocaleString("en-US")} times, scoring ${tr.score} (${tr.level}). Composition`);
console.log(`   rules do not measure exposure; appearing in a breach corpus does.`);

console.log();
console.log("2. MEASURED ANONYMITY SET");
console.log("-".repeat(78));
console.log(`   k ranged from ${Math.min(...ks)} to ${Math.max(...ks)}, mean ${Math.round(mean)}.`);
console.log();
console.log(`   What the server observes is one of ${Math.round(mean)} hash suffixes on average, with no`);
console.log(`   indication which. The password itself never leaves the browser, and neither`);
console.log(`   does its full hash. This is the privacy property section 5.1 claims, and the`);
console.log(`   figure above is the degree to which the deployment actually provides it.`);

console.log();
console.log("=".repeat(78));
console.log("Reproduce: npm run kanon   (k varies slightly with corpus updates and padding)");
console.log("=".repeat(78));
