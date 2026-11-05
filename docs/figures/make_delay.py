# -*- coding: utf-8 -*-
"""docs/figures/delay.svg - how long an individual waits to be told.

WHY THIS FIGURE EXISTS
The thesis argues that an individual needs a measurement of their own
exposure rather than an assurance that somebody is watching the problem. The
strongest evidence for that is the delay between a breach happening and the
people in it being told, and the thesis did not show it.

Every figure here is from Xu and Nguyen (2025), Variance vol. 18, a
peer-reviewed study of 2,123 breach notification reports filed with the
California Attorney General between January 2012 and December 2020. It is
used in preference to the industry reports that dominate this statistic
because the paper is peer-reviewed, states its sample, and separates the two
intervals that industry summaries routinely conflate.

The mean and the median are both drawn because the gap between them IS the
finding: the distributions are heavily right-skewed, and an average describes
almost no real case. The longest single identification interval in the sample
is 3,140 days - more than eight and a half years.
"""
from uml import (Canvas, INK, MUTED, HAIR, TEAL, GOLD, SLATE, WASH,
                 FS_BODY, FS_SMALL, FS_TINY, W, rasterise)

# Xu & Nguyen 2025, Variance 18, Table 1. Days.
TTI_MED, TTI_MEAN, TTI_MAX = 20, 101.8, 3140      # occurrence  -> identification
ITN_MED, ITN_MEAN, ITN_MAX = 44, 62.01, 539       # identification -> notification
TTN_MED, TTN_MEAN = 102, 189.8                    # occurrence  -> notification

H = 712
c = Canvas(H, "How long before the people in a breach are told",
           "2,123 breach reports filed in California, 2012–2020 · Xu and Nguyen (2025)")

X0, X1 = 150, 762                                 # bars; the right is kept for totals
SCALE = (X1 - X0) / TTN_MEAN

# ── legend, so the bars need no labels of their own ──
LY = 128
for dx, colour, label in ((0, GOLD, "breach occurs → company notices"),
                          (396, TEAL, "company notices → people told")):
    c.add(f'<rect x="{150+dx}" y="{LY-13}" width="26" height="22" rx="4" fill="{colour}" '
          f'fill-opacity="0.18" stroke="{colour}" stroke-width="2"/>')
    c.text(150 + dx + 36, LY + 5, label, FS_TINY, MUTED, anchor="start")


def row(y, label, a, b, total):
    """One statistic: two intervals to scale, values above, total at the right."""
    c.text(X0 - 18, y + 8, label, FS_SMALL, INK, anchor="end", weight="600")
    x = X0
    for days, colour in ((a, GOLD), (b, TEAL)):
        w = days * SCALE
        c.add(f'<rect x="{x}" y="{y-18}" width="{w}" height="36" rx="5" fill="{colour}" '
              f'fill-opacity="0.18" stroke="{colour}" stroke-width="2"/>')
        c.text(x + w / 2, y - 28, f"{days:g}", FS_TINY, INK, weight="600")
        x += w
    c.text(X1 + 22, y + 8, f"{total:g} days in all", FS_TINY, INK, anchor="start", weight="600")


row(230, "median", TTI_MED, ITN_MED, TTN_MED)
row(330, "mean", TTI_MEAN, ITN_MEAN, TTN_MEAN)

# ── axis ──
AX = 392
c.add(f'<path d="M{X0},{AX} L{X1},{AX}" stroke="{MUTED}" stroke-width="2"/>')
for days in (0, 30, 60, 90, 120, 150, 180):
    x = X0 + days * SCALE
    c.add(f'<path d="M{x},{AX} L{x},{AX+8}" stroke="{MUTED}" stroke-width="1.6"/>')
    c.text(x, AX + 32, str(days), FS_TINY, MUTED)
c.text((X0 + X1) / 2, AX + 60, "days after the breach occurred", FS_TINY, MUTED, style="italic")

c.note(92, AX + 86, 816, 178,
       ["Half of all breaches took more than 20 days merely to be noticed, and the mean is",
        "101.8, because the distribution has a long tail: the slowest single case in the sample",
        "took 3,140 days to identify. Someone waiting to be notified is therefore exposed for",
        "months in the median case and years in the tail, which is the condition this thesis",
        "designs for."],
       title="Why an individual cannot wait to be told", accent=MUTED)

p = c.save("delay")
rasterise(p, H)
