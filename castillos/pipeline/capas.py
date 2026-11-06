import os; os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))  # paths below are relative to castillos/
import json, os, re
def dp(pts, eps):
    if len(pts) < 3: return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1; L = (dx*dx + dy*dy) ** .5 or 1e-12
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy*pts[i][0] - dx*pts[i][1] + x2*y1 - y2*x1) / L
        if d > dmax: dmax, idx = d, i
    if dmax > eps: return dp(pts[:idx+1], eps)[:-1] + dp(pts[idx:], eps)
    return [pts[0], pts[-1]]
R = lambda l: [[round(x, 4), round(y, 4)] for x, y in l]
# Rivers
RIV = {"Ebro": ["Río Ebro", "Ebro"], "Aragón": ["Río Aragón", "Aragón"], "Arga": ["Arga", "Río Arga"], "Ega": ["Ega", "Río Ega"],
       "Irati": ["Irati", "Río Irati"], "Bidasoa": ["Bidasoa", "Río Bidasoa", "Bidasoa ibaia"], "Cidacos": ["Zidakos", "Cidacos", "Río Cidacos"],
       "Queiles": ["Río Queiles"], "Alhama": ["Río Alhama", "Alhama"], "Salazar": ["Salazar", "Zaraitzu", "Río Salazar"], "Esca": ["Esca", "Ezka", "Río Esca"],
       "Arakil": ["Arakil", "Araquil"], "Ultzama": ["Ultzama", "Ulzama"], "Erro": ["Erro"], "Urrobi": ["Urrobi"]}
lookup = {v: k for k, vs in RIV.items() for v in vs}
e = json.load(open("geo/raw/osm_rivers.json"))["elements"]
riv = {}
for w in e:
    k = lookup.get(w["tags"].get("name"))
    if not k: continue
    pts=[(p["lon"], p["lat"]) for p in w["geometry"]]
    if k == "Cidacos" and min(x for x, _ in pts) < -1.9: continue
    riv.setdefault(k, []).append(R(dp(pts, 0.0007)))
rivers = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"name": k, "major": k in ("Ebro", "Aragón", "Arga", "Ega")}, "geometry": {"type": "MultiLineString", "coordinates": v}} for k, v in riv.items()]}
print("ríos:", {k: len(v) for k, v in riv.items()})
# Roads: OSM if available else Natural Earth
roads = None
if os.path.exists("geo/raw/osm_roads.json"):
    try:
        el = json.load(open("geo/raw/osm_roads.json"))["elements"]
        feats = []
        for w in el:
            t = w["tags"]; ref = t.get("ref", "")
            feats.append({"type": "Feature", "properties": {"ref": ref, "cls": "auto" if t["highway"] == "motorway" else "nac"},
                          "geometry": {"type": "LineString", "coordinates": R(dp([(p["lon"], p["lat"]) for p in w["geometry"]], 0.0005))}})
        roads = {"type": "FeatureCollection", "features": feats}; print("carreteras OSM:", len(feats))
    except Exception as ex: print("OSM roads no disponible:", ex)
if roads is None:
    g = json.load(open("geo/raw/ne_10m_roads.geojson")); W, S, E, N = -3.2, 41.5, -0.1, 43.6
    feats = []
    for f in g["features"]:
        geo = f["geometry"]
        if not geo: continue
        lines = geo["coordinates"] if geo["type"] == "MultiLineString" else [geo["coordinates"]]
        keep = [R(l) for l in lines if any(W <= x <= E and S <= y <= N for x, y in l)]
        if keep and f["properties"]["type"] in ("Major Highway", "Secondary Highway"):
            feats.append({"type": "Feature", "properties": {"ref": f["properties"].get("label") or "", "cls": "auto" if f["properties"]["type"] == "Major Highway" else "nac"},
                          "geometry": {"type": "MultiLineString", "coordinates": keep}})
    roads = {"type": "FeatureCollection", "features": feats}; print("carreteras Natural Earth:", len(feats))
# Places
mun = {x["nombre"]: x for x in json.load(open("data/municipios.json"))}
# Wikidata gives the municipality's coordinate, which can sit kilometres from the town itself (Olite: 4.6 km).
# Use the OSM place node with the same name nearest to it; keep Wikidata only if OSM has none.
osm = {}
for e in json.load(open("data/osm_places.json"))["elements"]:
    for k in ("name", "name:es", "name:eu"):
        for v in e["tags"].get(k, "").split("/"):
            if v: osm.setdefault(v.strip(), []).append((e["lon"], e["lat"]))
def pt(n, label=None):
    m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", mun[n]["coord"]); x, y = float(m[1]), float(m[2])
    c = [q for k in (label, n, mun[n]["eu"]) if k for q in osm.get(k, []) if abs(q[0] - x) < 0.15 and abs(q[1] - y) < 0.15]
    if c: x, y = min(c, key=lambda q: (q[0] - x) ** 2 + (q[1] - y) ** 2)
    return [round(x, 4), round(y, 4)]
T1 = ["Pamplona", "Tudela", "Estella", "Tafalla", "Sangüesa", "Olite"]
T2 = ["Alsasua", "Vera de Bidasoa", "Aoiz", "Lumbier", "Puente la Reina", "Viana", "Lodosa", "Peralta", "Corella", "Isaba", "Ochagavía",
      "Roncesvalles", "Leiza", "San Adrián", "Javier", "Ujué", "Fitero", "Los Arcos", "Cascante", "Marcilla", "Monreal", "Caparroso", "Valtierra", "Lerín"]
labels = {"Baztán": "Elizondo", "Vera de Bidasoa": "Bera"}
places = [{"n": labels.get(n, n), "c": pt(n, labels.get(n)), "t": 1} for n in T1] + [{"n": labels.get(n, n), "c": pt(n, labels.get(n)), "t": 2} for n in T2] + [{"n": "Elizondo", "c": pt("Baztán", "Elizondo"), "t": 2}]
places += [{"n": "Logroño", "c": [-2.4455, 42.4650], "t": 3}, {"n": "Donostia", "c": [-1.9812, 43.3183], "t": 3}, {"n": "Jaca", "c": [-0.5495, 42.5700], "t": 3},
           {"n": "Vitoria-Gasteiz", "c": [-2.6727, 42.8467], "t": 3}, {"n": "Donibane Garazi", "c": [-1.2372, 43.1633], "t": 3}, {"n": "Zaragoza →", "c": [-1.18, 41.80], "t": 3}]
json.dump({"rivers": rivers, "roads": roads, "places": places}, open("geo/capas.json", "w"), ensure_ascii=False)
print("lugares:", len(places), "tamaño KB:", os.path.getsize("geo/capas.json") // 1024)