# Privacy Notice — ExposureScope (template)

*Adapt this with your supervisor and ethics committee before any use with participants.
Bracketed fields must be completed.*

**Who is responsible.** This tool is operated by [Esmail Mohammed Salem Abdullah], a student researcher at
Óbuda University, Budapest, Hungary, under the supervision of [Dr. Eszter Balázsné Kail]. Contact:
[abdullah@stud.uni-obuda.hu].

**Purpose.** ExposureScope is a research prototype that lets you assess *your own* digital exposure. It is
used to study how personal exposure can be measured and communicated. It is not a commercial security service.

**What is processed, and where it goes.**
- **Password (Section 01):** Your password is hashed in your browser. Only the first 5 characters of that
  hash are sent to the Have I Been Pwned range API to check for matches. Your password itself never leaves
  your device and is not stored.
- **Email address (Section 02, if enabled):** Sent to our server only to query the Have I Been Pwned breach
  API on your behalf, then discarded. Not stored.
- **Text you paste (Section 03):** Sent to our server, which forwards it to the Anthropic API to generate the
  inference analysis, then discarded. Not stored.

**Storage and retention.** The application stores nothing. There is no database and no logging of your inputs.
All results exist only in your browser for the duration of your session and disappear when you close the tab.

**Third parties.** The tool relies on Have I Been Pwned (breach data) and Anthropic (language-model inference).
Data sent to them is limited to what is described above and is governed by their respective terms.

**Legal basis (GDPR).** [State your lawful basis — typically consent for research participation. Complete with
your ethics committee.]

**Your rights.** You may decline to use any section, and you may stop at any time. Because nothing is stored,
there is no retained record to access, correct, or delete. For questions about the study, contact the researcher
above or [ethics committee contact].

**Consent.** Using the tools in this application indicates you have read this notice and consent to the in-session
processing described here, for your own data only.
