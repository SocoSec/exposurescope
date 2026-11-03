# -*- coding: utf-8 -*-
"""docs/figures/deployment.svg - UML 2.5 deployment diagram.

WHY THIS FIGURE EARNS ITS PLACE
The thesis argues throughout that zero storage is an architectural property
rather than a policy promise. A deployment diagram is the one notation in which
that argument can be shown instead of asserted: a reader looks for the database
node and there is not one. Everything the server knows between requests is
carried by the browser in a signed token, and the only stateful external node
holds integer counters under keyed hashes that expire with their window.

Node contents are read from the repository, not invented:
  runtimes      app/api/*/route.js      -> export const runtime = "edge"
  providers     lib/providers.js        -> PROVIDERS, five rows
  counters      lib/ratelimit.js        -> Upstash REST, in-memory fallback
  model         lib/config.js           -> ANTHROPIC_MODEL, default haiku
  catalogue     lib/breach-index.json   -> bundled with the deployment
"""
from uml import (Canvas, INK, MUTED, HAIR, TEAL, GOLD, SLATE, WASH,
                 FS_BODY, FS_SMALL, FS_TINY, W, rasterise)

H = 1262
c = Canvas(H, "Exposio — deployment",
           "UML deployment diagram: execution environments, artefacts, and the absent data store")


def node(cx, cy, w, h, title, stereo, arts=(), rows=(), accent=INK, depth=15):
    """A UML node: 3-D box, stereotype, name, then the artefacts deployed on it."""
    x, y = cx - w / 2, cy - h / 2
    c.add(f'<path d="M{x},{y} L{x+depth},{y-depth} L{x+w+depth},{y-depth} '
          f'L{x+w+depth},{y+h-depth} L{x+w},{y+h} Z" fill="{WASH}" stroke="{accent}" stroke-width="2"/>')
    c.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FFFFFF" '
          f'stroke="{accent}" stroke-width="2.4"/>')
    c.text(cx, y + 28, stereo, FS_TINY, MUTED)
    c.text(cx, y + 56, title, FS_BODY, INK, weight="600")
    c.add(f'<path d="M{x+12},{y+70} L{x+w-12},{y+70}" stroke="{HAIR}" stroke-width="1.4"/>')
    ty = y + 100
    for a in arts:
        bw = w - 44
        c.add(f'<rect x="{cx-bw/2}" y="{ty-19}" width="{bw}" height="30" rx="4" '
              f'fill="#FFFFFF" stroke="{accent}" stroke-width="1.6"/>')
        c.add(f'<rect x="{cx+bw/2-26}" y="{ty-14}" width="15" height="12" fill="none" '
              f'stroke="{accent}" stroke-width="1.3"/>')
        c.text(cx - 11, ty + 2, a, FS_TINY, INK)
        ty += 38
    for r in rows:
        c.text(cx, ty, r, FS_TINY, MUTED)
        ty += 26


def link(p0, p1, label=None, lx=None, ly=None, dash=False, anchor="middle"):
    c.arrow([p0, p1], dash=dash, marker="open", width=1.9)
    if label:
        c.text(lx, ly, label, FS_TINY, MUTED, anchor=anchor)


# ── client: holds every session state, because the server holds none ────
node(258, 205, 420, 180, "User's browser", "«device»",
     arts=["exposio-spa (React 18)", "three signed tokens"],
     rows=["session state lives here"], accent=SLATE)

# ── edge tier ───────────────────────────────────────────
node(290, 590, 480, 332, "Vercel Edge Runtime", "«execution environment»",
     arts=["/api/verify/start", "/api/verify/check", "/api/breach", "/api/chat",
           "breach-index.json"],
     rows=["stateless; no writes"], accent=TEAL)

# ── the only stateful node, and it stores no personal data ──────────
node(790, 540, 360, 185, "Upstash Redis", "«execution environment»",
     arts=["counter per keyed hash"],
     rows=["integers, TTL-bounded", "memory fallback if down"], accent=GOLD)

# ── external services ──────────────────────────────────
node(185, 1040, 320, 175, "Delivery", "«external»",
     arts=["Resend · email code", "Twilio · SMS code"], accent=GOLD)

node(520, 1040, 300, 175, "Breach sources", "«external»",
     arts=["HIBP · DeHashed", "3 keyless providers"], accent=GOLD)

node(838, 1040, 268, 175, "Anthropic", "«external»",
     arts=["claude-haiku-4-5"],
     rows=["fixed tool set only"], accent=GOLD)

# ── communication paths ───────────────────────────────
# the browser speaks only to the edge; nothing else is reachable from it
c.arrow([(205, 295), (205, 412)], marker="open", width=1.9)
c.text(190, 362, "POST", FS_TINY, MUTED, anchor="end")
c.arrow([(320, 412), (320, 295)], marker="open", width=1.9, dash=True)
c.text(336, 362, "signed token", FS_TINY, MUTED, anchor="start")

link((530, 556), (605, 545), "REST", 580, 512)
link((190, 760), (185, 950), "API", 152, 862)
link((330, 760), (470, 950), "concurrent", 296, 900, anchor="start")
link((470, 757), (795, 950), "tool call", 640, 838, anchor="start")

# ── the point of the figure ────────────────────────────
c.note(600, 118, 380, 300,
       ["No database node appears",
        "here, and that is the claim",
        "of Chapter 8 in notation.",
        "",
        "Redis holds integers under",
        "keyed hashes, never data.",
        "",
        "Session state lives in the",
        "browser as signed tokens;",
        "the server re-derives it from",
        "the signature each request."],
       title="No persistence node", accent=TEAL)

c.legend(1180, [("node", "node"), ("artefact", "box"), ("path", "sync"),
                ("token", "reply"), ("note", "note")])

p = c.save("deployment")
rasterise(p, H)
