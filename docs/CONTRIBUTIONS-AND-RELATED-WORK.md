# Exposio — Contributions and Related Work

**Draft for the thesis.** Section numbering assumes this sits after the introduction and
before the system design chapter. Citations are given in author–year form; **verify each
reference against the original before submission** — the bibliography at the end lists what
needs checking.

---

## 1. Related work and positioning

The work sits at the intersection of four literatures that rarely meet: breach notification
services, credential-leak search, security-advice effectiveness, and the safety of
LLM-mediated advice. Positioning matters here more than usual, because the system is easily
mistaken for a client of Have I Been Pwned. The distinction is not the data source; it is
what is produced from it and for whom.

### 1.1 Breach notification services

Have I Been Pwned (HIBP) is the reference implementation of public breach notification. A
user submits an address and receives the set of breaches it appears in, with dates and the
categories of data exposed. HIBP's contribution is coverage, curation and reach, and it has
become the de facto corpus for research in this area.

What HIBP produces is **set membership**: the address is, or is not, in each breach. Breaches
are not weighted against one another. A 2011 forum leak of email addresses and a 2024 leak of
payment data are presented as two entries in the same list. There is no aggregate quantity,
no notion of decay, and therefore nothing to compare across people or across time.

HIBP also performs no ownership check for ordinary breaches: any visitor may query any
address. Breaches flagged *sensitive* are the exception and are released only to a verified
owner — an acknowledgement, within HIBP's own design, that disclosure of membership can harm
the subject. Exposio generalises that exception into the default.

### 1.2 Credential-leak search and OSINT tooling

DeHashed, and the wider OSINT family (Maltego, SpiderFoot, Holehe, theHarvester, Epieos),
occupy a different position again. These return **records**, not metadata: leaked passwords,
addresses, phone numbers, usernames, and the links between them. They are built for
investigation — the design centre is an analyst learning about a subject who is not the
analyst.

Two consequences follow. First, the output is evidence, not a decision: the tool does not say
what the subject should do. Second, and more importantly for this work, the entire category
assumes the operator and the data subject are different people. Exposio inverts that
assumption, and enforces the inversion in code rather than in an acceptable-use policy.

### 1.3 Password compromise checking

Checking a password against a breach corpus without disclosing it is a solved problem. The
k-anonymity construction used by Pwned Passwords — send the first five characters of the
SHA-1 digest, receive the matching suffix bucket, complete the comparison locally — is
described by Ali (2018) and analysed alongside alternatives by Li et al. (2019). Thomas et
al. (2019) report deployment experience at scale in Google Password Checkup.

Exposio adopts this construction unchanged. It is cited not as a contribution but as a design
constraint the architecture had to respect: the password check is the one operation that must
not reach the server, and the rest of the system is built so that this remains visibly true.
NIST SP 800-63B's requirement that verifiers compare prospective secrets against known-
compromised lists supplies the normative justification for offering the check at all.

### 1.4 Severity assessment of personal data breaches

The regulatory literature has an established vocabulary for breach severity. ENISA's
methodology (2013) scores a breach from the data processing context, ease of identification
and circumstances of the breach, and the EDPB's notification guidelines use a comparable
framing to decide when subjects must be informed.

That work assesses severity **from the controller's perspective**, for one breach, to decide
notification. It is not an individual-level measure and does not aggregate across the many
breaches an ordinary person accumulates over fifteen years. Exposio's severity tiers are
constructed in the same spirit and at the same granularity (which categories of data were
exposed), but composed into a per-subject aggregate. ENISA therefore supplies the strongest
available external basis for the tier weights, which is how it is used in §3.1.

### 1.5 Security advice and user behaviour

A consistent finding across this literature is that advice fails for reasons unrelated to its
technical correctness. Herley (2009) argues that users' rejection of security advice is
economically rational when the advice ignores the cost it imposes. Ion, Reeder and Consolvo
(2015) show that expert and non-expert practices diverge sharply, and that non-experts act on
advice of low expert-rated value. Redmiles et al. (2020) evaluate security advice published
on the web and find it abundant, frequently poor, and almost never prioritised.

Two design requirements follow, and both are visible in the system: advice must be **ranked**,
because users cannot act on everything; and the ranking must be **justified by a quantity**,
because otherwise it is one more unsourced list. This is the literature that motivates the
residual-risk model rather than a plain checklist.

### 1.6 LLM-mediated advice and its failure modes

Attaching a language model to a security tool introduces failure modes the tool did not
previously have. Perez and Ribeiro (2022) demonstrate goal hijacking and prompt leaking by
direct instruction. Greshake et al. (2023) show that in applications that retrieve external
content, the attacker need not be the user at all: instructions placed in retrieved data are
executed by the model — *indirect* prompt injection. The OWASP Top 10 for LLM Applications
(2025) codifies these alongside improper output handling, excessive agency and unbounded
consumption, and the NIST AI Risk Management Framework (2023) supplies the governance framing.

This threat applies directly and non-hypothetically to Exposio. Breach records are untrusted
third-party content: DeHashed returns raw `database_name` strings taken from leaked dumps,
which no one has curated, and an attacker who can get a string into a breach corpus can get
that string into the model's context. §3.4 reports a defect of exactly this shape, found by
the adversarial suite in this system.

The prevailing evaluation practice in this area is to red-team **the model** — to measure how
often a given model resists a given attack. That measures a property of the model, which
changes with every version. The approach taken here is to assume the model has already been
compromised and to measure what the **application** still prevents.

### 1.7 The gap

| | Quantifies exposure | Subject-bound | Ranked remediation | Progress measurable | LLM output constrained |
|---|---|---|---|---|---|
| HIBP | — | partial (sensitive only) | generic | — | n/a |
| DeHashed / OSINT | — | — | — | — | n/a |
| Password checkers | — | n/a | single action | — | n/a |
| ENISA methodology | per breach, controller-side | — | — | — | n/a |
| Commercial "dark web monitoring" | opaque | account-based | varies | — | typically unconstrained |
| **Exposio** | **yes, published formula** | **yes, enforced** | **yes, quantified** | **yes, residual risk** | **yes, with adversarial evidence** |

No existing system combines a transparent individual-level exposure metric with
architecturally enforced subject binding and a remediation model whose effect is computed
rather than asserted. That combination is the space this work occupies.

---

## 2. Problem statement

Breach data is abundant and individually interpretable only as a list. A person who learns
they appear in fourteen breaches has gained information but not a decision: they cannot tell
whether their situation is ordinary or severe, which of the fourteen matters, what to do
first, or whether anything they do improves it.

The research problem is therefore one of **operationalisation**: converting breach membership
into a measurement that is transparent, reproducible, bounded, subject-safe, and attached to
actions whose effect is calculable.

---

## 3. Contributions

Four claims. Each is stated with the artifact that implements it and the test that evidences
it, so that an examiner can verify rather than accept.

### C1 — An individual-level exposure metric with a published, reproducible formula

Exposure is operationalised as the thesis Breach Risk component *B*:

```
B_raw = Σ  severity(dataClasses) × exp(−λ · age_days)          λ = 0.002  (half-life ≈ 347 days)
score = min(1, B_raw / B_MAX) × 100                             B_MAX = 0.8
```

Severity is assigned by the worst category of data exposed in each record (payment data with
passwords 1.0; passwords 0.7; phone or physical address 0.4; email only 0.2). Records without
a breach date are scored at an assumed age of 730 days, and the interface marks them
`undated*` rather than hiding the assumption.

Two properties distinguish this from a count of breaches. Breaches are **weighted** against
one another by the harm the exposed categories enable, and their contribution **decays**, so
the measure reflects present rather than historical exposure.

| Implements | Evidenced by |
|---|---|
| `lib/score.js` | TC-3.1 – TC-3.7; TC-3.3 reproduces the thesis worked example (*B* = 0.64) |

The formula is published in the interface itself: the Details tab shows each breach's
contribution, their sum, and the normalisation, so a user can recompute the score by hand.
Transparency here is a design requirement, not a courtesy — an opaque risk score is indistinguishable
from a marketing device.

### C2 — Subject binding enforced architecturally rather than by policy

Every comparable tool is capable of being pointed at a stranger. Exposio is not. An address is
looked up only after a one-time code has demonstrated control of the mailbox, and the
demonstration is carried in a signed, expiring token bound to a keyed hash of that address.
`/api/breach` recomputes the hash and refuses any token that does not match.

The property is structural: there is no code path, privileged role, or configuration flag that
performs an unverified lookup. The consequence is that Exposio belongs to a different class of
tool from the OSINT family — it cannot be repurposed for investigation.

| Implements | Evidenced by |
|---|---|
| `app/api/verify/start`, `app/api/verify/check`, `app/api/breach`, `lib/tokens.js` | TC-1.4 – TC-1.10; TC-1.8 (a scan token cannot act as a report token); production returns `unverified` for a forged token (§7.1 of the test specification) |

This is GDPR Art. 25 — data protection by design and by default — demonstrated in executable
form. The supporting architecture is a zero-persistence design: no database, no account, no
history; what must survive between steps travels as a signed token held in browser memory, and
the only server-side residue is rate-limit counters keyed by HMAC hashes that expire within
24 hours.

### C3 — Separation of exposure from residual risk

The system distinguishes two quantities that comparable tools conflate:

- **Exposure** — what is in the breach corpus. It does not fall when the user acts, because
  leaked data cannot be recalled.
- **Residual risk** — exposure after completed mitigations, computed per breach as
  `contribution × Π(1 − f_i)` over the completed actions whose mitigation rules match that
  breach's exposed categories.

Each action therefore carries a computed *estimated point reduction*, which supplies the
ranking that §1.5 argues is required, and the user's progress is visible without implying
that the underlying exposure has changed.

| Implements | Evidenced by |
|---|---|
| `lib/playbook.js` — ten human-authored, version-controlled actions | TC-4.1 – TC-4.5; TC-4.3 asserts residual falls while exposure is unchanged; TC-4.4 asserts preventive actions do not inflate progress |

The refusal to let a user reach zero is an integrity property. `GDPR_REQUEST` is defined with
no mitigation factor at all, because erasure prevents future disclosure but does not retrieve
copies already circulating — the honest answer, and the commercially inconvenient one.

### C4 — Grounded generation: an assistant that cannot fabricate security advice

The assistant (ExpoBot) is an agent with tools over the signed report rather than a chat
wrapper over a prompt. The division of labour is strict: **the model chooses what to say
about the user's situation; the code decides what to do and what it is worth.**

- Actions may be referenced only by identifier, from an enum generated per report, so an
  inapplicable or invented action cannot be expressed.
- Every figure the user reads is produced by a tool that executes project code —
  `simulate_fixes` calls `residualScore()`, `list_actions` calls `estimatedReduction()`.
  The model cannot state a number it invented.
- Untrusted third-party breach names are fenced, and the fence delimiters are stripped from
  the data placed inside it.
- Output is validated server-side: unknown identifiers dropped, URLs removed, length and
  counts capped, GDPR letter targets checked against the user's own breached companies.
- The loop is bounded at `MAX_TOOL_ROUNDS + 1` model calls, with a cap on tool calls per round.

| Implements | Evidenced by |
|---|---|
| `lib/agent.js`, `lib/expobot.js`, `app/api/chat` | TC-6.1 – TC-6.5, TC-8.1 – TC-8.6, TC-10.1 – TC-13.3 |

**The evaluation method is itself part of the contribution.** `scripts/redteam.mjs` injects a
deliberately hostile model implementation into the production agent loop — the same function
the API route executes — and asserts containment across eighteen attacks spanning fabricated
advice, phishing-link injection, letter misdirection, budget exhaustion, tool abuse and
indirect prompt injection. Because the threat model assumes the model is attacker-controlled,
the result is a property of the system rather than of the model version in use.

**A real defect was found by this method and is reported rather than quietly fixed.** Two
injection cases failed when first written: a breach title containing `BREACHES>>>` closed the
untrusted-data fence, so the remainder of the title was interpreted as prompt rather than
data. Since DeHashed returns uncurated `database_name` strings from leaked dumps, the input
path was attacker-reachable. The fix (`fenceSafe()` in `lib/expobot.js`) strips delimiters and
line breaks from every value placed inside the fence, and the two cases are retained as
regression tests.

---

## 4. What this work does **not** claim

Stated explicitly, because the boundary is part of the contribution.

1. **Not a validated predictor of harm.** The score is a transparent, face-valid, reproducible
   operationalisation of exposure. No outcome data links scores to account compromise, and no
   such claim is made. Establishing predictive validity would require longitudinal data the
   zero-persistence design deliberately does not collect.
2. **Only component *B*.** The thesis Exposure Score defines five components; one is
   implemented. The interface therefore names the figure "Breach Risk score" rather than
   "Exposure Score".
3. **Mitigation factors are provisional.** The factors in `lib/playbook.js` are informed
   estimates, marked as such in the source. Calibrating them is the purpose of the user study.
4. **Severity tiers require external grounding.** The four tiers are defensible but currently
   under-sourced; ENISA (2013) supplies the basis against which they should be justified or
   revised.
5. **Data-source integration is engineering, not contribution.** Querying HIBP and merging
   across providers is competent work, not novel work.
6. **Single live source during evaluation.** DeHashed was unavailable (account-side, HTTP 403)
   throughout the evaluation period; cross-source merging is evidenced against fixtures
   (TC-5.2) rather than live data.
7. **No certification.** The system aligns with the standards referenced in the test
   specification; it is certified against none of them.

---

## 5. Summary statement

> Exposio reframes breach data from an investigative lookup into a self-assessment instrument:
> a transparent, reproducible exposure metric computed only for a verified data subject,
> coupled to a vetted remediation model whose effect on residual risk is calculated rather
> than asserted, and to an LLM assistant that is architecturally prevented from fabricating
> security advice — demonstrated by an adversarial evaluation that assumes the model is
> attacker-controlled.

---

## 6. Bibliography — verify before citing

Each entry needs checking against the original; details below are from memory and may contain
errors in volume, page or year.

**Breach data and credential checking**
- Ali, J. (2018). *Validating Leaked Passwords with k-Anonymity.* Cloudflare.
- Li, L., Pal, B., Ali, J., Sullivan, N., Chatterjee, R., Ristenpart, T. (2019). *Protocols for Checking Compromised Credentials.* ACM CCS.
- Thomas, K. et al. (2019). *Protecting accounts from credential stuffing with password breach alerting.* USENIX Security.
- NIST SP 800-63B, *Digital Identity Guidelines: Authentication and Lifecycle Management* — cite the current revision.

**Breach severity and regulation**
- ENISA (2013). *Recommendations for a methodology of the assessment of severity of personal data breaches.*
- EDPB, *Guidelines on personal data breach notification under Regulation 2016/679* — cite the current version.
- Regulation (EU) 2016/679 (GDPR), Articles 5, 6, 7, 9, 12–15, 17, 19, 25, 30, 32, 35, 44–49.
- Regulation (EU) 2024/1689 (AI Act), Article 50 (transparency).

**Security advice and user behaviour**
- Herley, C. (2009). *So Long, and No Thanks for the Externalities: The Rational Rejection of Security Advice by Users.* NSPW.
- Ion, I., Reeder, R., Consolvo, S. (2015). *"...no one can hack my mind": Comparing Expert and Non-Expert Security Practices.* SOUPS.
- Redmiles, E. et al. (2020). *A Comprehensive Quality Evaluation of Security and Privacy Advice on the Web.* USENIX Security.

**LLM security**
- Perez, F., Ribeiro, I. (2022). *Ignore Previous Prompt: Attack Techniques For Language Models.*
- Greshake, K. et al. (2023). *Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection.* ACM AISec.
- OWASP (2025). *Top 10 for LLM Applications.*
- NIST (2023). *AI Risk Management Framework 1.0* (AI 100-1).

**Method**
- ISO/IEC/IEEE 29119-3, *Software testing — Test documentation.*
- ISO/IEC 25010, *Systems and software quality models.*
- ISO 9241-11 / 9241-210, *Usability* and *Human-centred design.*
- Brooke, J. (1996). *SUS: A quick and dirty usability scale.*
- Dittrich, D., Kenneally, E. (2012). *The Menlo Report: Ethical Principles Guiding Information and Communication Technology Research.* U.S. DHS.
