# Exposio — User Study Protocol

**Version:** 1.0 · **Date:** 8 October 2026
**Researcher:** Abdullah Esmail Mohammed Salem, MSc Cyber Security Engineering, Óbuda University
**Supervisor:** Balázsné Dr. Kail Eszter
**Ethics approval reference:** _[to be inserted before recruitment — set `EXPOSIO_ETHICS_REF`]_

> **Do not recruit before ethics approval is granted.** This document is written to be submitted
> as part of that application.

---

## 1. Purpose

This study addresses the question raised in review:

> *"How could the Exposure Score be empirically validated … and how could the effectiveness of
> ExpoBot's recommendations in improving users' privacy-related behaviour be measured?"*
> — Reviewer 1, 27 April 2026

### Research questions

| | Question | Measured by |
|---|---|---|
| **RQ1** | Can users correctly interpret the Breach Risk score and the exposure/residual distinction? | Comprehension items, post-questionnaire |
| **RQ2** | Does the ranked action plan change intention to act, and does intention translate into completed actions? | Pre/post intention items; follow-up completion |
| **RQ3** | What mitigation factors should replace the provisional values in `lib/playbook.js`? | Follow-up: which actions completed, by action ID |
| **RQ4** | Is the system usable by non-experts? | System Usability Scale (SUS) |
| **RQ5** | How is exposure distributed across ordinary accounts? | Self-reported band and breach count |

---

## 2. Design

Within-subjects, three waves:

```
Wave 1  Pre-questionnaire      prior behaviour, risk perception, intention       ~5 min
          ↓
Wave 2  Task + post-questionnaire   use Exposio on own address; comprehension,
                                    intention, trust, SUS                        ~20 min
          ↓  (14 days)
Wave 3  Follow-up               which recommended actions were completed          ~4 min
```

Waves 1 and 2 run in one session. Wave 3 is sent by email 14 days later.

---

## 3. Participants

| | |
|---|---|
| **Target n** | 30 completing waves 1–2; ≥ 18 completing wave 3 |
| **Minimum viable** | 20 (SUS stabilises around 12–15; correlation needs ~25) |
| **Recruitment** | Óbuda University students and staff; departmental mailing list and noticeboards |
| **Inclusion** | 18+, holds an email address they have controlled for ≥ 2 years, sufficient English or Hungarian |
| **Exclusion** | Members of the supervisory team; anyone who contributed to the system's development |
| **Incentive** | None, or a nominal draw entry — must not be large enough to pressure participation |
| **Pilot** | 5–8 participants first, to check timing and item wording. Pilot data excluded from analysis |

**Why ≥ 2 years:** addresses created recently rarely appear in breach corpora, which would yield
a score of 0 and leave nothing to interpret or act on.

---

## 4. Ethics and risk

### 4.1 Consent

Written informed consent before wave 1, using `docs/CONSENT_FORM.md`. Participants may withdraw
at any time without giving a reason; data already collected is deleted on request up to the
point of anonymised analysis.

### 4.2 Foreseeable risks and mitigations

| Risk | Mitigation |
|---|---|
| **Distress.** Seeing a password you still use listed in a breach is upsetting | The task ends with the ranked action plan, so no participant leaves with a problem and no remedy. The researcher is present and offers to work through the first action |
| **Disclosure to the researcher.** A participant's breach list is sensitive and may imply special-category data (Art. 9) — breach membership can reveal health, religion or sexual orientation | **The researcher never sees the results.** Participants work on their own device and report only the band and the count. The researcher does not look at the screen during the report phase, and this is stated aloud |
| **Participant checks someone else's address** | Structurally prevented: the one-time code goes to the mailbox being checked |
| **Password entry** | Optional. If used, the password never leaves the browser (5 hash characters only). Participants are told they may skip this part entirely |
| **Re-identification via questionnaire data** | Pseudonymous participant IDs; no name or email in the response data; the ID↔contact mapping is held separately and destroyed after wave 3 |

### 4.3 Data protection

**The application stores nothing.** The research data comes from the questionnaires, which are a
separate instrument.

| Data | Where | Retention |
|---|---|---|
| Questionnaire responses, keyed by participant ID | University survey platform (LimeSurvey) or equivalent EU-hosted service | Until thesis defence + 1 year, then deleted |
| ID ↔ email mapping (for wave 3 only) | Separate encrypted file, researcher's device | Destroyed once wave 3 closes |
| Signed consent forms | Paper, locked storage | Per university policy |
| Breach results | **Not collected** | n/a |

Lawful basis: consent (Art. 6(1)(a)). Participants are informed of the right to withdraw,
access, and erasure.

### 4.4 DeHashed

**Disabled for the study.** DeHashed returns raw leaked records rather than breach metadata,
which raises a materially different legal question. Only HIBP is enabled for participants.

---

## 5. Materials

### 5.1 Wave 1 — Pre-questionnaire (~5 min)

*Participant ID: ________*

**A. Background**
1. Age group: 18–24 / 25–34 / 35–44 / 45–54 / 55+
2. Field of study or work: Computing or IT / Engineering (non-IT) / Other
3. How would you rate your own computer security knowledge? *(1 = none, 5 = expert)*

**B. Current practice** — *yes / no / not sure*
4. Do you use a password manager?
5. Do you use two-step verification on your main email account?
6. Do you reuse the same password on more than one website?
7. Have you ever checked whether your email appears in a data breach?

**C. Risk perception** *(1 = strongly disagree, 5 = strongly agree)*
8. My personal data has probably been exposed in a data breach.
9. If my data were exposed, it could cause me real harm.
10. I know what I would need to do about it.

**D. Intention** *(1 = very unlikely, 5 = very likely)*
11. In the next two weeks, how likely are you to change a password?
12. In the next two weeks, how likely are you to turn on two-step verification somewhere?

### 5.2 Wave 2 — Task script

Read aloud, verbatim, so every session is the same.

> *"You'll use a tool called Exposio to check your own email address against known data
> breaches. It's a research prototype I built; there are no right or wrong answers, and I'm
> testing the tool, not you.*
>
> *You'll work on your own device. I won't look at your screen while your results are shown —
> what you find is yours, and I don't need to see it. I'll only ask you afterwards for two
> numbers from the summary.*
>
> *Please think aloud as you go. If something is confusing, say so — that's exactly what's
> useful to me.*
>
> *You can stop at any point, for any reason."*

**Tasks**

| # | Task | Observed |
|---|---|---|
| T1 | Open `https://exposio.eu` and check your own email address | Completion; time; hesitation at the consent checkbox |
| T2 | Without scrolling to the explanation, say in your own words what your score means | Unprompted interpretation *(RQ1)* |
| T3 | Open the **Details** tab and find which single breach contributes most to your score | Can the user trace the number to its cause *(RQ1)* |
| T4 | Open **Actions**. Which would you do first, and why? | Does the ranking match the user's own priority *(RQ2)* |
| T5 | Mark one action as done and describe what changed on screen | Is the exposure/residual distinction understood *(RQ1)* |
| T6 | Ask ExpoBot one question of your choice | Question type; whether the answer is trusted |
| T7 | *(Optional)* Check a password you no longer use | Taken up or declined; stated reason |

**Observation notes** record behaviour and quotes only — never the content of the report.

### 5.3 Wave 2 — Post-questionnaire (~10 min)

**E. Your result** *(transcribed by the participant)*
13. Which band was shown? Safe / Low / Medium / High
14. How many breaches were listed? ____
15. *(If you completed T5)* What was the "left after your fixes" figure? ____

**F. Comprehension** *(RQ1)*
16. In your own words, what does the score measure? *(free text)*
17. True or false: "If I complete all the recommended actions, my exposure score will fall to zero." *(correct answer: **false** — exposure does not fall; residual risk does)*
18. True or false: "The tool stored my email address so it can notify me later." *(correct answer: **false**)*
19. Which breach contributed most to your score, and why do you think that was? *(free text)*

**G. Trust and perceived accuracy** *(1–5)*
20. The score seemed accurate for my situation.
21. I understood where the number came from.
22. I trusted the recommended actions.
23. I would be comfortable recommending this tool to a friend or family member.

**H. ExpoBot** *(1–5, plus free text)*
24. ExpoBot's answer was useful.
25. ExpoBot's answer was accurate as far as I could judge.
26. Did ExpoBot say anything that seemed wrong or made-up? *(free text)* — **flag any "yes" for inspection**

**I. Intention** *(1–5, mirrors items 11–12)*
27. In the next two weeks, how likely are you to change a password?
28. In the next two weeks, how likely are you to turn on two-step verification somewhere?
29. Which of the recommended actions do you intend to complete? *(tick all; record action IDs)*

**J. System Usability Scale** *(Brooke, 1996 — 1 = strongly disagree, 5 = strongly agree)*

| # | Item |
|---|---|
| 30 | I think that I would like to use this system frequently. |
| 31 | I found the system unnecessarily complex. |
| 32 | I thought the system was easy to use. |
| 33 | I think that I would need the support of a technical person to be able to use this system. |
| 34 | I found the various functions in this system were well integrated. |
| 35 | I thought there was too much inconsistency in this system. |
| 36 | I would imagine that most people would learn to use this system very quickly. |
| 37 | I found the system very cumbersome to use. |
| 38 | I felt very confident using the system. |
| 39 | I needed to learn a lot of things before I could get going with this system. |

*Scoring: odd items contribute (score − 1); even items contribute (5 − score); sum × 2.5 gives
0–100. Benchmark: 68 is average; above 80 is good.*

**K. Open feedback**
40. What was most confusing?
41. What would you change?

### 5.4 Wave 3 — Follow-up, 14 days (~4 min)

*Participant ID: ________*

42. Since the session, which of these have you completed? *(list the action IDs they were shown; yes / no / started but not finished, per action)*
43. For any not completed: what stopped you? *(too difficult / no time / didn't seem important / forgot / other)*
44. Have you checked your exposure again since? *(yes / no)*
45. Anything else you'd like to add? *(free text)*

**Item 42 is the primary input to RQ3** — the observed completion rates and their association
with the estimated point reductions are what replace the provisional mitigation factors.

---

## 6. Analysis plan

| RQ | Analysis |
|---|---|
| RQ1 | Proportion correct on items 17 and 18; thematic coding of items 16 and 19. Pre-registered target: ≥ 70% correct on item 17 |
| RQ2 | Wilcoxon signed-rank on items 11–12 vs 27–28 (pre/post intention). Intention (item 29) vs completion (item 42) |
| RQ3 | Completion rate per action ID; relationship between a user's estimated point reduction and the likelihood of completing that action. Revised factors proposed, with the revision documented rather than silently applied |
| RQ4 | SUS score: mean, SD, comparison with the 68 benchmark |
| RQ5 | Descriptives of bands and breach counts; compared with the researcher-run distribution from `npm run evaluate` |

**Reporting integrity.** Pilot data is excluded and reported as excluded. Non-completers are
reported with the reason where known. Any item 26 flag (ExpoBot said something wrong) is
reported in full, regardless of how it reflects on the system — this is the measure that matters
most for the safety claims in `docs/REVIEWER-RESPONSE.md`.

---

## 7. Before the first session — checklist

- [ ] Ethics approval granted; `EXPOSIO_ETHICS_REF` set on the deployment
- [ ] `EXPOSIO_CONTACT_EMAIL` set, so `/privacy` shows a real contact
- [ ] DeHashed disabled for the study (`DEHASHED_API_KEY` removed from Production)
- [ ] `ANTHROPIC_API_KEY` set with a spend limit, so ExpoBot is available to every participant
- [ ] Domain `exposio.eu` pointing at the application
- [ ] Verification email delivery confirmed to a non-researcher address
- [ ] Questionnaires built in the university survey platform; participant IDs pre-generated
- [ ] Pilot run with 5–8 participants; timing and wording adjusted
- [ ] Consent forms printed
