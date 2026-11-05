# -*- coding: utf-8 -*-
"""docs/figures/twoprofiles.svg - two real breach histories, scored.

WHY THIS FIGURE EXISTS
Section 5.6 found that scoring a subject by their single worst breach
reproduces the full model almost exactly, and Section 5.10 answers it with a
synthetic corpus. This answers it with incidents that actually happened.

Both profiles contain exactly four breaches. A breach-notification service
reports the same thing for each: four breaches, pwned. The model separates
them by a factor of two, and - the part that matters to the person - says
that one of them can act and the other cannot.

The breach records are those Have I Been Pwned publishes for each incident.
The profiles are combinations of public records, not lookups of any
individual: no identifier appears here and none was queried, consistent with
the scope of Section 8.2.

Every number is produced by scripts/twoprofiles.mjs against lib/score.js.
"""
from uml import (Canvas, INK, MUTED, HAIR, TEAL, GOLD, SLATE, WASH,
                 FS_BODY, FS_SMALL, FS_TINY, W, rasterise)

CRED, PERM = GOLD, TEAL
RED = "#C2543B"
GREEN = "#2E9E6B"

H = 986
c = Canvas(H, "Two histories, four breaches each, and what separates them",
           "Breach records as Have I Been Pwned documents them · npm run twoprofiles")

COLS = [(258, "A"), (742, "B")]
BW = 452

PROFILES = [
    dict(x=258, score=28, band="Low", colour=GREEN,
         head="Four credential dumps",
         rows=[("Synthient list", "2025", "password", CRED),
               ("Collection #1", "2019", "password", CRED),
               ("kayo.moe list", "2018", "password", CRED),
               ("Exploit.In", "2016", "password", CRED)],
         cred="0.2227", ident="0.0000", perm_share="0%",
         after=5, floor=0,
         verdict="Everything here can be revoked."),
    dict(x=742, score=55, band="Medium", colour=RED,
         head="Identity-heavy",
         rows=[("TAP Air Portugal", "2022", "birth date, name, phone, address", PERM),
               ("MGM Resorts", "2019", "birth date, name, phone, address", PERM),
               ("Canva", "2019", "name, username, location", PERM),
               ("Lumin PDF", "2019", "name, username, gender", PERM)],
         cred="0.0058", ident="0.4310", perm_share="99%",
         after=54, floor=54,
         verdict="Almost nothing here can be revoked."),
]

for p in PROFILES:
    x = p["x"]
    # ── header ────────────────────────────────────────────────────────────
    c.add(f'<rect x="{x-BW/2}" y="118" width="{BW}" height="92" rx="10" '
          f'fill="{p["colour"]}" fill-opacity="0.12" stroke="{p["colour"]}" stroke-width="2.4"/>')
    c.text(x, 152, p["head"], FS_SMALL, INK, weight="600")
    c.text(x, 192, f"{p['score']}  ·  {p['band']}", 34, p["colour"], weight="600")

    # ── the four breaches ─────────────────────────────────────────────────
    y = 248
    c.text(x, y, "four breaches", FS_TINY, MUTED, style="italic")
    y += 26
    for name, year, what, colour in p["rows"]:
        c.add(f'<rect x="{x-BW/2}" y="{y}" width="{BW}" height="56" rx="6" '
              f'fill="#FFFFFF" stroke="{HAIR}" stroke-width="1.4"/>')
        c.add(f'<rect x="{x-BW/2}" y="{y}" width="6" height="56" rx="3" fill="{colour}"/>')
        c.text(x - BW / 2 + 22, y + 24, f"{name}  ({year})", FS_TINY, INK,
               anchor="start", weight="600")
        c.text(x - BW / 2 + 22, y + 45, what, FS_TINY, MUTED, anchor="start")
        y += 62

    # ── the terms ─────────────────────────────────────────────────────────
    y += 10
    c.add(f'<rect x="{x-BW/2}" y="{y}" width="{BW}" height="112" rx="8" '
          f'fill="{WASH}" stroke="{HAIR}" stroke-width="1.4"/>')
    c.text(x - BW / 2 + 22, y + 32, "revocable term", FS_TINY, MUTED, anchor="start")
    c.text(x + BW / 2 - 22, y + 32, p["cred"], FS_TINY, INK, anchor="end", weight="600")
    c.text(x - BW / 2 + 22, y + 62, "permanent term", FS_TINY, MUTED, anchor="start")
    c.text(x + BW / 2 - 22, y + 62, p["ident"], FS_TINY, INK, anchor="end", weight="600")
    c.text(x - BW / 2 + 22, y + 92, "permanent share of score", FS_TINY, MUTED, anchor="start")
    c.text(x + BW / 2 - 22, y + 92, p["perm_share"], FS_TINY, p["colour"],
           anchor="end", weight="600")

    # ── what remediation achieves ─────────────────────────────────────────
    y += 136
    c.text(x, y, "after completing every action offered", FS_TINY, MUTED, style="italic")
    y += 34
    c.text(x - 56, y, str(p["score"]), 30, MUTED, weight="600")
    c.arrow([(x - 24, y - 10), (x + 18, y - 10)], width=2.2)
    c.text(x + 54, y, str(p["after"]), 30, p["colour"], weight="600")
    c.text(x, y + 30, f"floor {p['floor']}", FS_TINY, MUTED)
    c.text(x, y + 58, p["verdict"], FS_TINY, INK, weight="600")

c.add(f'<path d="M500,118 L500,806" stroke="{HAIR}" stroke-width="1.4" stroke-dasharray="6 6"/>')

c.note(70, 826, 860, 138,
       ["A breach-notification service reports the same thing for both: four breaches, pwned.",
        "The model separates them by a factor of two, and says which of the two people can do",
        "anything about it. Profile B's floor of 54 is not a modelling choice; it is the arithmetic",
        "of a date of birth, a nationality and an address that no action withdraws."],
       title="Why the count is not the answer", accent=MUTED)

p = c.save("twoprofiles")
rasterise(p, H)
