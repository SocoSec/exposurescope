// scripts/verify-cipher.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Confirm the BreachDirectory response shape without spending more than one of
// the ten requests the free plan allows per month.
//
//   BREACHDIRECTORY_API_KEY=... node scripts/verify-cipher.mjs you@example.com
//
// WHY THIS SCRIPT EXISTS AND WHY IT PRINTS SO LITTLE
// The parser in lib/sources.js was written from published field names, because
// the service sits behind bot protection and could not be inspected. One real
// call settles whether those names are right.
//
// But this endpoint answers with the leaked passwords themselves: a partially
// censored plaintext and a SHA-1 of each. A debugging script that dumps the
// response would put credential material on a terminal, into scrollback, and
// very likely into a screenshot. So this prints FIELD NAMES and the algorithm
// the parser derives, and never a value from any field that could carry a
// password or a hash.
//
// Use your own address. The ownership rule that governs the application
// governs the tooling around it too.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cipherFromRecord, credentialRecovered } from "../lib/sources.js";

// Next.js reads .env.local for us; a standalone script does not, so load it
// here. No dependency, and it leaves anything already in the environment
// alone so an inline override still wins.
function loadEnvLocal() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.join(here, "..", ".env.local");
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(String.fromCharCode(10))) {
    const line = raw.trim();
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const value = m[2].trim().replace(/^["']|["']$/g, "");
    if (value && !process.env[m[1]]) process.env[m[1]] = value;
  }
}
loadEnvLocal();

let ok = true, done = false;
const KEY = process.env.BREACHDIRECTORY_API_KEY;
const EMAIL = process.argv[2];

if (!KEY) {
  console.error("BREACHDIRECTORY_API_KEY not found.");
  console.error("Add this line to .env.local in the project root:");
  console.error("   BREACHDIRECTORY_API_KEY=your_key_here");
  process.exit(1);
}
if (!EMAIL || !EMAIL.includes("@")) {
  console.error("Usage: node scripts/verify-cipher.mjs you@example.com   (use your own address)");
  process.exit(1);
}

// Any field whose name suggests credential material: never print its value.
// The cipher-NAME fields are exempt: "bcrypt" is the answer we came for, and
// naming an algorithm discloses nothing. Everything else stays withheld.
const CIPHER_NAME_FIELD = /^(hash_?type|algorithm|algo|cipher|type)$/i;
const SECRET_FIELD = /pass|hash|sha|md5|plain|line|crack|value/i;

const show = (name, value) => {
  if (SECRET_FIELD.test(name) && !CIPHER_NAME_FIELD.test(name)) {
    const kind = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    const len = typeof value === "string" ? `, length ${value.length}` : "";
    return `${name}: <withheld: ${kind}${len}>`;
  }
  if (typeof value === "string" && value.length > 60) return `${name}: ${JSON.stringify(value.slice(0, 60))}…`;
  return `${name}: ${JSON.stringify(value)}`;
};

if (ok && !done) {
const url = "https://breachdirectory.p.rapidapi.com/?func=auto&term=" + encodeURIComponent(EMAIL);
let res;
try {
  res = await fetch(url, {
  headers: {
    "x-rapidapi-key": KEY,
    "x-rapidapi-host": "breachdirectory.p.rapidapi.com",
    accept: "application/json",
    // keep-alive leaves a socket open past the last statement, which trips a
    // libuv teardown assertion on Windows; this is a one-shot script, so ask
    // for the connection to close with the response
    connection: "close",
    },
  });
} catch (err) {
  console.error("Request failed before any response:", err?.cause?.code || err?.message || err);
  console.error("Network or DNS problem, not an API problem. Nothing was spent.");
  ok = false;
  done = true;
}
if (!done) {

console.log("HTTP", res.status, res.statusText);
console.log("quota remaining:", res.headers.get("x-ratelimit-requests-remaining") ?? "(not reported)");
if (!res.ok) {
  console.log("\nThe parser treats any non-200 as 'no cipher information', so the model is unaffected.");
  process.exit(0);
}

const data = await res.json();
console.log("\ntop-level keys:", Object.keys(data).join(", "));
console.log("success:", data.success, " found:", data.found);
// an error message is diagnostic, not credential material, so print it whole
for (const k of ["error", "message", "reason", "detail"]) {
  if (data[k] !== undefined) console.log(`${k}:`, JSON.stringify(data[k]));
}
// and show the shape of anything array-like, whatever it is called
for (const [k, v] of Object.entries(data)) {
  if (Array.isArray(v)) console.log(`array field "${k}": ${v.length} items`
    + (v.length ? `, first item keys: ${typeof v[0] === "object" ? Object.keys(v[0]).join(", ") : typeof v[0]}` : ""));
}

const rows = Array.isArray(data.result) ? data.result : [];
console.log(`\nresult rows: ${rows.length}`);
if (!rows.length) {
  console.log("No rows. Nothing to verify — try an address with known exposure.");
  process.exit(0);
}

console.log("\nfields present on the first row (values withheld where sensitive):");
for (const [k, v] of Object.entries(rows[0])) console.log("   " + show(k, v));

console.log("\nwhat the parser derives from each row:");
let detected = 0;
rows.slice(0, 10).forEach((row, i) => {
  const c = cipherFromRecord(row);
  const rec = credentialRecovered(row);
  if (c || rec) detected++;
  console.log(`   row ${i + 1}: sources=${JSON.stringify(row.sources ?? null)}`
            + `  ->  cipher=${JSON.stringify(c)}  recovered=${rec}`);
});

console.log(`\n${detected}/${Math.min(rows.length, 10)} rows yielded an algorithm.`);
console.log(detected
  ? "The parser reads this shape. Nothing further needed."
  : "Nothing derived: compare the field names above with CIPHER_FIELDS in lib/sources.js.");
}
if (!ok) process.exitCode = 1;

// Node 24 on Windows trips a libuv teardown assertion when the HTTP pool is
// still closing as the module ends. The work above is finished by this point,
// so drain the loop once and exit deliberately rather than let teardown race.
}
await new Promise((r) => setTimeout(r, 50));
process.exit(ok ? 0 : 1);
