// app/components/Explain.js
// ─────────────────────────────────────────────────────────────────────────────
// The Learn tab's pictures.
//
// Everything else in this interface explains a number. This part explains the
// situation, to someone who has just been told their data is in four breaches
// and does not yet know what that means. So the register drops: short words,
// one idea per panel, and a comparison from ordinary life — a list, a key, a
// door, a puzzle. The precise wording stays directly underneath each picture
// rather than being replaced by it (see lib/content.js), because simplifying
// the explanation is not the same as simplifying the claim.
//
// The drawings are inline SVG on a 120×84 stage. No icon font, no sprite sheet,
// no image host — one less third party observing who reads a page about breach
// exposure. Each scene is built from a handful of primitives so the whole set
// stays legible at 120px and readable on a dark background.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

const CORAL = "#E56A5A";
const GOLD = "#E6B057";
const BLUE = "#6FA8DC";
const MUTE = "#5A6880";

// ── the drawings ─────────────────────────────────────────────────────────────
// Convention: MUTE is the ordinary world, the accent colour is the thing that
// went wrong, and CORAL is the person doing it.
export function Scene({ name, accent = "#38C89A" }) {
  const S = {
    viewBox: "0 0 120 84", width: "100%", height: "auto", fill: "none",
    stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round",
    strokeLinejoin: "round", "aria-hidden": "true", className: "x-scene",
  };
  const person = (x, y, c) => (
    <g stroke={c}>
      <circle cx={x} cy={y} r="6" />
      <path d={`M${x - 9} ${y + 19}c0-5 4-9 9-9s9 4 9 9`} />
    </g>
  );

  switch (name) {
    // You hand a website your address, the way you write on a list.
    case "signup":
      return (
        <svg {...S}>
          {person(26, 30, accent)}
          <rect x="60" y="18" width="38" height="46" rx="4" stroke={MUTE} />
          <path d="M67 30h24M67 39h24M67 48h14" stroke={MUTE} />
          <path d="M41 42h14" stroke={accent} strokeDasharray="3 4" />
          <path d="M51 38l5 4-5 4" stroke={accent} />
        </svg>
      );

    // The list is taken. Not by you, and not because of anything you did.
    case "breakin":
      return (
        <svg {...S}>
          <rect x="12" y="18" width="42" height="46" rx="4" stroke={MUTE} />
          <path d="M19 30h28M19 39h28M19 48h16" stroke={MUTE} />
          <path d="M54 26l16 8-16 8" stroke={CORAL} strokeDasharray="4 4" />
          {person(92, 32, CORAL)}
          <path d="M80 52h24v12H80z" stroke={CORAL} />
          <path d="M86 52v-4h12v4" stroke={CORAL} />
        </svg>
      );

    // A copy cannot be taken back. That is the whole problem.
    case "copies":
      return (
        <svg {...S}>
          <rect x="10" y="26" width="30" height="36" rx="3" stroke={MUTE} />
          <rect x="48" y="20" width="30" height="36" rx="3" stroke={GOLD} />
          <rect x="56" y="30" width="30" height="36" rx="3" stroke={GOLD} opacity="0.75" />
          <rect x="64" y="40" width="30" height="36" rx="3" stroke={GOLD} opacity="0.5" />
          <path d="M40 40h6" stroke={accent} />
          <path d="M43 36l4 4-4 4" stroke={accent} />
        </svg>
      );

    // Separate pieces, one picture. The thing the score is actually about.
    case "mosaic":
      return (
        <svg {...S}>
          <path d="M22 14h26v26H22z" stroke={BLUE} />
          <path d="M52 14h26v26H52z" stroke={GOLD} />
          <path d="M22 44h26v26H22z" stroke={CORAL} />
          <path d="M52 44h26v26H52z" stroke={accent} />
          <circle cx="50" cy="42" r="15" stroke={accent} strokeDasharray="3 4" />
          <circle cx="45" cy="38" r="1.8" fill={accent} stroke="none" />
          <circle cx="55" cy="38" r="1.8" fill={accent} stroke="none" />
          <path d="M45 47c3 3 7 3 10 0" stroke={accent} />
          <path d="M88 30h16M88 42h16M88 54h10" stroke={MUTE} strokeWidth="1.6" />
        </svg>
      );

    // One key, many doors — the reason password reuse is the first fix.
    case "manydoors":
      return (
        <svg {...S}>
          <circle cx="18" cy="42" r="7" stroke={GOLD} />
          <path d="M25 42h16M35 42v6M40 42v5" stroke={GOLD} />
          <rect x="50" y="16" width="20" height="52" rx="2" stroke={MUTE} />
          <rect x="76" y="16" width="20" height="52" rx="2" stroke={MUTE} />
          <rect x="100" y="16" width="18" height="52" rx="2" stroke={CORAL} />
          <circle cx="65" cy="44" r="1.8" fill={MUTE} stroke="none" />
          <circle cx="91" cy="44" r="1.8" fill={MUTE} stroke="none" />
          <circle cx="113" cy="44" r="1.8" fill={CORAL} stroke="none" />
          <path d="M100 16l-9 6v46l9 6" stroke={CORAL} />
        </svg>
      );

    // A letter that looks like one you trust.
    case "fakemail":
      return (
        <svg {...S}>
          <rect x="16" y="22" width="56" height="40" rx="4" stroke={MUTE} />
          <path d="M16 26l28 20 28-20" stroke={MUTE} />
          <path d="M76 32h30v8c0 7-6 12-15 14-9-2-15-7-15-14v-8z" stroke={CORAL} />
          <circle cx="85" cy="40" r="2.2" fill={CORAL} stroke="none" />
          <circle cx="97" cy="40" r="2.2" fill={CORAL} stroke="none" />
        </svg>
      );

    // Your number, moved to someone else's phone. Your codes follow it.
    case "simswap":
      return (
        <svg {...S}>
          <rect x="14" y="14" width="30" height="56" rx="5" stroke={MUTE} />
          <path d="M24 21h10" stroke={MUTE} />
          <rect x="76" y="14" width="30" height="56" rx="5" stroke={CORAL} />
          <path d="M86 21h10" stroke={CORAL} />
          <path d="M50 42h20" stroke={CORAL} strokeDasharray="4 4" />
          <path d="M64 36l7 6-7 6" stroke={CORAL} />
          <path d="M26 38h6v8h-6z" stroke={MUTE} />
        </svg>
      );

    // Buying as you, or signing up as you.
    case "card":
      return (
        <svg {...S}>
          <rect x="16" y="24" width="60" height="38" rx="5" stroke={CORAL} />
          <path d="M16 36h60" stroke={CORAL} />
          <path d="M26 50h14" stroke={CORAL} />
          {person(96, 30, CORAL)}
          <path d="M84 60h24" stroke={MUTE} />
        </svg>
      );

    // Look yourself up before someone else does.
    case "search":
      return (
        <svg {...S}>
          <rect x="14" y="14" width="56" height="56" rx="4" stroke={MUTE} />
          <path d="M22 28h40M22 38h40M22 48h24" stroke={MUTE} />
          <circle cx="78" cy="44" r="18" stroke={accent} strokeWidth="2.6" />
          <path d="M91 57l13 13" stroke={accent} strokeWidth="2.6" />
        </svg>
      );

    // One handle, many profiles, all joinable.
    case "nickname":
      return (
        <svg {...S}>
          {person(24, 26, accent)}
          {person(24, 58, accent)}
          {person(96, 26, accent)}
          {person(96, 58, accent)}
          <path d="M38 30h44M38 62h44M30 40v10M102 40v10" stroke={GOLD} strokeDasharray="3 4" />
          <circle cx="60" cy="46" r="9" stroke={GOLD} />
          <path d="M56 46h8M60 42v8" stroke={GOLD} />
        </svg>
      );

    // The accounts you stopped using still hold what you gave them.
    case "oldaccounts":
      return (
        <svg {...S}>
          <rect x="14" y="20" width="28" height="22" rx="3" stroke={MUTE} opacity="0.5" />
          <rect x="48" y="20" width="28" height="22" rx="3" stroke={MUTE} opacity="0.5" />
          <rect x="82" y="20" width="24" height="22" rx="3" stroke={MUTE} opacity="0.5" />
          <rect x="14" y="50" width="28" height="22" rx="3" stroke={accent} />
          <rect x="48" y="50" width="28" height="22" rx="3" stroke={MUTE} opacity="0.5" />
          <path d="M86 52l16 16M102 52l-16 16" stroke={CORAL} />
        </svg>
      );

    // Companies that collect and sell facts about people.
    case "brokers":
      return (
        <svg {...S}>
          <ellipse cx="34" cy="24" rx="20" ry="7" stroke={MUTE} />
          <path d="M14 24v26c0 4 9 7 20 7s20-3 20-7V24" stroke={MUTE} />
          <path d="M14 37c0 4 9 7 20 7s20-3 20-7" stroke={MUTE} />
          <path d="M62 42h16" stroke={CORAL} strokeDasharray="3 4" />
          <path d="M72 37l6 5-6 5" stroke={CORAL} />
          <rect x="84" y="28" width="26" height="30" rx="3" stroke={CORAL} />
          <path d="M91 38h12M91 46h8" stroke={CORAL} />
        </svg>
      );

    // A photo can carry where it was taken.
    case "photo":
      return (
        <svg {...S}>
          <rect x="16" y="22" width="56" height="42" rx="4" stroke={MUTE} />
          <circle cx="44" cy="43" r="11" stroke={MUTE} />
          <circle cx="44" cy="43" r="4" stroke={MUTE} />
          <path d="M96 24c7 0 12 5 12 12 0 9-12 22-12 22S84 45 84 36c0-7 5-12 12-12z" stroke={CORAL} />
          <circle cx="96" cy="36" r="4" stroke={CORAL} />
        </svg>
      );

    default:
      return null;
  }
}

// ── the four-panel story ─────────────────────────────────────────────────────
// Left to right, because that is how a sequence is read. The arrows between
// panels are the point: each step happens to you, and none of them asked.
export function StoryStrip({ panels, accent }) {
  return (
    <ol className="x-story">
      {panels.map((p, i) => (
        <li className="x-storyp" key={p.scene + i}>
          <span className="x-storyn">{String(i + 1).padStart(2, "0")}</span>
          <div className="x-storyart"><Scene name={p.scene} accent={accent} /></div>
          <div className="x-storyh">{p.head}</div>
          <div className="x-storyb">{p.body}</div>
        </li>
      ))}
    </ol>
  );
}

// ── one lesson ───────────────────────────────────────────────────────────────
// Picture, plain sentence, then the precise text. A reader can stop at any of
// the three and still have been told the truth.
export function Lesson({ item, accent }) {
  const s = item.simple;
  return (
    <div className="x-lesson">
      <div className="x-lessonart"><Scene name={item.scene} accent={accent} /></div>
      <div className="x-lessonbody">
        <div className="x-lessonh">{s ? s.head : item.title}</div>
        {s && <div className="x-lessons">{s.body}</div>}
        <details className="x-lessonmore">
          <summary>{item.title}</summary>
          <div className="x-lessonp">{item.body}</div>
        </details>
        {item.action && (
          <a className="x-fplink" href={item.action.url} target="_blank" rel="noopener noreferrer">
            {item.action.label} ↗
          </a>
        )}
      </div>
    </div>
  );
}

export function LessonCard({ n, title, desc, items, accent }) {
  return (
    <div className="x-card">
      <div className="x-sech"><span className="x-secn">{n}</span><span className="x-sect">{title}</span></div>
      <div className="x-secd">{desc}</div>
      <div className="x-lessons-wrap">
        {items.map((it, i) => <Lesson item={it} accent={accent} key={(it.scene || "") + i} />)}
      </div>
    </div>
  );
}
