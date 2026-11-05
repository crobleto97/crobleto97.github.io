import os; os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))  # run from anywhere
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wdlib import *
# 1) candidates: castle, fortress, fortified tower, tower house, city gate, palace? (keep castle-like)
classes = {"Q23413":"castillo","Q57831":"fortaleza","Q1785071":"fortaleza","Q20034791":"torre defensiva",
           "Q2087181":"casa-torre","Q82117":"puerta","Q16748868":"muralla","Q88205":"fortificación","Q57821":"fortificación"}
ids = {}
for c,lab in classes.items():
    q = f"""SELECT DISTINCT ?item WHERE {{ ?mun wdt:P131 wd:Q4018 . {{ ?item wdt:P131 ?mun }} UNION {{ ?item wdt:P131 wd:Q4018 }}
      ?item wdt:P31/wdt:P279* wd:{c} ; wdt:P625 [] . }}"""
    try:
        r = sparql(q)
    except SystemExit:
        print(c, "timeout"); continue
    print(c, lab, len(r))
    for x in r: ids.setdefault(qid(v(x,"item")), lab)
json.dump(ids, open("wd_ids.json","w"))
print(len(ids), "ids")