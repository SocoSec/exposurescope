# -*- coding: utf-8 -*-
"""docs/figures/domain.svg - UML 2.5 class diagram of the transient domain model.

WHY THIS FIGURE EARNS ITS PLACE
A conventional thesis would put a database schema here. This system has none,
so the equivalent artefact is the set of objects that exist in memory for the
duration of one request and are discarded with the response. Table 7 traces a
single identifier through those objects; this figure gives their structure, so
that the trace can be read against a type rather than against prose.

It also carries a point the prose makes twice and the notation makes once: the
shape changes at every stage. Four providers answer in four shapes, the merge
produces one, the catalogue supplies a date the providers did not, and only
then does scoring attach a number. Every class is stereotyped «transient»,
which is the whole argument of Chapter 8 restated as a type property.

Field names are taken from the implementation:
  lib/providers.js   PROVIDERS rows: name, kinds, keyed, run
  lib/sources.js     merged record: { title, key, date, dataClasses, sources }
  lib/enrich.js      catalogueEntry, datesResolved, flagged
  lib/score.js       scored breach and the report returned by emailReport()
"""
from uml import (Canvas, INK, MUTED, HAIR, TEAL, GOLD, SLATE, WASH,
                 FS_BODY, FS_SMALL, FS_TINY, W, rasterise)

H = 1360
c = Canvas(H, "Exposio — transient domain model",
           "UML class diagram: the objects a request creates, and discards with its response")


def cls(cx, cy, w, name, stereo, attrs, accent=TEAL, note=None):
    """A class: stereotype and name compartment over an attribute compartment."""
    head = 76 if stereo else 48
    h = head + 28 * len(attrs) + 14 + (26 if note else 0)
    x, y = cx - w / 2, cy - h / 2
    c.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#FFFFFF" '
          f'stroke="{accent}" stroke-width="2.4"/>')
    if stereo:
        c.text(cx, y + 30, stereo, FS_TINY, MUTED)
        c.text(cx, y + 60, name, FS_BODY, INK, weight="600")
    else:
        c.text(cx, y + 34, name, FS_BODY, INK, weight="600")
    c.add(f'<path d="M{x},{y+head} L{x+w},{y+head}" stroke="{accent}" stroke-width="2"/>')
    ty = y + head + 26
    for a in attrs:
        c.text(x + 16, ty, a, FS_TINY, INK, anchor="start")
        ty += 28
    if note:
        c.text(cx, ty + 2, note, FS_TINY, MUTED, style="italic")
    return x, y, w, h


def assoc(p0, p1, label, lx, ly, mult=None, mx=None, my=None, anchor="middle", dash=False):
    c.arrow([p0, p1], dash=dash, marker="hollow", width=2.1)
    c.text(lx, ly, label, FS_TINY, INK, anchor=anchor)
    if mult:
        c.text(mx, my, mult, FS_TINY, MUTED, anchor=anchor)


TR = "«transient»"

# the pipeline runs down the left; its two inputs feed in from the right
cls(300, 300, 360, "RawBreach", TR,
    ["title : string", "date : \"YYYY-MM-DD\" | null", "dataClasses : string[]",
     "source : string"], note="one per provider reply")

cls(300, 620, 360, "MergedBreach", TR,
    ["title, key : string", "date : date | null", "dataClasses : string[]",
     "sources : string[]"], note="one per distinct breach")

cls(300, 920, 360, "ScoredBreach", TR,
    ["severity : 0–1", "ageDays : int", "contribution : float",
     "identityAttrs : string[]"])

cls(300, 1160, 360, "Report", TR,
    ["score : 0–100", "level : band", "credRaw, identityRaw"])

cls(770, 300, 340, "ProviderRow", "«registry»",
    ["name : string", "kinds : [\"email\" | \"phone\"]", "keyed : envVar | null",
     "run(id, kind, env)"], accent=SLATE)

cls(770, 620, 340, "CatalogueEntry", "«bundled»",
    ["name : string", "date : date", "flags : unverified,", "        spam, fabricated"],
    accent=GOLD, note="1,048 records, read-only")

# ── associations ──────────────────────────────────────────
assoc((598, 300), (482, 300), "returns  0..*", 540, 272)
assoc((598, 620), (482, 620), "supplies a date", 540, 578, "0..1", 540, 600)
assoc((300, 416), (300, 504), "mergeBreaches()", 320, 452, "merge by key", 320, 480, anchor="start")
assoc((300, 736), (300, 817), "emailReport()", 320, 770, "scores each", 320, 798, anchor="start")
assoc((300, 1023), (300, 1071), "aggregates  0..*", 320, 1052, anchor="start")

c.note(596, 1016, 380, 232,
       ["No class here is persisted, and",
        "none has an identifier that",
        "outlives the request.",
        "",
        "Where a thesis would normally",
        "print a database schema, this",
        "system has only these objects,",
        "created when the request begins",
        "and gone when it ends."],
       title="Why there is no schema", accent=TEAL)

c.legend(1288, [("class", "box"), ("association", "sync"), ("note", "note")])

p = c.save("domain")
rasterise(p, H)
