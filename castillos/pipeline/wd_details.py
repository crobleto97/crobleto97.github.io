import os; os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))  # run from anywhere
import json, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wdlib import sparql, v, qid
ids = set(json.load(open("wd_ids.json")))
osm = json.load(open("osm_navarra.json"))["elements"]
ids |= {e["tags"]["wikidata"] for e in osm if "wikidata" in e["tags"]}
ids = sorted(ids); out = {}
for i in range(0, len(ids), 60):
    vals = " ".join("wd:"+x for x in ids[i:i+60])
    q = f"""SELECT ?item ?label ?labelEu ?coord ?tipoLabel ?inicio ?estadoLabel ?munLabel ?herLabel ?bic ?es ?eu ?img ?desc WHERE {{
      VALUES ?item {{ {vals} }}
      OPTIONAL {{ ?item rdfs:label ?label FILTER(lang(?label)="es") }}
      OPTIONAL {{ ?item rdfs:label ?labelEu FILTER(lang(?labelEu)="eu") }}
      OPTIONAL {{ ?item wdt:P625 ?coord }}
      OPTIONAL {{ ?item wdt:P31 ?tipo }}
      OPTIONAL {{ ?item wdt:P571 ?inicio }}
      OPTIONAL {{ ?item wdt:P5816 ?estado }}
      OPTIONAL {{ ?item wdt:P131 ?mun }}
      OPTIONAL {{ ?item wdt:P1435 ?her }}
      OPTIONAL {{ ?item wdt:P808 ?bic }}
      OPTIONAL {{ ?item wdt:P18 ?img }}
      OPTIONAL {{ ?es schema:about ?item ; schema:isPartOf <https://es.wikipedia.org/> }}
      OPTIONAL {{ ?eu schema:about ?item ; schema:isPartOf <https://eu.wikipedia.org/> }}
      OPTIONAL {{ ?item schema:description ?desc FILTER(lang(?desc)="es") }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,eu,en". }} }}"""
    for r in sparql(q):
        k = qid(v(r,"item")); d = out.setdefault(k, collections.defaultdict(set))
        for f in ["label","labelEu","coord","tipoLabel","inicio","estadoLabel","munLabel","herLabel","bic","es","eu","img","desc"]:
            if v(r,f): d[f].add(v(r,f))
    print(i, len(out))
json.dump({k:{f:sorted(s) for f,s in d.items()} for k,d in out.items()}, open("wd_details.json","w"), ensure_ascii=False, indent=1)