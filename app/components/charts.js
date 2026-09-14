// app/components/charts.js
// ─────────────────────────────────────────────────────────────────────────────
// Presentational pieces of the report: icons, flow diagrams, the needle gauge,
// data-class bars and the breach timeline. Pure render functions — no state,
// no network. Icon/FlowDiagram/Gauge/Bars are moved from page.js unchanged;
// Timeline is updated for the new breach record shape (year + severity).
// ─────────────────────────────────────────────────────────────────────────────

import React from "react";

export function Icon({ name, color }) {
  const c = color || "var(--sig)";
  const cm = { viewBox: "0 0 24 24", width: 24, height: 24, fill: "none", stroke: c, strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "person": return <svg {...cm}><circle cx="12" cy="8" r="3.4" /><path d="M5.5 20c0-3.6 3-5.6 6.5-5.6s6.5 2 6.5 5.6" /></svg>;
    case "building": return <svg {...cm}><rect x="6" y="3.5" width="12" height="17" rx="1" /><path d="M9.5 7.5h1M13.5 7.5h1M9.5 11h1M13.5 11h1M9.5 14.5h1M13.5 14.5h1" /></svg>;
    case "db": return <svg {...cm}><ellipse cx="12" cy="6" rx="6.5" ry="2.6" /><path d="M5.5 6v11c0 1.5 2.9 2.6 6.5 2.6s6.5-1.1 6.5-2.6V6" /><path d="M5.5 11.5c0 1.5 2.9 2.6 6.5 2.6s6.5-1.1 6.5-2.6" /></svg>;
    case "layers": return <svg {...cm}><path d="M12 3l8.5 4.2L12 11.4 3.5 7.2z" /><path d="M4 12l8 4 8-4" /></svg>;
    case "key": return <svg {...cm}><circle cx="8" cy="14" r="3.6" /><path d="M10.6 11.4L19 3M15.5 6.5l2 2M13.5 8.5l2 2" /></svg>;
    case "target": return <svg {...cm}><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>;
    case "unlock": return <svg {...cm}><rect x="5.5" y="11" width="13" height="8.5" rx="2" /><path d="M9 11V8a3 3 0 0 1 5.7-1.3" /></svg>;
    default: return null;
  }
}

export function FlowDiagram({ steps, color }) {
  return (
    <div className="x-flow">
      {steps.map((st, i) => (
        <React.Fragment key={i}>
          <div className="x-fnode">
            <div className="x-ficon" style={{ borderColor: color }}><Icon name={st.icon} color={color} /></div>
            <div className="x-flabel">{st.label}</div>
          </div>
          {i < steps.length - 1 && <div className="x-farrow" style={{ color }}>→</div>}
        </React.Fragment>
      ))}
    </div>
  );
}

export const LEAK_FLOW = [
  { icon: "person", label: "You sign up" },
  { icon: "building", label: "Company breached" },
  { icon: "db", label: "Data dumped & sold" },
  { icon: "layers", label: "Profile aggregated" },
];
export const ATTACK_FLOW = [
  { icon: "key", label: "Leaked login" },
  { icon: "target", label: "Tried on many sites" },
  { icon: "unlock", label: "Account taken over" },
];

export function Gauge({ score, level }) {
  const S = level === "safe" ? 0 : Math.max(0, Math.min(100, Math.round(score)));
  const Cx = 160, Cy = 150, R = 118, SW = 24, N = 9, gap = 2.4, seg = 180 / N;
  const ramp = ["#2FBF71", "#57C559", "#8CCB44", "#C0CE3B", "#E7C93B", "#E9A93C", "#E8843F", "#E76A45", "#E5544A"];
  const P = (ang, r = R) => { const t = ang * Math.PI / 180; return [Cx + r * Math.cos(t), Cy - r * Math.sin(t)]; };
  const arcs = [];
  for (let k = 0; k < N; k++) {
    const a0 = 180 - k * seg - gap / 2;
    const a1 = 180 - (k + 1) * seg + gap / 2;
    const [x0, y0] = P(a0), [x1, y1] = P(a1);
    arcs.push(<path key={k} d={"M " + x0.toFixed(1) + " " + y0.toFixed(1) + " A " + R + " " + R + " 0 0 1 " + x1.toFixed(1) + " " + y1.toFixed(1)} stroke={ramp[k]} strokeWidth={SW} fill="none" strokeLinecap="round" />);
  }
  const nAng = 180 - (S / 100) * 180;
  const [tx, ty] = P(nAng, R - 4);
  const [b1x, b1y] = P(nAng + 90, 7);
  const [b2x, b2y] = P(nAng - 90, 7);
  const bandColor = ramp[Math.min(N - 1, Math.floor((S / 100) * N))];
  return (
    <svg viewBox="0 0 320 224" style={{ width: "100%", maxWidth: 340, display: "block", margin: "0 auto" }}>
      <defs><filter id="nsh" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.55" /></filter></defs>
      {arcs}
      <polygon points={tx.toFixed(1) + "," + ty.toFixed(1) + " " + b1x.toFixed(1) + "," + b1y.toFixed(1) + " " + b2x.toFixed(1) + "," + b2y.toFixed(1)} fill="#EAF1FA" filter="url(#nsh)" />
      <circle cx={Cx} cy={Cy} r="13" fill="#0F1521" stroke={bandColor} strokeWidth="3.5" />
      <circle cx={Cx} cy={Cy} r="4.5" fill={bandColor} />
      <text x={Cx} y="200" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="38" fontWeight="700" fill={bandColor}>{S}</text>
      <text x={Cx} y="216" textAnchor="middle" fontFamily="ui-monospace,monospace" fontSize="10" fill="#67748B">/ 100</text>
      <text x="30" y="176" fontFamily="ui-monospace,monospace" fontSize="9" fill="#2FBF71">SAFE</text>
      <text x="290" y="176" textAnchor="end" fontFamily="ui-monospace,monospace" fontSize="9" fill="#E5544A">CRITICAL</text>
    </svg>
  );
}

export function Bars({ counts, color }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map((e) => e[1]));
  return (
    <div>
      {entries.map(([label, n]) => (
        <div className="x-bar" key={label}>
          <span className="bl">{label.replace(/ addresses| numbers/i, "")}</span>
          <span className="bt"><span className="bf" style={{ width: (n / max * 100) + "%", background: color }} /></span>
          <span className="bv">{n}</span>
        </div>
      ))}
    </div>
  );
}

// One dot per dated breach on a year axis; bigger dot = more severe data.
// Undated records (DeHashed) can't be placed on a timeline, so they're counted
// underneath instead of being silently dropped.
export function Timeline({ breaches, color }) {
  const dated = breaches.filter((b) => b.year);
  const undated = breaches.length - dated.length;
  if (dated.length === 0) return <div className="x-secd">Breach dates weren't available from these sources.</div>;
  const years = dated.map((b) => parseInt(b.year, 10));
  const max = new Date().getFullYear();
  const min = Math.min(...years, max - 1);
  const span = Math.max(1, max - min);
  return (
    <>
      <svg viewBox="0 0 100 22" style={{ width: "100%", height: 60 }} preserveAspectRatio="none" role="img" aria-label="Breach timeline">
        <line x1="2" y1="14" x2="98" y2="14" stroke="var(--line)" strokeWidth="0.4" />
        {[min, Math.round((min + max) / 2), max].map((y, i) => (
          <text key={i} x={2 + i * 48} y="21" fontSize="3" fill="var(--mute)" fontFamily="monospace">{y}</text>
        ))}
        {dated.map((b, i) => (
          <circle key={i} cx={2 + ((parseInt(b.year, 10) - min) / span) * 96} cy="14" r={1.4 + b.severity * 1.6} fill={color} opacity="0.85">
            <title>{b.title + " (" + b.year + ")"}</title>
          </circle>
        ))}
      </svg>
      {undated > 0 && <div className="x-secd" style={{ marginTop: 6 }}>+ {undated} undated record{undated > 1 ? "s" : ""} not shown on the timeline.</div>}
    </>
  );
}
