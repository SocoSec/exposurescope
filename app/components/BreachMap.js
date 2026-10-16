"use client";
// app/components/BreachMap.js
// ─────────────────────────────────────────────────────────────────────────────
// The exposure map, the decay strip, the contribution ribbon, and the cards.
//
// Every breach service shows a LIST. A list answers "am I in a breach?" and
// stops there. These four views answer the question a list cannot: which breach
// matters, and why that one.
//
// What makes this presentation unusual is that it draws the SCORING MODEL
// rather than the data alone. Three of the four views are the model's own
// terms, made visible:
//
//   map        position encodes the two inputs — when it happened (recency)
//              and what class of data leaked (severity) — and bubble AREA is
//              the product of the two, which is the breach's contribution.
//   strip      the recency function itself, exp(-0.002 * age), drawn beneath
//              the map on the same time axis. A user can see the curve
//              collapse and understand why a 2013 breach scores near zero,
//              instead of being told.
//   ribbon     the score divided into proportional segments. This makes
//              concentration immediately visible: for most people a single
//              breach is the overwhelming majority of the score, which is a
//              finding the written work reports (median 92% of the raw sum).
//
// So the interface is an argument about the model, not a decoration on top of
// it. A reader who disagrees with the weighting can see exactly where the
// number came from — which is the same transparency claim the thesis makes,
// expressed visually.
//
// Dates are formatted from a fixed month table rather than toLocaleDateString,
// because locale formatting differs between the server render and the browser
// and produces a hydration mismatch.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { DECAY_PER_DAY } from "../../lib/score.js";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const TIER_COLOUR = {
  financial: "#E56A5A",
  "financial-only": "#E08A4E",
  credentials: "#E6B057",
  contact: "#6FA8DC",
  email: "#8C9AB3",
};
const TIER_LABEL = {
  financial: "Payment + password",
  "financial-only": "Payment data",
  credentials: "Credentials",
  contact: "Contact",
  email: "Email only",
};
const ROWS = [
  { sev: 1.0, y: 44, label: "Financial", tier: "financial" },
  { sev: 0.7, y: 96, label: "Credentials", tier: "credentials" },
  { sev: 0.4, y: 148, label: "Contact", tier: "contact" },
  { sev: 0.2, y: 196, label: "Email", tier: "email" },
];

const HALF_LIFE = Math.round(Math.LN2 / DECAY_PER_DAY);

function formatDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-");
  const month = MONTHS[parseInt(m, 10) - 1];
  return month ? parseInt(d, 10) + " " + month + " " + y : y;
}

// A breach that rounds to zero still exists, so it is never shown as "0%".
function share(fraction) {
  const pct = fraction * 100;
  return pct < 1 ? "<1%" : Math.round(pct) + "%";
}

function rowFor(severity) {
  let best = ROWS[ROWS.length - 1];
  for (const r of ROWS) if (Math.abs(r.sev - severity) < Math.abs(best.sev - severity)) best = r;
  return best;
}

// ── map + decay strip ────────────────────────────────────────────────────────
export function ExposureMap({ breaches, selected, onSelect }) {
  if (!breaches || breaches.length === 0) return null;

  const W = 680, PLOT_H = 224, STRIP_H = 108, H = PLOT_H + STRIP_H;
  const LEFT = 80, RIGHT = 18;
  const dated = breaches.filter((b) => b.date);
  const undated = breaches.filter((b) => !b.date);

  const LANE = undated.length ? 50 : 0;
  const x0 = LEFT + (LANE ? LANE + 24 : 0);
  const x1 = W - RIGHT;

  const years = dated.map((b) => parseInt(b.year, 10)).filter(Number.isFinite);
  const thisYear = new Date().getFullYear();
  const minYear = years.length ? Math.min(...years, thisYear - 1) : thisYear - 1;
  const span = Math.max(1, thisYear - minYear);

  const maxC = Math.max(...breaches.map((b) => b.contribution), 1e-9);
  const total = breaches.reduce((s, b) => s + b.contribution, 0) || 1e-9;
  // Area is proportional to contribution; a radius-linear scale would square
  // the visual weight of the large values.
  const r = (c) => 5 + 14 * Math.sqrt(Math.max(c, 0) / maxC);
  const xAt = (year) => x0 + ((year - minYear) / span) * (x1 - x0 - 26) + 13;

  // The dominant record is named on the map, because for most people the
  // answer to "which one matters" is a single breach.
  const dominant = breaches.reduce((a, b) => (b.contribution > a.contribution ? b : a), breaches[0]);
  const dominantShare = dominant.contribution / total;

  const ticks = span <= 4
    ? Array.from({ length: span + 1 }, (_, i) => minYear + i)
    : [minYear, minYear + Math.round(span / 3), minYear + Math.round((2 * span) / 3), thisYear];

  // The recency curve, sampled across the same time axis as the map above it.
  const stripTop = PLOT_H + 18, stripH = 44;
  const curve = [];
  for (let i = 0; i <= 60; i++) {
    const year = minYear + (span * i) / 60;
    const ageDays = (thisYear - year) * 365.25;
    const w = Math.exp(-DECAY_PER_DAY * ageDays);
    curve.push((i === 0 ? "M" : "L") + xAt(year).toFixed(1) + "," + (stripTop + stripH - w * stripH).toFixed(1));
  }

  const Bubble = ({ b, cx }) => {
    const row = rowFor(b.severity);
    const sel = selected === b.title;
    const colour = TIER_COLOUR[b.tier] || TIER_COLOUR.email;
    const isDominant = b.title === dominant.title && dominantShare > 0.35;
    return (
      <g style={{ cursor: "pointer" }} onClick={() => onSelect(sel ? null : b.title)}>
        {(sel || isDominant) && (
          <circle cx={cx} cy={row.y} r={r(b.contribution) + 7} fill={colour} fillOpacity={sel ? 0.18 : 0.1} />
        )}
        <circle cx={cx} cy={row.y} r={r(b.contribution)}
          fill={colour} fillOpacity={sel ? 0.92 : 0.55}
          stroke={sel ? "#FFFFFF" : colour} strokeWidth={sel ? 1.8 : 1.2} />
        <title>{b.title + (b.date ? " — " + formatDate(b.date) : " — date not reported") +
          " · " + share(b.contribution / total) + " of the score"}</title>
      </g>
    );
  };

  return (
    <div className="x-mapwrap">
      <svg viewBox={"0 0 " + W + " " + H} className="x-map" role="img"
        aria-label="Exposure map: each breach plotted by date and severity, sized by its share of the score, above the recency decay curve">

        {ROWS.map((row) => (
          <g key={row.sev}>
            <line x1={LEFT} y1={row.y} x2={W - RIGHT} y2={row.y} stroke="#1C2636" strokeDasharray="2 6" />
            <text x={LEFT - 11} y={row.y + 3.5} textAnchor="end" fontSize="10" fill="#67748B"
              fontFamily="ui-monospace, monospace">{row.label}</text>
            <circle cx={LEFT - 4} cy={row.y} r="2.5" fill={TIER_COLOUR[row.tier]} fillOpacity="0.8" />
          </g>
        ))}

        {undated.length > 0 && (
          <>
            <rect x={LEFT + 4} y="16" width={LANE} height={PLOT_H - 46} rx="7"
              fill="#131B29" stroke="#1C2636" strokeDasharray="4 4" />
            <text x={LEFT + 4 + LANE / 2} y={PLOT_H - 12} textAnchor="middle" fontSize="9.5"
              fill="#B45309" fontFamily="ui-monospace, monospace">undated</text>
            {undated.map((b, i) => <Bubble key={b.title + i} b={b} cx={LEFT + 4 + LANE / 2} />)}
          </>
        )}

        <line x1={x0} y1={PLOT_H - 26} x2={W - RIGHT} y2={PLOT_H - 26} stroke="#1C2636" />
        {ticks.map((t) => (
          <text key={t} x={xAt(t)} y={PLOT_H - 12} textAnchor="middle" fontSize="9.5"
            fill="#67748B" fontFamily="ui-monospace, monospace">{t}</text>
        ))}

        {dated.map((b, i) => <Bubble key={b.title + i} b={b} cx={xAt(parseInt(b.year, 10))} />)}

        {dominantShare > 0.35 && dominant.date && (
          <text x={xAt(parseInt(dominant.year, 10))} y={rowFor(dominant.severity).y - r(dominant.contribution) - 9}
            textAnchor="middle" fontSize="10.5" fontWeight="600"
            fill={TIER_COLOUR[dominant.tier] || TIER_COLOUR.email}>
            {Math.round(dominantShare * 100)}% of your score
          </text>
        )}

        {/* The recency function, on the same time axis as the map above.
            Over a decade the curve is near zero for most of its length, which
            is precisely the point — but a bare flat line communicates nothing.
            The 50% reference line and the half-life markers give the eye
            something to read it against, so the collapse becomes legible. */}
        <text x={LEFT - 11} y={stripTop + 4} textAnchor="end" fontSize="9" fill="#67748B"
          fontFamily="ui-monospace, monospace">100%</text>
        <text x={LEFT - 11} y={stripTop + stripH / 2 + 3} textAnchor="end" fontSize="9" fill="#67748B"
          fontFamily="ui-monospace, monospace">50%</text>
        <text x={LEFT - 11} y={stripTop + stripH + 3} textAnchor="end" fontSize="9" fill="#67748B"
          fontFamily="ui-monospace, monospace">0%</text>
        <line x1={x0} y1={stripTop + stripH / 2} x2={x1} y2={stripTop + stripH / 2}
          stroke="#1C2636" strokeDasharray="2 5" />
        <line x1={x0} y1={stripTop + stripH} x2={x1} y2={stripTop + stripH} stroke="#1C2636" />

        <path d={curve.join(" ") + " L" + x1 + "," + (stripTop + stripH) + " L" + x0 + "," + (stripTop + stripH) + " Z"}
          fill="#38C89A" fillOpacity="0.09" />
        <path d={curve.join(" ")} fill="none" stroke="#38C89A" strokeWidth="1.8" strokeOpacity="0.85" />

        {/* One marker per half-life, so the halving is countable. */}
        {[1, 2, 3].map((n) => {
          const yearsBack = (n * HALF_LIFE) / 365.25;
          const year = thisYear - yearsBack;
          if (year < minYear) return null;
          const w = Math.pow(0.5, n);
          return (
            <g key={n}>
              <circle cx={xAt(year)} cy={stripTop + stripH - w * stripH} r="2.6"
                fill="#38C89A" fillOpacity="0.9" />
              <text x={xAt(year)} y={stripTop + stripH - w * stripH - 7} textAnchor="middle"
                fontSize="8.5" fill="#38C89A" fillOpacity="0.9" fontFamily="ui-monospace, monospace">
                {Math.round(w * 100)}%
              </text>
            </g>
          );
        })}

        <text x={x0} y={stripTop + stripH + 20} fontSize="9.5" fill="#67748B" fontFamily="ui-monospace, monospace">
          how much a breach still counts toward the score
        </text>
        <text x={x0} y={stripTop + stripH + 33} fontSize="9.5" fill="#38C89A" fillOpacity="0.85"
          fontFamily="ui-monospace, monospace">
          its weight halves every {HALF_LIFE} days
        </text>
      </svg>

      <div className="x-maplegend">
        <span>Bubble area = share of your score</span>
        <span className="x-mapkeys">
          {ROWS.map((row) => (
            <span className="x-mapkey" key={row.sev}>
              <span className="x-mapdot" style={{ background: TIER_COLOUR[row.tier] }} />{row.label}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

// ── contribution ribbon ──────────────────────────────────────────────────────
// One bar, divided in proportion to each breach's share. Concentration becomes
// obvious at a glance — usually one segment fills most of the bar.
export function ContributionRibbon({ breaches, selected, onSelect }) {
  const total = breaches.reduce((s, b) => s + b.contribution, 0);
  if (total <= 0) return null;
  const top = breaches.reduce((a, b) => (b.contribution > a.contribution ? b : a), breaches[0]);
  const topShare = Math.round((top.contribution / total) * 100);

  return (
    <div className="x-ribbonwrap">
      <div className="x-ribbon">
        {breaches.map((b, i) => {
          const pct = (b.contribution / total) * 100;
          const sel = selected === b.title;
          return (
            <span key={b.title + i} className={"x-ribbonseg" + (sel ? " on" : "")}
              style={{ flex: pct + " 0 0", minWidth: 4, background: TIER_COLOUR[b.tier] || TIER_COLOUR.email }}
              onClick={() => onSelect(sel ? null : b.title)} title={b.title + " — " + share(b.contribution / total)} />
          );
        })}
      </div>
      <div className="x-ribbonnote">
        <b>{top.title}</b> accounts for {topShare}% of your score
        {topShare >= 70 ? " — addressing it first changes more than everything else combined." : "."}
      </div>
    </div>
  );
}

// ── cards ────────────────────────────────────────────────────────────────────
export function BreachList({ breaches, selected, onSelect }) {
  if (!breaches || breaches.length === 0) return null;
  const total = breaches.reduce((s, b) => s + b.contribution, 0) || 1e-9;

  return (
    <div className="x-breaches">
      {breaches.map((b, i) => {
        const colour = TIER_COLOUR[b.tier] || TIER_COLOUR.email;
        const sel = selected === b.title;
        const pct = (b.contribution / total) * 100;
        return (
          <div className={"x-breach" + (sel ? " on" : "")} key={b.title + i}
            onClick={() => onSelect(sel ? null : b.title)} style={{ borderLeftColor: colour }}>
            <div className="x-breachtop">
              <span className="x-breachname">{b.title}</span>
              <span className="x-breachdate">
                {b.date ? formatDate(b.date)
                  : <span className="x-assumed">date not reported — scored as 2 years old</span>}
              </span>
            </div>

            <div className="x-breachtier" style={{ color: colour }}>
              {TIER_LABEL[b.tier] || b.tier}
              <span className="x-breachsrc">{(b.sources || []).join(" · ")}</span>
            </div>

            {/* The exact classes the provider reported, rather than only the
                tier they were mapped to. This is what a person recognises. */}
            <div className="x-classes">
              {(b.dataClasses || []).map((c) => <span className="x-class" key={c}>{c}</span>)}
            </div>

            <div className="x-contrib">
              <span className="x-contribbar">
                <span style={{ width: Math.max(1.5, pct) + "%", background: colour }} />
              </span>
              <span className="x-contribval">{pct < 1 ? "<1" : Math.round(pct)}% of score</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BreachExplorer({ breaches }) {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <ExposureMap breaches={breaches} selected={selected} onSelect={setSelected} />
      <ContributionRibbon breaches={breaches} selected={selected} onSelect={setSelected} />
      <BreachList breaches={breaches} selected={selected} onSelect={setSelected} />
    </>
  );
}
