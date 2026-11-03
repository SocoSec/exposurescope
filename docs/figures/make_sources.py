# -*- coding: utf-8 -*-
"""docs/figures/sources.svg - the source registry and the ingestion pipeline.

WHY IT WAS REBUILT
Legibility: the previous figure set its smallest text at 23 units on a
2400-unit canvas, which prints at 1.42 mm, or 4.0 pt, at 14.8 cm wide.

Scope: it also carried a third column showing what the user sees, and a
seven-stage pipeline described in the same detail as the sources. The report
column belongs to Section 6.3 and needs no figure; the per-stage detail is now
in Figure 9, which gives the shape of the record at each stage, and Figure 10,
which gives the order and the concurrency. What is left here is the thing
neither of those shows: which source answers which identifier type, what it
returns, and whether it needs a paid key.

Every row is read from lib/providers.js and lib/sources.js.
"""
from uml import (Canvas, INK, MUTED, HAIR, TEAL, GOLD, SLATE, WASH,
                 FS_BODY, FS_SMALL, FS_TINY, W, rasterise)

H = 1074
c = Canvas(H, "Exposio — sources and ingestion",
           "Five breach providers, one browser-side check, one bundled catalogue")

LX, LW = 300, 544          # the source column
RX, RW = 790, 372          # the pipeline column


def source(cy, name, detail, tag, accent):
    x, y = LX - LW / 2, cy - 44
    c.add(f'<rect x="{x}" y="{y}" width="{LW}" height="88" rx="5" fill="#FFFFFF" '
          f'stroke="{accent}" stroke-width="2.2"/>')
    c.text(x + 18, y + 34, name, FS_SMALL, INK, anchor="start", weight="600")
    c.text(x + 18, y + 64, detail, FS_TINY, MUTED, anchor="start")
    tw = len(tag) * 11 + 22
    c.add(f'<rect x="{x+LW-tw-14}" y="{y+14}" width="{tw}" height="28" rx="14" '
          f'fill="{WASH}" stroke="{accent}" stroke-width="1.5"/>')
    c.text(x + LW - tw / 2 - 14, y + 34, tag, FS_TINY, accent)


def group(y0, y1, label, accent):
    c.add(f'<rect x="{LX-LW/2-14}" y="{y0}" width="{LW+28}" height="{y1-y0}" rx="8" '
          f'fill="none" stroke="{accent}" stroke-width="1.8" stroke-dasharray="9 6"/>')
    c.text(LX - LW / 2 - 4, y0 + 26, label, FS_TINY, accent, anchor="start", weight="600")


def stage(cy, n, name, detail):
    x, y = RX - RW / 2, cy - 36
    c.add(f'<rect x="{x}" y="{y}" width="{RW}" height="72" rx="5" fill="#FFFFFF" '
          f'stroke="{TEAL}" stroke-width="2.2"/>')
    c.add(f'<circle cx="{x+30}" cy="{cy}" r="17" fill="{TEAL}"/>')
    c.text(x + 30, cy + 8, str(n), FS_TINY, "#FFFFFF", weight="600")
    c.text(x + 58, y + 30, name, FS_TINY, INK, anchor="start", weight="600")
    c.text(x + 58, y + 56, detail, FS_TINY, MUTED, anchor="start")


# ── the sources, grouped by what they cost and where they run ──────────────
group(128, 346, "«paid key required»", GOLD)
source(214, "Have I Been Pwned", "email · title, exact date, data classes", "key", GOLD)
source(310, "DeHashed", "email + phone · the only phone source", "key", GOLD)

group(364, 678, "«no key required»", TEAL)
source(450, "LeakCheck", "email · month-precision dates", "free", TEAL)
source(546, "XposedOrNot", "email · names only; coverage, not score", "free", TEAL)
source(642, "Hudson Rock", "email · infostealer infections", "free", TEAL)

group(696, 914, "«never reaches the server»", SLATE)
source(782, "Pwned Passwords", "password · first 5 hash characters only", "browser", SLATE)
source(878, "HIBP catalogue", "1,048 breaches · 1,328 aliases · bundled", "local", SLATE)

# ── the pipeline the answers pass through ───────────────────────────────────
c.text(RX, 118, "Per request, nothing retained", FS_TINY, MUTED, weight="600")
STAGES = [
    (170, 1, "Ownership gate", "code verified first"),
    (268, 2, "Parallel query", "all providers at once"),
    (366, 3, "Normalise", "fields to one vocabulary"),
    (464, 4, "Merge", "one record per breach"),
    (562, 5, "Enrich", "dates from the catalogue"),
    (660, 6, "Score", "two clocks"),
    (758, 7, "Report", "signed token, no writes"),
]
for cy, n, name, detail in STAGES:
    stage(cy, n, name, detail)
for a, b in zip(STAGES, STAGES[1:]):
    c.arrow([(RX, a[0] + 36), (RX, b[0] - 36)], width=2.0)

c.note(RX - RW / 2, 812, RW, 122,
       ["Each stage reads the previous",
        "one and writes nothing. The",
        "response ends the only copy."],
       title="Stateless by stage", accent=TEAL)

c.text(14, 968, "Email reaches all five providers; phone reaches DeHashed only.",
       FS_TINY, MUTED, anchor="start")
c.text(14, 996, "A password never leaves the browser.", FS_TINY, MUTED, anchor="start")
c.text(14, 1024, "Catalogue © Have I Been Pwned, CC BY 4.0. Exposio retains no breach "
                 "data of its own.", FS_TINY, MUTED, anchor="start")

p = c.save("sources")
rasterise(p, H)
