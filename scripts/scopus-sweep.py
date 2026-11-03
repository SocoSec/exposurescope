# -*- coding: utf-8 -*-
"""Full Scopus sweep across every claim the thesis makes.

    python scripts/scopus-sweep.py            # run everything, write CSV
    python scripts/scopus-sweep.py --top 3    # show only the best N per claim

Key is read from ~/.scopus-api-key and never printed.

DESIGN NOTES, because the obvious approach does not work:

  • RELEVANCE, not citations. Sorting a loose query by citation count returns
    the most-cited papers in all of science that share a word. It is how
    "re-identification" surfaces computer-vision person re-ID and "calibration"
    surfaces soccer cameras.

  • A RELEVANCE GATE per claim. Scopus matches any of the OR terms, so a result
    can match on the weakest one. Each claim therefore carries `must` terms, and
    a title has to contain one of them to survive.

  • ENGLISH ONLY, and DOI required, since a record without a DOI cannot be
    verified against Crossref afterwards.

  • DEDUPLICATED against the references already in the thesis, so the output is
    what could be ADDED rather than what is already there.
"""
import csv, json, os, sys, time, urllib.parse, urllib.request

KEY_PATH = os.path.join(os.path.expanduser("~"), ".scopus-api-key")
API = "https://api.elsevier.com/content/search/scopus"
OUT_CSV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "scopus-candidates.csv")

# DOIs already cited in the thesis (references 1-48), lowercased.
ALREADY = {s.lower() for s in """
10.1142/s0218488502001648 10.1038/srep01376 10.14722/ndss.2014.23357 10.1109/sp.2008.33
10.1145/2976749.2978339 10.1145/3605764.3623985 10.1145/3689432 10.1109/sp54263.2024.00058
10.1145/3319535.3354229 10.1145/3321705.3329818 10.1145/3308558.3313489 10.1037/a0039729
10.2307/2288400 10.1016/j.cpc.2009.09.018 10.1109/tse.2022.3176725 10.1145/3589958
10.25300/misq/2024/18787 10.1080/0735648x.2025.2535007 10.7551/mitpress/12587.001.0001
10.1145/3436242 10.48550/arxiv.2109.14490 10.1109/sp54263.2024.00114 10.1109/sp.2019.00056
10.1145/3054926 10.1016/j.ijhcs.2018.05.011 10.1109/sp61157.2025.00037 10.1145/2702123.2702442
10.1186/s42400-025-00430-0 10.1109/eurospw59978.2023.00027 10.1016/j.jcss.2014.04.024
10.21552/edpl/2019/4/11 10.1007/978-94-007-5170-5_18 10.1007/s12553-017-0181-7
10.1016/j.cose.2026.104978 10.1002/asi.24188 10.48550/arxiv.2012.07805
""".split()}

# (section, claim, scopus query, must-appear-in-title terms)
CLAIMS = [
 ("2.2", "quasi-identifiers and uniqueness",
  'TITLE-ABS-KEY("quasi-identifier" AND ("re-identification" OR "anonymity" OR "disclosure"))',
  ["quasi-identifier", "re-identif", "anonym", "disclosure"]),
 ("2.2", "linkage and the mosaic effect",
  'TITLE-ABS-KEY(("record linkage" OR "data linkage" OR "linkage attack") AND "privacy")',
  ["linkage", "privacy", "link"]),
 ("2.2", "de-anonymisation of released data",
  'TITLE-ABS-KEY("de-anonymization" OR "deanonymization") AND SUBJAREA(COMP)',
  ["anonymi", "de-anonym"]),
 ("2.2", "measured re-identification rates",
  'TITLE-ABS-KEY("re-identification risk" AND ("population" OR "census" OR "demographics"))',
  ["re-identif", "risk"]),
 ("2.3", "password reuse measured",
  'TITLE-ABS-KEY("password reuse" AND ("measurement" OR "study" OR "empirical"))',
  ["password", "reuse"]),
 ("2.3", "credential stuffing",
  'TITLE-ABS-KEY("credential stuffing")',
  ["credential", "stuffing", "account takeover"]),
 ("2.3", "account takeover economics",
  'TITLE-ABS-KEY("account takeover" OR "account hijacking")',
  ["account", "takeover", "hijack"]),
 ("5.8", "targeted guessing from personal data",
  'TITLE-ABS-KEY("targeted password guessing" OR ("password" AND "personal information" AND "guessing"))',
  ["password", "guessing", "targeted"]),
 ("5.1", "compromised credential checking protocols",
  'TITLE-ABS-KEY("compromised credential checking" OR "password breach alerting" OR "credential checking service")',
  ["credential", "breach alerting", "checking"]),
 ("5.1", "private set intersection for credentials",
  'TITLE-ABS-KEY("private set intersection" AND ("password" OR "credential" OR "breach"))',
  ["private set", "credential", "password"]),
 ("1.2", "harm to individuals from breaches",
  'TITLE-ABS-KEY("data breach" AND ("victim" OR "harm" OR "consequence" OR "financial loss"))',
  ["breach", "victim", "harm", "consequence"]),
 ("1.2", "identity theft consequences",
  'TITLE-ABS-KEY("identity theft" AND ("consequence" OR "victim" OR "financial" OR "emotional"))',
  ["identity theft", "victim"]),
 ("2.5", "response to breach notification",
  'TITLE-ABS-KEY("breach notification" AND ("user" OR "consumer" OR "behaviour" OR "behavior"))',
  ["notification", "breach"]),
 ("2.5", "protection motivation and security behaviour",
  'TITLE-ABS-KEY("protection motivation theory" AND ("security" OR "privacy"))',
  ["protection motivation", "security", "privacy"]),
 ("2.5", "security nudges",
  'TITLE-ABS-KEY("nudge" AND ("security" OR "privacy") AND ("intervention" OR "behaviour" OR "behavior"))',
  ["nudg", "privacy", "security"]),
 ("6.4", "risk communication to lay users",
  'TITLE-ABS-KEY(("risk communication" OR "risk perception") AND ("security" OR "privacy") AND "user")',
  ["risk", "percept", "communicat"]),
 ("6.4", "security warnings and indicators",
  'TITLE-ABS-KEY(("security warning" OR "browser warning" OR "security indicator") AND ("adherence" OR "comprehension" OR "design"))',
  ["warning", "indicator"]),
 ("6.4", "visualising risk",
  'TITLE-ABS-KEY("risk visualization" OR "security visualization" OR ("dashboard" AND "security" AND "user"))',
  ["visuali", "dashboard"]),
 ("9.1", "security scoring systems and their validity",
  'TITLE-ABS-KEY(("CVSS" OR "vulnerability scoring" OR "severity score") AND ("validity" OR "inconsistency" OR "limitation" OR "critique"))',
  ["cvss", "scoring", "severity", "vulnerabilit"]),
 ("9.1", "exploit prediction",
  'TITLE-ABS-KEY("exploit prediction" OR "EPSS" OR ("vulnerability" AND "prioritization" AND "prediction"))',
  ["exploit", "epss", "prioriti"]),
 ("9.1", "calibration of predictive risk models",
  'TITLE-ABS-KEY("risk score" AND ("calibration" OR "validation") AND ("security" OR "cyber"))',
  ["risk score", "calibrat", "valid"]),
 ("5.2", "quantifying privacy risk",
  'TITLE-ABS-KEY(("privacy metric" OR "privacy risk quantification" OR "privacy score") AND NOT "differential privacy")',
  ["privacy metric", "privacy risk", "privacy score"]),
 ("2.4", "LLM inference of personal attributes",
  'TITLE-ABS-KEY(("large language model" OR "LLM") AND ("personal attribute" OR "privacy inference" OR "profiling"))',
  ["language model", "llm", "attribute", "privacy"]),
 ("2.4", "memorisation and extraction from LLMs",
  'TITLE-ABS-KEY(("language model" AND ("memorization" OR "training data extraction" OR "PII leakage")))',
  ["memoriz", "extraction", "leakage", "language model"]),
 ("6.7", "indirect prompt injection",
  'TITLE-ABS-KEY("prompt injection")',
  ["prompt injection", "injection"]),
 ("6.5", "security of tool-using LLM agents",
  'TITLE-ABS-KEY(("LLM agent" OR "AI agent") AND ("security" OR "attack" OR "defense" OR "benchmark"))',
  ["agent", "llm"]),
 ("6.5", "guardrails and output validation",
  'TITLE-ABS-KEY(("guardrail" OR "output validation" OR "constrained decoding") AND ("LLM" OR "language model"))',
  ["guardrail", "validation", "constrain"]),
 ("8.1", "GDPR technical implementation",
  'TITLE-ABS-KEY("GDPR" AND ("data minimisation" OR "data minimization" OR "storage limitation" OR "privacy by design"))',
  ["gdpr", "minimi", "privacy by design", "storage limitation"]),
 ("8.5", "Hungarian data protection",
  'TITLE-ABS-KEY(("Hungary" OR "Hungarian" OR "NAIH") AND ("data protection" OR "GDPR" OR "privacy"))',
  ["hungar", "naih"]),
 ("2.3", "stolen data markets",
  'TITLE-ABS-KEY(("underground market" OR "dark web" OR "stolen data market") AND ("credential" OR "personal data" OR "identity"))',
  ["market", "dark web", "underground"]),
 ("5.7", "data brokers and OSINT exposure",
  'TITLE-ABS-KEY(("data broker" OR "people search engine") AND ("personal data" OR "privacy"))',
  ["broker", "people search"]),
 ("4.x", "stateless and minimal-retention architecture",
  'TITLE-ABS-KEY(("privacy-preserving architecture" OR "data minimization") AND ("web service" OR "system design" OR "implementation"))',
  ["minimi", "privacy-preserving", "architectur"]),
]


def load_key():
    if not os.path.exists(KEY_PATH):
        sys.exit(f"No key at {KEY_PATH}")
    k = open(KEY_PATH, encoding="utf-8").read().strip()
    return k or sys.exit("key file empty")


def search(key, query, count=25):
    q = query + " AND LANGUAGE(english) AND (DOCTYPE(ar) OR DOCTYPE(cp) OR DOCTYPE(re) OR DOCTYPE(ch))"
    url = f"{API}?{urllib.parse.urlencode({'query': q, 'count': count, 'sort': 'relevancy'})}"
    req = urllib.request.Request(url, headers={"X-ELS-APIKey": key, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        print(f"  ! HTTP {e.code}")
        return None
    except Exception as e:
        print(f"  ! {e}")
        return None


def main():
    key = load_key()
    top = 4
    if "--top" in sys.argv:
        top = int(sys.argv[sys.argv.index("--top") + 1])

    found, seen = [], set()
    for sec, claim, q, must in CLAIMS:
        payload = search(key, q)
        entries = (payload or {}).get("search-results", {}).get("entry", []) or []
        total = (payload or {}).get("search-results", {}).get("opensearch:totalResults", "?")
        kept = 0
        for e in entries:
            doi = (e.get("prism:doi") or "").lower()
            title = e.get("dc:title") or ""
            if not doi or doi in seen or doi in ALREADY:
                continue
            if not any(m in title.lower() for m in must):
                continue
            seen.add(doi)
            kept += 1
            found.append({
                "section": sec, "claim": claim, "year": (e.get("prism:coverDate") or "")[:4],
                "cites": int(e.get("citedby-count") or 0), "title": title,
                "author": e.get("dc:creator") or "", "venue": e.get("prism:publicationName") or "",
                "type": e.get("subtypeDescription") or "", "doi": doi,
            })
            if kept >= top:
                break
        print(f"§{sec:<5} {claim[:44]:<46} {str(total):>6} hits → kept {kept}")
        time.sleep(0.4)

    found.sort(key=lambda r: (r["section"], -r["cites"]))
    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)
    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(found[0].keys()) if found else ["section"])
        w.writeheader()
        w.writerows(found)

    print(f"\n{len(found)} new candidates (not already cited) → {os.path.normpath(OUT_CSV)}\n")
    cur = None
    for r in found:
        if r["section"] != cur:
            cur = r["section"]
            print(f"\n§{cur}")
        print(f"  {r['year']} {r['cites']:>5}c  {r['title'][:86]}")
        print(f"            {r['author'][:28]:<30} {r['venue'][:46]}  doi:{r['doi']}")


if __name__ == "__main__":
    main()
