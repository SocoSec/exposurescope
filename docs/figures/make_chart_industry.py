# -*- coding: utf-8 -*-
"""Figure 2 — what industry telemetry shows, and what it may be used for.

This figure deliberately plots NON-peer-reviewed data: the breach-corpus
frequencies reported by the Verizon Data Breach Investigations Report [14],
[15]. Section 2.7 of the thesis criticises reliance on that source, so the
figure carries the criticism with it rather than presenting the numbers as
population parameters.

The academic position, stated in the figure itself:
  usable    the ORDERING of data classes by how often they appear, which a
            reporting bias is unlikely to invert
  not usable as point estimates for any population, because the sample is
            drawn from incidents disclosed to contributing organisations and
            no published correction quantifies that selection effect

Paired with the severity weights of Table 3, the figure makes the argument
Section 5.2 needs: the classes that appear most often are not the ones that
matter most, so frequency cannot be the weighting.
"""
import io, os

W, H = 1000, 860
BLUE, ORANGE = "#2a78d6", "#eb6834"
INK, MUTED, HAIR, SURF = "#14202E", "#5A6B7F", "#D8DEE5", "#FCFCFB"
CAUTION_BG, CAUTION_INK = "#FBF3E7", "#8A6218"
FS_TITLE, FS_PANEL, FS_LABEL, FS_NOTE = 30, 25, 23, 22
FONT = "Segoe UI, Calibri, Helvetica, Arial, sans-serif"
o = []
A = o.append


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def text(x, y, s, size=FS_LABEL, fill=INK, anchor="start", weight="400", style=""):
    st = f' font-style="{style}"' if style else ""
    A(f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" '
      f'font-weight="{weight}"{st}>{esc(s)}</text>')


def bar(x, y, w, h, fill, r=4):
    if w > 0:
        A(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" fill="{fill}"/>')


A(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="{FONT}">')
A(f'<rect width="{W}" height="{H}" fill="{SURF}"/>')

text(40, 46, "What a breach actually contains", FS_TITLE, INK, weight="600")
text(40, 78, "Share of 1,048 catalogued breaches containing each data class, measured  ·  npm run scale",
     FS_NOTE, MUTED)

ROWS = [
    ("Email addresses", 99.3, "the lookup key", False),
    ("Passwords",       64.3, "credential, 0.7", True),
    ("Names",           54.0, "identity", True),
    ("Phone numbers",   36.5, "contact, 0.4", False),
    ("Dates of birth",  27.5, "permanent", True),
]
X0, X1, TOP, BH, GAP = 320, 880, 124, 48, 26
MAXV = 105
for i, (label, val, note, heavy) in enumerate(ROWS):
    y = TOP + i * (BH + GAP)
    col = ORANGE if heavy else BLUE
    bw = (val / MAXV) * (X1 - X0)
    text(X0 - 18, y + BH * 0.68, label, FS_LABEL, INK, anchor="end")
    bar(X0, y, bw, BH, col)
    text(X0 + bw + 14, y + BH * 0.68, f"{val}%", FS_LABEL, INK, weight="600")
    if bw > len(note) * 10.5 + 28:
        text(X0 + 14, y + BH * 0.68, note, FS_NOTE, "#FFFFFF")
    else:
        text(X0 + bw + 86, y + BH * 0.68, note, FS_NOTE, MUTED)

yb = TOP + len(ROWS) * (BH + GAP) + 2
A(f'<line x1="{X0}" y1="{yb}" x2="{X1}" y2="{yb}" stroke="{HAIR}" stroke-width="1.4"/>')
bar(X0, yb + 28, 22, 16, ORANGE, 3)
text(X0 + 32, yb + 42, "weighted heavily by the model", FS_NOTE, MUTED)
bar(X0 + 330, yb + 28, 22, 16, BLUE, 3)
text(X0 + 362, yb + 42, "weighted lightly", FS_NOTE, MUTED)

# ── the provenance caveat, carried on the figure itself ────────────────────
cy = yb + 80
A(f'<rect x="40" y="{cy}" width="920" height="142" rx="8" fill="{CAUTION_BG}" '
  f'stroke="#E3C892" stroke-width="1.6"/>')
text(60, cy + 32, "Measured here, not quoted", FS_NOTE, CAUTION_INK, weight="600")
text(60, cy + 60, "Industry telemetry [14], [15] reports passwords in about 28% of breaches.", FS_NOTE, CAUTION_INK)
text(60, cy + 84, "The catalogue this system queries puts them in 64.3%. The populations differ:", FS_NOTE, CAUTION_INK)
text(60, cy + 108, "incidents disclosed by firms, against corpora collected and published. A tool", FS_NOTE, CAUTION_INK)
text(60, cy + 132, "scoring an individual against corpora should use the corpus figure.", FS_NOTE, CAUTION_INK)

text(40, cy + 184, "Email addresses are near-universal because they are the lookup key. Passwords, which the model", FS_NOTE, MUTED)
text(40, cy + 208, "weights most heavily, are present in nearly two thirds of breaches. Weights from Table 3.", FS_NOTE, MUTED)

A("</svg>")
HERE = os.path.dirname(os.path.abspath(__file__))
dest = os.path.join(HERE, "fig-industry-frequency.svg")
io.open(dest, "w", encoding="utf-8").write("\n".join(o))
print("wrote", dest)
print(f"canvas {W}x{H}; text floor {FS_NOTE} units = {FS_NOTE / W * 150 / 0.3528:.1f} pt at 15 cm")
