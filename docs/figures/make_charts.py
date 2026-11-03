# -*- coding: utf-8 -*-
"""Generate the two data figures for the thesis.

FIGURE 5  Exposed data classes by frequency, from the breach-corpus analysis
          cited as [15], set against the severity tier this thesis assigns.
          The point is that the two orderings disagree.

FIGURE 6  Robustness of the model, from this project's own measurements:
          weight perturbation, date recovery, and corpus quality.

WHY THESE ARE DRAWN RATHER THAN COPIED. Figures in published papers are the
publisher's copyright and reproducing them needs written permission. The
underlying numbers are facts and may be replotted. Every value below is either
cited to its source or produced by a script in this repository, and the
provenance is printed under each panel.

MEDIUM IS PRINT. These are embedded in a Word document at 15 cm wide, so there
is no hover layer and no interaction: the labels that matter are drawn directly
on the marks. Text is sized so that 21 canvas units = 8.9 pt at 15 cm, which is
the floor for legibility in print.

COLOR. Two categorical slots, validated with the dataviz palette validator:
  #2a78d6 / #eb6834 - lightness band, chroma floor, CVD separation (dE 24.7
  protan), normal-vision floor (33.6) and contrast vs surface all PASS.
"""
import io, os

W = 1000
BLUE, ORANGE = "#2a78d6", "#eb6834"
INK, MUTED, HAIR, SURF = "#14202E", "#5A6B7F", "#D8DEE5", "#FCFCFB"
FS_TITLE, FS_LABEL, FS_AXIS, FS_NOTE = 30, 25, 23, 22
FONT = "Segoe UI, Calibri, Helvetica, Arial, sans-serif"


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class Svg:
    def __init__(self, w, h):
        self.w, self.h, self.o = w, h, []
        self.o.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
                      f'width="{w}" height="{h}" font-family="{FONT}">')
        self.o.append(f'<rect width="{w}" height="{h}" fill="{SURF}"/>')

    def text(self, x, y, s, size=FS_LABEL, fill=INK, anchor="start", weight="400", style=""):
        st = f' font-style="{style}"' if style else ""
        self.o.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" '
                      f'text-anchor="{anchor}" font-weight="{weight}"{st}>{esc(s)}</text>')

    def rect(self, x, y, w, h, fill, r=4):
        if w <= 0 or h <= 0:
            return
        self.o.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" fill="{fill}"/>')

    def line(self, x1, y1, x2, y2, stroke=HAIR, w=1.4, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.o.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
                      f'stroke="{stroke}" stroke-width="{w}"{d}/>')

    def path(self, d, stroke=BLUE, w=2.4, fill="none"):
        self.o.append(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{w}" '
                      f'stroke-linejoin="round" stroke-linecap="round"/>')

    def dot(self, x, y, r=7, fill=BLUE):
        self.o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{fill}" '
                      f'stroke="{SURF}" stroke-width="2"/>')

    def save(self, path):
        self.o.append("</svg>")
        io.open(path, "w", encoding="utf-8").write("\n".join(self.o))
        return path


HERE = os.path.dirname(os.path.abspath(__file__))

# ════════════════════════════════════════════════════════════════════════════
# FIGURE 5 — frequency of exposure vs severity of exposure
# ════════════════════════════════════════════════════════════════════════════
# Values: breach-corpus analysis cited in the thesis as [15].
# Tier:   this thesis's own severity assignment (Table 3).
ROWS = [
    ("Email addresses", 61, "lookup key", False),
    ("Phone numbers",   39, "contact 0.4", False),
    ("Passwords",       28, "credential 0.7", True),
    ("Government IDs",  22, "identity, permanent", True),
]

s = Svg(W, 600)
s.text(40, 46, "Frequency of exposure is not severity of exposure", FS_TITLE, INK, weight="600")
s.text(40, 76, "Share of breached databases containing each data class, against the weight this model assigns",
       FS_AXIS, MUTED)

X0, X1, TOP, BH, GAP = 320, 930, 124, 50, 28
MAXV = 70
for i, (label, val, note, heavy) in enumerate(ROWS):
    y = TOP + i * (BH + GAP)
    col = ORANGE if heavy else BLUE
    s.text(X0 - 18, y + BH * 0.68, label, FS_LABEL, INK, anchor="end")
    s.rect(X0, y, (val / MAXV) * (X1 - X0), BH, col)
    bw_px = (val / MAXV) * (X1 - X0)
    s.text(X0 + bw_px + 14, y + BH * 0.68, f"{val}%", FS_LABEL, INK, weight="600")
    if bw_px > len(note) * 10.5 + 28:            # only if it fits inside the mark
        s.text(X0 + 14, y + BH * 0.68, note, FS_NOTE, "#FFFFFF")
    else:
        s.text(X0 + bw_px + 92, y + BH * 0.68, note, FS_NOTE, MUTED)

yb = TOP + len(ROWS) * (BH + GAP) + 4
s.line(X0, yb, X1, yb, HAIR, 1.4)

# legend: two categories, so a legend is required
lx = X0
s.rect(lx, yb + 30, 22, 16, ORANGE, 3)
s.text(lx + 32, yb + 44, "weighted heavily by the model", FS_NOTE, MUTED)
s.rect(lx + 330, yb + 30, 22, 16, BLUE, 3)
s.text(lx + 362, yb + 44, "weighted lightly", FS_NOTE, MUTED)

s.text(40, 536, "Passwords appear in fewer breaches than email addresses, yet carry the heavier weight:",
       FS_NOTE, MUTED)
s.text(40, 560, "an exposed credential authenticates, an exposed address does not.", FS_NOTE, MUTED)
s.text(40, 584, "Frequencies from [15]; weights from Table 3 of this thesis.", FS_NOTE, MUTED)
f5 = s.save(os.path.join(HERE, "fig-frequency-vs-severity.svg"))

# ════════════════════════════════════════════════════════════════════════════
# FIGURE 6 — three measured robustness results (own data)
# ════════════════════════════════════════════════════════════════════════════
s = Svg(W, 1110)
s.text(40, 46, "Measured behaviour of the scoring model", FS_TITLE, INK, weight="600")
s.text(40, 76, "All three panels are produced by scripts in the project repository and are reproducible",
       FS_AXIS, MUTED)

# ── panel A: weight perturbation ────────────────────────────────────────────
s.text(40, 132, "A · The ranking survives badly mis-specified weights", FS_LABEL, INK, weight="600")
s.text(40, 158, "2,000 synthetic profiles, 200 trials per level  ·  npm run sensitivity", FS_NOTE, MUTED)

PERT = [("±10%", 0.999, 98.4), ("±20%", 0.998, 96.6), ("±30%", 0.996, 95.0)]
# Two measures on different scales -> two panels, never one dual axis.
for pi, (title, lo, hi, fmt, pick) in enumerate([
        ("Spearman ρ of the ranking", 0.990, 1.000, "{:.3f}", lambda r: r[1]),
        ("identities keeping their band", 90.0, 100.0, "{:.1f}%", lambda r: r[2])]):
    px = 112 + pi * 486
    pw, ph, py = 332, 140, 206
    s.text(px, py - 16, title, FS_NOTE, MUTED)
    # A DOT PLOT, not bars. The scale below is zoomed, and a bar on a zoomed
    # scale lies: its length no longer encodes the value. Dots do not imply
    # length from zero, so zooming them is legitimate.
    s.line(px, py + ph, px + pw, py + ph, HAIR, 1.4)
    for gv in (lo, (lo + hi) / 2, hi):
        gxp = px + ((gv - lo) / (hi - lo)) * pw
        s.line(gxp, py, gxp, py + ph, HAIR, 1, dash="4 4")
        s.text(gxp, py + ph + 26, fmt.format(gv), FS_NOTE, MUTED, anchor="middle")
    for i, r in enumerate(PERT):
        v = pick(r)
        yy = py + 30 + i * 38
        xx = px + ((v - lo) / (hi - lo)) * pw
        s.text(px - 14, yy + 7, r[0], FS_NOTE, INK, anchor="end")
        s.dot(xx, yy, 9, BLUE)
        s.text(xx + 18, yy + 7, fmt.format(v), FS_NOTE, INK, weight="600")
    s.text(px, py + ph + 54, "scale starts at " + fmt.format(lo) + ", not zero", FS_NOTE, MUTED)

# ── panel B: date recovery ──────────────────────────────────────────────────
s.text(40, 436, "B · Recovering dates removes the model's most sensitive assumption", FS_LABEL, INK, weight="600")
s.text(40, 462, "spread in rank correlation as the undated-age assumption is swept 180–2,920 days  ·  npm run sensitivity",
       FS_NOTE, MUTED)

REC = [(0, 0.047), (25, 0.036), (50, 0.027), (75, 0.013), (100, 0.000)]
gx, gy, gw, gh = 150, 500, 700, 160
s.line(gx, gy + gh, gx + gw, gy + gh, HAIR, 1.4)
s.line(gx, gy, gx, gy + gh, HAIR, 1.4)
for yv in (0.00, 0.02, 0.04):
    yy = gy + gh - (yv / 0.05) * gh
    s.line(gx, yy, gx + gw, yy, HAIR, 1, dash="4 4")
    s.text(gx - 14, yy + 6, f"{yv:.2f}", FS_NOTE, MUTED, anchor="end")
pts = [(gx + (r[0] / 100) * gw, gy + gh - (r[1] / 0.05) * gh) for r in REC]
s.path("M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts), BLUE, 2.6)
for (x, y), r in zip(pts, REC):
    s.dot(x, y, 7, BLUE)
    s.text(x, gy + gh + 28, f"{r[0]}%", FS_NOTE, MUTED, anchor="middle")
s.text(pts[0][0] + 16, pts[0][1] - 14, "0.047  nothing recovered", FS_NOTE, INK, weight="600")
s.text(pts[-1][0] - 16, pts[-1][1] - 18, "0.000", FS_NOTE, INK, anchor="end", weight="600")
s.text(gx + gw / 2, gy + gh + 56, "share of undated records whose date is recovered", FS_NOTE, MUTED, anchor="middle")

# ── panel C: corpus quality ─────────────────────────────────────────────────
s.text(40, 760, "C · 5.8% of the reference corpus carries a reliability mark", FS_LABEL, INK, weight="600")
s.text(40, 786, "1,048 catalogued breaches  ·  npm run validate", FS_NOTE, MUTED)

FLAGS = [("unverified", 4.0), ("spam list", 1.5), ("malware", 0.9),
         ("stealer log", 0.6), ("fabricated", 0.3), ("retired", 0.2)]
cx, cy, cw = 250, 820, 600
MAXF = 4.5
for i, (label, v) in enumerate(FLAGS):
    y = cy + i * 28
    s.text(cx - 18, y + 15, label, FS_NOTE, INK, anchor="end")
    s.rect(cx, y, (v / MAXF) * cw, 19, BLUE, 4)
    s.text(cx + (v / MAXF) * cw + 12, y + 15, f"{v}%", FS_NOTE, INK)
s.text(40, 1046, "Marks are the catalogue curator's own. A score computed over this corpus", FS_NOTE, MUTED)
s.text(40, 1070, "inherits that uncertainty, which is why the report shows them.", FS_NOTE, MUTED)
f6 = s.save(os.path.join(HERE, "fig-model-behaviour.svg"))

print("wrote:")
print(" ", f5)
print(" ", f6)
print(f"\ntext floor: {FS_NOTE} units = {FS_NOTE / W * 150 / 0.3528:.1f} pt at 15 cm wide")
