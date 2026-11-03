"use client";

import { useMemo, useRef, useState } from "react";
import { DECAY_PER_DAY, B_MAX, W_IDENTITY, IDENTITY_WEIGHTS, bandFor } from "../../lib/score.js";

// app/components/Horizon.js
// ─────────────────────────────────────────────────────────────────────────────
// The report as ONE object on a time axis, rather than a dashboard of tiles.
//
// Every comparable tool presents the same genre: a gauge, a row of counters, a
// donut, some tabs. That shape is borrowed from monitoring dashboards, where
// every number is a level that can go back down. It is the wrong shape here,
// because the central claim of this work is that half of a person's exposure
// CANNOT go back down.
//
// So the interface is the claim. The horizontal axis is time, running from the
// first breach to ten years ahead. The stack is the score, split into the two
// clocks: a band that decays, drawn above a band that does not. The reader
// drags the marker into the future and watches one half melt while the other
// stays exactly where it is. The number is read OFF the picture rather than
// printed beside it.
//
// The curve is not an illustration. Every point is computed with the deployed
// model — same λ, same B_MAX, same identity union as lib/score.js — so what is
// drawn and what is scored cannot drift apart.
// ─────────────────────────────────────────────────────────────────────────────

const W = 720;
const H = 300;
const PAD_T = 26;
const PAD_B = 34;
const FUTURE_YEARS = 10;

// The model, evaluated at an arbitrary offset in years from today. Negative t
// is the past: a breach that had not happened yet contributes nothing, which is
// what makes the stack visibly build up rather than appear fully formed.
function stackAt(breaches, tYears) {
  let cred = 0;
  const attrs = new Set();
  for (const b of breaches) {
    const ageAtT = (b.ageDays || 0) + tYears * 365;
    if (ageAtT < 0) continue;
    cred += (b.credSeverity || 0) * Math.exp(-DECAY_PER_DAY * ageAtT);
    for (const k of b.identityAttrs || []) attrs.add(k);
  }
  let keep = 1;
  for (const k of attrs) keep *= 1 - (IDENTITY_WEIGHTS[k] || 0);
  return { cred, ident: W_IDENTITY * (1 - keep) };
}

const pts = (v) => (v / B_MAX) * 100;
const scoreOf = ({ cred, ident }) =>
  Math.max(0, Math.round(Math.min(1, (cred + ident) / B_MAX) * 100));

export function Horizon({ report, bands, heads, bandColor }) {
  const breaches = useMemo(
    () => (report.breaches || []).filter((b) => typeof b.ageDays === "number"),
    [report.breaches],
  );

  // How far back the axis reaches: the oldest breach, with a little air.
  const pastYears = useMemo(() => {
    const oldest = breaches.reduce((m, b) => Math.max(m, b.ageDays || 0), 0) / 365;
    return Math.min(22, Math.max(1.5, oldest + 0.6));
  }, [breaches]);

  const span = pastYears + FUTURE_YEARS;
  const xOf = (t) => ((t + pastYears) / span) * W;
  const tOf = (x) => (x / W) * span - pastYears;
  const yOf = (p) => H - PAD_B - (Math.min(100, Math.max(0, p)) / 100) * (H - PAD_T - PAD_B);

  const curve = useMemo(() => {
    const out = [];
    for (let i = 0; i <= 180; i++) {
      const t = -pastYears + (i / 180) * span;
      const s = stackAt(breaches, t);
      out.push({ t, identP: pts(s.ident), totalP: Math.min(100, pts(s.cred + s.ident)) });
    }
    return out;
  }, [breaches, pastYears, span]);

  const [t, setT] = useState(0);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef(null);

  const here = stackAt(breaches, t);
  const score = scoreOf(here);
  const floor = scoreOf({ cred: 0, ident: here.ident });
  const fading = Math.max(0, score - floor);
  const level = bandFor(score, score > 0);

  function moveTo(clientX) {
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * W;
    setT(Math.min(FUTURE_YEARS, Math.max(-pastYears, tOf(x))));
  }

  const area = (key) => {
    const top = curve.map((c) => `${xOf(c.t).toFixed(1)},${yOf(c[key]).toFixed(1)}`).join(" L");
    return `M${xOf(curve[0].t).toFixed(1)},${yOf(0)} L${top} L${xOf(curve[curve.length - 1].t).toFixed(1)},${yOf(0)} Z`;
  };

  const label =
    t < -0.05 ? Math.round(-t * 10) / 10 + " years ago"
      : t < 0.05 ? "today"
        : Math.round(t * 10) / 10 + " years from now";

  return (
    <div className="x-hz">
      <div className="x-hzread">
        <div className="x-hznum">{score}</div>
        <div className="x-hzbreak">
          <div className="x-hzrow">
            <span className="x-hzswatch x-hzfade" />
            <b>{fading}</b> fades as passwords and cards are replaced
          </div>
          <div className="x-hzrow">
            <span className="x-hzswatch x-hzperm" />
            <b>{floor}</b> is permanent and never falls
          </div>
          <div className="x-hzwhen">{label}</div>
        </div>
      </div>

      {/* The verdict follows the marker. Leaving a fixed "HIGH" beside a
          scrubbed score of 27 would be a plain contradiction on screen. */}
      <div className="x-band" style={{ color: bandColor[level], marginTop: 2 }}>{bands[level]}</div>
      <div className="x-hhead" style={{ marginBottom: 14 }}>{heads[level]}</div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="x-hzsvg"
        role="img"
        aria-label={"Exposure over time. At " + label + " the score is " + score + ", of which " + floor + " is permanent."}
        onPointerDown={(e) => { setDragging(true); e.currentTarget.setPointerCapture(e.pointerId); moveTo(e.clientX); }}
        onPointerMove={(e) => dragging && moveTo(e.clientX)}
        onPointerUp={(e) => { setDragging(false); e.currentTarget.releasePointerCapture(e.pointerId); }}
      >
        <defs>
          <linearGradient id="hz-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--sig)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--sig)" stopOpacity="0.12" />
          </linearGradient>
          <linearGradient id="hz-perm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--coral)" stopOpacity="0.62" />
            <stop offset="100%" stopColor="var(--coral)" stopOpacity="0.30" />
          </linearGradient>
        </defs>

        {[25, 50, 75, 100].map((p) => (
          <line key={p} x1="0" y1={yOf(p)} x2={W} y2={yOf(p)} stroke="var(--line)" strokeWidth="1" opacity="0.5" />
        ))}

        {/* The decaying half sits ABOVE the permanent half, so the thing that
            disappears is the thing on top, and the floor stays visibly flat. */}
        <path d={area("totalP")} fill="url(#hz-fade)" />
        <path d={area("identP")} fill="url(#hz-perm)" />
        <path
          d={"M" + curve.map((c) => `${xOf(c.t).toFixed(1)},${yOf(c.identP).toFixed(1)}`).join(" L")}
          fill="none" stroke="var(--coral)" strokeWidth="1.6" strokeDasharray="4 3" opacity="0.9"
        />

        <line x1={xOf(0)} y1={PAD_T - 8} x2={xOf(0)} y2={H - PAD_B} stroke="var(--mute)" strokeWidth="1" opacity="0.7" />
        <text x={xOf(0) + 5} y={PAD_T - 12} fontSize="10" fontFamily="ui-monospace,monospace" fill="var(--mute)">now</text>

        {breaches.map((b, i) => {
          const bt = -(b.ageDays || 0) / 365;
          if (bt < -pastYears) return null;
          return (
            <circle key={i} cx={xOf(bt)} cy={H - PAD_B} r={b.ageAssumed ? 3 : 4}
                    fill={b.ageAssumed ? "var(--mute)" : "var(--ink)"} opacity="0.85">
              <title>{b.title + (b.date ? " · " + b.date : " · date unknown")}</title>
            </circle>
          );
        })}

        <line x1={xOf(t)} y1={PAD_T - 8} x2={xOf(t)} y2={H - PAD_B} stroke="var(--ink)" strokeWidth="1.5" />
        <circle cx={xOf(t)} cy={yOf(pts(here.cred + here.ident))} r="5" fill="var(--bg)" stroke="var(--ink)" strokeWidth="2" />
        <circle cx={xOf(t)} cy={H - PAD_B} r="7" fill="var(--ink)" />
        <circle cx={xOf(t)} cy={H - PAD_B} r="3" fill="var(--bg)" />

        <text x={xOf(-pastYears) + 2} y={H - 10} fontSize="10" fontFamily="ui-monospace,monospace" fill="var(--mute)">
          {new Date().getFullYear() - Math.round(pastYears)}
        </text>
        <text x={W - 2} y={H - 10} textAnchor="end" fontSize="10" fontFamily="ui-monospace,monospace" fill="var(--mute)">
          +{FUTURE_YEARS}y
        </text>
      </svg>

      <div className="x-hzhint">Drag along the line to move through time.</div>

      <details className="x-hzcalc">
        <summary>How is this calculated?</summary>
        <div className="x-hzcalcbody">
          <p>
            Each breach is weighted by what it exposed. The weight is then split in two, because
            the two halves behave differently over time.
          </p>
          <p>
            <b className="x-hzfadetx">The fading half</b> covers things you can replace: passwords and payment
            cards. Once replaced, the stolen copy is worthless, so its weight halves roughly every
            347 days. That is the green band, and it is why the curve falls.
          </p>
          <p>
            <b className="x-hzpermtx">The permanent half</b> covers things you cannot replace: your date of birth,
            your name, your nationality, your address. These are exactly as true today as the day
            they leaked, so they are not discounted at all. If two breaches exposed the same fact,
            it is counted once, not twice. That is the dashed floor.
          </p>
          <p>
            The two are added, divided by a fixed scale, and shown out of 100. The constants are
            chosen rather than fitted — there is no public dataset of who was later defrauded to
            calibrate against — so the claim made here is about the <b>ordering and the band</b>,
            which survive a 30% error in every weight, not about the exact number.
          </p>
        </div>
      </details>
    </div>
  );
}
