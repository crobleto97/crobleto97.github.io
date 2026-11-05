import os; os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))  # run from anywhere
# Joins the inventory (final.py) with the hand-written fichas (fichas_data.py) into fichas_castillos.csv
import sys, pandas as pd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fichas_data import F
d = pd.read_csv("inventario_castillos_navarra.csv", keep_default_na=False); s = d[d.incluir == "sí"].copy()
missing = set(s.nombre) - set(F)
assert not missing, f"Fichas missing for: {missing}"
def src(r):
    for c in ("wiki_es", "wiki_eu"):
        if r[c]: return r[c]
    return r.castillosnet_url.split(",")[0] or r.wikidata_url.split(",")[0] or r.osm_url.split(",")[0]
rows = []
for _, r in s.iterrows():
    f = F[r.nombre]
    rows.append(dict(Nombre=r.nombre, Euskera=r.nombre_eu, Tipo=r.categoria, Municipio=r.municipio, Año=f["anio"] or "",
                     Fecha=f["fecha"], Estado=f["estado"], Historia=f["historia"], Confianza=f["confianza"], Nota=f.get("nota", ""),
                     Fuente=src(r), Lat=r.lat, Lon=r.lon))
order = {"confirmado": 0, "dudoso": 1, "parcial": 2, "sin datos": 3}
o = pd.DataFrame(rows).sort_values(["Confianza", "Nombre"], key=lambda c: c.map(order) if c.name == "Confianza" else c.str.lower())
o.to_csv("fichas_castillos.csv", index=False)
print(o.Confianza.value_counts().to_dict())
