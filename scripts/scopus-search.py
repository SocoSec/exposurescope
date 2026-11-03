# -*- coding: utf-8 -*-
"""Query the Scopus Search API for thesis citation candidates.

    python scripts/scopus-search.py "quasi-identifier permanence"
    python scripts/scopus-search.py --all          # run the whole gap list

THE KEY IS NEVER STORED HERE. It is read from ~/.scopus-api-key, which sits
outside this repository so that it cannot be committed. If that file is absent
the script says so and stops rather than prompting, because a prompt in an
automated context is how keys end up in logs.

WHAT THIS USES. The Scopus Search API returns metadata only: title, authors,
venue, year, DOI, citation count. That is exactly what is needed to judge a
candidate and to verify it afterwards against Crossref. Full-text retrieval is
restricted by Elsevier's terms and is deliberately not attempted.

RELEVANCE, NOT CITATIONS. Results are requested in relevance order. Sorting by
citation count on a loose query returns the most-cited papers in all of science
that happen to share a word — which is how a search for re-identification risk
surfaces computer-vision person re-identification, and a search for calibration
surfaces camera calibration.
"""
import json, os, sys, time, urllib.parse, urllib.request

KEY_PATH = os.path.join(os.path.expanduser("~"), ".scopus-api-key")
API = "https://api.elsevier.com/content/search/scopus"


def load_key():
    if not os.path.exists(KEY_PATH):
        sys.exit(f"No key file at {KEY_PATH}\n"
                 f"Create it with your Scopus API key as the only contents.")
    key = open(KEY_PATH, encoding="utf-8").read().strip()
    if not key:
        sys.exit(f"{KEY_PATH} is empty.")
    return key


def search(key, query, count=25, start=0):
    url = f"{API}?{urllib.parse.urlencode({'query': query, 'count': count, 'start': start, 'sort': 'relevancy'})}"
    req = urllib.request.Request(url, headers={
        "X-ELS-APIKey": key,
        "Accept": "application/json",
    })
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:300]
        if e.code == 401:
            print("  ! 401 — key rejected. Check the key, and that you are on the "
                  "institutional network or the key is registered to your account.")
        elif e.code == 429:
            print("  ! 429 — weekly quota or rate limit reached.")
        else:
            print(f"  ! HTTP {e.code}: {body}")
        return None
    except Exception as e:
        print(f"  ! {e}")
        return None


def rows(payload):
    if not payload:
        return []
    return payload.get("search-results", {}).get("entry", []) or []


def show(e):
    doi = e.get("prism:doi", "")
    title = (e.get("dc:title") or "")[:104]
    venue = (e.get("prism:publicationName") or "—")[:62]
    year = (e.get("prism:coverDate") or "")[:4]
    cites = e.get("citedby-count", "0")
    author = e.get("dc:creator", "—")
    typ = e.get("subtypeDescription", "")
    print(f"\n  {year} | {str(cites):>5} cites | {typ}")
    print(f"  {title}")
    print(f"  {author} et al. | {venue}")
    print(f"  doi:{doi or '— (no DOI indexed)'}")


# One query per claim the thesis makes. TITLE-ABS-KEY is correct HERE because
# the API has no field dropdown to imply it — unlike the website's basic form.
GAPS = [
    ("5.8  permanent vs revocable exposure",
     'TITLE-ABS-KEY(("personally identifiable information" OR "quasi-identifier") AND ("immutable" OR "irrevocable" OR "cannot be changed" OR "permanent"))'),
    ("5.8  identity data aids targeted guessing",
     'TITLE-ABS-KEY("targeted password guessing" OR ("personal information" AND "password guessing"))'),
    ("5.9  risk that does not decay",
     'TITLE-ABS-KEY(("privacy risk" OR "security risk") AND ("time decay" OR "half-life" OR "temporal decay"))'),
    ("9.1  calibrating a score to outcomes",
     'TITLE-ABS-KEY(("vulnerability scoring" OR "risk score") AND ("calibration" OR "predictive validity" OR "empirical validation")) AND SUBJAREA(COMP)'),
    ("2.2  aggregation and the mosaic effect",
     'TITLE-ABS-KEY("quasi-identifier" AND ("re-identification" OR "linkage") AND "privacy")'),
    ("5.1  compromised credential checking",
     'TITLE-ABS-KEY("compromised credential" OR "password breach alerting" OR "credential checking service")'),
    ("1.2  measured harm to breach victims",
     'TITLE-ABS-KEY("data breach" AND ("victim" OR "consumer") AND ("harm" OR "consequence" OR "financial loss"))'),
    ("2.5  acting on breach notification",
     'TITLE-ABS-KEY("breach notification" AND ("behaviour" OR "behavior" OR "response" OR "password change"))'),
    ("6.4  risk scores and lay comprehension",
     'TITLE-ABS-KEY(("risk score" OR "security indicator") AND ("comprehension" OR "lay user" OR "mental model"))'),
    ("6.7  indirect prompt injection",
     'TITLE-ABS-KEY("prompt injection" AND ("agent" OR "tool" OR "application"))'),
    ("8.5  Hungarian data protection practice",
     'TITLE-ABS-KEY(("Hungary" OR "Hungarian" OR "NAIH") AND ("data protection" OR "GDPR" OR "privacy"))'),
    ("2.6  tools for personal exposure assessment",
     'TITLE-ABS-KEY(("digital footprint" OR "personal data exposure") AND ("tool" OR "dashboard" OR "assessment"))'),
]


def main():
    key = load_key()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    if "--all" in sys.argv or not args:
        todo = GAPS
    else:
        todo = [("ad hoc", " ".join(args))]

    for label, q in todo:
        print("\n" + "=" * 96)
        print(f"{label}")
        print(f"  {q}")
        print("=" * 96)
        payload = search(key, q, count=15)
        if payload is None:
            break
        total = payload.get("search-results", {}).get("opensearch:totalResults", "?")
        entries = rows(payload)
        print(f"  {total} total; showing {len(entries)}")
        for e in entries:
            show(e)
        time.sleep(0.5)      # stay well inside the rate limit


if __name__ == "__main__":
    main()
