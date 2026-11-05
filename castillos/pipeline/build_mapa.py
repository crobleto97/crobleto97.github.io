import os; os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))  # paths below are relative to castillos/
import json, pandas as pd
o = pd.read_csv("data/fichas_castillos.csv", keep_default_na=False)
feats = []
for i, r in o.reset_index().iterrows():
    a = str(r["Año"]).replace(".0", "")
    feats.append({"type": "Feature", "id": i, "geometry": {"type": "Point", "coordinates": [round(float(r.Lon), 5), round(float(r.Lat), 5)]},
                  "properties": {"n": r.Nombre, "eu": r.Euskera if r.Euskera != r.Nombre else "", "m": r.Municipio, "t": r.Tipo,
                                 "a": int(a) if a else -1, "f": r.Fecha, "e": r.Estado or "sin estado", "h": r.Historia,
                                 "c": r.Confianza, "no": r.Nota, "src": r.Fuente}})
castles = {"type": "FeatureCollection", "features": feats}
g = json.load(open("geo/provincias.geojson"))
names = {"Navarra", "Gipuzkoa/Guipúzcoa", "Araba/Álava", "La Rioja", "Zaragoza", "Huesca", "Soria", "Bizkaia/Vizcaya", "Burgos"}
prov = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"nav": f["properties"]["name"] == "Navarra", "name": f["properties"]["name"]}, "geometry": f["geometry"]} for f in g["features"] if f["properties"]["name"] in names]}
css = open("pipeline/vendor/maplibre-gl.css").read()
tpl = open("pipeline/mapa_template.html").read()
html = tpl.replace("/*__MLCSS__*/", css).replace("__CASTLES__", json.dumps(castles, ensure_ascii=False)).replace("__PROV__", json.dumps(prov)).replace("__CAPAS__", open("geo/capas.json").read())
head = open("pipeline/page_head.html").read()
open("index.html", "w").write(head + html + "\n</body>\n</html>\n")
print("ok", len(html), "castillos", len(feats))