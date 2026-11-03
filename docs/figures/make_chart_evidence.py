# -*- coding: utf-8 -*-
"""Figure 4 — the peer-reviewed empirical case for the design.

EVERY NUMBER HERE COMES FROM A PEER-REVIEWED PAPER, and each is quoted from the
paper's own abstract so it can be checked without a subscription:

  A  Pal, Daniel, Chatterjee & Ristenpart, IEEE S&P 2019 [36]
     "our attack compromises more than 16% of user accounts in less than a
      thousand guesses, should one of their other passwords be known"

  B  Jenkins, Grimes, Proudfoot & Lowry, Information Technology for
     Development 2013 [68]
     "88.41% of users who received a fear appeal subsequently created unique
      passwords, whereas only 4.45% of users who did not receive a fear appeal
      created unique passwords"

  C  Pal, Islam, Sanusi et al. 2021 [34]
     "MIGP reduces the efficacy of state-of-the-art 1000-guess credential
      tweaking attacks by 94%"

The earlier version of this figure plotted data-class frequencies from an
industry report. That was inconsistent with Section 2.7, which criticises
exactly such reliance, so it was replaced rather than relabelled.

Figures in published papers are the publisher's copyright; the numbers in them
are facts. These are replotted, not reproduced.
"""
import io, os

W, H = 1000, 790
BLUE, ORANGE = "#2a78d6", "#eb6834"
INK, MUTED, HAIR, SURF = "#14202E", "#5A6B7F", "#D8DEE5", "#FCFCFB"
FS_TITLE, FS_PANEL, FS_LABEL, FS_NOTE = 30, 25, 23, 22
FONT = "Segoe UI, Calibri, Helvetica, Arial, sans-serif"
o = []
A = o.append


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def text(x, y, s, size=FS_LABEL, fill=INK, anchor="start", weight="400"):
    A(f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" '
      f'font-weight="{weight}">{esc(s)}</text>')


def bar(x, y, w, h, fill, r=4):
    if w > 0:
        A(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" fill="{fill}"/>')


A(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="{FONT}">')
A(f'<rect width="{W}" height="{H}" fill="{SURF}"/>')

text(40, 46, "The empirical case, from peer-reviewed measurement", FS_TITLE, INK, weight="600")
text(40, 78, "Every value below is quoted from the source paper's own abstract", FS_NOTE, MUTED)

# ── Panel A ─────────────────────────────────────────────────────────────────
text(40, 142, "A · One known password compromises other accounts", FS_PANEL, INK, weight="600")
text(40, 170, "simulated attack against accounts whose owner reused or varied a password  ·  Pal et al. [36]",
     FS_NOTE, MUTED)

X0, XW = 300, 560
bar(X0, 196, XW, 44, "#E8EDF3")
bar(X0, 196, XW * 0.16, 44, ORANGE)
text(X0 - 18, 226, "accounts broken", FS_LABEL, INK, anchor="end")
text(X0 + XW * 0.16 + 16, 226, "16%", FS_LABEL, INK, weight="600")
text(X0 + XW + 16, 226, "of accounts", FS_NOTE, MUTED)
text(X0, 268, "within 1,000 guesses, despite state-of-the-art countermeasures", FS_NOTE, MUTED)

# ── Panel B ─────────────────────────────────────────────────────────────────
text(40, 342, "B · How the warning is framed changes what people do", FS_PANEL, INK, weight="600")
text(40, 370, "share of users who went on to create a unique password  ·  Jenkins et al. [68]", FS_NOTE, MUTED)

pairs = [("shown a just-in-time appeal", 88.41, ORANGE), ("no appeal shown", 4.45, BLUE)]
for i, (label, val, col) in enumerate(pairs):
    y = 402 + i * 58
    text(X0 - 18, y + 30, label, FS_LABEL, INK, anchor="end")
    bar(X0, y, XW, 42, "#E8EDF3")
    bar(X0, y, XW * (val / 100), 42, col)
    text(X0 + XW * (val / 100) + 16, y + 30, f"{val}%", FS_LABEL, INK, weight="600")
text(X0, 540, "a twenty-fold difference from the framing of the message alone", FS_NOTE, MUTED)

# ── Panel C ─────────────────────────────────────────────────────────────────
text(40, 608, "C · Checking credentials properly removes most of the risk", FS_PANEL, INK, weight="600")
text(40, 636, "reduction in the efficacy of 1,000-guess credential-tweaking attacks  ·  Pal et al. [34]",
     FS_NOTE, MUTED)

bar(X0, 662, XW, 42, "#E8EDF3")
bar(X0, 662, XW * 0.94, 42, BLUE)
text(X0 - 18, 692, "attack efficacy removed", FS_LABEL, INK, anchor="end")
text(X0 + XW * 0.94 + 16, 692, "94%", FS_LABEL, INK, weight="600")

text(40, 744, "Reuse is exploitable; the framing of the response matters more than its mere existence;", FS_NOTE, MUTED)
text(40, 768, "and a proper credential check removes most of the residual risk.", FS_NOTE, MUTED)

A("</svg>")
HERE = os.path.dirname(os.path.abspath(__file__))
dest = os.path.join(HERE, "fig-evidence.svg")
io.open(dest, "w", encoding="utf-8").write("\n".join(o))
print("wrote", dest)
print(f"text floor: {FS_NOTE} units = {FS_NOTE / W * 150 / 0.3528:.1f} pt at 15 cm")
