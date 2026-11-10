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
# River names: one label per river, on a straight stretch inside Navarre, as far as possible from towns and castles
import csv, math
nav = next(f for f in json.load(open("geo/provincias.geojson"))["features"] if f["properties"]["name"] == "Navarra")["geometry"]["coordinates"]
def inside(x, y):
    hit = False
    for poly in nav:
        ring = poly[0]
        for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
            if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1): hit = not hit
    return hit
KM = lambda a, b: math.hypot((a[0] - b[0]) * 82, (a[1] - b[1]) * 111)
obst = [pl["c"] for pl in places if pl["t"] < 3] + [[float(r["Lon"]), float(r["Lat"])] for r in csv.DictReader(open("data/fichas_castillos.csv"))]
rlabels = []
for k, parts in riv.items():
    cand = []
    for part in parts:
        for i, q in enumerate(part):
            if not inside(*q): continue
            # direction over about 2.5 km either side of the point
            j0 = i
            while j0 > 0 and KM(part[j0], q) < 2.5: j0 -= 1
            j1 = i
            while j1 < len(part) - 1 and KM(part[j1], q) < 2.5: j1 += 1
            a, b = part[j0], part[j1]; span = KM(a, b)
            if span < 2.5: continue
            path = sum(KM(part[m], part[m + 1]) for m in range(j0, j1))
            rot = -math.degrees(math.atan2((b[1] - a[1]) * 111, (b[0] - a[0]) * 82))  # clockwise on screen
            rot = rot - 180 if rot > 90 else rot + 180 if rot < -90 else rot
            cand.append((q, rot, span / path))
    if not cand: continue
    cx = sum(c[0][0] for c in cand) / len(cand); cy = sum(c[0][1] for c in cand) / len(cand)
    def score(c):
        q, rot, straight = c
        # clear of labels and castles, straight, near the middle of its course, and as level as possible (steep text is hard to read)
        return min(min(KM(q, o) for o in obst), 5) + 4 * straight - 0.06 * KM(q, (cx, cy)) - 0.06 * max(0, abs(rot) - 30)
    q, rot, _ = max(cand, key=score)
    rlabels.append({"n": k, "c": [round(q[0], 4), round(q[1], 4)], "r": round(rot), "major": k in ("Ebro", "Aragón", "Arga", "Ega")})
print("etiquetas de ríos:", [(r["n"], r["r"]) for r in rlabels])
json.dump({"rivers": rivers, "roads": roads, "places": places, "rlabels": rlabels}, open("geo/capas.json", "w"), ensure_ascii=False)
print("lugares:", len(places), "tamaño KB:", os.path.getsize("geo/capas.json") // 1024)