"use client";

// app/components/Sources.js
// ─────────────────────────────────────────────────────────────────────────────
// Who the data actually belongs to.
//
// Two reasons this is in the interface rather than buried in a README:
//
//   1. Licence. The bundled breach catalogue (lib/breach-index.json) is Have I
//      Been Pwned's data under CC BY 4.0, and that licence REQUIRES visible
//      attribution. Shipping it without this block would be a licence breach,
//      not a style choice.
//
//   2. Honesty. This tool holds no breach data of its own. Every finding is
//      somebody else's record, queried live. A reader who wants to check a
//      result, or dispute it, needs to know whose database to go to.
//
// Provider names are proper nouns and are deliberately not translated; only the
// heading is. The roles are kept to a few words so the list stays scannable
// instead of turning into a second privacy policy.
// ─────────────────────────────────────────────────────────────────────────────

const SOURCES = [
  { name: "Have I Been Pwned", href: "https://haveibeenpwned.com", role: "breach records, dates and data classes" },
  { name: "Pwned Passwords", href: "https://haveibeenpwned.com/Passwords", role: "password checks, k-anonymity" },
  { name: "LeakCheck", href: "https://leakcheck.io", role: "breach sources and dates" },
  { name: "XposedOrNot", href: "https://xposedornot.com", role: "breach names" },
  { name: "Hudson Rock", href: "https://www.hudsonrock.com", role: "infostealer infections" },
  { name: "DeHashed", href: "https://dehashed.com", role: "email and phone records" },
  // Admitted last, and the only source that reports how a service stored a
  // password, which is what the cryptographic weight consumes. Listing it
  // matters for the same reason the others are listed: a reader is entitled
  // to know every party an identifier was sent to.
  { name: "BreachDirectory", href: "https://breachdirectory.org", role: "password storage algorithm" },
];

export function Sources({ T, active }) {
  // `active` is the list the last scan actually reached, when there has been
  // one. A provider that did not answer is shown greyed rather than hidden:
  // quietly dropping it would overstate the coverage behind a result.
  const reached = active && active.length ? new Set(active) : null;

  return (
    <div className="x-srcbox">
      <div className="x-srctitle">{T.sourcesTitle}</div>
      <ul className="x-srclist">
        {SOURCES.map((s) => {
          const dim = reached && !reached.has(s.name);
          return (
            <li key={s.name} className={"x-srcitem" + (dim ? " off" : "")}>
              <a className="x-srclink" href={s.href} target="_blank" rel="noopener noreferrer">{s.name}</a>
              <span className="x-srcrole">{s.role}</span>
            </li>
          );
        })}
      </ul>
      <div className="x-srcattr">
        Breach catalogue from Have I Been Pwned, used under{" "}
        <a className="x-privlink" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.
        Exposio stores none of it; every lookup is made live and discarded.
      </div>
    </div>
  );
}
