# Exposio (ExposureScope)

A research MVP for assessing **your own** digital exposure: verified email breach lookups,
k-anonymity password checks, a transparent Breach Risk score, a vetted action plan with
residual-risk tracking, GDPR request letters, and ExpoBot — an AI assistant constrained to
that action plan. MSc thesis prototype, Óbuda University.

👉 **Live:** https://exposurescope.vercel.app/

*Research demonstrator. Not a commercial security product and not a substitute for professional security advice.*

---

## How it works

```
email + consent ─► /api/verify/start ─ rate limits ─► 6-digit code by email
                   ◄─ signed CHALLENGE token (holds a keyed tag of the code, not the code)
code ───────────► /api/verify/check  ─► signed SCAN token (15 min, bound to that email)
email + SCAN ───► /api/breach ─ token + rate limits + daily cap ─► HIBP / DeHashed
                   merge + dedupe → Breach Risk score → signed REPORT token (60 min)
question+REPORT ► /api/chat ─ context built server-side ─► Claude (tool-forced JSON)
                   ◄─ { answer, actionIds } — IDs checked against the vetted playbook
password ───────► (browser only) SHA-1 → first 5 chars ─► Pwned Passwords (padded)
```

**Zero storage.** No database. State that must survive between steps travels as signed,
expiring tokens held in the browser's memory. The only server-side traces are rate-limit
counters keyed by HMAC hashes, which expire within 24 hours.

## Project map

| Path | Role |
|---|---|
| `lib/config.js` | Every environment variable; testing switches gated to dev/preview |
| `lib/crypto.js` | Web Crypto helpers: base64url, HMAC, keyed hashes, unbiased codes |
| `lib/tokens.js` | Stateless signed tokens (challenge / scan / report) |
| `lib/ratelimit.js` | Fixed-window limits (Upstash or in-memory) |
| `lib/http.js` | JSON responses, error codes, body size caps, input normalisation |
| `lib/mailer.js` | Verification email via Resend |
| `lib/sources.js` | HIBP + DeHashed lookups, cross-source merge, demo fixtures |
| `lib/score.js` | Thesis Breach Risk component B (pure functions) |
| `lib/playbook.js` | Vetted actions + residual-risk model |
| `lib/expobot.js` | ExpoBot guard rails (trusted context, closed action set, output checks) |
| `lib/gdpr.js` | Article 15 / 17 request letters |
| `lib/content.js` | Learn-tab text |
| `app/api/*` | Thin routes wiring the libraries to HTTP |
| `app/page.js` | The UI flow; components in `app/components/` |
| `app/privacy/page.js` | Privacy notice (must match what the code does) |
| `scripts/selftest.mjs` | Offline tests for everything in `lib/` |

## Run locally

```bash
npm install
cp .env.example .env.local   # then set EXPOSIO_DEMO=1 and EXPOSIO_SHOW_CODE=1
npm run selftest             # offline tests, no keys needed
npm run dev                  # http://localhost:3000
```

With the testing flags on, any address returns example breach data
(`clean@example.com` returns none) and the verification code appears on screen.

### Demoing on a preview deployment

`EXPOSIO_DEMO=1` and `EXPOSIO_SHOW_CODE=1` also work on Vercel **Preview**
deployments, which sit behind Vercel's login — useful for showing the product
before the Resend and breach-data accounts are set up. They are ignored on
production, and the interface shows a banner whenever they are active.

## Deploying — checklist

1. **Vercel env vars:** `EXPOSIO_SECRET`, `RESEND_API_KEY`, `EXPOSIO_FROM_EMAIL`, `HIBP_API_KEY`
   (and optionally `DEHASHED_*`, `ANTHROPIC_API_KEY`, `UPSTASH_*`, `EXPOSIO_CONTACT_EMAIL`, `EXPOSIO_ETHICS_REF`).
2. **Resend:** verify a sending domain, otherwise codes only reach the Resend account owner.
3. **Upstash:** create a Redis database so limits and daily caps are shared across instances.
4. **Vercel Firewall:** add a rate-limit rule on `/api/*` as an outer layer.
5. **Anthropic console:** set a monthly spend limit on the workspace key.
6. **DeHashed:** only enable after a legal opinion; it returns raw leaked records.
7. **Ethics approval** before recruiting study participants; set `EXPOSIO_ETHICS_REF`.

## Scoring, briefly

`B_raw = Σ severity × exp(−0.002 × age_days)`, `score = min(1, B_raw / 0.8) × 100`.
Severity: payment + passwords 1.0 · passwords 0.7 · phone/address 0.4 · email only 0.2.
Records without a breach date assume an age of 730 days (shown as "undated*").
The UI calls this the **Breach Risk score** — it is component B of the thesis Exposure
Score, whose other four components are not yet measured. Residual-risk factors in
`lib/playbook.js` are provisional and meant to be calibrated in a user study.
