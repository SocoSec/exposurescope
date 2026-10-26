# Response to Reviewers — Exposio / ExposureScope

**Thesis:** *Integrált keretrendszer valós idejű OSINT-expozícióelemzéshez és viselkedésalapú
adatvédelmi nudginghez*
**Author:** Abdullah Esmail Mohammed Salem · Óbuda University
**Reviews dated:** 27 April 2026 — Leitold Ferenc (52/60), Emődi Márk (40/60)
**This response:** 8 October 2026

---

## Summary of what changed

Both reviews identified the same principal technical deficiency:

> **Leitold:** *"a dolgozat jelenlegi formájában inkább részletes rendszerterv és validációs
> terv, mint teljesen megvalósított és empirikusan kipróbált rendszer"*
>
> **Emődi:** *"the most significant deficiency is the absence of a functional implementation"*

**The system has since been implemented and deployed.** It is live at
https://exposurescope.vercel.app, verification works for any address, and the complete chain —
ownership verification → breach lookup → scoring → ranked remediation → AI assistant → GDPR
letters — runs in production.

The work is accompanied by two automated suites that a reviewer can run without credentials:

```
npm run selftest    41 cases   correctness of the scoring model and security properties
npm run redteam     18 attacks containment of a deliberately hostile language model
```

A component-by-component breakdown, including what remains **unimplemented**, is in
[`docs/IMPLEMENTATION-STATUS.md`](IMPLEMENTATION-STATUS.md). That document is deliberately
written so the gaps are visible without searching for them.

---

## Reviewer 1 — Leitold Ferenc

### Q1. *"Which components of the Exposio system have actually been implemented at prototype level, and which remain at the specification or future development stage?"*

Answered in full in [`docs/IMPLEMENTATION-STATUS.md`](IMPLEMENTATION-STATUS.md). In summary:

**Implemented and tested (12):** Breach Risk score (component *B*), the four-tier severity
model, exponential recency decay, zero-storage token architecture, email ownership
verification, HIBP integration, DeHashed integration, cross-source merge, k-anonymity password
check, the vetted action library, the residual-risk model, and GDPR Art. 15/17 letter
generation.

**Extended beyond specification:** ExpoBot was specified as an intervention layer. What is
built is a bounded **agent** whose figures are computed by project code rather than generated,
together with an adversarial evaluation suite that the thesis did not propose.

**Partial (3):** multi-source aggregation (DeHashed's account has been inactive throughout the
evaluation period); the Exposure Score (component *B* only, of five); behavioural nudging
(implemented, not yet measured).

**Not implemented (7):** GBDT risk model, BERT-BiLSTM NER, GNN identity alignment, Shodan
integration, the four remaining Exposure Score components, DSAR automation, and AI training-data
exposure detection.

On the first three of those: the implemented scoring model is a deterministic published formula
rather than a learned model, and this is a **deliberate choice rather than an omission**. A
transparent formula can be recomputed by the user, audited by a reviewer, and reproduced by a
test (TC-3.3). A gradient-boosted model would have removed all three properties while adding no
measurable accuracy, since there is no labelled outcome data to train against. The interface
reflects the narrowed scope: it displays **"Breach Risk score"**, not "Exposure Score".

### Q2. *"How could the Exposure Score be empirically validated, and how could the effectiveness of ExpoBot's recommendations in improving privacy-related behaviour be measured?"*

Two separate studies, and the instruments for both now exist.

**Validating the score.** The construct is a severity aggregation, not a classifier, so the
relevant validity questions are:

| Validity type | Method | Status |
|---|---|---|
| Reproducibility | Recompute the published formula and compare | **Done** — TC-3.3 reproduces the thesis worked example |
| Distributional behaviour | Run the model over real accounts and examine the score distribution | **Instrument ready** — `npm run evaluate` |
| Agreement with expert judgement | Expert panel ranks N reports; compare with the score's ordering (Kendall's τ) | Proposed |
| Predictive validity | Longitudinal: do higher scores precede more compromise? | Out of reach — the zero-storage design deliberately retains no data |

`scripts/evaluate.mjs` runs the production pipeline over a list of addresses without the web
flow, reporting per-address score, band, breach count, best achievable residual, and per-source
latency percentiles. Its header states the conditions for lawful use: addresses the researcher
owns, or addresses a participant has consented to in writing.

**Measuring behaviour change.** The protocol is in [`docs/STUDY-PROTOCOL.md`](STUDY-PROTOCOL.md):
a pre-questionnaire, the task, a post-questionnaire including the System Usability Scale, and a
follow-up wave at two weeks recording which recommended actions were actually completed. That
third wave is what calibrates the provisional mitigation factors in `lib/playbook.js`.

One methodological point worth stating explicitly: **because the application stores nothing, it
collects no research data.** Measurement is therefore participant-mediated — participants
transcribe their own score band and action counts into a separate questionnaire instrument. This
is a consequence of the privacy architecture rather than a limitation of the study design, and
it preserves the zero-storage property during the evaluation itself.

---

## Reviewer 2 — Emődi Márk

### Q1. *"The platform relies on several external APIs. How do you plan to manage the varying response times (latency) and rate limiting of different providers in real-time, without compromising the user experience?"*

Five mechanisms, all implemented in `lib/sources.js` and `app/api/breach/route.js`:

1. **Parallel querying.** Providers are queried concurrently (`Promise.all`), so wall-clock time
   is the *slower* provider rather than the sum. Measured by `npm run evaluate`, which reports
   per-source and wall-clock percentiles.
2. **Hard timeout.** `fetchWithTimeout` aborts any single provider via `AbortController`, so one
   slow provider cannot hold the request open.
3. **Rate-limit back-off.** On HTTP 429 the client honours `Retry-After`, adds jitter to spread
   simultaneous retries, and retries once. If the required wait exceeds 3 seconds it gives up and
   reports the source as rate-limited rather than making the user wait.
4. **Graceful degradation with honest reporting.** A failed provider does not fail the request.
   The report is produced from whichever sources answered, and the interface names the ones that
   did not. Critically, **if no source answers, the system refuses rather than reporting "no
   breaches found"** — "not checked" and "nothing found" must never look alike.
5. **Client-side rate limiting.** Per-IP, per-email and global daily caps protect both the user
   experience and the provider quota (`lib/ratelimit.js`, TC-2.3).

This is currently demonstrated in production rather than argued: DeHashed has returned HTTP 403
for the duration of the evaluation period, and live reports render correctly from HIBP alone
while displaying *"Sources checked: HIBP · DeHashed didn't respond."*

### Q2. *"ExpoBot utilizes a generative language model for behavior-based nudging. What technical solutions are implemented to guarantee that the AI does not provide technically incorrect or misleading security advice?"*

This question drove the most substantial engineering work since the review, and the answer is
structural rather than behavioural: **the model is not trusted to be correct; it is prevented
from being able to express incorrect advice.**

| Control | Mechanism | Test |
|---|---|---|
| **Closed action set** | Actions may be referenced only by ID, from an enum generated per report. An action that does not apply cannot be named | TC-6.2, TC-10.1, TC-10.2 |
| **Computed, not generated, figures** | Every number reaches the model through a tool that executes project code — `simulate_fixes` calls `residualScore()`, `list_actions` calls `estimatedReduction()`. The model cannot state a figure it invented | TC-8.1 – TC-8.3, TC-12.2 |
| **Human-authored remediation text** | The steps the user reads come from `lib/playbook.js`, written and reviewed by a person and versioned in git. The model selects; it does not write | TC-6.3 |
| **Untrusted-data fencing** | Third-party breach names are delimited and the model is instructed to treat them as data; delimiters are stripped from the data itself | TC-13.1 – TC-13.3 |
| **Server-side output validation** | Unknown IDs dropped, URLs removed, length and counts capped, GDPR letter targets checked against the user's own breached companies | TC-6.3, TC-6.4, TC-10.3 – TC-10.7 |
| **Bounded execution** | At most `MAX_TOOL_ROUNDS + 1` model calls; a cap on tool calls per round | TC-11.1 – TC-11.3 |
| **No reach beyond the report** | No tool touches the network or any state outside this one signed report | TC-12.1 – TC-12.5 |

**The evaluation method is the substantive part of the answer.** `scripts/redteam.mjs` injects a
deliberately hostile `callModel` implementation into the production agent loop — the same
function the API route executes — and asserts containment across eighteen attacks: invented
actions, phishing-link injection, GDPR letters misdirected to companies the user was never
breached in, answer flooding, budget exhaustion, tool abuse, and indirect prompt injection.

Because the threat model assumes the language model is **fully attacker-controlled**, the result
is a property of the application rather than of the model version in use. This is a stronger
claim than measuring how often a particular model resists a particular jailbreak, and it is what
the OWASP Top 10 for LLM Applications asks for.

**The suite found a real defect in this system, which is reported rather than quietly fixed.**
Two injection cases failed when first written: a breach title containing `BREACHES>>>` closed
the untrusted-data fence, so the remainder of the title was interpreted as prompt rather than
data. Because DeHashed returns uncurated `database_name` strings taken from leaked dumps, the
input path was attacker-reachable. The fix (`fenceSafe()` in `lib/expobot.js`) strips delimiters
and line breaks from every value placed inside the fence, and the two cases are retained as
regression tests.

---

## Remaining limitations

Stated here so they are not discovered elsewhere.

1. **Construct validity is not established.** The score is a transparent, reproducible,
   face-valid operationalisation of exposure — not a validated predictor of harm.
2. **Only component *B* of five** is implemented; the interface names it accordingly.
3. **Mitigation factors are provisional**, marked as such in the source, pending the user study.
4. **Severity tiers need external grounding.** ENISA's methodology for assessing the severity of
   personal data breaches provides the basis against which they should be justified or revised.
5. **One live source during evaluation.** Cross-source merging is evidenced against fixtures.
6. **Comparison with other published scoring systems remains superficial** — identified as a gap
   in `docs/CONTRIBUTIONS-AND-RELATED-WORK.md`.
7. **No formal certification.** The system aligns with the standards referenced in
   `docs/TEST-SPECIFICATION.md`; it is certified against none of them.

---

## Reproducing these claims

```bash
git clone https://github.com/SocoSec/exposurescope
cd exposurescope && npm install
npm run selftest     # 41 passed, 0 failed      — no keys, no network
npm run redteam      # 18 contained, 0 escaped  — no keys, no network
npm run build        # compiles
```

Live system: https://exposurescope.vercel.app
Documentation: `docs/IMPLEMENTATION-STATUS.md`, `docs/TEST-SPECIFICATION.md`,
`docs/CONTRIBUTIONS-AND-RELATED-WORK.md`, `docs/STUDY-PROTOCOL.md`
