// lib/explain.js
// ─────────────────────────────────────────────────────────────────────────────
// The score, in sentences, computed from the same report the number came from.
//
// WHY THIS EXISTS
// The thesis claims the score is explainable. Until now that claim rested on
// the interface showing a breakdown: a chart of contributions, a list of data
// classes, a derivation panel. Those show a reader WHAT the parts are; they do
// not tell them what the number means. Comparable services do better on this
// one point — XposedOrNot states its factors in two sentences of plain English
// — and a model that is genuinely more detailed has no excuse for being harder
// to read.
//
// Every sentence below is generated from the report. None is a fixed string
// describing the model in general: each states what happened to THIS subject,
// with the figures taken from the same object the score was computed on. A
// sentence therefore cannot contradict the number it explains, which is the
// property that makes this an explanation rather than a caption.
//
// It deliberately says three things no comparable tool says:
//   • that part of the exposure decays and part of it does not, and why
//   • how much the score would move if the model's weights were wrong
//   • what remediation cannot remove, and why there is a floor
// ─────────────────────────────────────────────────────────────────────────────

import { DECAY_PER_DAY, IDENTITY_WEIGHTS, VOLATILE_HALF_LIFE_DAYS } from "./score.js";
import { scoreInterval } from "./interval.js";
import { applicableIds, residualScore } from "./playbook.js";

const HALF_LIFE = Math.round(Math.log(2) / DECAY_PER_DAY);

const LABEL = {
  govid: "a government identifier", dob: "a date of birth", address: "a postal address",
  phone: "a telephone number", name: "a name", username: "a username",
  location: "a city or region", nationality: "a nationality", gender: "a stated gender",
  biometric: "biometric data", geoprecise: "a precise location", birthplace: "a place of birth",
  maidenname: "a mother's maiden name", sensitive: "special-category data",
  ethnicity: "an ethnicity", deviceid: "a device identifier", relations: "family relationships",
};

const WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const count = (n) => (n <= 10 ? WORD[n] : String(n));
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : t);
const plural = (n, s, p) => `${count(n)} ${n === 1 ? s : p}`;

function list(items) {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

function shortAge(days) {
  if (days < 1) return "less than a day";
  if (days < 14) return `${days} days`;
  if (days < 60) return `about ${Math.round(days / 7)} weeks`;
  if (days < 365) return `about ${Math.round(days / 30)} months`;
  return years(days);
}

function years(days) {
  if (days < 45) return "less than two months";
  if (days < 365) return `about ${Math.round(days / 30)} months`;
  const y = days / 365;
  return y < 1.5 ? "about a year" : `about ${count(Math.round(y))} years`;
}

/**
 * Produce the plain-language account of a report.
 * Returns { headline, sentences[], interval, split, floor } so an interface can
 * render it and the thesis can quote it without re-deriving anything.
 */
export function explain(report, { includeRemediation = true } = {}) {
  const out = [];
  const band = { safe: "Safe", low: "Low", medium: "Medium", high: "High" }[report.level] || report.level;

  if (!report.breaches || report.score === 0) {
    return {
      headline: "No exposure was found for this identifier in the sources that answered.",
      sentences: ["This is not proof of safety: it means the sources consulted hold no record. "
                + "A source that failed to answer is named separately."],
      interval: null, split: null, floor: null,
    };
  }

  const headline = `Your Breach Risk score is ${report.score} out of 100, in the ${band} band.`;

  // ── what was found ───────────────────────────────────────────────────────
  const withCred = report.breaches.filter((b) => b.credSeverity > 0);
  const without = report.breaches.length - withCred.length;
  let found = `${plural(report.breaches.length, "breach was", "breaches were")} found`;
  if (withCred.length && without) {
    found += `: ${count(withCred.length)} exposed a password or payment instrument, `
           + `and ${count(without)} exposed other details but no credential.`;
  } else if (withCred.length) {
    found += `, ${withCred.length === 1 ? "and it exposed" : "and all of them exposed"} `
           + "a password or payment instrument.";
  } else {
    found += report.breaches.length === 1
      ? ", and it exposed no password."
      : ", and none of them exposed a password.";
  }
  out.push(cap(found));

  // ── the fast clock ───────────────────────────────────────────────────────
  if (withCred.length) {
    const newest = withCred.reduce((a, b) => (b.ageDays < a.ageDays ? b : a));
    const pct = Math.round(newest.recency * 100);
    out.push(
      `The most recent credential exposure is ${years(newest.ageDays)} old`
      + `${newest.ageAssumed ? ", an age assumed because no source supplied a date" : ""}`
      + `. A password can be changed, so that exposure is discounted as it ages, halving every `
      + `${HALF_LIFE} days; it currently counts for ${pct}% of what it would have counted on the `
      + `day it was disclosed.`);
  }

  // ── the volatile clock ───────────────────────────────────────────────────
  const stealers = report.breaches.filter((b) => b.stealer);
  if (stealers.length) {
    const newest = stealers.reduce((a, b) => (b.ageDays < a.ageDays ? b : a));
    const live = Math.round(newest.volatileRecency * 100);
    out.push(cap(
      `${plural(stealers.length, "record came", "records came")} from an infostealer rather than `
      + `from a company breach. That matters separately, because malware of this kind takes the `
      + `live session as well as the password: cookies and tokens that are already signed in, and `
      + `that you cannot revoke by changing anything. Sessions expire by themselves, so this part `
      + `is discounted far faster, halving every ${VOLATILE_HALF_LIFE_DAYS} days; the most recent `
      + `infection is ${years(newest.ageDays)} old and its live-session weight stands at ${live}%.`));
  }

  // ── the slow clock ───────────────────────────────────────────────────────
  const perm = (report.identityAttrs || []).filter((a) => IDENTITY_WEIGHTS[a]);
  if (perm.length) {
    const named = perm
      .slice()
      .sort((a, b) => IDENTITY_WEIGHTS[b] - IDENTITY_WEIGHTS[a])
      .map((a) => LABEL[a] || a);
    out.push(
      `${plural(perm.length, "detail that cannot be changed was", "details that cannot be changed were")} `
      + `exposed: ${list(named)}. These do not fade with time, and they are counted once however many `
      + `breaches carried them, because the same date of birth leaked twice is still one date of birth.`);
    out[out.length - 1] = cap(out[out.length - 1]);
  }

  // ── where the score actually comes from ──────────────────────────────────
  const share = (x) => (report.raw > 0 ? Math.round(((x || 0) / report.raw) * 100) : 0);
  const permShare = share(report.identityRaw);
  const volShare = share(report.volatileRaw);
  const credShare = Math.max(0, 100 - permShare - volShare);
  const split = { permanentShare: permShare, volatileShare: volShare, credentialShare: credShare };
  if (perm.length && (withCred.length || stealers.length)) {
    if (permShare >= 50) {
      out.push(`The permanent half accounts for ${permShare}% of this score. What is driving it is `
             + `not the leaked credential but the details behind it.`);
    } else if (volShare >= 50) {
      out.push(`The live-session half accounts for ${volShare}% of this score. It will fall on its `
             + `own as those sessions expire, but until they do it is the part that matters most, `
             + `and signing out of every device is what ends it.`);
    } else {
      out.push(`The revocable half accounts for ${credShare}% of this score, so most of it can be `
             + `removed by changing what was leaked.`);
    }
  }

  // ── how much the model could be wrong ────────────────────────────────────
  const iv = scoreInterval(report);
  out.push(
    `Every weight in this model is a judgement, not a measurement. If all of them were wrong by up `
    + `to ${Math.round(iv.spread * 100)}%, this score would still fall between ${iv.lo} and ${iv.hi}, `
    + `and would remain in the ${band} band in ${iv.bandStable}% of those cases.`);

  // ── what remediation cannot do ───────────────────────────────────────────
  let floor = null;
  if (includeRemediation) {
    try {
      const all = residualScore(report, applicableIds(report));
      floor = { after: all.score, floor: all.floor ?? all.score, removable: report.score - all.score };
      const f = all.floor ?? 0;
      if (floor.removable <= 0) {
        out.push("No action offered reduces this score, because nothing it measures can be "
               + "withdrawn. The figure is a floor.");
      } else if (f > 0) {
        out.push(`Completing every action offered brings the score to ${all.score}. It cannot fall `
               + `below ${f}, because no action available to anyone withdraws a detail already held `
               + `in someone else's file, and the report shows that floor rather than implying a `
               + `return to zero.`);
      } else {
        out.push(`Completing every action offered brings the score to ${all.score}. There is no `
               + `irreducible core here: everything this score measures is revocable in principle, `
               + `and what remains reflects how much each action is estimated to achieve.`);
      }
    } catch { /* remediation is optional; the explanation stands without it */ }
  }

  return { headline, sentences: out, interval: iv, split, floor };
}

// ─────────────────────────────────────────────────────────────────────────────
// THE SHORT VERSION
//
// explain() above is thorough and it is too long. Six paragraphs, "halving
// every 347 days", "the permanent half accounts for 100% of this score" — a
// person who has just been told their data is in three breaches does not read
// that, and a model nobody reads is not an explainable model, whatever the
// thesis claims for it.
//
// The idea underneath is one sentence: some of what leaked you can change,
// some you cannot, and the part you cannot is usually what decides the number.
// Everything else is a refinement on top of that sentence.
//
// So brief() gives the three things the card actually shows — the number, how
// it was worked out, and what was found — and nothing else. The long form
// stays for the Learn tab and for anyone who asks for the derivation, which is
// the right place for the arithmetic.
//
// What goes into "how" depends on what actually happened to THIS subject. A
// profile with no stolen session does not get a sentence about stolen
// sessions. That keeps the paragraph short by leaving things out rather than
// by compressing them, which is the only kind of brevity that does not lie.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The card: a score, a band, a plain-language note on how it was reached, and
 * one line saying what was found. Returns { score, band, how, found }.
 */
export function brief(report) {
  const band = { safe: "Safe", low: "Low", medium: "Medium", high: "High" }[report.level]
            || report.level;

  // ── the credential path ──────────────────────────────────────────────
  // A password check produces a score too, and until now it produced no
  // account of where that score came from: the interface said only that the
  // password was in public dumps. The quantity is different from the account
  // score — it measures how widely one secret has circulated, not what is
  // known about a person — so it needs its own sentences rather than a
  // reworded copy of theirs.
  if (report.kind === "password") {
    const n = report.count || 0;
    if (!n) {
      return {
        score: 0, band,
        how: "Nothing was found, so there is nothing to score. This is not proof the password is "
           + "strong: it means it has not appeared in the corpora we can check.",
        found: "This password does not appear in the breach corpora we checked.",
      };
    }
    return {
      score: report.score, band,
      how: "This score weighs how widely the password has circulated, and nothing about you. A "
         + "password found once is already compromised; one found millions of times is in the "
         + "first list an attacker tries, so the count matters more than the fact of a match. "
         + "It cannot rise above 70, because a password is something you can change, and the "
         + "top of the scale is kept for exposure you cannot. The password itself never left "
         + "this device: only the first five characters of its hash were sent, and the rest was "
         + "matched here.",
      found: n === 1
        ? "This password appears once in the breach corpora we checked."
        : `This password appears ${n.toLocaleString()} times in the breach corpora we checked.`,
    };
  }

  const what = report.kind === "phone" ? "Your phone number" : "Your email";

  if (!report.breaches || !report.breaches.length) {
    return {
      score: 0, band,
      how: "Nothing was found, so there is nothing to score. This is not proof that you are "
         + "safe: it means the places we checked hold no record of you.",
      found: `${what} did not appear in any breach the sources we checked know about.`,
    };
  }

  // ── how ────────────────────────────────────────────────────────────────
  // One short paragraph. The first two sentences are the whole model; the
  // rest appear only when they did something to this score.
  const how = ["The score weighs what leaked and how long ago. A password can be changed, so it "
             + "counts for less as time passes. Things you cannot change \u2014 your date of birth, "
             + "your name, your address \u2014 keep counting however old the breach is."];

  const permShare = report.raw > 0 ? Math.round((report.identityRaw / report.raw) * 100) : 0;
  if (permShare >= 50) {
    how.push("Here that unchangeable part is most of the number, which is why it does not fall "
           + "much as the breaches age.");
  }
  if (report.breaches.some((b) => b.stealer)) {
    how.push("One record came from malware that took a login session, not just a password. That "
           + "counts heavily at first and fades within weeks, because sessions expire by "
           + "themselves.");
  }
  if (report.cipherCoverage > 0) {
    how.push("Where a site told us how it stored your password, a plaintext one counts in full "
           + "and a strongly scrambled one counts for very little.");
  }

  // ── found ──────────────────────────────────────────────────────────────
  const n = report.breaches.length;
  const withCred = report.breaches.filter((b) => b.credSeverity > 0).length;
  const without = n - withCred;
  const word = (k) => (k <= 10 ? WORD[k] : String(k));
  let found = `${what} appeared in ${word(n)} ${n === 1 ? "breach" : "breaches"}`;
  if (withCred && without) {
    found += `: ${word(withCred)} exposed your password, ${word(without)} exposed other details `
           + "but no password.";
  } else if (withCred) {
    found += n === 1 ? ", and it exposed your password." : ", and all of them exposed your password.";
  } else {
    found += n === 1
      ? ", which exposed other details but no password."
      : ", which exposed other details but no password.";
  }

  return { score: report.score, band, how: how.join(" "), found: cap(found) };
}
