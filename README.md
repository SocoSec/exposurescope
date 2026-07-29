# ExposureScope

A self-assessment instrument for **personal digital exposure**, built as a research prototype.
A visitor assesses **their own** data across three surfaces — credential exposure, account (email)
exposure, and LLM attribute inference — and receives an illustrative exposure index and remediation.

**Design principles that keep it defensible:**
- **Self-assessment only.** The UI is scoped to the visitor's own data, behind a consent gate.
- **Stores nothing.** No database, no logging of inputs. All state is in-memory for the session.
- **Keys stay server-side.** The Anthropic and HIBP keys live in Vercel environment variables and are
  used only inside serverless routes — never shipped to the browser.
- **k-anonymity for passwords.** The password never leaves the browser; only the first 5 characters of
  a SHA-1 hash are sent to the Have I Been Pwned range API.

---

 

## Run locally

```bash
npm install
cp .env.example .env.local     # then fill in your keys
npm run dev                    # http://localhost:3000
```

---

## Architecture

```
app/
  page.js              Client UI. Password check runs here (k-anonymity, no server round-trip).
  layout.js            Root layout; marked noindex.
  api/
    infer/route.js     Serverless: LLM attribute inference. Anthropic key server-side. No storage.
    breach/route.js    Serverless: HIBP email lookup. HIBP key server-side. Disabled if no key. No storage.
```

The exposure index is a **heuristic**, deliberately labelled as *not* a calibrated probability. Turning
it into a calibrated, uncertainty-aware score is an open research problem — this prototype is a scaffold
for that work, not a finished measure.

---

## ⚠️ Before you test with real users — read this

Putting the app on a public URL for **your own** use is fine. Running a **study on other people**
(recruiting participants, analysing their data for a thesis) is *human-subjects research* and has
prerequisites you must satisfy first:

1. **Ethics approval.** Obtain sign-off from your university's research-ethics committee **before**
   collecting any participant data. This is mandatory at essentially every institution.
2. **Informed consent + privacy notice.** Participants must be told what is processed and why, and must
   consent. Draft documents are provided in `docs/CONSENT_FORM.md` and `docs/PRIVACY_NOTICE.md` — adapt
   them with your supervisor and ethics committee.
3. **GDPR basis.** Passwords, emails, and personal text are personal data. If you deploy live email
   lookups (`HIBP_API_KEY` set) or otherwise process participants' data, you need a lawful basis and
   must honour data-subject rights. The safest research posture is: **process in-session, store nothing**
   (as this app does by default) and analyse only aggregate, de-identified observations you record
   separately with consent.
4. **HIBP terms.** HIBP's acceptable-use rules prohibit querying to harm breach victims and prohibit
   building a competing breach database. Self-check email lookups are within bounds; bulk or third-party
   profiling is not.

If in doubt, keep testing to yourself and a few consenting volunteers under a documented protocol until
formal approval is in place.

---

*Research demonstrator. Not a commercial security product and not a substitute for professional security advice.*
