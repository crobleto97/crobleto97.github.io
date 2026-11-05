import os; os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))  # run from anywhere
import json, time, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import urllib.request, urllib.parse
import pandas as pd
UA = "CastillosNavarraBot/0.1 (personal open-data portfolio project)"
def api(lang, **p):
    p.update(format="json", formatversion=2)
    url = f"https://{lang}.wikipedia.org/w/api.php?" + urllib.parse.urlencode(p)
    for i in range(6):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=60))
        except Exception as e:
            print("  retry", lang, e, flush=True); time.sleep(10 * (i + 1))
    return {}
def title(u): return urllib.parse.unquote(u.rsplit("/wiki/", 1)[1]).replace("_", " ")
def page(lang, t):
    r = api(lang, action="query", titles=t, prop="extracts|langlinks", explaintext=1, lllang="es", redirects=1)
    p = (r.get("query", {}).get("pages") or [{}])[0]
    return p.get("title"), p.get("extract", ""), (p.get("langlinks") or [{}])[0].get("title")
out = json.load(open("wiki/extracts.json"))
d = pd.read_csv("inventario_castillos_navarra.csv", keep_default_na=False); d = d[d.incluir=="sí"].set_index("nombre")
for k, rec in out.items():
    if (rec["es"] and rec["es"]["text"]) or (rec["eu"] and rec["eu"]["text"]): continue
    r = d.loc[k]; es_t = title(r.wiki_es) if r.wiki_es else None
    if r.wiki_eu:
        t, txt, ll = page("eu", title(r.wiki_eu)); rec["eu"] = {"title": t, "text": txt}; es_t = es_t or ll
        time.sleep(2)
    if es_t:
        t, txt, _ = page("es", es_t); rec["es"] = {"title": t, "text": txt}; time.sleep(2)
    ok = bool((rec["es"] and rec["es"]["text"]) or (rec["eu"] and rec["eu"]["text"]))
    print(k, "OK" if ok else "—", flush=True)
json.dump(out, open("wiki/extracts.json", "w"), ensure_ascii=False, indent=1)