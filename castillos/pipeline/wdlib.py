import json, sys, time, urllib.request, urllib.parse
UA = "castillos-navarra/0.1 (portfolio project)"
def sparql(q):
    for i in range(3):
        try:
            req = urllib.request.Request("https://query.wikidata.org/sparql",
                data=urllib.parse.urlencode({"query": q}).encode(),
                headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
            return json.load(urllib.request.urlopen(req, timeout=120))["results"]["bindings"]
        except Exception as e:
            print("retry", e, file=sys.stderr); time.sleep(5)
    raise SystemExit("fail")
v = lambda r,k: r[k]["value"] if k in r else None
qid = lambda u: u.rsplit("/",1)[-1] if u else None

