# -*- coding: utf-8 -*-
"""docs/figures/fig-clocks.svg - the thesis argument in one chart.

WHY THIS FIGURE EXISTS
The central claim of this work is that exposure a subject can revoke and
exposure they cannot must not share a decay curve. Every other figure reports
a property OF the model: how stable its ranking is, how its records are
shaped, where its components run. None of them shows the claim itself.

This one does, and it needs no interpretation. One profile, three real
breaches, scored once a year by each model. The single-clock score falls to 1
and reports the subject as Low. The deployed model settles on a floor at 50
and reports Medium. Nothing about the exposure changed between the two lines;
only the question the model asks about it.

The gap between the lines is the quantity the thesis exists to measure.

Every value is produced by the deployed scorer in lib/score.js, with the
single-clock comparison computed exactly as Section 5.2 defines it, before
the revision of Section 5.8.
"""
import io, os, subprocess, tempfile, uuid

W, H = 1000, 700
BLUE, ORANGE = "#2a78d6", "#eb6834"
INK, MUTED, HAIR, SURF = "#14202E", "#5A6B7F", "#D8DEE5", "#FCFCFB"
FS_TITLE, FS_LABEL, FS_AXIS, FS_NOTE = 30, 25, 23, 22

# measured: node scripts/clocks.mjs  (deployed scorer vs the single-clock
# form of Section 5.2, same three records, one evaluation per year)
YEARS = list(range(2019, 2030))
SINGLE = [43, 20, 10, 5, 2, 1, 1, 1, 1, 1, 1]
THREE  = [89, 76, 70, 67, 65, 65, 64, 64, 64, 64, 64]

X0, X1, Y0, Y1 = 112, 742, 150, 480          # plot area
px = lambda i: X0 + (X1 - X0) * i / (len(YEARS) - 1)
py = lambda v: Y1 - (Y1 - Y0) * v / 100

o = []
add = o.append
esc = lambda t: t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def text(x, y, s, size=FS_NOTE, fill=INK, anchor="start", weight="400", style=""):
    st = f' font-style="{style}"' if style else ""
    add(f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" '
        f'font-weight="{weight}"{st}>{esc(s)}</text>')


add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
    f'font-family="Segoe UI, Calibri, Helvetica, Arial, sans-serif">')
add(f'<rect width="{W}" height="{H}" fill="{SURF}"/>')

text(40, 48, "What the second clock sees that the first does not", FS_TITLE, INK, weight="600")
text(40, 80, "LinkedIn 2012, MyFitnessPal 2018 and Exactis 2018, scored once a year by each model",
     FS_NOTE, MUTED)

# band boundaries, so the reader can see a band change rather than infer it
for v in (35, 65):
    add(f'<path d="M{X0},{py(v)} L{X1},{py(v)}" stroke="{HAIR}" stroke-width="1.6" stroke-dasharray="6 5"/>')
for v, lab in ((82, "High"), (50, "Medium"), (17, "Low")):
    text(X1 + 16, py(v) + 8, lab, FS_NOTE, MUTED)

# axes
add(f'<path d="M{X0},{Y0} L{X0},{Y1} L{X1},{Y1}" fill="none" stroke="{MUTED}" stroke-width="2"/>')
for v in (0, 25, 50, 75, 100):
    text(X0 - 14, py(v) + 8, str(v), FS_NOTE, MUTED, anchor="end")
for i, y in enumerate(YEARS):
    if y % 2 == 1:
        text(px(i), Y1 + 34, str(y), FS_NOTE, MUTED, anchor="middle")
text(X0 - 46, Y0 - 18, "score", FS_NOTE, MUTED, anchor="start")

# the gap is the quantity the thesis measures, so shade it
pts_u = " ".join(f"{px(i)},{py(v)}" for i, v in enumerate(THREE))
pts_l = " ".join(f"{px(i)},{py(v)}" for i, v in reversed(list(enumerate(SINGLE))))
add(f'<polygon points="{pts_u} {pts_l}" fill="{BLUE}" fill-opacity="0.10"/>')

def line(vals, colour, dash=False):
    d = "M" + " L".join(f"{px(i)},{py(v)}" for i, v in enumerate(vals))
    sd = ' stroke-dasharray="9 6"' if dash else ""
    add(f'<path d="{d}" fill="none" stroke="{colour}" stroke-width="3.4"{sd}/>')
    for i, v in enumerate(vals):
        add(f'<circle cx="{px(i)}" cy="{py(v)}" r="5" fill="{colour}"/>')

line(SINGLE, ORANGE, dash=True)
line(THREE, BLUE)

# the two models' final answers, placed clear of the band labels
text(px(9), py(64) - 20, "64", FS_LABEL, BLUE, weight="600", anchor="middle")
text(px(9), py(1) - 16, "1", FS_LABEL, ORANGE, weight="600", anchor="middle")

# the gap, named
add(f'<defs><marker id="a" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" '
    f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{INK}"/></marker></defs>')
add(f'<path d="M{px(6)},{py(64)+8} L{px(6)},{py(1)-8}" stroke="{INK}" stroke-width="1.8" '
    f'marker-start="url(#a)" marker-end="url(#a)"/>')
text(px(6) + 14, py(36), "the exposure the single", FS_NOTE, INK)
text(px(6) + 14, py(36) + 26, "clock discounts away", FS_NOTE, INK)

# legend on one line, then the finding, each inside the canvas
add(f'<path d="M44,{Y1+78} L96,{Y1+78}" stroke="{BLUE}" stroke-width="3.4"/>')
text(108, Y1 + 86, "deployed model, three clocks", FS_NOTE, BLUE, weight="600")
add(f'<path d="M448,{Y1+78} L500,{Y1+78}" stroke="{ORANGE}" stroke-width="3.4" stroke-dasharray="9 6"/>')
text(512, Y1 + 86, "single clock of Section 5.2, superseded", FS_NOTE, ORANGE, weight="600")

text(44, Y1 + 128, "By 2026 the two models differ by 63 points: the first reports Low, the second Medium.", FS_NOTE, INK)
text(44, Y1 + 158, "The three records are identical throughout. Only the treatment of what cannot be changed differs.", FS_NOTE, MUTED)
text(44, Y1 + 188, "Permanent attributes rise from 72% of the raw score in 2019 to 100% by 2025.", FS_NOTE, MUTED)

add('</svg>')

dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fig-clocks.svg")
body = "\n".join(o)
io.open(dest, "w", encoding="utf-8").write(body)
import re
sizes = sorted({float(x) for x in re.findall(r'font-size="([\d.]+)"', body)})
pt = min(sizes) / W * 150 / 0.3528
print(f"wrote {dest}")
print(f"  smallest text {min(sizes):g} units = {pt:.1f} pt at 15 cm wide  {'OK' if pt >= 9 else 'TOO SMALL'}")

BR = [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
      r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
      r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"]
b = next((x for x in BR if os.path.exists(x)), None)
if b:
    html = ("<!doctype html><meta charset='utf-8'><style>html,body{margin:0;padding:0}"
            "svg{display:block}</style>" + body)
    tmp = os.path.join(tempfile.gettempdir(), "clocks.html")
    io.open(tmp, "w", encoding="utf-8").write(html)
    png = os.path.splitext(dest)[0] + ".png"
    subprocess.run([b, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                    f"--user-data-dir={os.path.join(tempfile.gettempdir(), 'shot-' + uuid.uuid4().hex[:8])}",
                    "--force-device-scale-factor=3", f"--window-size={W},{H}",
                    f"--screenshot={png}", "file:///" + tmp.replace("\\", "/")],
                   capture_output=True, timeout=180)
    print(f"  rasterised -> {png} ({os.path.getsize(png)//1024} KB)" if os.path.exists(png) else "  rasterise FAILED")
