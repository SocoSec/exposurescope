// app/components/DataMatrix.js
// ─────────────────────────────────────────────────────────────────────────────
// The exposure matrix: every class of data that leaked, against every breach
// that leaked it.
//
// The bar chart it replaces answered "how many breaches exposed my phone
// number" but never "which ones". That second question is the one people ask,
// because it decides what they do: a date of birth leaked by one airline is a
// different problem from a password leaked by two services you still use.
//
// Rows are data classes, ordered by how many breaches exposed them. Columns are
// breaches, ordered by contribution to the score, so the left-most column is
// the one that matters most. A filled cell is an exposure, coloured by the
// breach's severity tier.
//
// Deliberately NOT a heat map: a cell is binary, because the underlying fact is
// binary. Shading it by magnitude would invent precision the data lacks.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from "react";
import { TIER_COLOUR } from "./BreachMap.js";

// HIBP's class names are written for a breach description, not for a table
// header. Shortened for the row label only; the full name stays in the tooltip.
function shortClass(name) {
  return String(name)
    .replace(/ addresses$/i, "")
    .replace(/ numbers$/i, "")
    .replace(/^Dates of birth$/i, "Date of birth")
    .replace(/^Geographic locations$/i, "Location")
    .replace(/^Physical$/i, "Postal address");
}

// A column needs a label narrow enough to read vertically. The full title is
// always available on hover, so truncation here costs nothing.
function shortTitle(title) {
  const t = String(title).trim();
  return t.length <= 18 ? t : t.slice(0, 17) + "…";
}

export default function ExposureMatrix({ breaches }) {
  const [hover, setHover] = useState(null);   // { row, col } | null
  if (!breaches || breaches.length === 0) return null;

  // Columns: most consequential first, matching the order of the cards below.
  const cols = [...breaches].sort((a, b) => b.weight - a.weight);

  // Rows: every distinct class, most widely exposed first. A class leaked by
  // several breaches is harder to undo, so it belongs at the top.
  const counts = {};
  for (const b of cols) for (const c of b.dataClasses || []) counts[c] = (counts[c] || 0) + 1;
  const rows = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  if (rows.length === 0) return null;

  const has = (b, c) => (b.dataClasses || []).includes(c);
  const grid = { gridTemplateColumns: "minmax(118px, 215px) repeat(" + cols.length + ", 30px)" };

  return (
    <div className="x-mx">
      <div className="x-mxscroll">
        <div className="x-mxgrid" style={grid} role="table" aria-label="Which breach exposed which kind of data">

          {/* header: breach names, set vertically so narrow columns stay readable */}
          <div className="x-mxcorner" role="columnheader">
            <span className="x-mxcount">{rows.length}</span> kinds of data
          </div>
          {cols.map((b, j) => (
            <div key={b.title + j} role="columnheader"
              className={"x-mxhead" + (hover && hover.col === j ? " hot" : "")}
              onMouseEnter={() => setHover({ row: -1, col: j })}
              onMouseLeave={() => setHover(null)}
              title={b.title + (b.year ? " — " + b.year : " — date not reported")}>
              <span style={{ color: TIER_COLOUR[b.tier] || TIER_COLOUR.email }}>{shortTitle(b.title)}</span>
            </div>
          ))}

          {rows.map((c, i) => (
            <React.Fragment key={c}>
              <div role="rowheader" title={c}
                className={"x-mxrow" + (hover && hover.row === i ? " hot" : "")}
                onMouseEnter={() => setHover({ row: i, col: -1 })}
                onMouseLeave={() => setHover(null)}>
                <span className="x-mxlabel">{shortClass(c)}</span>
                <span className="x-mxn">{counts[c]}</span>
              </div>
              {cols.map((b, j) => {
                const on = has(b, c);
                const lit = hover && (hover.row === i || hover.col === j);
                return (
                  <div key={b.title + j} role="cell"
                    className={"x-mxcell" + (on ? " on" : "") + (lit ? " lit" : "")}
                    onMouseEnter={() => setHover({ row: i, col: j })}
                    onMouseLeave={() => setHover(null)}
                    title={on ? b.title + " exposed your " + shortClass(c).toLowerCase() : ""}>
                    {on && <span className="x-mxdot"
                      style={{ background: TIER_COLOUR[b.tier] || TIER_COLOUR.email }} />}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="x-mxfoot">
        Each dot is one kind of your data in one breach, coloured by severity.
        The number beside a row is how many separate breaches exposed it.
      </div>
    </div>
  );
}
