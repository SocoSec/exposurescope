# Exposio — Implementation Status

**Date:** 2026-10-08 · **Commit:** `docs-test-spec` · **Live:** https://exposurescope.vercel.app

This document exists to answer one question precisely, and to answer it the same way whether
the reader is a supervisor, a reviewer, or someone who opens the repository:

> *"Which components of the Exposio system have actually been implemented at prototype level,
> and which remain at the specification or future development stage?"*
> — Reviewer 1 (Leitold Ferenc), TDK review, 27 April 2026

Every row below is marked **Implemented**, **Partial**, or **Not implemented**, with the file
that contains it and the test that demonstrates it. Nothing is listed as implemented unless a
reader can run it.

**Verification:** `npm run selftest` (41 cases) · `npm run redteam` (18 attacks) · `npm run build`

---

## 1. Summary

| | Count |
|---|---|
| Implemented and tested | 12 |
| Partially implemented | 3 |
| Specified but not implemented | 7 |

The system is a **working deployed application**, not a design document. The components that
remain unimplemented are stated plainly in §4 rather than left for a reader to discover.

---

## 2. Implemented

Each of these runs in production today.

| Component | What it does | File | Evidence |
|---|---|---|---|
| **Breach Risk score (component *B*)** | `B_raw = Σ severity × exp(−0.002 × age_days)`, normalised to 0–100 | `lib/score.js` | TC-3.1 – TC-3.7; TC-3.3 reproduces the thesis worked example |
| **Severity tier model** | 4 tiers: payment+password 1.0, password 0.7, phone/address 0.4, email only 0.2 | `lib/score.js` | TC-3.1, TC-3.2, TC-3.7 |
| **Recency decay** | λ = 0.002/day (half-life ≈ 347 days); undated records scored at 730 days and marked | `lib/score.js` | TC-3.4 |
| **Zero-storage architecture** | No database. State travels as HMAC-signed expiring tokens; only rate-limit counters persist, keyed by hash, ≤ 24 h | `lib/tokens.js`, `lib/crypto.js` | TC-1.4 – TC-1.10 |
| **Email ownership verification** | 6-digit code → signed challenge → scan token bound to a keyed hash of the address | `app/api/verify/*` | TC-1.8, TC-1.10; production returns `unverified` for a forged token |
| **HIBP integration** | `breachedaccount` with timeout, 429 back-off honouring `Retry-After`, jitter | `lib/sources.js` | Live: 271 breaches returned for a verified address |
| **DeHashed integration** | v2 `/search` with the correct header auth | `lib/sources.js` | Implemented; **provider account inactive** — see §3 |
| **Cross-source merge** | Deduplicates one breach appearing under different provider names; HIBP metadata wins | `lib/sources.js` | TC-5.1 – TC-5.3 |
| **Password check (k-anonymity)** | SHA-1 in the browser, first 5 hash characters sent, comparison completed locally | `app/page.js` | TC-3.7 |
| **Vetted action library** | 10 human-authored, version-controlled actions with mitigation factors | `lib/playbook.js` | TC-4.1, TC-4.2 |
| **Residual-risk model** | `contribution × Π(1 − f_i)` per breach; exposure never falls, residual does | `lib/playbook.js` | TC-4.3, TC-4.4 |
| **GDPR Art. 15 / 17 letters** | Template-generated request letters, never model-generated | `lib/gdpr.js` | TC-9.1 |

### 2.1 ExpoBot — implemented and extended beyond the thesis specification

The thesis described ExpoBot as an intervention layer that converts risk output into
user-level recommendations. What is built is an **agent** with tools over the signed report,
plus an adversarial evaluation that the thesis did not propose.

| Component | File | Evidence |
|---|---|---|
| Agent tools (`list_actions`, `simulate_fixes`, `breach_details`) — every figure computed by project code, not generated | `lib/agent.js` | TC-8.1 – TC-8.3 |
| Bounded loop: ≤ `MAX_TOOL_ROUNDS + 1` model calls, forced `respond` on the last round | `lib/agent.js` | TC-8.6, TC-11.1 |
| Closed action set: per-report enum, so an inapplicable action cannot be expressed | `lib/expobot.js` | TC-6.2, TC-10.1, TC-10.2 |
| Untrusted-data fencing with delimiter stripping (`fenceSafe`) | `lib/expobot.js` | TC-13.1 – TC-13.3 |
| Server-side output validation: unknown IDs dropped, URLs removed, counts capped | `lib/agent.js` | TC-6.3, TC-10.3 – TC-10.7 |
| **Adversarial evaluation under a hostile-model threat model** | `scripts/redteam.mjs` | 18 attacks, 0 escaped |

### 2.2 Operational controls

| Component | File | Evidence |
|---|---|---|
| Rate limiting (per IP, per email, global daily caps) | `lib/ratelimit.js` | TC-2.3 |
| Fail-closed behaviour: no signing secret, no breach source, or no email → refuse rather than degrade silently | `app/api/*` | Live probes return `unavailable` / `sources_down` / `email_unavailable` |
| Testing switches gated out of production | `lib/config.js` | TC-7.1 |
| Security headers (CSP, HSTS, frame-ancestors, referrer policy) | `next.config.js` | Verified live |
| Email authentication: SPF, DKIM, DMARC on `exposio.eu`, EU sending region (Ireland) | DNS + Resend | Verified 8 Oct 2026 |
| Evaluation harness for scoring the model over real addresses without the web flow | `scripts/evaluate.mjs` | Runs offline of the app; consent conditions in the file header |

---

## 3. Partial

| Component | What exists | What is missing |
|---|---|---|
| **Multi-source aggregation** | Two providers implemented, merged, with honest per-source failure reporting | DeHashed has returned HTTP 403 (`Issue with API Key`) throughout the evaluation period — an inactive Search subscription on the provider side, reproduced identically with a deliberately invalid key, so the client is confirmed correct. Cross-source merging is therefore evidenced against fixtures (TC-5.2), not live dual-source data |
| **Exposure Score** | Component *B* (breach exposure) implemented and tested | Four further components specified in the thesis are not implemented. The interface deliberately shows **"Breach Risk score"**, not "Exposure Score", to avoid overstating what is measured |
| **Behavioural nudging** | Ranked actions with computed point reductions, residual-risk tracking, a prompt offering the top three fixes | No measurement of whether nudges change behaviour. That requires the user study (§5) |

---

## 4. Specified but **not** implemented

Stated explicitly. These appear in the thesis and in the reviewers' summaries of it; none exist
in the codebase. A search of the repository for `shodan|bert|bilstm|gbdt|xgboost|tensorflow|torch|GNN`
returns no matches, and the only runtime dependencies are `next`, `react` and `react-dom`.

| Component | Thesis role | Status |
|---|---|---|
| **GBDT risk model** | Gradient-boosted scoring | **Not implemented.** Scoring is a deterministic, published formula — which is a *deliberate* choice: a transparent formula can be recomputed by the user and audited by a reviewer, which a trained model cannot |
| **BERT-BiLSTM NER** | Sensitive-information recognition in text | **Not implemented.** No text-analysis pipeline exists |
| **GNN identity alignment** | Cross-platform identity matching | **Not implemented.** No graph component exists |
| **Shodan integration** | Infrastructure exposure signals | **Not implemented.** No Shodan client, key, or code path |
| **Exposure Score components beyond *B*** | Four further risk dimensions | **Not implemented.** See §3 |
| **DSAR automation** | Automated data subject access requests | **Not implemented.** Letters are generated for the user to send from their own mailbox; Exposio never contacts companies on anyone's behalf — a deliberate limit, not an omission |
| **AI training-data exposure detection** | Future direction in the thesis | **Not implemented** |

### 4.1 Why this matters for the resubmission

The original reviews criticised the work for being *"inkább részletes rendszerterv … mint
teljesen megvalósított rendszer"* — a design rather than a system. That criticism no longer
holds: the system is deployed and working.

The opposite risk now applies. If the written work continues to claim GBDT, BERT-BiLSTM, GNN
and Shodan components while presenting a working implementation, a reviewer who opens the
repository will find the gap, and that is more damaging than the original criticism. The claims
should be narrowed to what exists, with the rest moved to future work explicitly.

Where the implemented approach is *better* than the specified one, say so. The deterministic
scoring formula is the clearest case: it was chosen over a learned model because it is
transparent, reproducible by the user, and auditable by a reviewer — properties a GBDT would
have removed.

---

## 5. Not yet evaluated

| Evaluation | Status | What is needed |
|---|---|---|
| **Score distribution over real accounts** | Instrument ready, data not collected | `npm run evaluate -- addresses.txt` over addresses the researcher owns — hours, not weeks |
| **Latency and rate-limit behaviour under load** | Controls implemented; no measurements | Timing is now recorded by the evaluation harness (§2.2) |
| **Construct validity of the score** | Not established | The score is a transparent operationalisation, **not** a validated predictor of harm. See §6 |
| **User acceptance and behaviour change** | Not started — now unblocked | Study protocol in `docs/STUDY-PROTOCOL.md`; participant verification became possible on 8 Oct 2026 |
| **Comparison against other published scoring systems** | Superficial | Identified as a gap in `docs/CONTRIBUTIONS-AND-RELATED-WORK.md` |

---

## 6. On "False Positive / False Negative" rates

Reviewer 2 proposed validating the model with ~100 control subjects, quantifying false positive
and false negative rates. This deserves a direct answer rather than silent compliance, because
the framing does not fit the construct.

**Breach membership is not predicted; it is retrieved.** Whether an address appears in a given
breach is supplied by Have I Been Pwned, which is the ground truth for this work. Exposio does
not classify, so there is nothing for it to misclassify. A false-positive rate would be a
property of HIBP's corpus, not of this system.

What Exposio produces is a **severity aggregation**: given a known set of breach records, it
assigns a weighted, time-decayed magnitude. Three things can genuinely be validated:

1. **Reproducibility** — does the published formula yield the stated score? *Already demonstrated:* TC-3.3.
2. **Agreement with expert judgement** — do security practitioners rank the same reports in the
   same order the score does? *Measurable with a small expert panel; not yet done.*
3. **Predictive validity** — do higher scores precede more account compromise? *Would require
   longitudinal outcome data that the zero-storage design deliberately does not collect.*

Stating this openly is a stronger position than producing a confusion matrix for a system that
does not classify.
