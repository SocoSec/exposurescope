# -*- coding: utf-8 -*-
"""docs/figures/usecases.svg - UML 2.5 use case diagram, rebuilt.

WHY IT WAS REBUILT
Two faults, one of legibility and one of notation.

Legibility: the previous figure set its smallest text at 14.5 units on a
2280-unit canvas. Placed 14.8 cm wide in the thesis that prints at 0.94 mm,
which is 2.7 pt, and is not readable. The rule applied here is the one the
other figures use: nothing below 22 units on a 1000-unit canvas, so that the
smallest text prints at 9.4 pt.

Notation: the previous figure drew seventeen ellipses, and nine of them were
not use cases. "Apply rate limits", "Validate the signed token", "Send a
5-character hash prefix only", "Query the breach sources" and "Compute the
Breach Risk score" are internal steps, not goals an actor pursues, and UML
reserves the ellipse for the latter. Those steps are where they belong in the
activity, sequence and state diagrams (Figures 5, 10 and 11). What remains
here are the goals, plus the two relationships that are genuinely shared:
ownership proof, which both identifier checks include, and the GDPR letters,
which extend the action plan only when the subject chooses them.
"""
from uml import (Canvas, INK, MUTED, HAIR, TEAL, GOLD, SLATE, WASH,
                 FS_BODY, FS_SMALL, FS_TINY, W, rasterise)

H = 1214
c = Canvas(H, "Exposio — use cases",
           "UML use case diagram: one human actor; the supporting actors are systems")

BX0, BX1, BY0, BY1 = 180, 760, 150, 1048     # the system boundary
UX = 469                                      # the use-case column
UW = 440                                      # ellipse width; leaves a routing
ACT = 92                                      # corridor between it and BX1
SYS = 878


def actor(cx, cy, rows):
    c.add(f'<circle cx="{cx}" cy="{cy}" r="17" fill="none" stroke="{SLATE}" stroke-width="2.6"/>')
    c.add(f'<path d="M{cx},{cy+17} L{cx},{cy+58} M{cx-22},{cy+32} L{cx+22},{cy+32} '
          f'M{cx},{cy+58} L{cx-17},{cy+86} M{cx},{cy+58} L{cx+17},{cy+86}" '
          f'fill="none" stroke="{SLATE}" stroke-width="2.6"/>')
    y = cy + 118
    for i, r in enumerate(rows):
        c.text(cx, y, r, FS_SMALL if i == 0 else FS_TINY,
               INK if i == 0 else MUTED, weight="600" if i == 0 else "400")
        y += 26


def sysactor(cx, cy, rows):
    """A supporting actor drawn as a stereotyped rectangle, which UML permits
    and which keeps a non-human participant visually distinct from the person."""
    h = 54 + 26 * len(rows)
    c.add(f'<rect x="{cx-108}" y="{cy-h/2}" width="216" height="{h}" rx="5" fill="{WASH}" '
          f'stroke="{GOLD}" stroke-width="2.2"/>')
    c.text(cx, cy - h / 2 + 28, "«system»", FS_TINY, MUTED)
    y = cy - h / 2 + 56
    for r in rows:
        c.text(cx, y, r, FS_TINY, INK)
        y += 26


def usecase(cy, label, w, accent=TEAL):
    c.add(f'<ellipse cx="{UX}" cy="{cy}" rx="{w/2}" ry="35" fill="#FFFFFF" '
          f'stroke="{accent}" stroke-width="2.4"/>')
    c.text(UX, cy + 8, label, FS_TINY, INK)
    return cy


def line(p0, p1, dash=False, marker=None):
    if dash:
        c.arrow([p0, p1], dash=True, marker="open", width=1.9)
    else:
        d = "M" + " L".join(f"{x},{y}" for x, y in [p0, p1])
        c.add(f'<path d="{d}" fill="none" stroke="{SLATE}" stroke-width="1.9"/>')


# ── system boundary ──────────────────────────────────────
c.add(f'<rect x="{BX0}" y="{BY0}" width="{BX1-BX0}" height="{BY1-BY0}" rx="6" '
      f'fill="none" stroke="{INK}" stroke-width="2.4"/>')
c.text(UX, BY0 + 36, "Exposio", FS_BODY, INK, weight="600")

# ── the one human actor ─────────────────────────────────
actor(ACT, 520, ["The person", "(data subject)", "checking their", "own data"])

# ── use cases: goals, not steps ────────────────────────────
EMAIL, PHONE, OWN  = 250, 334, 418
PASSWORD           = 502
EXPLORE, PLAN      = 586, 670
GDPR               = 754
AGENT, SAVE, LANG  = 838, 922, 1006

usecase(EMAIL,    "Check an email address", UW)
usecase(PHONE,    "Check a phone number", UW)
usecase(OWN,      "Prove ownership of the identifier", UW, accent=SLATE)
usecase(PASSWORD, "Check a password", UW)
usecase(EXPLORE,  "Explore where the exposure comes from", UW)
usecase(PLAN,     "Work through the ranked action plan", UW)
usecase(GDPR,     "Draft GDPR Art. 15 and Art. 17 letters", UW, accent=GOLD)
usecase(AGENT,    "Ask the advisory agent", UW)
usecase(SAVE,     "Save or print the report", UW)
usecase(LANG,     "Read the report in six languages", UW)

# ── associations: the person pursues goals, never internal steps ──────
for cy in (EMAIL, PHONE, PASSWORD, EXPLORE, PLAN, AGENT, SAVE, LANG):
    line((ACT + 36, 520), (UX - UW/2 + 8, cy))

# ── include and extend, routed in the corridor on the right ─────────
# the stereotype labels are set vertically: the corridor is 71 units wide and
# horizontal text at 22 units would run past the system boundary
R = UX + UW / 2


def vlabel(x, y, t):
    c.add(f'<text transform="rotate(-90 {x} {y})" x="{x}" y="{y}" '
          f'font-family="Segoe UI, Calibri, Helvetica, Arial, sans-serif" '
          f'font-size="{FS_TINY}" fill="{MUTED}" text-anchor="middle">{c.esc(t)}</text>')


c.arrow([(R - 8, EMAIL), (R + 38, EMAIL), (R + 38, OWN), (R - 8, OWN)],
        dash=True, marker="open", width=1.9)
c.arrow([(R - 8, PHONE), (R + 20, PHONE), (R + 20, OWN - 12), (R - 8, OWN - 12)],
        dash=True, marker="open", width=1.9)
vlabel(R + 62, (EMAIL + OWN) / 2, "«include»")

c.arrow([(R - 8, GDPR), (R + 24, GDPR), (R + 24, PLAN), (R - 8, PLAN)],
        dash=True, marker="open", width=1.9)
vlabel(R + 62, (PLAN + GDPR) / 2, "«extend»")

# ── supporting actors, ordered to avoid crossings ─────────────────
sysactor(SYS, 250, ["Have I Been", "Pwned"])
sysactor(SYS, 390, ["DeHashed"])
sysactor(SYS, 530, ["Resend", "Twilio"])
sysactor(SYS, 670, ["Pwned", "Passwords"])
sysactor(SYS, 850, ["Anthropic API"])

for a, b in ((EMAIL, 250), (PHONE, 390), (OWN, 530), (PASSWORD, 670), (AGENT, 850)):
    line((BX1, a), (SYS - 108, b))

# ── legend ─────────────────────────────────────────────
ly = 1082
c.add(f'<rect x="14" y="{ly}" width="{W-28}" height="60" rx="8" fill="{WASH}" '
      f'stroke="{HAIR}" stroke-width="1.4"/>')
c.add(f'<ellipse cx="58" cy="{ly+30}" rx="30" ry="14" fill="#FFF" stroke="{TEAL}" stroke-width="2"/>')
c.text(96, ly + 38, "a goal the person has", FS_TINY, MUTED, anchor="start")
c.add(f'<path d="M352,{ly+30} L402,{ly+30}" stroke="{SLATE}" stroke-width="1.9"/>')
c.text(412, ly + 38, "association", FS_TINY, MUTED, anchor="start")
c.add(f'<path d="M576,{ly+30} L626,{ly+30}" stroke="{INK}" stroke-width="1.9" '
      f'stroke-dasharray="7 5" marker-end="url(#open)"/>')
c.text(636, ly + 38, "«include» / «extend»", FS_TINY, MUTED, anchor="start")

c.text(500, 1184, "Internal steps are not use cases; they appear in Figures 5, 10 and 11.",
       FS_TINY, MUTED)

p = c.save("usecases")
rasterise(p, H)
