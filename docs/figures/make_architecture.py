# -*- coding: utf-8 -*-
"""docs/figures/architecture.svg - UML 2.5 component diagram, rebuilt.

WHY IT WAS REBUILT
Three faults.

Legibility: the previous figure set its smallest text at 13.5 units on a
2200-unit canvas. Placed 14.8 cm wide that prints at 0.91 mm, which is 2.6 pt.
Nothing below 22 units on a 1000-unit canvas is allowed here, so the smallest
text prints at 9.4 pt.

Notation: the previous figure was an annotated infographic with about ninety
text elements, a numbered walkthrough and three prose panels. None of that is
component notation, and the walkthrough duplicates the activity diagram.

Overlap: with a deployment diagram now at Figure 7, the two were saying the
same thing twice. The division adopted is the conventional one. This figure
gives the logical structure, which is what Chapter 4 describes: which
components exist and which depends on which. Figure 7 gives the physical
view, which is where those components run.

Components are the modules actually present in the repository: the four route
handlers under app/api, and the pure modules under lib that they call.
"""
from uml import (Canvas, INK, MUTED, HAIR, TEAL, GOLD, SLATE, WASH,
                 FS_BODY, FS_SMALL, FS_TINY, W, rasterise)

H = 1286
c = Canvas(H, "Exposio — component structure",
           "UML component diagram: the three tiers, and what each component depends on")


def tier(x0, y0, x1, y1, label, accent):
    c.add(f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" rx="8" fill="none" '
          f'stroke="{accent}" stroke-width="2" stroke-dasharray="9 6"/>')
    c.text(x0 + 14, y0 + 26, label, FS_TINY, accent, anchor="start", weight="600")


def comp(cx, cy, w, h, name, rows=(), accent=INK, stereo=True):
    """A component: rectangle with the UML component icon in its top-right."""
    x, y = cx - w / 2, cy - h / 2
    c.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="#FFFFFF" '
          f'stroke="{accent}" stroke-width="2.3"/>')
    if stereo:
        ix, iy = x + w - 34, y + 13
        c.add(f'<rect x="{ix}" y="{iy}" width="22" height="16" fill="#FFFFFF" '
              f'stroke="{accent}" stroke-width="1.6"/>')
        for dy in (3, 9):
            c.add(f'<rect x="{ix-6}" y="{iy+dy}" width="10" height="5" fill="#FFFFFF" '
                  f'stroke="{accent}" stroke-width="1.4"/>')
    c.text(cx, y + 34, name, FS_SMALL, INK, weight="600")
    ty = y + 60
    for r in rows:
        c.text(cx, ty, r, FS_TINY, MUTED)
        ty += 25


def dep(p0, p1, label=None, lx=None, ly=None, anchor="start"):
    """A «use» dependency: dashed line, open arrowhead."""
    c.arrow(p0 if isinstance(p0, list) else [p0, p1], dash=True, marker="open", width=2.0)
    if label:
        c.text(lx, ly, label, FS_TINY, MUTED, anchor=anchor)


# ── tier 1: the client ──────────────────────────────────────────────────────
tier(36, 140, 566, 318, "«client tier»", SLATE)
comp(301, 236, 450, 120, "exposio-spa", accent=SLATE,
     rows=["React 18 · holds the three tokens", "hashes a password locally"])

# ── tier 2: the stateless route handlers ────────────────────────────────────
tier(36, 348, 566, 792, "«application tier»  stateless", TEAL)
ROUTES = [
    (438, "/api/verify/start", "sends a one-time code"),
    (538, "/api/verify/check", "returns the scan token"),
    (638, "/api/breach", "looks up, merges, scores"),
    (730, "/api/chat", "bounded advisory loop"),
]
for cy, name, sub in ROUTES:
    comp(301, cy, 450, 78, name, [sub], accent=TEAL)

# ── tier 3: the pure modules ────────────────────────────────────────────────
tier(36, 822, 566, 1164, "«pure modules»  no network, no storage", INK)
MODS = [
    (170, 898, "tokens.js", "sign and verify"),
    (432, 898, "providers.js", "registry, parallel"),
    (170, 998, "sources.js", "normalise, merge"),
    (432, 998, "enrich.js", "resolve dates"),
    (170, 1098, "score.js", "two clocks"),
    (432, 1098, "agent.js", "bounded tool loop"),
]
for cx, cy, name, sub in MODS:
    comp(cx, cy, 240, 78, name, [sub], accent=INK)

dep((301, 296), (301, 398), "calls", 316, 328)
dep((301, 770), (301, 872), "«use»", 316, 806)

# ── external services ───────────────────────────────────────────────────────
EXT = [
    (232, "Pwned Passwords", "k-anonymity range query", GOLD),
    (392, "Delivery", "Resend · Twilio", GOLD),
    (552, "Breach sources", "HIBP · DeHashed · 3 keyless", GOLD),
    (712, "Anthropic API", "claude-haiku-4-5", GOLD),
    (872, "Upstash Redis", "counters only, TTL-bounded", GOLD),
]
for cy, name, sub, acc in EXT:
    comp(790, cy, 372, 94, name, [sub], accent=acc)

# the password path leaves the browser and never touches the application tier
c.arrow([(526, 236), (604, 232)], dash=True, marker="open", width=2.0)
c.text(566, 128, "5-character hash prefix only", FS_TINY, GOLD, anchor="middle")

dep((526, 438), (604, 392))
dep((526, 638), (604, 552))
dep((526, 730), (604, 712))
dep((566, 772), (604, 842))

c.note(600, 950, 376, 214,
       ["The client reaches one external",
        "service directly: a password is",
        "hashed on the device and only",
        "a five-character prefix leaves.",
        "",
        "Every other call is made by the",
        "application tier, never by the",
        "browser."],
       title="One path bypasses the server", accent=SLATE)

c.legend(1196, [("component", "box"), ("«use»", "reply"), ("tier", "frame"),
                ("note", "note")], pad=34)

p = c.save("architecture")
rasterise(p, H)
