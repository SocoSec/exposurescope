# -*- coding: utf-8 -*-
"""docs/figures/state.svg - UML 2.5 state machine of an assessment session.

WHY THIS FIGURE EARNS ITS PLACE
Chapter 8 argues that zero storage is achieved by construction rather than by
policy. The sharpest form of that argument is this: the session plainly has
states, and the server keeps none of them. Each state is a signed token held by
the browser, and the server re-derives the current state from the signature on
every request. Drawing the machine makes the claim checkable - a reader can ask
where each state is kept, and the answer is the same for all four.

The transitions, guards and timeouts are taken from the implementation:
  lib/tokens.js                  TTL challenge 10 min, scan 15 min, report 60 min
  app/api/verify/check/route.js  tag match, kind match, 10 attempts per 15 min
  app/api/breach/route.js        token binds identifier and kind; 5 scans per hour
  app/api/chat/route.js          report token admits questions until it expires
"""
from uml import (Canvas, INK, MUTED, HAIR, TEAL, GOLD, SLATE, WASH,
                 FS_BODY, FS_SMALL, FS_TINY, W, rasterise)

H = 1404
c = Canvas(H, "Exposio — session state",
           "UML state machine: four states, none of them stored on the server")

A, B = 210, 800          # the two columns; the corridor between them carries
LBL = 330                # transition labels, and the right margin the timeouts


def state(cx, cy, w, h, name, held, rows=(), accent=TEAL):
    """A state: name compartment over an internal-activity compartment."""
    x, y = cx - w / 2, cy - h / 2
    c.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="22" fill="#FFFFFF" '
          f'stroke="{accent}" stroke-width="2.6"/>')
    c.text(cx, y + 40, name, FS_BODY, INK, weight="600")
    c.add(f'<path d="M{x+1},{y+56} L{x+w-1},{y+56}" stroke="{HAIR}" stroke-width="1.5"/>')
    c.text(cx, y + 84, held, FS_TINY, accent, style="italic")
    ty = y + 110
    for r in rows:
        c.text(cx, ty, r, FS_TINY, MUTED)
        ty += 24


def initial(cx, cy):
    c.add(f'<circle cx="{cx}" cy="{cy}" r="15" fill="{INK}"/>')


def final(cx, cy):
    c.add(f'<circle cx="{cx}" cy="{cy}" r="19" fill="none" stroke="{INK}" stroke-width="2.6"/>')
    c.add(f'<circle cx="{cx}" cy="{cy}" r="11" fill="{INK}"/>')


def label(rows, lx, ly, anchor="start"):
    for i, r in enumerate(rows):
        c.text(lx, ly + i * 24, r, FS_TINY, INK if i == 0 else MUTED, anchor=anchor)


def toploop(cx, top, w=92, h=68):
    """A transition whose source and target are the same state, drawn above it."""
    c.add(f'<path d="M{cx+w/2},{top} L{cx+w/2},{top-h} L{cx-w/2},{top-h} L{cx-w/2},{top-6}" '
          f'fill="none" stroke="{INK}" stroke-width="2.2" marker-end="url(#arrow)"/>')


# ── column A: the verification ladder ───────────────────────────
initial(A, 148)
c.arrow([(A, 166), (A, 196)], width=2.2)

state(A, 256, 210, 120, "Unverified", "no token", ["nothing issued"], accent=SLATE)
state(A, 548, 230, 168, "Challenged", "challenge token",
      ["10 min", "code sent", "bad code / retry"])
state(A, 844, 210, 144, "Verified", "scan token", ["15 min", "ownership proved"])

c.arrow([(A, 316), (A, 476)], width=2.2)
label(["POST /verify/start", "[within rate limits]", "/ sign challenge"], LBL, 360)

c.arrow([(A, 632), (A, 772)], width=2.2)
label(["POST /verify/check", "[tag and kind match]", "/ sign scan token"], LBL, 654)

# ── column B: the report and its end ──────────────────────────
state(B, 844, 230, 144, "Reported", "report token", ["60 min", "admits questions"])
state(B, 1120, 210, 120, "Expired", "token stale", ["re-verify to resume"], accent=GOLD)
final(B, 1278)

c.arrow([(315, 844), (685, 844)], width=2.2)
label(["POST /breach", "[token binds identifier]"], 500, 790, anchor="middle")

toploop(B, 772, w=96, h=66)
label(["POST /chat", "[under daily cap]"], B, 676, anchor="middle")

c.arrow([(B, 916), (B, 1060)], dash=True, width=2.1)
label(["after 60 min"], B + 18, 996)

c.arrow([(B, 1180), (B, 1259)], width=2.2)

# ── timeouts from column A converge on Expired ───────────────────
c.arrow([(325, 560), (655, 560), (655, 1096), (690, 1096)], dash=True, width=2.1)
label(["after 10 min"], 530, 540, anchor="middle")
c.arrow([(315, 892), (598, 892), (598, 1140), (690, 1140)], dash=True, width=2.1)
label(["after 15 min"], 440, 918)

# ── the point of the figure ────────────────────────────
c.note(36, 1000, 520, 282,
       ["Every state here is held by the browser as",
        "a signed token. No row of any kind is",
        "written on the server: it reads the state",
        "from the signature on each request, and",
        "forgets it when the response is sent.",
        "",
        "This is what Chapter 8 means by zero",
        "storage by construction. A session that is",
        "never written cannot be enumerated,",
        "exported or breached afterwards."],
       title="Where the state is kept", accent=TEAL)

c.legend(1334, [("initial", "initial"), ("state", "state"), ("transition", "sync"),
                ("timeout", "reply"), ("final", "final")])

p = c.save("state")
rasterise(p, H)
