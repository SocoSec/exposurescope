"use client";
// app/components/Forecast.js
// ─────────────────────────────────────────────────────────────────────────────
// THE TWO-CLOCK FORECAST.
//
// Every other breach service draws the PAST: a bar per year, "when were you
// breached". That chart is a history of events. It cannot answer the question
// people actually have, which is "what happens if I do nothing".
//
// This draws the FUTURE, and it is the only chart in the tool that is purely a
// statement of the model:
//
//   credential half   every term carries exp(-lambda * age) with the SAME
//                     lambda, so the whole sum decays as one exponential:
//                     credRaw(t) = credRaw(0) * exp(-lambda * t).
//                     No simulation is needed; the curve is analytic.
//   identity half     carries no age term at all. It is a horizontal line.
//
// Drawn together, the shape makes the thesis visible in one image: the top
// band drains away on its own, the bottom band never does. The score does not
// fall to zero with time, it falls to a FLOOR — and the floor is the part no
// action, and no amount of waiting, will remove.
//
// That floor is the finding the scoring model was rewritten to express, after
// it returned 3 out of 100 for an identity whose date of birth, name,
// nationality, telephone number and home address were permanently public.
//
// Pure render function: no state, no network, no Date formatting through
// toLocaleDateString (locale output differs between the server render and the
// browser and produces a hydration mismatch).
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";
import { DECAY_PER_DAY, B_MAX } from "../../lib/score.js";

const YEARS_AHEAD = 8;
const W = 720, H = 320;
const L = 62, R = 24, T = 28, B = 56;          // plot margins
const PW = W - L - R, PH = H - T - B;

const COL = {
  fades: "#2FBF71",      // the half that time removes
  permanent: "#E5544A",  // the half that it does not
  axis: "#2A3344",
  muted: "#67748B",
  text: "#EAF1FA",
};

// score(t) for t in years. Clamped and scaled exactly as lib/score.js does, so
// the curve cannot drift away from the number printed beside it.
function scoreAt(credRaw, identityRaw, years) {
  const decayed = credRaw * Math.exp(-DECAY_PER_DAY * years * 365.25);
  return Math.min(1, (decayed + identityRaw) / B_MAX) * 100;
}

export function TwoClockForecast({ report }) {
  if (!report) return null;
  const credRaw = report.credRaw || 0;
  const identityRaw = report.identityRaw || 0;
  if (credRaw <= 0 && identityRaw <= 0) return null;

  const x = (years) => L + (years / YEARS_AHEAD) * PW;
  const y = (score) => T + PH - (Math.max(0, Math.min(100, score)) / 100) * PH;

  // Sampled densely enough that the knee of the exponential stays smooth.
  const steps = 96;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * YEARS_AHEAD;
    pts.push([x(t), y(scoreAt(credRaw, identityRaw, t))]);
  }
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");

  const floor = Math.min(100, (identityRaw / B_MAX) * 100);
  const today = scoreAt(credRaw, identityRaw, 0);
  const yFloor = y(floor);
  const yZero = y(0);

  // Area between the floor and the total curve: the part that fades.
  const fadeArea = line + " L " + x(YEARS_AHEAD).toFixed(1) + " " + yFloor.toFixed(1) +
    " L " + x(0).toFixed(1) + " " + yFloor.toFixed(1) + " Z";

  // When does the credential half stop mattering? The first whole year at
  // which the total has fallen to within one point of the floor.
  let settlesAt = null;
  for (let t = 0; t <= YEARS_AHEAD; t += 0.25) {
    if (scoreAt(credRaw, identityRaw, t) - floor <= 1) { settlesAt = t; break; }
  }

  const halfLifeYears = Math.LN2 / DECAY_PER_DAY / 365.25;
  const ticks = [0, 2, 4, 6, 8];

  return (
    <figure className="x-forecast" style={{ margin: 0 }}>
      <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", display: "block" }} role="img"
        aria-label={"Forecast: with no action the score falls from " + Math.round(today) +
          " to a permanent floor of " + Math.round(floor) + " out of 100."}>

        {/* horizontal grid */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={L} x2={L + PW} y1={y(v)} y2={y(v)} stroke={COL.axis} strokeWidth="1" />
            <text x={L - 10} y={y(v) + 4} textAnchor="end" fontFamily="ui-monospace,monospace" fontSize="11" fill={COL.muted}>{v}</text>
          </g>
        ))}

        {/* the permanent half: a block that never moves */}
        <rect x={L} y={yFloor} width={PW} height={Math.max(0, yZero - yFloor)}
          fill={COL.permanent} fillOpacity="0.20" />
        <line x1={L} x2={L + PW} y1={yFloor} y2={yFloor} stroke={COL.permanent} strokeWidth="2" strokeDasharray="6 4" />

        {/* the half that time removes */}
        <path d={fadeArea} fill={COL.fades} fillOpacity="0.18" />
        <path d={line} fill="none" stroke={COL.fades} strokeWidth="2.5" strokeLinejoin="round" />

        {/* today */}
        <circle cx={x(0)} cy={y(today)} r="5" fill={COL.text} stroke={COL.fades} strokeWidth="2.5" />
        <text x={x(0) + 10} y={y(today) - 10} fontFamily="ui-monospace,monospace" fontSize="13" fontWeight="700" fill={COL.text}>
          {Math.round(today)} today
        </text>

        {/* half-life of the credential half */}
        <line x1={x(halfLifeYears)} x2={x(halfLifeYears)} y1={T} y2={T + PH} stroke={COL.muted} strokeWidth="1" strokeDasharray="2 4" />
        <text x={x(halfLifeYears) + 6} y={T + 12} fontFamily="ui-monospace,monospace" fontSize="10" fill={COL.muted}>
          half-life {Math.round(halfLifeYears * 365.25)}d
        </text>

        {/* the floor, labelled at the right where the curve has flattened */}
        <text x={L + PW} y={yFloor - 9} textAnchor="end" fontFamily="ui-monospace,monospace" fontSize="12" fontWeight="700" fill={COL.permanent}>
          floor {Math.round(floor)}, permanent
        </text>

        {/* x axis */}
        <line x1={L} x2={L + PW} y1={yZero} y2={yZero} stroke={COL.axis} strokeWidth="1.5" />
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={yZero + 20} textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="11" fill={COL.muted}>
            {t === 0 ? "now" : "+" + t + "y"}
          </text>
        ))}
        <text x={L + PW / 2} y={H - 12} textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="10" fill={COL.muted}>
          if you change nothing
        </text>
      </svg>

      <figcaption style={{ marginTop: 12, fontSize: 14, lineHeight: 1.55, color: COL.muted }}>
        {floor < 1 ? (
          <>Everything in your score is <strong style={{ color: COL.fades }}>revocable</strong>. Left alone it decays
            to nothing, and acting now simply gets you there sooner.</>
        ) : (
          <>The green band is exposure that <strong style={{ color: COL.fades }}>fades on its own</strong>: leaked
            passwords stop mattering once they are changed, and the model halves their weight every{" "}
            {Math.round(halfLifeYears * 365.25)} days. The red band does not fade. It is built from facts about you
            that cannot be reissued: a date of birth, a name, an address. Waiting does nothing to it.
            {settlesAt !== null && settlesAt > 0.25 && (
              <> With no action at all your score settles near <strong style={{ color: COL.permanent }}>{Math.round(floor)}</strong>{" "}
                in about {settlesAt < 1 ? Math.round(settlesAt * 12) + " months" : Math.round(settlesAt) + " years"}, and stays there.</>
            )}
            {settlesAt !== null && settlesAt <= 0.25 && (
              <> Your score is already at that floor of <strong style={{ color: COL.permanent }}>{Math.round(floor)}</strong>.</>
            )}
          </>
        )}
      </figcaption>
    </figure>
  );
}
