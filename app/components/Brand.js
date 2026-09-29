// app/components/Brand.js
// ─────────────────────────────────────────────────────────────────────────────
// The header: the mark, the wordmark, and one line of checkable fact.
//
// The mark is drawn as SVG rather than loaded as an image, for the same reason
// the icons are: a tool for checking breach exposure should not ask a CDN to
// observe who visits it. It is a lens ring around a target — a scope.
//
// The chip under the wordmark says "No accounts · No cookies · No trackers".
// That is true and anyone can verify it: there is no localStorage, no
// sessionStorage, no document.cookie and no analytics anywhere in this repo,
// and the Content-Security-Policy in next.config.js only permits scripts from
// this origin. If that ever stops being true, this line has to come out.
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

export function BrandHeader() {
  return (
    <header className="x-header">
      <div className="x-mark"><ScopeMark /></div>
      <div className="x-brand">Exposio</div>
      <div className="x-secureline">
        <b>No accounts</b> · No cookies · No trackers
      </div>
    </header>
  );
}

function ScopeMark() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="7.2" />
      <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
      <path d="M12 1.6v3.2M12 19.2v3.2M1.6 12h3.2M19.2 12h3.2" />
    </svg>
  );
}
