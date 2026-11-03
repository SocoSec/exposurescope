# -*- coding: utf-8 -*-
"""docs/figures/workflow.svg - UML 2.5 activity diagram, rebuilt.

WHY IT WAS REBUILT
The previous version was 1000 x 1790 units, an aspect ratio of 1.79. The
thesis text area is 14.8 x 23.2 cm, an aspect ratio of 1.57, so the figure
could not be both full width and fit on the page: placed at a width that fit,
its smallest text printed at 6.2 pt, and placed at a legible width it ran
1.15 cm off the bottom of the paper and was cut off.

The fix is not to shrink it further but to give it less to say. When it was
drawn it was the only process figure in the thesis. It no longer is: Figure 8
gives the ingestion stages, Figure 9 the shape of the record at each stage,
and Figure 10 the message order and the concurrency. What none of those shows,
and what an activity diagram is the right notation for, is the DECISION
structure: the two points at which the flow can stop, and what happens on each
failing branch. That is what this figure now shows, and nothing else.

NOTATION (UML 2.5 activity diagram)
  filled circle        initial node
  rounded rectangle    action
  diamond              decision
  thick bar            fork / join
  dashed rounded rect  expansion region, concurrent mode
  circle with cross    flow final: this path stops, the activity does not
  bullseye             activity final
Partitions are the three tiers used throughout the thesis.
"""
from uml import (Canvas, INK, MUTED, HAIR, TEAL, GOLD, SLATE, WASH,
                 FS_BODY, FS_LANE, FS_SMALL, FS_TINY, W, rasterise)

H = 1444
c = Canvas(H, "Exposio — request lifecycle",
           "UML activity diagram, partitioned by tier: where the flow can stop, and why")

TOP, BOT = 108, 1316
LANES = [(14, 330, "Client (browser)", SLATE),
         (344, 652, "Application (edge)", TEAL),
         (666, 986, "External services", GOLD)]
CA, CB, CC = 172, 498, 826

for i, (x0, x1, name, acc) in enumerate(LANES):
    c.add(f'<rect x="{x0}" y="{TOP}" width="{x1-x0}" height="{BOT-TOP}" '
          f'fill="{"#FFFFFF" if i != 1 else WASH}" stroke="{HAIR}" stroke-width="1.6"/>')
    c.add(f'<rect x="{x0}" y="{TOP}" width="{x1-x0}" height="48" fill="{acc}"/>')
    c.text((x0 + x1) / 2, TOP + 32, name, FS_TINY, "#FFFFFF", weight="600")


def action(cx, cy, rows, accent=INK, w=276, h=72):
    c.add(f'<rect x="{cx-w/2}" y="{cy-h/2}" width="{w}" height="{h}" rx="10" fill="#FFFFFF" '
          f'stroke="{accent}" stroke-width="2.3"/>')
    c.lines(cx, cy, rows, FS_TINY)


def decision(cx, cy, rows, w=250, h=112):
    c.add(f'<path d="M{cx},{cy-h/2} L{cx+w/2},{cy} L{cx},{cy+h/2} L{cx-w/2},{cy} Z" '
          f'fill="#FFFFFF" stroke="{INK}" stroke-width="2.3"/>')
    c.lines(cx, cy, rows, FS_TINY)


def bar(cx, cy, w=290):
    c.add(f'<rect x="{cx-w/2}" y="{cy-7}" width="{w}" height="14" rx="3" fill="{INK}"/>')


def initial(cx, cy):
    c.add(f'<circle cx="{cx}" cy="{cy}" r="15" fill="{INK}"/>')


def final(cx, cy):
    c.add(f'<circle cx="{cx}" cy="{cy}" r="18" fill="none" stroke="{INK}" stroke-width="2.6"/>')
    c.add(f'<circle cx="{cx}" cy="{cy}" r="10" fill="{INK}"/>')


def flow_final(cx, cy, r=17):
    c.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#FFFFFF" stroke="{INK}" stroke-width="2.4"/>')
    d = r * 0.52
    c.add(f'<path d="M{cx-d},{cy-d} L{cx+d},{cy+d} M{cx+d},{cy-d} L{cx-d},{cy+d}" '
          f'stroke="{INK}" stroke-width="2.4"/>')


def flow(pts, label=None, lx=None, ly=None, anchor="middle"):
    c.arrow(pts, width=2.2)
    if label:
        c.text(lx, ly, label, FS_TINY, MUTED, anchor=anchor)


# ── A. the ownership gate: the first place the flow can stop ───────────────
initial(CA, 206)
action(CA, 284, ["Enter identifier"], SLATE)
flow([(CA, 221), (CA, 248)])

action(CB, 284, ["Verify ownership"], TEAL)
flow([(CA + 138, 284), (CB - 138, 284)])

decision(CB, 410, ["Code valid?"], w=200)
flow([(CB, 320), (CB, 354)])

flow_final(CB + 128, 410)
flow([(CB + 100, 410), (CB + 111, 410)], "no", CB + 106, 388)

action(CB, 540, ["Issue scan token"], TEAL)
flow([(CB, 466), (CB, 504)], "yes", CB + 22, 492, anchor="start")

# ── B. the lookup: concurrent, and tolerant of one source failing ──────────
bar(CB, 622)
flow([(CB, 576), (CB, 615)])

ex, ey, ew, eh = CC - 148, 664, 296, 134
c.add(f'<rect x="{ex}" y="{ey}" width="{ew}" height="{eh}" rx="14" fill="#FFFFFF" '
      f'stroke="{GOLD}" stroke-width="2.2" stroke-dasharray="8 5"/>')
c.text(CC, ey + 30, "«concurrent»", FS_TINY, GOLD, style="italic")
action(CC, ey + 88, ["Query provider"], GOLD, w=248, h=62)
flow([(CB + 145, 622), (CC, 622), (CC, ey - 6)])

bar(CB, 846)
flow([(CC, ey + eh), (CC, 846), (CB + 145, 846)])

decision(CB, 952, ["Any source", "answered?"], w=240)
flow([(CB, 853), (CB, 896)])

action(CA, 952, ["Report “not checked”"], SLATE)
flow([(CB - 120, 952), (CA + 138, 952)], "no", CA + 196, 934)

action(CB, 1080, ["Merge, enrich, score"], TEAL)
flow([(CB, 1008), (CB, 1044)], "yes", CB + 22, 1032, anchor="start")

# ── C. advice, bounded, then the report the person reads ───────────────────
action(CB, 1190, ["Bounded advisory loop"], TEAL)
flow([(CB, 1116), (CB, 1154)])

action(CC, 1190, ["Language model"], GOLD)
flow([(CB + 138, 1178), (CC - 138, 1178)])
flow([(CC - 138, 1204), (CB + 138, 1204)])

action(CA, 1190, ["Read the report"], SLATE)
flow([(CB - 138, 1190), (CA + 138, 1190)])

final(CA, 1278)
flow([(CA, 1226), (CA, 1256)])

# the note sits in the empty part of the external lane, not under the legend
c.note(678, 936, 296, 128,
       ["A failed source is named",
        "in the report, never as",
        "an absence of breaches."],
       title="The second decision", accent=TEAL)

c.legend(1340, [("initial", "initial"), ("action", "box"), ("decision", "diamond"),
                ("fork / join", "bar"), ("flow stops", "x"), ("final", "final")])

p = c.save("workflow")
rasterise(p, H)
