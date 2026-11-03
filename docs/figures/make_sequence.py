# -*- coding: utf-8 -*-
"""docs/figures/sequence.svg - UML 2.5 sequence diagram of the three-step
ownership-verification protocol and the scan it authorises.

WHY THIS FIGURE EARNS ITS PLACE
Figure 5 is an activity diagram: it shows control flow and decisions, but it
flattens who holds what and when. Both reviewers questioned whether the tool
could establish that a requester owns the identifier being searched, and the
answer is a protocol rather than a component, so it needs the notation built
for protocols. The figure also makes two properties legible that prose states
only in passing: the verification code never travels inside the token the
browser holds, and the provider calls are concurrent rather than sequential,
which is what Section 7.4 then measures.

Every message is taken from the route handlers:
  app/api/verify/start/route.js   rate limits, code delivery, challenge token
  app/api/verify/check/route.js   tag recomputation, scan token
  app/api/breach/route.js         token binding, queryAll, merge, enrich, score
  lib/tokens.js                   TTL = challenge 10 min, scan 15, report 60
"""
from uml import (Canvas, INK, MUTED, HAIR, TEAL, GOLD, SLATE, WASH,
                 FS_BODY, FS_SMALL, FS_TINY, W, rasterise)

H = 1326
c = Canvas(H, "Exposio — ownership verification and scan",
           "UML sequence diagram: three signed tokens, no server-side session")

TOP, BOT = 108, 1240

LIFELINES = [
    ("User", 78, 0, SLATE, True),
    (":Browser", 258, 150, SLATE, False),
    (":EdgeAPI", 470, 168, TEAL, False),
    (":Delivery", 690, 150, GOLD, False),
    (":Provider", 890, 158, GOLD, False),
]
X = {name: x for name, x, _, _, _ in LIFELINES}


def head(name, x, w, accent, actor):
    if actor:
        c.add(f'<circle cx="{x}" cy="{TOP+22}" r="13" fill="none" stroke="{accent}" stroke-width="2.4"/>')
        c.add(f'<path d="M{x},{TOP+35} L{x},{TOP+66} M{x-17},{TOP+47} L{x+17},{TOP+47} '
              f'M{x},{TOP+66} L{x-13},{TOP+88} M{x},{TOP+66} L{x+13},{TOP+88}" '
              f'fill="none" stroke="{accent}" stroke-width="2.4"/>')
        c.text(x, TOP + 112, name, FS_SMALL, INK, weight="600")
        top = TOP + 124
    else:
        c.add(f'<rect x="{x-w/2}" y="{TOP+30}" width="{w}" height="52" rx="4" fill="{WASH}" '
              f'stroke="{accent}" stroke-width="2.4"/>')
        c.text(x, TOP + 63, name, FS_SMALL, INK, weight="600")
        top = TOP + 82
    c.add(f'<path d="M{x},{top} L{x},{BOT}" stroke="{MUTED}" stroke-width="1.8" '
          f'stroke-dasharray="7 6"/>')


for n, x, w, a, act in LIFELINES:
    head(n, x, w, a, act)


def bar(x, y0, y1, accent=TEAL):
    """Execution occurrence."""
    c.add(f'<rect x="{x-9}" y="{y0}" width="18" height="{y1-y0}" fill="#FFFFFF" '
          f'stroke="{accent}" stroke-width="2"/>')


def msg(y, a, b, label, reply=False, note=None):
    x0, x1 = X[a], X[b]
    d = 9 if x1 > x0 else -9
    c.arrow([(x0 + d, y), (x1 - d, y)], dash=reply, marker="open" if reply else "arrow", width=2.1)
    c.text((x0 + x1) / 2, y - 12, label, FS_TINY, INK if not reply else MUTED)
    if note:
        c.text((x0 + x1) / 2, y + 22, note, FS_TINY, MUTED, style="italic")


def selfmsg(y, a, label, h=44):
    x = X[a]
    c.add(f'<path d="M{x+9},{y} L{x+78},{y} L{x+78},{y+h} L{x+11},{y+h}" fill="none" '
          f'stroke="{INK}" stroke-width="2.1" marker-end="url(#arrow)"/>')
    c.text(x + 90, y + h / 2 + 6, label, FS_TINY, MUTED, anchor="start")


# ── step 1: prove the identifier can be reached ──────────────────
c.text(40, 262, "1", FS_BODY, MUTED, anchor="start", weight="600")
msg(276, "User", ":Browser", "identifier")
bar(X[":Browser"], 276, 1216, SLATE)
msg(322, ":Browser", ":EdgeAPI", "POST /verify/start")
bar(X[":EdgeAPI"], 322, 430)
selfmsg(348, ":EdgeAPI", "rate limits checked")
msg(430, ":EdgeAPI", ":Delivery", "six-digit code")
bar(X[":Delivery"], 430, 476, GOLD)
msg(468, ":Delivery", "User", "code, out of band")
msg(516, ":EdgeAPI", ":Browser", "challenge token · 10 min", reply=True)

c.note(622, 538, 354, 112,
       ["The token carries a keyed tag of",
        "the code, never the code itself."],
       title="What the browser holds", accent=TEAL)

# ── step 2: prove the requester read it ───────────────────────
c.text(40, 650, "2", FS_BODY, MUTED, anchor="start", weight="600")
msg(664, "User", ":Browser", "code")
msg(706, ":Browser", ":EdgeAPI", "POST /verify/check")
bar(X[":EdgeAPI"], 706, 820)
selfmsg(732, ":EdgeAPI", "recompute tag, compare")
msg(820, ":EdgeAPI", ":Browser", "scan token · 15 min", reply=True)

# ── step 3: the scan the token authorises ────────────────────
c.text(40, 866, "3", FS_BODY, MUTED, anchor="start", weight="600")
msg(880, ":Browser", ":EdgeAPI", "POST /breach + scan token")
bar(X[":EdgeAPI"], 880, 1216)
selfmsg(906, ":EdgeAPI", "token must bind identifier")

c.frame(372, 972, 604, 126, "par", "five providers")
msg(1026, ":EdgeAPI", ":Provider", "lookup")
bar(X[":Provider"], 1026, 1080, GOLD)
msg(1068, ":Provider", ":EdgeAPI", "hits, or a named failure", reply=True)

selfmsg(1114, ":EdgeAPI", "merge, resolve dates, score")
msg(1196, ":EdgeAPI", ":Browser", "report + report token · 60 min", reply=True)

c.legend(1256, [("lifeline", "lifeline"), ("call", "sync"), ("reply", "reply"),
                ("execution", "box"), ("fragment", "frame")])

p = c.save("sequence")
rasterise(p, H)
