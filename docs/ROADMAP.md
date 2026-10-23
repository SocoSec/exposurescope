# Roadmap — continuous monitoring and adjacent capabilities

Exposio answers a question once. Commercial exposure platforms (DarkEntry is a
representative example) watch continuously and alert when something new appears.
That gap is the most valuable thing missing from this prototype, and it is also
the hardest to add, because watching an identifier means remembering it and this
system's data-protection argument rests on remembering nothing.

This document records what such an extension would involve. Nothing here is
implemented. See thesis §9.7 for the academic treatment.

## 1. Continuous monitoring (the headline item)

**Why it matters.** The decay term in `lib/score.js` says a breach counts most
when it is fresh. A single-shot check is least likely to catch it then. Monitoring
is what makes the score act on the timescale the model already assumes.

**The conflict.** `docs/PRIVACY_NOTICE.md` and thesis ch. 8 both ground the GDPR
position in zero storage. A watch list is storage.

**The way through.** `identifierId(secret, kind, value)` in `lib/tokens.js`
already produces a keyed hash that is enough to re-match an identifier against
new breach records. A watch list of those digests holds no addresses or phone
numbers. Delivery is the unsolved part — an alert needs a channel, and a channel
is a contact point. Three candidates, in order of how much of the current
guarantee they cost:

| Design | Service holds | Cost |
|---|---|---|
| Client-held subscription token, client polls | keyed hashes only | no push; needs the user to return |
| Delivery delegated to a separate service | keyed hashes; channel held elsewhere | operational complexity, two-party trust |
| Narrow retention of a contact address, Art. 6(1)(a) consent, Art. 17 erasure | one contact address per subscriber | weakens the zero-storage claim |

Quantifying that trade-off is the research question, not an implementation detail.

## 2. Infostealer evidence as a new severity tier

Credentials taken from a compromised *device* rather than a breached *service*
are categorically worse: they imply session cookies and every credential saved in
that browser. `TIER` in `lib/score.js` currently tops out at `financial` = 1.0,
so there is no room above it. Adding a tier means re-deriving `B_MAX`, which
`scripts/sensitivity.mjs` §2 shows is a definition of the top of the scale
("one payment-data-plus-password breach about 112 days old"), not a fitted value.

## 3. Credential-stuffing intelligence

The k-anonymity check tells a person a password is compromised. The precondition
for an actual stuffing attack is an address and a password appearing *together*
in one collection. Confirming that pairing means handling raw leaked records,
which `docs/STUDY-PROTOCOL.md` rules out for the user study. Gate behind a
separate ethical review before touching it.

## 4. Organisational mode (out of current scope)

Attack-surface discovery and brand protection are organisational, not personal,
and fall outside the boundary argued in thesis §8.2. An employer-facing version
stays on the right side of that line only if each employee verifies their own
identifier first, so the employer receives aggregate statistics rather than a
searchable register of its staff. Without that constraint it becomes the
third-party profiling this project exists to argue against.

## Not planned

- Lookup of an identifier the user has not verified, in any mode or for any customer.
- Retention of breach results. The alerting designs above store a digest and, at
  most, a contact address — never the findings.
