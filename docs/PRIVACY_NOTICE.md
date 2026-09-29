# Privacy Notice — Exposio

The privacy notice that participants and visitors see is the page at **`/privacy`**
(`app/privacy/page.js`). That page is the single source of truth, because it lives next to
the code it describes and changes in the same commit.

Before any use with study participants, review it with your supervisor and ethics committee,
then set on the deployment:

- `EXPOSIO_CONTACT_EMAIL` — the contact address shown to data subjects
- `EXPOSIO_ETHICS_REF` — the ethics approval reference

## What the notice must stay consistent with

| Processing | Recipient | Code |
|---|---|---|
| Email → one-time verification code | Resend | `lib/mailer.js` |
| Verified email → breach metadata | HIBP; DeHashed if enabled | `lib/sources.js` |
| First 5 chars of password SHA-1 | Pwned Passwords | `app/page.js` (`pwnedCount`) |
| Score, breach names, data types, chat messages (no email) | Anthropic | `lib/expobot.js`, `app/api/chat` |
| Keyed hashes of IP and email, ≤ 24 h | Exposio / Upstash if enabled | `lib/ratelimit.js` |
| Standard request logs | Vercel | platform |

If a change to the code adds a recipient or a new kind of data, update `/privacy` in the same commit.
