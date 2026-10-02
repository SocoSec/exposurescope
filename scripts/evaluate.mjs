// scripts/evaluate.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Evaluation harness: run the scoring pipeline over a list of addresses and
// print a table of results.  npm run evaluate -- addresses.txt
//
// WHY THIS EXISTS, AND WHY IT IS NOT A BACK DOOR
// ----------------------------------------------
// The web application deliberately refuses to look up an address the user has
// not proven they control (app/api/verify/*). That is a product decision about
// what a public website may do, and it stands.
//
// This is not the website. It is a local research instrument, run by the
// researcher, on a machine the researcher controls, against addresses the
// researcher is entitled to check:
//
//   • addresses the researcher owns, or
//   • addresses a participant has given written informed consent for, in person
//
// It is NOT deployed, NOT reachable over the network, and NOT importable by the
// app. Its purpose is to validate the scoring model (thesis component B)
// against real breach data without routing every check through an email flow.
//
// LEGAL AND ETHICAL CONDITIONS — read before running
//   1. GDPR Art. 6(1)(a): consent is the lawful basis for any address that is
//      not your own. Obtain it in writing, before the lookup, per address.
//   2. Do not run this against addresses harvested from anywhere.
//   3. Results may reveal special-category data (Art. 9) by implication — a
//      breach can disclose sexual orientation, health or religion. Treat the
//      output as confidential and do not publish it with the address attached.
//   4. Store nothing you do not need. --out writes a CSV; by default addresses
//      are HASHED in that file so the artifact is not a list of who was breached.
//      --with-emails overrides this and should only be used under an approved
//      protocol.
//
// Usage
//   npm run evaluate -- addresses.txt                 table to the console
//   npm run evaluate -- addresses.txt --out eval.csv  plus a CSV (hashed ids)
//   npm run evaluate -- addresses.txt --json          machine-readable output
//
// The input file is one address per line; blank lines and lines starting with
// # are ignored. HIBP_API_KEY must be set in the environment.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { queryHIBP, queryDeHashed, mergeBreaches } from "../lib/sources.js";
import { emailReport } from "../lib/score.js";
import { applicableIds, residualScore, estimatedReduction } from "../lib/playbook.js";

const HIBP_KEY = process.env.HIBP_API_KEY || "";
const DEHASHED_KEY = process.env.DEHASHED_API_KEY || "";

// HIBP's Core tier allows 10 requests per minute. Going faster earns a 429 and
// a slower run overall, so the harness paces itself rather than retrying.
const DELAY_MS = Number(process.env.EVAL_DELAY_MS || 6500);

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const outPath = argValue("--out");
const asJson = args.includes("--json");
const withEmails = args.includes("--with-emails");

if (!file) {
  console.error("usage: npm run evaluate -- <addresses.txt> [--out eval.csv] [--json] [--with-emails]");
  process.exit(1);
}
if (!HIBP_KEY) {
  console.error("HIBP_API_KEY is not set. export it first (it is never written to disk by this script).");
  process.exit(1);
}

const addresses = readFileSync(file, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

if (!addresses.length) {
  console.error("No addresses found in " + file);
  process.exit(1);
}

console.error("Checking " + addresses.length + " address(es) against HIBP" +
  (DEHASHED_KEY ? " and DeHashed" : "") + ", pacing at " + DELAY_MS + "ms…\n");

const rows = [];
for (let i = 0; i < addresses.length; i++) {
  const email = addresses[i].toLowerCase();
  if (i > 0) await sleep(DELAY_MS);

  const [hibp, dehashed] = await Promise.all([
    queryHIBP(email, HIBP_KEY),
    DEHASHED_KEY ? queryDeHashed(email, DEHASHED_KEY) : Promise.resolve(null),
  ]);

  const lists = [];
  const ok = [];
  const failed = [];
  for (const [name, result] of [["HIBP", hibp], ["DeHashed", dehashed]]) {
    if (!result) continue;
    if (result.ok) { ok.push(name); lists.push(result.breaches); }
    else failed.push(name + "(" + result.reason + ")");
  }

  // Never report "no breaches" for a check that did not run. Same rule as the
  // app: a failed source is a gap in knowledge, not a clean result.
  if (!ok.length) {
    rows.push({ id: hashOf(email), email, error: "all sources failed: " + failed.join(", ") });
    console.error("  ! " + email + " — no source answered (" + failed.join(", ") + ")");
    continue;
  }

  const report = emailReport(mergeBreaches(...lists));
  const ids = applicableIds(report);

  // What the score would become if the user completed every applicable action.
  const best = residualScore(report, ids);

  rows.push({
    id: hashOf(email),
    email,
    score: report.score,
    band: report.level,
    breaches: report.breaches.length,
    attrs: report.attrs.join("|"),
    oldest: oldestYear(report),
    newest: newestYear(report),
    undated: report.breaches.filter((b) => b.ageAssumed).length,
    residual_best: best.score,
    top_action: ids[0] || "",
    top_action_points: ids[0] ? estimatedReduction(report, ids[0]) : 0,
    sources_ok: ok.join("+"),
    sources_failed: failed.join("+") || "-",
  });
  process.stderr.write("  ✓ " + email + " → " + report.score + "/100 (" + report.level + ", " +
    report.breaches.length + " breaches)\n");
}

console.error("");

if (asJson) {
  console.log(JSON.stringify(withEmails ? rows : rows.map(stripEmail), null, 2));
} else {
  printTable(rows);
  printSummary(rows);
}

if (outPath) {
  const data = withEmails ? rows : rows.map(stripEmail);
  const cols = Object.keys(data[0]);
  const csv = [cols.join(","), ...data.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
  writeFileSync(outPath, csv + "\n", "utf8");
  console.error("Wrote " + outPath + (withEmails ? " WITH addresses — handle under your approved protocol." :
    " with hashed identifiers (addresses omitted)."));
}

// ---- helpers ----------------------------------------------------------------

function argValue(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "";
}

// A stable pseudonym so repeated runs line up per participant, without the CSV
// becoming a list of breached people.
function hashOf(email) {
  return createHash("sha256").update("exposio-eval:" + email).digest("hex").slice(0, 12);
}

function stripEmail({ email, ...rest }) { return rest; }

function oldestYear(report) {
  const years = report.breaches.map((b) => b.year).filter(Boolean).sort();
  return years[0] || "";
}
function newestYear(report) {
  const years = report.breaches.map((b) => b.year).filter(Boolean).sort();
  return years[years.length - 1] || "";
}

function printTable(rows) {
  // Failed lookups are listed separately rather than as a row of blanks: an
  // empty row next to a score of 0 reads as "clean", which is the one thing
  // this tool must never imply for a check that did not run.
  const scored = rows.filter((r) => !r.error);
  const failed = rows.filter((r) => r.error);

  if (scored.length) {
    const cols = ["id", "score", "band", "breaches", "undated", "residual_best", "top_action", "sources_ok"];
    const widths = cols.map((c) => Math.max(c.length, ...scored.map((r) => String(r[c] ?? "").length)));
    const line = (cells) => cells.map((v, i) => String(v ?? "").padEnd(widths[i])).join("  ");
    console.log(line(cols));
    console.log(widths.map((w) => "-".repeat(w)).join("  "));
    for (const r of scored) console.log(line(cols.map((c) => r[c])));
    console.log("");
  }

  if (failed.length) {
    console.log("NOT CHECKED — these addresses have no result, which is not the same as no exposure:");
    for (const r of failed) console.log("  " + r.id + "  " + r.error);
    console.log("");
  }
}

function printSummary(rows) {
  const scored = rows.filter((r) => typeof r.score === "number");
  if (!scored.length) return;
  const scores = scored.map((r) => r.score).sort((a, b) => a - b);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const median = scores.length % 2
    ? scores[(scores.length - 1) / 2]
    : (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2;
  const bands = {};
  for (const r of scored) bands[r.band] = (bands[r.band] || 0) + 1;

  console.log("n = " + scored.length +
    "   mean = " + mean.toFixed(1) +
    "   median = " + median +
    "   min = " + scores[0] +
    "   max = " + scores[scores.length - 1]);
  console.log("bands: " + Object.entries(bands).map(([b, n]) => b + "=" + n).join("  "));
  const clean = scored.filter((r) => r.score === 0).length;
  console.log("addresses with no exposure found: " + clean + " / " + scored.length);
  console.log("");
}

function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
