// scripts/twoprofiles.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Two breach histories of four incidents each, scored by the deployed model.
//
// WHY THIS EXISTS
// Section 5.6 found that scoring a subject by their single worst breach
// reproduces the full model almost exactly, and Section 5.10 answers that with
// a synthetic corpus of 2,000 identities. A synthetic answer to an objection
// about realism is a weak answer. This gives the same demonstration on
// incidents that actually happened.
//
// Both profiles hold four breaches. A breach-notification service reports the
// same thing for each: four breaches, pwned. The model separates them roughly
// two to one, and — the part that matters to the person — says which of the
// two can act on the result.
//
// WHAT THESE PROFILES ARE, AND ARE NOT
// The breach records are the ones Have I Been Pwned publishes for each named
// incident: its date and its data classes, both public. The profiles are
// combinations of those public records. No identifier is queried here and none
// appears in this file, which keeps the demonstration inside the
// self-assessment scope of Section 8.2: publishing a real person's breach
// history is exactly what that scope forbids.
//
//   node scripts/twoprofiles.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { emailReport, IDENTITY_WEIGHTS } from "../lib/score.js";
import { scoreInterval } from "../lib/interval.js";
import { residualScore, applicableIds } from "../lib/playbook.js";

// Fixed, so the figures in the thesis stay reproducible as time passes.
const NOW = new Date("2026-11-05T00:00:00Z");

const CREDENTIAL_ONLY = [
  { title: "Synthient Credential Stuffing Threat Data", date: "2025-04-01", sources: ["HIBP"],
    dataClasses: ["Email addresses", "Passwords"] },
  { title: "Collection #1", date: "2019-01-07", sources: ["HIBP"],
    dataClasses: ["Email addresses", "Passwords"] },
  { title: "Kayo.moe Credential Stuffing List", date: "2018-09-01", sources: ["HIBP"],
    dataClasses: ["Email addresses", "Passwords"] },
  { title: "Exploit.In", date: "2016-10-13", sources: ["HIBP"],
    dataClasses: ["Email addresses", "Passwords"] },
];

const IDENTITY_HEAVY = [
  { title: "TAP Air Portugal", date: "2022-08-25", sources: ["HIBP"],
    dataClasses: ["Dates of birth", "Email addresses", "Genders", "Names", "Nationalities",
                  "Phone numbers", "Physical addresses", "Salutations", "Spoken languages"] },
  { title: "MGM Resorts (2022 Update)", date: "2019-07-10", sources: ["HIBP"],
    dataClasses: ["Dates of birth", "Email addresses", "Names", "Phone numbers",
                  "Physical addresses"] },
  { title: "Canva", date: "2019-05-24", sources: ["HIBP"],
    dataClasses: ["Email addresses", "Geographic locations", "Names", "Passwords",
                  "Usernames"] },
  { title: "Lumin PDF", date: "2019-04-18", sources: ["HIBP"],
    dataClasses: ["Auth tokens", "Email addresses", "Genders", "Names", "Passwords",
                  "Spoken languages", "Usernames"] },
];

function report(label, breaches) {
  const r = emailReport(breaches, NOW);
  const iv = scoreInterval(r);
  const res = residualScore(r, applicableIds(r));
  const perm = (r.identityAttrs || []).filter((a) => IDENTITY_WEIGHTS[a]);

  console.log("=".repeat(74));
  console.log(label);
  console.log("=".repeat(74));
  for (const b of r.breaches) {
    console.log("  " + b.title.slice(0, 40).padEnd(42)
      + String(b.ageDays).padStart(5) + " d"
      + "   credential " + b.contribution.toFixed(4)
      + (b.identityAttrs.length ? "   permanent: " + b.identityAttrs.join(", ") : ""));
  }
  console.log("  " + "-".repeat(70));
  console.log("  revocable term  B_cred   " + r.credRaw.toFixed(4));
  console.log("  permanent term  0.70*I   " + r.identityRaw.toFixed(4)
    + "   union of " + perm.length + ": " + (perm.join(", ") || "none"));
  console.log("  volatile  term  0.60*V   " + r.volatileRaw.toFixed(4));
  console.log("  B_raw                    " + r.raw.toFixed(4));
  console.log("  SCORE                    " + r.score + "  " + r.level
    + "   (interval " + iv.lo + "\u2013" + iv.hi + ", band stable " + iv.bandStable + "%)");
  console.log("  after every action       " + res.score + "   floor " + (res.floor ?? 0));
  console.log("  permanent share          "
    + (r.raw > 0 ? Math.round((r.identityRaw / r.raw) * 100) : 0) + "%");
  console.log();
  return r;
}

const a = report("PROFILE A \u2014 four credential dumps", CREDENTIAL_ONLY);
const b = report("PROFILE B \u2014 identity-heavy", IDENTITY_HEAVY);

console.log("Both profiles contain " + a.breaches.length + " breaches. A notification service");
console.log("reports the same thing for each. This model reports " + a.score + " and " + b.score + ".");
