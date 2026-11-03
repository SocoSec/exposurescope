# -*- coding: utf-8 -*-
"""Shared SVG primitives for the hand-laid UML figures.

Extracted from make_workflow.py so that the diagrams added later use the same
palette, the same stroke weights and, above all, the same typography rule.

THE TYPOGRAPHY RULE
A figure placed 15 cm wide in the thesis must carry body text of at least 9 pt,
which is 3.2 mm, which is 2.1 per cent of the figure width. Every canvas here
is 1000 units across and body text is 21 units, so the printed result satisfies
the rule by construction. The narrow canvas is what forces labels to stay
short, which is also what the notation wants.
"""
import io, os, re, subprocess, tempfile

W = 1000

INK   = "#14202E"   # primary text and strokes
MUTED = "#5A6B7F"   # secondary text
HAIR  = "#B9C4D0"   # rules and separators
TEAL  = "#0D7D74"   # application tier
GOLD  = "#B8862F"   # external services
SLATE = "#44566B"   # client tier
WASH  = "#F6F8FA"   # lane and legend fill

# 9 pt at 15 cm wide is 2.117% of the width, so on a 1000-unit canvas nothing
# may be set below 22 units. check_sizes() enforces it on the finished file.
FLOOR = 22
FS_TITLE, FS_LANE, FS_BODY, FS_SMALL, FS_TINY = 32, 25, 24, 22, 22


class Canvas:
    def __init__(self, height, title, subtitle):
        self.H = height
        self.out = []
        self.add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {height}" '
                 f'width="{W}" height="{height}" '
                 f'font-family="Segoe UI, Calibri, Helvetica, Arial, sans-serif">')
        self.add('<defs>'
                 f'<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
                 f'markerHeight="7" orient="auto-start-reverse">'
                 f'<path d="M0,0 L10,5 L0,10 z" fill="{INK}"/></marker>'
                 f'<marker id="open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" '
                 f'markerHeight="9" orient="auto-start-reverse">'
                 f'<path d="M0,0 L10,5 L0,10" fill="none" stroke="{INK}" stroke-width="1.6"/></marker>'
                 f'<marker id="hollow" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="12" '
                 f'markerHeight="12" orient="auto-start-reverse">'
                 f'<path d="M0,0 L12,6 L0,12 z" fill="#FFFFFF" stroke="{INK}" stroke-width="1.6"/></marker>'
                 '</defs>')
        self.add(f'<rect width="{W}" height="{height}" fill="#FFFFFF"/>')
        self.text(W / 2, 46, title, FS_TITLE, INK, weight="600")
        self.text(W / 2, 76, subtitle, FS_LANE - 2, MUTED, style="italic")

    # ── plumbing ────────────────────────────────────────────────────────────
    def add(self, s):
        self.out.append(s)

    @staticmethod
    def esc(t):
        return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def text(self, x, y, s, size=FS_BODY, fill=INK, anchor="middle", weight="400",
             family="Segoe UI, Calibri, Helvetica, Arial, sans-serif", style=""):
        st = f' font-style="{style}"' if style else ""
        self.add(f'<text x="{x}" y="{y}" font-family="{family}" font-size="{size}" '
                 f'fill="{fill}" text-anchor="{anchor}" font-weight="{weight}"{st}>'
                 f'{self.esc(s)}</text>')

    def mono(self, x, y, s, size=FS_TINY, fill=INK, anchor="middle"):
        self.text(x, y, s, size, fill, anchor, family="Consolas, Courier New, monospace")

    def lines(self, x, cy, rows, size=FS_BODY, fill=INK, lead=None, weight="400"):
        lead = lead or size + 6
        y = cy - lead * (len(rows) - 1) / 2 + size * 0.34
        for r in rows:
            self.text(x, y, r, size, fill, weight=weight)
            y += lead

    # ── shapes ──────────────────────────────────────────────────────────────
    def box(self, cx, cy, w, h, rows, accent=INK, fill="#FFFFFF", rx=10,
            size=FS_BODY, weight="400"):
        self.add(f'<rect x="{cx-w/2}" y="{cy-h/2}" width="{w}" height="{h}" rx="{rx}" '
                 f'fill="{fill}" stroke="{accent}" stroke-width="2.2"/>')
        self.lines(cx, cy, rows, size, weight=weight)

    def arrow(self, pts, dash=False, marker="arrow", width=2.2, stroke=None):
        d = "M" + " L".join(f"{x},{y}" for x, y in pts)
        sd = ' stroke-dasharray="7 5"' if dash else ""
        self.add(f'<path d="{d}" fill="none" stroke="{stroke or INK}" stroke-width="{width}"{sd} '
                 f'marker-end="url(#{marker})"/>')

    def note(self, x, y, w, h, rows, title=None, accent=MUTED):
        f = 18
        self.add(f'<path d="M{x},{y} L{x+w-f},{y} L{x+w},{y+f} L{x+w},{y+h} L{x},{y+h} Z" '
                 f'fill="#FFFFFF" stroke="{accent}" stroke-width="1.6" stroke-dasharray="5 4"/>')
        self.add(f'<path d="M{x+w-f},{y} L{x+w-f},{y+f} L{x+w},{y+f}" fill="none" '
                 f'stroke="{accent}" stroke-width="1.6" stroke-dasharray="5 4"/>')
        ty = y + 28
        if title:
            self.text(x + 16, ty, title, FS_SMALL, INK, anchor="start", weight="600")
            ty += 24
        for r in rows:
            self.text(x + 16, ty, r, FS_TINY, MUTED, anchor="start")
            ty += 21

    def frame(self, x, y, w, h, label, operand=None, accent=INK):
        """A UML interaction frame: the tab in the corner carries the operator."""
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none" '
                 f'stroke="{accent}" stroke-width="1.8"/>')
        tw = 34 + len(label) * 10
        self.add(f'<path d="M{x},{y} L{x+tw},{y} L{x+tw},{y+22} L{x+tw-12},{y+32} '
                 f'L{x},{y+32} Z" fill="{WASH}" stroke="{accent}" stroke-width="1.8"/>')
        self.text(x + 12, y + 23, label, FS_TINY, INK, anchor="start", weight="600")
        if operand:
            self.text(x + tw + 12, y + 23, operand, FS_TINY, MUTED, anchor="start")

    def legend(self, y, items, pad=22):
        self.add(f'<rect x="14" y="{y}" width="{W-28}" height="56" rx="8" fill="{WASH}" '
                 f'stroke="{HAIR}" stroke-width="1.4"/>')
        lx = 36
        for label, kind in items:
            cy = y + 28
            if kind == "box":
                self.add(f'<rect x="{lx-17}" y="{cy-11}" width="34" height="22" rx="5" '
                         f'fill="#FFF" stroke="{INK}" stroke-width="2"/>')
            elif kind == "node":
                self.add(f'<rect x="{lx-17}" y="{cy-9}" width="30" height="20" fill="#FFF" '
                         f'stroke="{INK}" stroke-width="2"/>')
                self.add(f'<path d="M{lx-17},{cy-9} L{lx-11},{cy-16} L{lx+19},{cy-16} '
                         f'L{lx+19},{cy+3} L{lx+13},{cy+11}" fill="none" stroke="{INK}" stroke-width="2"/>')
            elif kind == "sync":
                self.add(f'<path d="M{lx-18},{cy} L{lx+14},{cy}" stroke="{INK}" stroke-width="2.2" '
                         f'marker-end="url(#arrow)"/>')
            elif kind == "reply":
                self.add(f'<path d="M{lx-18},{cy} L{lx+14},{cy}" stroke="{INK}" stroke-width="2.2" '
                         f'stroke-dasharray="7 5" marker-end="url(#open)"/>')
            elif kind == "state":
                self.add(f'<rect x="{lx-17}" y="{cy-11}" width="34" height="22" rx="11" '
                         f'fill="#FFF" stroke="{INK}" stroke-width="2"/>')
            elif kind == "initial":
                self.add(f'<circle cx="{lx}" cy="{cy}" r="9" fill="{INK}"/>')
            elif kind == "final":
                self.add(f'<circle cx="{lx}" cy="{cy}" r="11" fill="none" stroke="{INK}" stroke-width="2"/>')
                self.add(f'<circle cx="{lx}" cy="{cy}" r="5.5" fill="{INK}"/>')
            elif kind == "frame":
                self.add(f'<rect x="{lx-17}" y="{cy-11}" width="34" height="22" fill="#FFF" '
                         f'stroke="{INK}" stroke-width="1.6"/>')
                self.add(f'<path d="M{lx-17},{cy-11} L{lx-3},{cy-11} L{lx-3},{cy-3} '
                         f'L{lx-7},{cy+1} L{lx-17},{cy+1} Z" fill="{WASH}" stroke="{INK}" stroke-width="1.4"/>')
            elif kind == "lifeline":
                self.add(f'<path d="M{lx},{cy-13} L{lx},{cy+13}" stroke="{INK}" stroke-width="1.8" '
                         f'stroke-dasharray="6 5"/>')
            elif kind == "bar":
                self.add(f'<rect x="{lx-19}" y="{cy-5}" width="38" height="10" rx="2" fill="{INK}"/>')
            elif kind == "x":
                self.add(f'<circle cx="{lx}" cy="{cy}" r="11" fill="#FFF" stroke="{INK}" stroke-width="2"/>')
                self.add(f'<path d="M{lx-6},{cy-6} L{lx+6},{cy+6} M{lx+6},{cy-6} L{lx-6},{cy+6}" '
                         f'stroke="{INK}" stroke-width="2"/>')
            elif kind == "diamond":
                self.add(f'<path d="M{lx},{cy-13} L{lx+17},{cy} L{lx},{cy+13} L{lx-17},{cy} Z" '
                         f'fill="#FFF" stroke="{INK}" stroke-width="2"/>')
            elif kind == "note":
                self.add(f'<path d="M{lx-16},{cy-11} L{lx+8},{cy-11} L{lx+16},{cy-3} '
                         f'L{lx+16},{cy+11} L{lx-16},{cy+11} Z" fill="#FFF" stroke="{MUTED}" '
                         f'stroke-width="1.6" stroke-dasharray="5 4"/>')
            self.text(lx + 26, cy + 6, label, FS_TINY, MUTED, anchor="start")
            lx += 30 + len(label) * 11.4 + pad

    # ── output ──────────────────────────────────────────────────────────────
    def save(self, stem):
        self.add('</svg>')
        here = os.path.dirname(os.path.abspath(__file__))
        dest = os.path.join(here, stem + ".svg")
        body = "\n".join(self.out)
        io.open(dest, "w", encoding="utf-8").write(body)
        print(f"wrote {dest}  ({len(body)} bytes)")
        check_sizes(body, self.H)
        return dest


def check_sizes(svg, height):
    """Refuse to pass a figure whose smallest text would print below 9 pt."""
    sizes = sorted({float(m) for m in re.findall(r'font-size="([\d.]+)"', svg)})
    bad = [s for s in sizes if s < FLOOR]
    smallest = min(sizes) if sizes else 0
    pt = smallest / W * 150 / 0.3528
    print(f"  canvas {W}x{height}; smallest text {smallest:g} units = {pt:.1f} pt at 15 cm wide")
    if bad:
        raise SystemExit(f"  REJECTED: {len(bad)} size(s) below the {FLOOR}-unit floor: {bad}")
    print("  typography floor: OK")


BROWSERS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
]


def rasterise(svg_path, height, scale=3):
    """Render the SVG to PNG with headless Chromium at `scale` device pixels.

    The thesis needs a raster: Word will embed an SVG, but it re-rasterises on
    export at screen resolution, which undoes the point of the typography rule.
    """
    browser = next((b for b in BROWSERS if os.path.exists(b)), None)
    if not browser:
        print("  no Chromium found - SVG only")
        return None
    png = os.path.splitext(svg_path)[0] + ".png"
    svg = io.open(svg_path, encoding="utf-8").read()
    html = ("<!doctype html><meta charset='utf-8'>"
            "<style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>"
            + svg)
    tmp = os.path.join(tempfile.gettempdir(), os.path.basename(svg_path) + ".html")
    io.open(tmp, "w", encoding="utf-8").write(html)
    profile = os.path.join(tempfile.gettempdir(), "exposio-shot")
    subprocess.run([browser, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    f"--user-data-dir={profile}",
                    f"--force-device-scale-factor={scale}",
                    f"--window-size={W},{height}",
                    f"--screenshot={png}", "file:///" + tmp.replace("\\", "/")],
                   capture_output=True, timeout=120)
    if os.path.exists(png):
        print(f"  rasterised -> {png}  ({os.path.getsize(png)//1024} KB at {scale}x)")
        return png
    print("  rasterise FAILED")
    return None
