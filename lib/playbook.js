// lib/playbook.js
// ─────────────────────────────────────────────────────────────────────────────
// The vetted action library ("playbook") and the residual-risk model.
//
// Every security step Exposio shows comes from THIS file — written and reviewed
// by a human, versioned in git. Three features read it:
//   1. Actions tab   — shows the entries that apply to the user's report.
//   2. Residual risk — when the user ticks an action as done, its `mitigates`
//                      rules shrink the matching breach contributions.
//   3. ExpoBot       — the LLM may only reference entries by `id`; the steps
//                      the user sees are always this text, never model output.
//
// Mitigation factors are PROVISIONAL estimates. They exist so progress is
// visible and measurable; calibrating them is thesis Study 2.
// ─────────────────────────────────────────────────────────────────────────────

import { B_MAX, bandFor } from "./score.js";

export const PLAYBOOK_VERSION = "2026-09-a";

export const PLAYBOOK = [
  {
    id: "PW_STOP",
    category: "Credential Security",
    title: "Stop using this password everywhere",
    applies: (r) => r.kind === "password" && r.attrs.includes("password"),
    finding: (r) => "This password appears " + r.count.toLocaleString("en") + " times in known breach dumps, so attackers try it first.",
    steps: [
      "Change it on every account where you used it — start with your email account.",
      "Never use it again, not even with a small change such as an added number.",
      "Let a password manager create the replacements.",
    ],
    mitigates: [{ attr: "password", factor: 0.9 }],
  },
  {
    id: "PW_CHANGE",
    category: "Credential Security",
    title: "Change every password exposed in these breaches",
    applies: (r) => r.kind !== "password" && r.attrs.includes("password"),
    finding: (r) => "Passwords leaked in " + names(r, "password") + " can be replayed against your other accounts.",
    steps: [
      "Start with your email account, then banking and shopping accounts.",
      "Change the password on each service above, and anywhere you reused it.",
      "Make every new password unique: at least 14 characters or a random passphrase.",
    ],
    mitigates: [{ attr: "password", factor: 0.6 }],
  },
  {
    id: "PW_MANAGER",
    category: "Credential Security",
    title: "Use a password manager so no password is reused",
    applies: (r) => r.attrs.includes("password"),
    finding: () => "Reused passwords are what turn one breach into many hacked accounts.",
    steps: [
      "Install a reputable password manager on your phone and computer.",
      "Let it generate a unique password for every account.",
      "Open its reused-password report and fix those accounts first.",
    ],
    mitigates: [{ attr: "password", factor: 0.3 }],
  },
  {
    id: "MFA_APP",
    category: "Account Protection",
    title: "Turn on two-step verification with an authenticator app or passkey",
    applies: (r) => r.attrs.includes("password") || r.attrs.includes("email"),
    finding: () => "A second factor stops most account takeovers even when the password is known.",
    steps: [
      "Enable it on your email account first — email can reset every other account.",
      "Prefer an authenticator app or a passkey over SMS codes.",
      "Store the backup codes somewhere offline.",
    ],
    mitigates: [{ attr: "password", factor: 0.3 }, { attr: "email", factor: 0.1 }],
  },
  {
    id: "FIN_CHECK",
    category: "Financial Protection",
    title: "Check your statements and replace exposed cards",
    applies: (r) => r.attrs.includes("financial"),
    finding: (r) => "Payment or bank data was exposed in " + names(r, "financial") + ".",
    steps: [
      "Review the last few months of card and bank statements for charges you don't recognise.",
      "Ask your bank to replace any card used on the breached services.",
      "Turn on transaction alerts in your banking app.",
    ],
    mitigates: [{ attr: "financial", factor: 0.5 }],
  },
  {
    id: "PHONE_PIN",
    category: "SIM-Swap Defence",
    title: "Protect your phone number from SIM-swap fraud",
    applies: (r) => r.attrs.includes("phone"),
    finding: (r) => "Your phone number was exposed in " + names(r, "phone") + ".",
    steps: [
      "Ask your mobile carrier to add a SIM-change or port-out PIN to your account.",
      "Move two-step verification off SMS wherever the service allows it.",
      "Treat unexpected texts that ask you to click a link or call a number as suspicious.",
    ],
    mitigates: [{ attr: "phone", factor: 0.3 }],
  },
  {
    id: "PHISH_GUARD",
    category: "Phishing Defence",
    title: "Expect phishing that mentions these companies",
    applies: (r) => r.attrs.includes("email"),
    finding: (r) => "Attackers know you had accounts with " + names(r, "email") + " and can impersonate them.",
    steps: [
      "Be suspicious of messages about these services, even when they look official.",
      "Open the service by typing its address yourself — never through a link in the message.",
      "Use a separate email alias for new sign-ups.",
    ],
    mitigates: [{ attr: "email", factor: 0.15 }],
  },
  {
    id: "LINK_LIMIT",
    category: "Identity & Linkage",
    title: "Make your accounts harder to link together",
    applies: (r) => r.attrs.includes("address") || r.attrs.includes("username"),
    finding: () => "Usernames and addresses let separate profiles be joined into one picture of you.",
    steps: [
      "Use different usernames for accounts you want kept separate.",
      "Remove your home address from public profiles and old accounts.",
      "Close accounts you no longer use.",
    ],
    mitigates: [{ attr: "address", factor: 0.2 }, { attr: "username", factor: 0.2 }],
  },
  {
    id: "GDPR_REQUEST",
    category: "Your GDPR Rights",
    title: "Ask breached companies what they hold about you",
    applies: (r) => r.kind !== "password" && r.breaches.length > 0,
    finding: () => "EU law lets you see, and often delete, the data a company keeps about you.",
    steps: [
      "Use the letter drafts below to send an access (Art. 15) or erasure (Art. 17) request.",
      "The company must answer within one month.",
      "If it doesn't, you can complain to your national data protection authority.",
    ],
    // Deleting data stops FUTURE leaks; copies already circulating stay out
    // there. Honest answer: no reduction in today's score.
    mitigates: [],
  },
  {
    id: "MONITOR",
    category: "Ongoing Monitoring",
    title: "Keep watching for new breaches",
    applies: () => true,
    finding: () => "New breaches surface every week; exposure changes over time.",
    steps: [
      "Turn on free breach notifications for your email at haveibeenpwned.com/NotifyMe.",
      "Re-run this check every few months.",
      "Change a password immediately when a new breach names a service you use.",
    ],
    mitigates: [],
  },
];

const BY_ID = Object.fromEntries(PLAYBOOK.map((entry) => [entry.id, entry]));

export function playbookEntry(id) {
  return BY_ID[id] || null;
}

// Entries relevant to this report, in playbook order (which is priority order).
export function applicableActions(report) {
  return PLAYBOOK.filter((entry) => entry.applies(report));
}

export function applicableIds(report) {
  return applicableActions(report).map((entry) => entry.id);
}

// ---- residual risk ----------------------------------------------------------
// Exposure = what is out there (never changes when you act).
// Residual = exposure after the actions you've completed.
//
// For each breach, a completed action applies its LARGEST matching factor
// (an action counts once per breach even if several of its rules match), and
// different actions multiply:  contribution × (1 − f1) × (1 − f2) …
function factorFor(action, breachAttrs) {
  let best = 0;
  for (const rule of action.mitigates) {
    if (breachAttrs.includes(rule.attr)) best = Math.max(best, rule.factor);
  }
  return best;
}

export function residualScore(report, doneIds) {
  const done = [...doneIds].map(playbookEntry).filter(Boolean);
  if (report.score === 0) return { score: 0, level: "safe" };

  if (report.kind === "password") {
    const remaining = done.reduce((s, action) => s * (1 - factorFor(action, report.attrs)), report.score);
    const score = Math.round(remaining);
    return { score, level: bandFor(score, score > 0) };
  }

  const raw = report.breaches.reduce((sum, breach) => {
    const keep = done.reduce((k, action) => k * (1 - factorFor(action, breach.attrs)), 1);
    return sum + breach.contribution * keep;
  }, 0);
  // Plain rounding (not normalise): residual may honestly reach 0.
  const score = Math.round(Math.min(1, raw / B_MAX) * 100);
  return { score, level: bandFor(score, score > 0) };
}

// Points one action would remove on its own — the thesis ExpoBot
// "[Estimated score reduction]" field, computed from the model instead of
// being a number an LLM makes up.
export function estimatedReduction(report, id) {
  return report.score - residualScore(report, [id]).score;
}

// "LinkedIn and Canva" / "LinkedIn, Canva and 2 more" for breaches exposing `attr`.
function names(report, attr) {
  const titles = report.breaches.filter((b) => b.attrs.includes(attr)).map((b) => b.title);
  if (titles.length === 0) return "these breaches";
  if (titles.length <= 2) return titles.join(" and ");
  return titles.slice(0, 2).join(", ") + " and " + (titles.length - 2) + " more";
}
