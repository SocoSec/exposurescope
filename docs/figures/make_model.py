# -*- coding: utf-8 -*-
"""docs/figures/model.svg - the scoring model on one page.

WHY THIS FIGURE EXISTS
Chapter 5 develops the model over ten sections and two revisions. A reader who
wants to know what it actually computes has to assemble it from Section 5.2,
Section 5.8 and a nine-row table. The figure it replaces reported three
properties OF the model, which is no use to someone who does not yet know what
the model is.

This draws the structure: what goes in, the three terms and what distinguishes
them, how they are combined, and what comes out. The three decay curves are
drawn to scale from the actual constants, because the difference between them
is the whole argument of Section 5.8 and a reader should be able to see it
rather than infer it from two half-lives in prose.

Every constant is read from lib/score.js at build time, so this figure cannot
drift from the implementation.
"""
import io
import math
import os
import re

from uml import (Canvas, INK, MUTED, HAIR, TEAL, GOLD, SLATE, WASH,
                 FS_BODY, FS_SMALL, FS_TINY, W, rasterise)

# ── read the live constants ─────────────────────────────────────────────────
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "..", "..", "lib", "score.js")
js = io.open(SRC, encoding="utf-8").read()


def const(name):
    return float(re.search(r"export const " + name + r" = ([\d.]+)", js).group(1))


LAMBDA = const("DECAY_PER_DAY")
W_ID = const("W_IDENTITY")
W_ST = const("W_STEALER")
B_MAX = const("B_MAX")
VOL_HL = const("VOLATILE_HALF_LIFE_DAYS")
FAST_HL = round(math.log(2) / LAMBDA)

H = 1258
c = Canvas(H, "How the Breach Risk score is computed",
           "Three terms, summed raw and normalised once · lib/score.js")

CRED, SESS, PERM = GOLD, "#C2543B", TEAL
BW = 306                                   # term-box width
CX = [500 - BW - 16, 500, 500 + BW + 16]   # 178, 500, 822

# ── what goes in ────────────────────────────────────────────────────────────
c.box(500, 132, 620, 58,
      ["Every breach the identifier appears in, from six sources"],
      accent=SLATE, fill=WASH, size=FS_BODY)
for cx, col in zip(CX, (CRED, SESS, PERM)):
    c.arrow([(500, 161), (cx, 196), (cx, 222)], width=2.0, stroke=col)

# ── the three terms ─────────────────────────────────────────────────────────
TOP, BH = 222, 262
TERMS = [
    (CX[0], CRED, "What can be revoked",
     ["Passwords, tokens,", "payment cards"],
     ["B_cred =", "Σ sev · κ · e^(−λ·age)"],
     ["Changing it makes the", "leaked copy worthless.",
      f"Half-life {FAST_HL} days."]),
    (CX[1], SESS, "What expires by itself",
     ["Live sessions taken by", "infostealer malware"],
     ["V =", "Σ e^(−λᵥ · age)"],
     ["A password change does", "not revoke it; it lapses.",
      f"Half-life {VOL_HL:.0f} days."]),
    (CX[2], PERM, "What cannot be changed",
     ["Date of birth, name,", "address, phone, ID"],
     ["I =", "1 − Π (1 − w)"],
     ["As true today as the day", "it leaked. Counted once,",
      "however many breaches."]),
]
for cx, col, head, what, expr, why in TERMS:
    c.add(f'<rect x="{cx-BW/2}" y="{TOP}" width="{BW}" height="{BH}" rx="10" '
          f'fill="#FFFFFF" stroke="{col}" stroke-width="2.4"/>')
    c.add(f'<path d="M{cx-BW/2},{TOP+10} a10,10 0 0 1 10,-10 L{cx+BW/2-10},{TOP} '
          f'a10,10 0 0 1 10,10 L{cx+BW/2},{TOP+42} L{cx-BW/2},{TOP+42} Z" fill="{col}"/>')
    c.text(cx, TOP + 30, head, FS_SMALL, "#FFFFFF", weight="600")
    c.lines(cx, TOP + 76, what, FS_TINY, MUTED)
    c.add(f'<path d="M{cx-BW/2+22},{TOP+104} L{cx+BW/2-22},{TOP+104}" '
          f'stroke="{HAIR}" stroke-width="1.4"/>')
    c.mono(cx, TOP + 132, expr[0], FS_TINY, INK)
    c.mono(cx, TOP + 158, expr[1], FS_TINY, INK)
    c.add(f'<path d="M{cx-BW/2+22},{TOP+180} L{cx+BW/2-22},{TOP+180}" '
          f'stroke="{HAIR}" stroke-width="1.4"/>')
    c.lines(cx, TOP + 222, why, FS_TINY, MUTED)

# ── the three clocks, drawn to scale from the real constants ────────────────
GY, GH, GW = 536, 146, 262
c.text(500, GY - 12, "How each term behaves over ten years",
       FS_SMALL, INK, weight="600")
for cx, col, _, _, _, _ in TERMS:
    x0, y0 = cx - GW / 2, GY + 12
    c.add(f'<rect x="{x0}" y="{y0}" width="{GW}" height="{GH}" fill="{WASH}" '
          f'stroke="{HAIR}" stroke-width="1.2"/>')
    pts = []
    for k in range(61):
        days = k * 60                      # 0 .. 3,650 days
        if col is CRED:
            v = math.exp(-LAMBDA * days)
        elif col is SESS:
            v = math.exp(-(math.log(2) / VOL_HL) * days)
        else:
            v = 1.0
        pts.append((x0 + GW * k / 60, y0 + GH - (GH - 18) * v))
    c.add('<path d="M' + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
          + f'" fill="none" stroke="{col}" stroke-width="3"/>')
    c.text(x0 + 6, y0 + GH + 24, "now", FS_TINY, MUTED, anchor="start")
    c.text(x0 + GW - 6, y0 + GH + 24, "10 years", FS_TINY, MUTED, anchor="end")

# ── combine ─────────────────────────────────────────────────────────────────
JOIN = GY + 12 + GH + 46                   # clear of the "now / 10 years" row
for cx, col, _, _, _, _ in TERMS:
    c.arrow([(cx, JOIN), (cx, JOIN + 36), (500, JOIN + 36), (500, JOIN + 60)],
            width=2.0, stroke=col)

RAW_Y = JOIN + 94
c.box(500, RAW_Y, 720, 62,
      [f"B_raw  =  B_cred  +  {W_ID:.2f} · I  +  {W_ST:.2f} · V"],
      accent=INK, fill=WASH, size=FS_BODY, weight="600")
c.text(500, RAW_Y + 52,
       "summed raw, not averaged: a term that finds nothing contributes exactly zero",
       FS_TINY, MUTED, style="italic")

c.arrow([(500, RAW_Y + 66), (500, RAW_Y + 92)], width=2.0)
NORM_Y = RAW_Y + 130
c.box(500, NORM_Y, 720, 76,
      [f"B  =  min(1,  B_raw / {B_MAX})",
       "score  =  round(100 · B),  at least 1 where anything was found"],
      accent=INK, fill="#FFFFFF", size=FS_TINY)

c.arrow([(500, NORM_Y + 38), (500, NORM_Y + 62)], width=2.0)

# ── the bands ───────────────────────────────────────────────────────────────
BY = NORM_Y + 66
BANDS = [("Safe", "no exposure", "#8A94A6"), ("Low", "1–35", "#2E9E6B"),
         ("Medium", "36–65", "#C98A1B"), ("High", "66–100", "#C2543B")]
bw, gap = 182, 14
x = (W - (bw * 4 + gap * 3)) / 2
for name, rng, col in BANDS:
    c.add(f'<rect x="{x}" y="{BY}" width="{bw}" height="58" rx="8" fill="#FFFFFF" '
          f'stroke="{col}" stroke-width="2.4"/>')
    c.text(x + bw / 2, BY + 26, name, FS_SMALL, col, weight="600")
    c.text(x + bw / 2, BY + 48, rng, FS_TINY, MUTED)
    x += bw + gap

# ── what the figure wants the reader to take away ───────────────────────────
c.note(70, BY + 80, 860, 114,
       ["The first two terms fall as the exposure ages; the third does not, and for",
        "most subjects it is the larger of the three. That separation is the subject",
        "of Section 5.8, and Figure 6 measures what it is worth."],
       title="Why three terms and not one", accent=MUTED)

p = c.save("model")
rasterise(p, H)
