import os; os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))  # run from anywhere
import json, time, urllib.request, urllib.parse, re
import pandas as pd
UA = "CastillosNavarraBot/0.1 (personal open-data portfolio project)"
def api(lang, **p):
    p.update(format="json", formatversion=2)
    url = f"https://{lang}.wikipedia.org/w/api.php?" + urllib.parse.urlencode(p)
    for i in range(4):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60))
        except Exception as e:
            time.sleep(3 * (i + 1))
    return {}
def title(u): return urllib.parse.unquote(u.rsplit("/wiki/", 1)[1]).replace("_", " ")
def page(lang, t):
    r = api(lang, action="query", titles=t, prop="extracts|langlinks", explaintext=1, lllang="es", redirects=1)
    p = (r.get("query", {}).get("pages") or [{}])[0]
    return p.get("title"), p.get("extract", ""), (p.get("langlinks") or [{}])[0].get("title")
d = pd.read_csv("inventario_castillos_navarra.csv", keep_default_na=False)
s = d[d.incluir == "sí"]
out = {}
for _, r in s.iterrows():
    rec = {"nombre": r.nombre, "municipio": r.municipio, "es": None, "eu": None}
    es_t = title(r.wiki_es) if r.wiki_es else None
    if r.wiki_eu:
        t, txt, ll = page("eu", title(r.wiki_eu)); rec["eu"] = {"title": t, "text": txt}
        es_t = es_t or ll
    if not es_t and not r.wiki_eu:
        q = api("es", action="query", list="search", srsearch=f'{r.nombre} {r.municipio} Navarra', srlimit=3)
        hits = [h["title"] for h in q.get("query", {}).get("search", [])]
        rec["busqueda"] = hits
        if hits and any(w in hits[0].lower() for w in ("castillo", "torre", "palacio", "fuerte", "redoute", "fortaleza")):
            es_t = hits[0]
    if es_t:
        t, txt, _ = page("es", es_t); rec["es"] = {"title": t, "text": txt}
    out[r.nombre] = rec
    time.sleep(0.6)
json.dump(out, open("wiki/extracts.json", "w"), ensure_ascii=False, indent=1)
n_es = sum(1 for x in out.values() if x["es"] and x["es"]["text"]); n_eu = sum(1 for x in out.values() if x["eu"] and x["eu"]["text"])
none = [k for k, x in out.items() if not ((x["es"] and x["es"]["text"]) or (x["eu"] and x["eu"]["text"]))]
print(len(out), "es:", n_es, "eu:", n_eu); print("sin artículo:", none)
for k in none: print(k, out[k].get("busqueda"))