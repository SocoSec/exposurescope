# Citation map

Twenty peer-reviewed references, mapped to the thesis sections they support.

Every entry was retrieved from Crossref or OpenAlex, so the author list, year, venue
and DOI are taken from the indexing record rather than from recall. **Read at least
the abstract of each before citing it**: a DOI confirms the paper exists and says who
wrote it, not that it supports the sentence you attach it to.

Industry reports are deliberately excluded. The Verizon DBIR already cited in §1.2 and
§5.3 is the one exception, and it is cited for a frequency distribution rather than for
a claim.

---

## §1.2 The scale of the problem · §1.3 Motivation

**Peng et al. (2019). What Happens After You Leak Your Password.** ACM AsiaCCS.
`10.1145/3321705.3329818`
Follows what actually happens to an account after credentials are exposed. Use it where
the thesis asserts that exposure leads to consequences, which is currently asserted
rather than supported.

**Mayer, Zou, Schaub et al. (2021). "Now I'm a bit angry": Individuals' Awareness,
Perception, and Responses to Data Breaches.** USENIX Security. `10.5445/ir/1000132793`
Empirical study of how people actually react to being breached. This is the strongest
available support for the premise that notification alone does not produce action,
which is the gap the whole tool addresses.

## §2.2 Re-identification and the mosaic effect

**Sweeney (2002). k-Anonymity: A Model for Protecting Privacy.** Int. J. Uncertainty,
Fuzziness and Knowledge-Based Systems. `10.1142/s0218488502001648`
The canonical source for combining quasi-identifiers. Cite it for the union term in
§5.8: the reason identity attributes are combined rather than summed.

**de Montjoye et al. (2013). Unique in the Crowd: The privacy bounds of human
mobility.** Scientific Reports. `10.1038/srep01376`
Four spatio-temporal points uniquely identify most individuals. Supports the weight
given to precise location (`geoprecise`) over coarse location.

**El Emam et al. (2011). The re-identification risk of Canadians from longitudinal
demographics.** BMC Medical Informatics and Decision Making. `10.1186/1472-6947-11-46`
A measured re-identification rate on a real population. Useful as a non-US counterpart
to Sweeney, which matters for a European thesis.

## §2.3 Credential exposure and account takeover

**Das, Bonneau, Caesar et al. (2014). The Tangled Web of Password Reuse.** NDSS.
`10.14722/ndss.2014.23357`
Measures reuse across sites. The empirical basis for treating one leaked password as
risk to other accounts.

**Wang & Reiter (2019). How to End Password Reuse on the Web.** NDSS.
`10.14722/ndss.2019.23360`
Countermeasures to reuse. Pairs with the playbook's "change it everywhere" advice.

**Mirian et al. (2019). Hack for Hire: Exploring the Emerging Market for Account
Hijacking.** WWW. `10.1145/3308558.3313489`
Evidence that account takeover is a serviced market. Supports the threat model in §3.3.

## §2.4 Language models as threat and instrument · §6.7 Adversarial evaluation

**Greshake et al. (2023). Not What You've Signed Up For: Compromising Real-World
LLM-Integrated Applications with Indirect Prompt Injection.** ACM AISec.
`10.1145/3605764.3623985`
The reference work for indirect prompt injection. **This is the paper that names the
exact vulnerability your red-team suite found** in uncurated breach titles. §6.7 should
cite it directly rather than describe the attack class generically.

**Carlini et al. (2021). Extracting Training Data from Large Language Models.**
USENIX Security / arXiv. `10.48550/arxiv.2012.07805`
Memorisation and extraction. Supports §2.4's claim that a language model is itself a
privacy risk, not only a tool.

## §2.5 Communicating risk and prompting behaviour · §6.3 Interactive report

**Zou, Le, Mayer et al. (2024). Encouraging Users to Change Breached Passwords Using
the Protection Motivation Theory.** ACM TOCHI. `10.1145/3689432`
Directly on point: what actually makes someone change a breached password. **The
closest existing work to what this thesis attempts**, and it should appear in §2.6 as
related work as well as in §2.5.

**Tannenbaum et al. (2015). Appealing to fear: A meta-analysis of fear appeal
effectiveness and theories.** Psychological Bulletin. `10.1037/a0039729`
A meta-analysis, so stronger than citing a single fear-appeal theory. Supports the
design decision in §6.4 to present a calm interface alongside prominent remediation
rather than an alarming one.

## §3.4 Design principles

**Hoepman (2021). Privacy Is Hard and Seven Other Myths.** MIT Press.
`10.7551/mitpress/12587.001.0001`
Privacy-by-design strategies. Supports the data-minimisation and storage-limitation
principles that §8.1 now argues under GDPR Art. 5(1)(c) and 5(1)(e).

## §5.1 Credential checking by k-anonymity

**Li et al. (2019). Protocols for Checking Compromised Credentials.** ACM CCS.
`10.1145/3319535.3354229`
Formal treatment of the k-anonymity range protocol the password path uses. Cite it
where §5.1 explains why only a hash prefix leaves the browser.

**Pal et al. (2021). Might I Get Pwned: A Second Generation Compromised Credential
Checking Service.** USENIX Security / arXiv. `10.48550/arxiv.2109.14490`
Successor work covering credential *tweaking*, not just exact matches. Belongs in §9.6
as a direction the current password check does not yet cover.

## §5.2 Breach Risk (B) · §9.1 Calibration

**Wunder et al. (2024). Shedding Light on CVSS Scoring Inconsistencies: A User-Centric
Study on Evaluating Widespread Security Vulnerabilities.** IEEE S&P.
`10.1109/sp54263.2024.00058`
Shows that even the most widely deployed security scoring system produces inconsistent
scores between assessors. **This is the paper that makes "chosen, not fitted"
defensible** rather than apologetic: it establishes that scoring-system validity is an
open problem in the field, not a weakness peculiar to this thesis.

## §5.5 Parameter sensitivity

**Saltelli et al. (2009). Variance based sensitivity analysis of model output.**
Computer Physics Communications. `10.1016/j.cpc.2009.09.018`
Methodological citation for the perturbation study. The current ±30% Monte Carlo is a
one-at-a-time-style robustness check; citing Saltelli lets you say which method you
used and name variance-based decomposition as the stronger alternative you did not run.

## §5.8 Two clocks

**Wang, Zhang, Wang et al. (2016). Targeted Online Password Guessing: An Underestimated
Threat.** ACM CCS. `10.1145/2976749.2978339`
Shows that personal information — name, birthday, and similar — materially improves
password guessing. **This is the empirical bridge between the two clocks**: it is the
reason permanent identity attributes raise risk even when no password leaked, which
§5.8 currently argues from first principles alone.

## §9.4 Threats to validity

**Sjøberg & Bergersen (2022). Construct Validity in Software Engineering.** IEEE TSE.
`10.1109/tse.2022.3176725`
Gives §9.4 a vocabulary: construct, internal, external and conclusion validity. The
section currently discusses threats without naming which kind each one is.

---

## Still to verify yourself

**Thomas et al. (2019). Protecting accounts from credential stuffing with password
breach alerting.** USENIX Security.
Neither Crossref nor OpenAlex returned a DOI for it, as USENIX papers are often
indexed without one. The paper exists and is the origin of the Google Password
Checkup design, but confirm author list, year and page numbers from the USENIX
proceedings page before citing.

## Gaps no citation fixes

- **No paper calibrates breach exposure against realised harm.** The absence is why
  §9.1 exists. If a reviewer asks for calibration literature, the honest answer is
  that the outcome data does not exist publicly.
- **GDPR claims in §8.1 rest on the Regulation itself**, not on secondary literature.
  That is appropriate for statutory argument, but the EDPB guidance named there should
  be verified on edpb.europa.eu before submission.
