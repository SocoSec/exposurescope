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
      + `${newest.ageAssumed ? ", an age assumed because no source supplied a date," : ""}`
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
