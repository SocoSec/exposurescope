# Breach Risk Model — Analysis Notes

**Date:** 9 October 2026 · **Reproduce:** `npm run sensitivity`

> **These are working notes, not thesis prose.** They contain the evidence and the
> arguments you need to make. Write the chapter yourself, in your own words — see §6 for
> why that matters more than usual here.

Produced in response to:

> *"the scoring formula, weighting factors, and decay parameters are presented, [but] their
> selection is not adequately justified … no empirical validation, sensitivity analysis,
> comparison with alternative weighting schemes, or other evidence supporting the proposed
> model. As a result, the score appears largely heuristic."*

---

## 0. Fix these first — three numerical errors in the current draft

Before any new analysis, the thesis contains figures that **do not match the implementation**.
A supervisor who recomputes them will find this immediately, and it undermines everything else.

### 0.1 Worked example 1 (§5.3) — wrong by a factor of ~100 in two terms

| Breach | Age | Thesis says `rec` | Actual `exp(−0.002·age)` |
|---|---|---|---|
| 1 | 4,566 d | 0.010 | **0.000108** |
| 2 | 3,618 d | 0.064 | **0.000720** |
| 3 | 335 d | 0.511 | 0.511709 ✓ |

- Thesis: raw sum **0.563** → B ≈ 0.70 → **E ≈ 70**
- Actual: raw sum **0.5123** → B = 0.6404 → **E = 64**

Verified against `lib/score.js`; asserted by test case TC-3.3.

**The qualitative point you make is still correct and still worth making** — the recent
high-severity breach dominates, the twelve-year-old one is negligible. In fact the corrected
numbers make it *more* strongly: the old breach contributes 0.0076% of the score, not 1.2%.

### 0.2 Worked example 2 (§5.4) — contradicts the implementation, and changes the band

The thesis uses a default recency weight of ≈ 0.05 for undated records. The implementation
uses an assumed age of **730 days**, giving `exp(−0.002 × 730) = 0.2322`.

| | Thesis | Implementation |
|---|---|---|
| Default `rec` | 0.05 | **0.2322** |
| Implied assumed age | ~1,498 d | **730 d** |
| Raw sum (4 contact-tier breaches) | 0.08 | **0.3716** |
| Score | **10 — Low** | **46 — Medium** |

This one is serious for two reasons. The score lands in a **different band**, so the
interpretive claim in the paragraph ("the model reports, correctly, that … account-takeover
risk low") no longer holds. And the text states this example is *"drawn from a live run against
real data"* — which it cannot be, because the system does not produce that number.

**Either** correct the example to E = 46 and rewrite the interpretation, **or** change
`UNDATED_AGE_DAYS` in the code and re-run everything. Do not leave them disagreeing.

### 0.3 §5.2 omits the undated default entirely

The text says only *"a default age is applied"*. §5 of this document shows that this is the
model's **most consequential free parameter**. It must be stated, with its value and its basis.

### 0.4 Band count mismatch

Thesis Table 3 defines three bands (Low / Medium / High). The implementation has four —
`safe` is a distinct band for score 0 (`bandFor` in `lib/score.js`). Minor, but it is the kind
of inconsistency that invites a reviewer to keep looking.

---

## 1. What the supervisor is actually asking

Four distinct demands, often conflated:

| # | Demand | Answerable how |
|---|---|---|
| D1 | *Why these values?* | Derive them from a stated design intent, not from intuition |
| D2 | *Sensitivity analysis* | Vary each parameter, report the effect — **done, §3–5** |
| D3 | *Comparison with alternatives* | Score the same corpus under other schemes — **done, §4** |
| D4 | *Empirical validation* | Partly out of reach; be precise about which part — §7 |

D2 and D3 are now done and reproducible. D1 is a writing task that the analysis makes possible.
D4 needs honesty about what a thesis at this stage can and cannot claim.

---

## 2. The instrument

`scripts/sensitivity.mjs`, run with `npm run sensitivity`. Deterministic (seed 20261009),
2,000 synthetic identities, no network, no keys.

**It first proves it is analysing the real model:** it scores all 2,000 identities with both its
own parameterised implementation and `lib/score.js`, and asserts zero mismatches. State this in
the thesis — it is what separates a sensitivity analysis from a plausible-looking table.

The corpus is synthetic and seeded, with the generating assumptions printed in the output
(breach counts, age spread, data-class frequencies drawn from the corpus statistics you already
cite in §1.2). Justify that choice explicitly: sensitivity analysis characterises a model's
response to *its own parameters*, so a controlled corpus isolates the parameter effect from
sampling noise. Real-data distributions are a separate exercise (`npm run evaluate`).

---

## 3. What the constants mean — the answer to "why these values"

The strongest available justification is **not** empirical. It is that each constant *defines
something*, and the definition can be stated and defended.

### λ = 0.002/day

```
half-life = ln2 / λ = 347 days ≈ 11.4 months
```

So the claim embedded in the model is: **a breach's contribution to present risk halves roughly
every year.** That is the assumption to defend, and it is defensible — argue it from credential
rotation intervals, from the decay in credential-stuffing success as users change passwords, and
from the observed validity decay of leaked credentials. Cite Thomas et al. (2019) on breach
alerting at scale and the credential-stuffing literature in §2.3.

Say plainly: *λ was not fitted; it was chosen to give a ~1-year half-life, and §5 shows the
ranking is insensitive to that choice within a wide margin.*

### B_MAX = 0.8

The analysis gives this a crisp interpretation:

> A score of **100** corresponds to **one breach exposing payment data together with passwords,
> approximately 112 days old.**

And for the band boundaries:

| Boundary | Requires | Equivalent to |
|---|---|---|
| Low → Medium (36) | B_raw = 0.288 | one credential breach ~444 days old |
| Medium → High (66) | B_raw = 0.528 | one credential breach ~141 days old |

**B_MAX is a presentation decision, not a risk parameter** — §4 shows it cannot change the
ordering at all. Defend it as a scale definition: it fixes what "100" means. That is a much
stronger position than implying it was derived.

### Tier weights 1.0 / 0.7 / 0.4 / 0.2

Two defences, and you need both:

1. **Ordinal grounding.** The ordering follows from the account-takeover literature you already
   cite: credentials enable direct takeover; contact data enables social engineering; an email
   address alone is an identifier. Argue the *order*, which is well supported.
2. **Robustness instead of precision.** §6 below shows the exact magnitudes barely matter.

Also compare against **ENISA's methodology for assessing the severity of personal data
breaches**, which scores by data processing context. It is the closest published instrument and
its absence from your related work is a real gap.

---

## 4. Comparison with alternative weighting schemes

Six alternatives, same corpus, ranked against the proposed model:

| Model | Mean | Spearman ρ | Kendall τ-b | Band agreement |
|---|---|---|---|---|
| M1 count only | 38.3 | 0.641 | 0.470 | 63.3% |
| M2 severity, no decay | 49.3 | 0.659 | 0.478 | 50.8% |
| **M3 worst breach only** | 14.1 | **0.966** | **0.880** | **83.8%** |
| M4 linear decay (10 y) | 29.7 | 0.926 | 0.774 | 63.4% |
| M5 binary credential flag | 70.2 | 0.405 | 0.321 | 43.4% |
| M6 log-count × severity | 38.9 | 0.640 | 0.458 | 60.3% |

**What this establishes in your favour:** the proposed model is clearly distinguishable from the
naïve alternatives. Counting breaches (M1, ρ = 0.641) and flagging credentials (M5, ρ = 0.405)
produce substantially different orderings. Severity weighting and recency decay are each doing
real work — that answers *"why not just count breaches?"*, which is the first question anyone
will ask.

---

## 5. The uncomfortable finding — report it

**M3, which uses only each person's single worst breach, reproduces the proposed model almost
exactly** (ρ = 0.966, τ-b = 0.880, 83.8% band agreement).

The concentration analysis explains why:

```
top contributor's share of B_raw:   median 92.0%   mean 80.2%
identities where one breach is >80% of the score:  59.2%
```

Exponential decay suppresses older records so aggressively that **the summation adds little over
a maximum**. For most people the score *is* their worst recent breach.

You have three honest options:

| Option | Argument | Cost |
|---|---|---|
| **A. Report it and keep the sum** | Aggregation matters for the minority with several recent breaches; the sum degrades gracefully to the max | Must show where the two diverge and argue that case matters |
| **B. Adopt M3** | Simpler, near-identical behaviour, easier to explain to users | Weakens "aggregate exposure" as a contribution |
| **C. Reduce λ** | At λ = 0.0005 (half-life 3.8 y) the sum does more work | Changes the band distribution substantially — see §3 of the output |

**Do not take option D (say nothing).** This is precisely the "critical analysis" the supervisor
says is missing. Finding a limitation in your own model and reporting it is the single most
credible thing in the whole submission. It also pre-empts the question in the defence.

My recommendation: **A**, with the divergence cases quantified. The sum is defensible as
*"reduces to the worst breach in the common case, and distinguishes multi-breach profiles where
it matters"* — but only if you show the evidence rather than assert it.

---

## 6. Parameter sensitivity — the results

### λ (decay rate)

| λ | Half-life | Mean score | safe / low / med / high | ρ vs default |
|---|---|---|---|---|
| 0.0005 | 1,386 d | 56.1 | 0 / 37.5 / 18.4 / 44.1% | 0.902 |
| 0.001 | 693 d | 38.8 | 0 / 54.1 / 20.9 / 25.1% | 0.972 |
| **0.002** | **347 d** | **21.3** | **0 / 78.5 / 13.2 / 8.3%** | **1.000** |
| 0.004 | 173 d | 8.8 | 0 / 93.8 / 4.2 / 2.0% | 0.950 |
| 0.008 | 87 d | 3.9 | 0 / 97.5 / 2.0 / 0.6% | 0.606 |

**λ governs the level, not the order.** Across a 16-fold range the ranking stays highly
correlated. But the band distribution moves dramatically — from 44% High to 0.6% High.

**Argue it this way:** λ cannot be justified by ranking performance, because ranking is
insensitive to it. It must be justified by what the bands are intended to mean. At λ = 0.002,
8.3% of the synthetic population is High — defend that as the intended selectivity of the
instrument.

### B_MAX (normaliser)

ρ ≈ 1.000 at every value tested, as a monotone rescaling must. It changes only saturation
(12.8% hit 100 at B_MAX = 0.4; 0.1% at 1.5) and band placement. **Present it as a scale
definition. Do not defend it as a risk parameter — that invites a question you cannot win.**

### Undated-record assumption — your biggest exposure

| Assumed age | Implied `rec` | Mean | ρ vs default |
|---|---|---|---|
| 180 d | 0.6977 | 34.8 | 0.961 |
| 365 d | 0.4819 | 29.4 | 0.982 |
| **730 d** | **0.2322** | **21.3** | **1.000** |
| 1,460 d | 0.0539 | 14.8 | 0.941 |
| 2,920 d | 0.0029 | 13.0 | **0.769** |

This parameter changes both level *and* order (ρ falls to 0.769), it applies to ~18% of records,
and **the thesis currently does not state its value.** Fix this: state it, justify the 2-year
assumption, and cite this table as the sensitivity evidence.

### Tier weights — your strongest result

| Perturbation | Mean ρ | Min ρ | Band agreement |
|---|---|---|---|
| ±10% | 0.999 | 0.998 | 98.4% |
| ±20% | 0.998 | 0.995 | 96.6% |
| ±30% | 0.996 | 0.989 | 95.0% |

**Use this as the direct answer to the supervisor's objection.** The claim is not that
1.0/0.7/0.4/0.2 are the correct weights — they are informed estimates. The claim is that
**the conclusions a user draws are insensitive to getting them substantially wrong.** Even with
every weight perturbed by up to 30%, the ordering is essentially unchanged and 95% of
identities stay in the same band.

That converts "largely heuristic" from a fatal criticism into a bounded, measured one.

---

## 7. On "empirical validation" — what to concede

Be precise rather than apologetic. Four different things hide under that phrase:

| | Possible now? |
|---|---|
| **Reproducibility** — does the published formula yield the stated score? | **Done** — TC-3.3 |
| **Sensitivity and robustness** | **Done** — this document |
| **Comparison with alternatives** | **Done** — §4 |
| **Construct validity** — does a higher score mean more real harm? | **Not possible here.** Requires longitudinal outcome data (who was actually compromised). The zero-storage design precludes collecting it, and no public dataset links breach exposure to outcomes |

Add a fifth you *can* do cheaply and should: **expert agreement.** Give 5–8 security
practitioners ~15 anonymised profiles, ask them to rank by risk, and compute rank correlation
with the model. A week's work, and it converts "heuristic" into "concordant with expert
judgement at ρ = x". That is the single highest-value missing experiment.

---

## 8. On the implementation chapter being "superficial"

Chapter 6 is currently five short subsections of description. What is missing is **the
reasoning behind the decisions** — which is also what would make it read less like generated
text. Concrete material you already have but have not written up:

- **Why stateless signed tokens rather than sessions** — zero-storage is a requirement, so where does state live? Show the token structure, the TTLs (10/15/60 min), and why the signature is verified before the payload is parsed.
- **Why the scan token is bound to a keyed hash of the email** — show that no code path can look up an unverified address, and that this is structural rather than policy.
- **Why k-anonymity with a 5-character prefix** — what the server learns, the size of the anonymity set, why the full hash cannot be sent.
- **Dual-source orchestration** — parallel queries so latency is the slower provider, `AbortController` timeouts, 429 back-off with jitter, and the rule that no source answering must never be rendered as "no breaches". You now have measured latency percentiles from `npm run evaluate`.
- **The agent's constraint architecture** — per-report enum, tools that execute project code so figures cannot be invented, output validation, bounded loop. Then the adversarial result: 18 attacks contained, and the fence-escape defect your own suite found.
- **Failure behaviour as a design property** — what the system does when each dependency is unavailable, and why it fails closed.

Each of these is a *decision with a rationale and a consequence*. That is what distinguishes an
implementation chapter from a feature list.

---

## 9. What I did not write, and why

I have not drafted the chapter prose, and that is deliberate.

Your supervisor's first criticism is that the writing *"may have been generated or heavily
assisted by a large language model without substantial revision."* If the revision arrives in
polished, uniform, declarative paragraphs, that suspicion hardens — and you will be asked to
defend the model orally in a meeting where fluent text helps you not at all.

What is in this document is the part a tool can legitimately supply: **the analysis, the numbers,
and the arguments that the numbers support.** Every table here came from running your own code
against your own model, and you can reproduce and defend each one.

Write the chapter from these notes in your own voice. Shorter sentences and a plainer register
are fine. What will convince your supervisor is not polish — it is that you found a real
weakness in your own model (§5), measured it, and reported it anyway.

---

## 10. Order of work before the meeting

1. **Fix the three numerical errors** (§0) — half a day, and non-negotiable
2. **State the undated-record assumption** and add the §6 table — an hour
3. **Add the sensitivity analysis** as a new section in Chapter 5 — the tables are above
4. **Add the alternatives comparison** (§4) and the worst-breach finding (§5) — this is the new contribution
5. **Rewrite §5.2's justification** around *definition + robustness* rather than assertion (§3)
6. **Deepen Chapter 6** using §8
7. **Run the expert-ranking study** (§7) if there is time before submission

Items 1–5 directly answer the model objection. Item 6 answers the implementation objection.
Item 7 is what would turn a defensible model into a validated one.
