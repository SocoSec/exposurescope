"use client";

import { IDENTITY_WEIGHTS, ATTRIBUTES, attributesOf } from "../../lib/score.js";

// app/components/Dossier.js
// ─────────────────────────────────────────────────────────────────────────────
// The report, inverted: not "which companies lost your data" but "what can now
// be written down about you, and by whom".
//
// Every comparable tool answers the first question, because that is the shape
// of the data the providers return. It is the wrong way round for the person
// reading it. Nobody is harmed by the fact that a company was breached; they
// are harmed by the file somebody can now assemble. So the primary object here
// is that file, drawn as the dossier a stranger holds, with the fields they
// have filled in and the fields still redacted.
//
// The identifying weights are not decorative. They are the same w_k the score
// uses, and the combination reading beneath them is the union term itself, so
// what the picture says and what the number says cannot diverge.
//
// The quasi-identifier warning cites Sweeney (2000), which established that a
// large majority of a population is uniquely identifiable from date of birth,
// postcode and gender together. It fires only when that combination is
// actually present, because a warning that always fires carries no
// information.
// ─────────────────────────────────────────────────────────────────────────────

const LABELS = Object.fromEntries(ATTRIBUTES.map((a) => [a.key, a.label]));

// Ordered by how much each attribute narrows the field, which is also the
// order in which a reader should worry about them.
const DOSSIER_FIELDS = Object.entries(IDENTITY_WEIGHTS)
  .sort((a, b) => b[1] - a[1])
  .map(([key, weight]) => ({ key, weight, label: LABELS[key] || key }));

const REDACTED = "████████";

function pct(v) {
  return Math.round(v * 100);
}

export function IdentityDossier({ report }) {
  const exposed = new Set(report.identityAttrs || []);
  const known = DOSSIER_FIELDS.filter((f) => exposed.has(f.key));
  const hidden = DOSSIER_FIELDS.filter((f) => !exposed.has(f.key));

  // The union term, exactly as lib/score.js computes it.
  const union = report.identity || 0;

  // Sweeney's triple. "location" is this model's nearest equivalent to a
  // postcode; the claim is flagged as approximate rather than asserted.
  const quasi = ["dob", "location", "gender"].filter((k) => exposed.has(k));
  const quasiComplete = quasi.length === 3;

  return (
    <div className="x-dos">
      <div className="x-doshead">
        <div>
          <div className="x-dostitle">The file someone can open on you</div>
          <div className="x-dossub">
            {known.length === 0
              ? "Nothing permanent about you appeared in these breaches."
              : known.length + (known.length === 1 ? " permanent fact is" : " permanent facts are") +
                " already filled in. None of them can be reissued."}
          </div>
        </div>
        <div className="x-dosmeter">
          <div className="x-dosmeternum">{pct(union)}%</div>
          <div className="x-dosmeterlab">of the identifying power<br />this model measures</div>
        </div>
      </div>

      <div className="x-dosgrid">
        {DOSSIER_FIELDS.map((f) => {
          const on = exposed.has(f.key);
          return (
            <div className={"x-dosfield" + (on ? " on" : "")} key={f.key}>
              <div className="x-doslabel">{f.label}</div>
              <div className={"x-dosvalue" + (on ? "" : " red")}>
                {on ? "known" : REDACTED}
              </div>
              <div className="x-dosweight" title="How much this attribute narrows the field">
                {on ? "w " + f.weight.toFixed(2) : ""}
              </div>
            </div>
          );
        })}
      </div>

      {quasiComplete && (
        <div className="x-dosalert">
          <b>Date of birth, location and gender are all public.</b> Sweeney (2000) found that this
          combination alone identifies the large majority of a population uniquely. Taken together
          these three do more than any one of them does alone, which is why the model combines
          attributes rather than adding them up.
        </div>
      )}

      {known.length > 0 && !quasiComplete && (
        <div className="x-dosnote">
          These are combined, not added: {known.length} facts narrow the field further than the
          strongest one alone. Still redacted: {hidden.slice(0, 4).map((f) => f.label.toLowerCase()).join(", ")}
          {hidden.length > 4 ? " and others" : ""}.
        </div>
      )}
    </div>
  );
}

// ── who exposed what ─────────────────────────────────────────────────────────
// A bar per breach, split at the point where the revocable part ends and the
// permanent part begins. The same split as the headline figure, per company,
// so a reader can see which of them put something permanent into the open.
export function ByCompany({ breaches }) {
  const rows = (breaches || []).filter((b) => (b.weight || 0) > 0).slice(0, 12);
  if (!rows.length) return null;
  const max = Math.max(...rows.map((b) => b.weight || 0));

  return (
    <div className="x-bycomp">
      {rows.map((b, i) => {
        const fade = ((b.contribution || 0) / max) * 100;
        const perm = ((b.identityShare || 0) / max) * 100;
        return (
          <div className="x-comprow" key={i}>
            <div className="x-compname" title={b.title}>{b.title}</div>
            <div className="x-comptrack">
              <div className="x-compfade" style={{ width: fade + "%" }} />
              <div className="x-compperm" style={{ width: perm + "%" }} />
            </div>
            <div className="x-compyear">{b.year || (b.ageAssumed ? "undated" : "")}</div>
          </div>
        );
      })}
      <div className="x-complegend">
        <span><i className="x-swfade" /> fades once passwords are changed</span>
        <span><i className="x-swperm" /> permanent</span>
      </div>
    </div>
  );
}

// ── what kinds of data, and how often ────────────────────────────────────────
export function ByDataType({ report }) {
  const counts = Object.entries(report.classCounts || {}).sort((a, b) => b[1] - a[1]);
  if (!counts.length) return null;
  const max = Math.max(...counts.map(([, n]) => n));

  return (
    <div className="x-bytype">
      {counts.map(([label, n]) => {
        const attrs = attributesOf([label]);
        const permanent = [...attrs].some((a) => IDENTITY_WEIGHTS[a]);
        return (
          <div className="x-typerow" key={label}>
            <div className="x-typename">{label}</div>
            <div className="x-typetrack">
              <div className={"x-typebar" + (permanent ? " perm" : "")} style={{ width: (n / max) * 100 + "%" }} />
            </div>
            <div className="x-typecount">{n}</div>
          </div>
        );
      })}
      <div className="x-complegend">
        <span><i className="x-swperm" /> permanent kinds</span>
        <span><i className="x-swfade" /> revocable or contact-only</span>
      </div>
    </div>
  );
}
