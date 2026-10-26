#!/usr/bin/env python
"""Build the short discussion note for the supervisor meeting.

    python docs/build-discussion-note.py

A three-page summary for talking through in person. The long version, with
figures and the full implementation detail, is docs/build-brief.py.
"""

import os
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph,
                                Spacer, Table, TableStyle)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Exposio-Discussion-Note.pdf")

INK, MUTE, TEAL, AMBER, LINE = (colors.HexColor(c) for c in
                                ("#0F172A", "#475569", "#0D7D74", "#B45309", "#CBD5E1"))
ss = getSampleStyleSheet()


def st(name, **kw):
    base = dict(fontName="Helvetica", fontSize=9.7, leading=13.8, textColor=INK,
                spaceAfter=7, alignment=TA_JUSTIFY)
    base.update(kw)
    return ParagraphStyle(name, parent=ss["Normal"], **base)


BODY = st("body")
H1 = st("h1", fontName="Helvetica-Bold", fontSize=12.6, leading=16, spaceBefore=14,
        spaceAfter=6, alignment=0)
H2 = st("h2", fontName="Helvetica-Bold", fontSize=10.2, leading=13.4, spaceBefore=9,
        spaceAfter=3, textColor=TEAL, alignment=0)
NOTE = st("note", fontSize=9.4, leading=13.2, textColor=AMBER)
SMALL = st("small", fontSize=8.5, leading=11.4, textColor=MUTE)
CODE = st("code", fontName="Courier", fontSize=8.6, leading=12, alignment=0, spaceAfter=2)


CELL = st("cell", fontSize=8.6, leading=11.4, alignment=0, spaceAfter=0)
CELLH = st("cellh", fontName="Helvetica-Bold", fontSize=8.6, leading=11.4,
           alignment=0, spaceAfter=0, textColor=MUTE)


def table(rows, widths, head=True):
    # Cells are wrapped in Paragraphs so long text flows onto a second line
    # instead of running off the page edge — a plain string in a Table does
    # not wrap.
    body = [[Paragraph(str(c), CELLH if (head and r == 0) else CELL) for c in row]
            for r, row in enumerate(rows)]
    t = Table(body, colWidths=widths, hAlign="LEFT")
    style = [("FONT", (0, 0), (-1, -1), "Helvetica", 8.6),
             ("TEXTCOLOR", (0, 0), (-1, -1), INK),
             ("VALIGN", (0, 0), (-1, -1), "TOP"),
             ("TOPPADDING", (0, 0), (-1, -1), 4),
             ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
             ("LEFTPADDING", (0, 0), (-1, -1), 5),
             ("LINEBELOW", (0, 0), (-1, -2), 0.4, LINE)]
    if head:
        style += [("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8.6),
                  ("TEXTCOLOR", (0, 0), (-1, 0), MUTE),
                  ("LINEBELOW", (0, 0), (-1, 0), 0.9, MUTE)]
    t.setStyle(TableStyle(style))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.4)
    canvas.setFillColor(MUTE)
    canvas.drawString(2.1 * cm, 1.25 * cm, "Exposio — discussion note · E. M. S. Abdullah · 13 October 2026")
    canvas.drawRightString(A4[0] - 2.1 * cm, 1.25 * cm, "Page %d of 3" % doc.page)
    canvas.setStrokeColor(LINE)
    canvas.line(2.1 * cm, 1.7 * cm, A4[0] - 2.1 * cm, 1.7 * cm)
    canvas.restoreState()


S = []
A = S.append

A(Paragraph("Exposio — where the work stands", st("t", fontName="Helvetica-Bold",
            fontSize=16, leading=20, spaceAfter=2, alignment=0)))
A(Paragraph("Short note for our discussion", st("s2", fontSize=10.2, textColor=MUTE,
            spaceAfter=9, alignment=0)))
A(table([
    ["Author", "Esmail Mohammed Salem Abdullah — MSc Cyber Security Engineering"],
    ["Supervisor", "Balázsné Dr. Kail Eszter"],
    ["Live system", "https://exposurescope.vercel.app  ·  source: github.com/SocoSec/exposurescope"],
], [2.4 * cm, 14.2 * cm], head=False))
A(Spacer(1, 8))

A(Paragraph("1. What exists now", H1))
A(Paragraph(
    "The system is implemented and deployed. The complete path runs in production: a user proves "
    "they own an email address by entering a one-time code, the address is checked against breach "
    "intelligence, the Breach Risk score is computed on the server, a ranked remediation plan is "
    "produced, and an advisory agent answers questions about the result. A live check currently "
    "returns 271 breach records for a real address. Nothing is stored at any point.", BODY))
A(table([
    ["", "Status"],
    ["API routes / library modules", "4 routes · 13 modules (7 domain, 6 platform)"],
    ["Correctness tests", "46 passing — offline, no API keys required"],
    ["Adversarial tests", "18 attacks against a hostile model, 0 escaped"],
    ["Sensitivity analysis", "2,000 identities, parameter sweeps, 6 alternative models"],
    ["Runtime dependencies", "next, react, react-dom — no ORM, no database, no ML runtime"],
    ["Persistent storage", "None. Rate-limit counters only, hashed, expiring within 24 hours"],
], [5.6 * cm, 11.0 * cm]))
A(Spacer(1, 4))
A(Paragraph(
    "Three commands reproduce all of the above with no credentials and no network access: "
    "<font name='Courier' size='8.6'>npm run selftest</font>, "
    "<font name='Courier' size='8.6'>npm run redteam</font>, "
    "<font name='Courier' size='8.6'>npm run sensitivity</font>.", SMALL))

A(Paragraph("2. Responding to your three comments", H1))

A(Paragraph("2.1 “The implementation part is superficial”", H2))
A(Paragraph(
    "I have written the implementation up as decisions with reasons and consequences rather than "
    "as a description of features. Where state lives given that nothing is stored; why the scan "
    "token carries a keyed hash of the address rather than the address; what the password service "
    "learns and what it cannot learn; why a source that fails must never be rendered as “no "
    "breaches found”; and how the advisory agent is prevented from expressing an incorrect "
    "answer rather than asked to avoid one. The long brief sets each of these out with the file "
    "and the test that demonstrates it.", BODY))

A(Paragraph("2.2 “The scoring model appears largely heuristic”", H2))
A(Paragraph(
    "This was the substantial criticism and I have built the analysis rather than added argument. "
    "It runs as <font name='Courier' size='8.6'>npm run sensitivity</font> and begins by scoring "
    "2,000 identities twice — once with its own parameterised implementation, once with the "
    "deployed scoring code — asserting zero mismatches, so the results provably describe the "
    "real model.", BODY))
A(table([
    ["Parameter", "Effect on ranking", "What that means"],
    ["λ across a 16-fold range", "Spearman ≥ 0.90", "λ sets the level of the score, not the order"],
    ["B_max from 0.4 to 1.5", "≈ 1.000", "A monotone rescaling; a presentation decision"],
    ["Undated-record age", "falls to 0.769", "The most consequential free parameter"],
    ["Tier weights ±30%", "0.996, 95% keep band", "Conclusions survive the weights being wrong"],
], [4.2 * cm, 3.5 * cm, 8.9 * cm]))
A(Spacer(1, 4))
A(Paragraph(
    "The last line is the direct answer. I am not claiming 1.0 / 0.7 / 0.4 / 0.2 are the correct "
    "weights — they are informed estimates grounded in the account-takeover literature. I am "
    "claiming that what a user concludes survives those weights being substantially wrong, and "
    "that is measured rather than asserted. The constants are also now given operational meaning: "
    "λ = 0.002/day is a half-life of 347 days, and B_max = 0.8 defines a score "
    "of 100 as one payment-plus-password breach about 112 days old.", BODY))
A(Paragraph(
    "I also compared the model against six alternative weighting schemes. Counting breaches "
    "(ρ = 0.641) and flagging credentials (ρ = 0.405) give materially different "
    "orderings, so severity weighting and recency decay are each doing real work.", BODY))

A(Paragraph("2.3 “The writing feels generic”", H2))
A(Paragraph(
    "I am rewriting the chapters myself from the analysis rather than from a draft. The material "
    "in section 3 below is the kind of content I think was missing: specific numbers, a limitation "
    "I found in my own model, and errors I found in my own draft.", BODY))

A(Paragraph("3. What I found wrong in my own work", H1))

A(Paragraph("3.1 A limitation in the scoring model", H2))
A(Paragraph(
    "Scoring by each person’s single worst breach reproduces my full model almost exactly: "
    "Spearman ρ = 0.966, Kendall τ-b = 0.880, 83.8% band agreement. The reason is "
    "concentration — the largest single contributor is a median 92% of the raw score, and for "
    "59% of identities one breach accounts for more than 80% of it. Exponential decay suppresses "
    "older records so aggressively that the summation adds little over a maximum.", NOTE))
A(Paragraph(
    "I would like your view on whether to justify the aggregation by quantifying the cases where "
    "the two diverge, adopt the simpler model, or reduce λ so that aggregation does more work.", BODY))

A(Paragraph("3.2 Three numerical errors in the draft you reviewed", H2))
A(table([
    ["Location", "Issue"],
    ["§5.3, example 1", "Two recency terms are ~100× too large. Raw sum is 0.5123, not 0.563, so the score is 64, not 70. The qualitative point stands and is in fact stronger."],
    ["§5.4, example 2", "Uses a default recency of 0.05; the implementation assumes 730 days, giving 0.2322. The score is 46 (Medium), not 10 (Low), so the interpretation no longer holds. The text also calls it a live run, which it cannot be."],
    ["§5.2 and Table 3", "The undated-record assumption is not stated, and three bands are defined where the code has four."],
], [3.1 * cm, 13.5 * cm]))

A(Paragraph("4. A design decision worth discussing", H1))
A(Paragraph(
    "Every comparable service — Have I Been Pwned, DeHashed, the OSINT tools — lets "
    "anyone query anyone. Exposio cannot: the scan token carries a keyed hash of the identifier, "
    "recomputed and compared on the server, so there is no code path that performs an unverified "
    "lookup. This is what makes it a self-assessment instrument rather than an investigative one, "
    "and it is why it can be used with study participants at all.", BODY))
A(Paragraph(
    "I treated that as a constraint rather than a slogan. Phone lookups were removed from the "
    "system because ownership of a number could not be proven, and an unverified phone lookup is "
    "a stalking tool. They were restored this week only after SMS verification was implemented, "
    "and the property had to be shown to hold across two identifier types: a phone number paired "
    "with a token issued for an email address is refused. That work is complete and tested, and "
    "is awaiting merge to the deployed branch.", BODY))

A(Paragraph("5. What is not implemented", H1))
A(Paragraph(
    "Stated plainly, because the draft describes components that do not exist and I would rather "
    "narrow the claims than leave them to be discovered. Not implemented: the GBDT risk model, the "
    "BERT-BiLSTM NER pipeline, GNN identity alignment, Shodan integration, the four Exposure Score "
    "components beyond Breach Risk, and DSAR automation. A repository search for those terms "
    "returns nothing and the only dependencies are next, react and react-dom.", BODY))
A(Paragraph(
    "On the first three: the deterministic formula was a deliberate choice, and I would argue a "
    "better one here. A published formula can be recomputed by the user, audited by a reviewer and "
    "reproduced by a test. A gradient-boosted model removes all three properties, and there is no "
    "labelled outcome data to train it against. The interface reflects the narrowed scope: it says "
    "“Breach Risk score”, not “Exposure Score”.", BODY))

A(Paragraph("6. What I would like to decide tomorrow", H1))
A(table([
    ["1", "Whether to keep the summation in the scoring model or adopt the simpler maximum (§3.1)."],
    ["2", "How far to narrow the written claims to match what is built (§5)."],
    ["3", "Whether an expert-ranking exercise is worth running before submission — five to eight practitioners ranking fifteen anonymised profiles, compared with the model by rank correlation. It is roughly a week and would convert “heuristic” into a measured agreement figure."],
    ["4", "Whether the user study should proceed this term, and what the ethics route is."],
], [0.7 * cm, 15.9 * cm], head=False))

A(Spacer(1, 10))
A(Paragraph(
    "Supporting documents, all in the repository: the long implementation brief with the "
    "architecture and request-lifecycle figures; IMPLEMENTATION-STATUS.md (component by "
    "component); SCORE-MODEL-ANALYSIS.md (the full sensitivity findings); TEST-SPECIFICATION.md "
    "(59 test cases mapped to GDPR articles and the OWASP Top 10 for LLM Applications); and "
    "STUDY-PROTOCOL.md.", SMALL))


doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=2.1 * cm, rightMargin=2.1 * cm,
                      topMargin=1.9 * cm, bottomMargin=2.1 * cm,
                      title="Exposio — Discussion Note",
                      author="Esmail Mohammed Salem Abdullah")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="n")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=footer)])
doc.build(S)
print("wrote", OUT)
