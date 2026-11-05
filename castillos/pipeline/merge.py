import os; os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))  # run from anywhere
import json, re, math, unicodedata, collections
import pandas as pd
wd = json.load(open("wd_details.json"))
osm = json.load(open("osm_navarra.json"))["elements"]

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii","ignore").decode().lower()
    s = re.sub(r"\(.*?\)|\b(castillo|palacio|torre|de|del|la|el|los|ruinas|gaztelua|jauregia|dorretxea|fortificado|castillo-palacio)\b"," ",s)
    return " ".join(s.split())
def dist(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c); dp=p2-p1; dl=math.radians(d-b)
    return 2*R*math.asin(math.sqrt(math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2))
def pt(c):
    m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", c); return float(m[2]), float(m[1])

# --- category from Wikidata types
FORT = {"castillo","fortaleza","fortificación","casa torre","torre","palacio fortificado","castellum","muralla","puerta de la ciudad","puerta","castrum"}
PREHIST = {"castro","oppidum","yacimiento arqueológico","yacimiento arqueológico prehistórico","ciudad romana","sitio arqueológico romano","asentamiento","despoblado"}
def wd_cat(t):
    t=set(t)
    if t & {"puerta de la ciudad","puerta"}: return "puerta/muralla"
    if "muralla" in t and not t & {"castillo","fortaleza"}: return "puerta/muralla"
    if t & {"castillo","fortaleza","castellum","castrum","palacio fortificado"}: return "castillo/fortaleza"
    if t & {"casa torre","torre"}: return "torre/casa-torre"
    if "fortificación" in t and not t & PREHIST: return "castillo/fortaleza"
    if t & PREHIST: return "castro/yacimiento"
    if t & {"palacio","mansión"}: return "palacio/casa señorial"
    return "otro"
def osm_cat(t):
    h=t.get("historic"); ct=t.get("castle_type")
    if h in ("city_gate","citywalls"): return "puerta/muralla"
    if h=="tower": return "torre/casa-torre"
    if h=="fort": return "castillo/fortaleza"
    if ct=="tower": return "torre/casa-torre"
    if ct in ("stately","manor","palace"): return "palacio/casa señorial"
    return "castillo/fortaleza"
RANK = ["castillo/fortaleza","torre/casa-torre","puerta/muralla","palacio/casa señorial","castro/yacimiento","otro"]

rows = {}
for q,d in wd.items():
    if "coord" not in d: continue
    lat,lon = pt(d["coord"][0])
    rows[q] = dict(qid=q, nombre=(d.get("label") or d.get("labelEu") or [q])[0], nombre_eu=(d.get("labelEu") or [""])[0],
        cat_wd=wd_cat(d.get("tipoLabel",[])), tipos_wd=", ".join(d.get("tipoLabel",[])), municipio=", ".join(d.get("munLabel",[])),
        lat=lat, lon=lon, fecha_wd=", ".join(x[:4] for x in d.get("inicio",[])), estado_wd=", ".join(d.get("estadoLabel",[])),
        proteccion=", ".join(d.get("herLabel",[])), bic=", ".join(d.get("bic",[])), wiki_es=(d.get("es") or [""])[0],
        wiki_eu=(d.get("eu") or [""])[0], imagen=(d.get("img") or [""])[0], desc_wd=(d.get("desc") or [""])[0], osm=[])

def osm_row(e):
    t=e["tags"]; c=e.get("center",e)
    return dict(osm_id=f'{e["type"]}/{e["id"]}', nombre_osm=t.get("name:es") or t.get("name",""), nombre_osm_eu=t.get("name:eu",""),
        lat=c["lat"], lon=c["lon"], cat_osm=osm_cat(t), fecha_osm=t.get("start_date",""),
        ruina_osm= t.get("ruins")=="yes" or t.get("building")=="ruins" or "ruina" in (t.get("name","").lower()),
        castillosnet=(re.search(r"NA-CAS-\d+", t.get("website","")+t.get("note","")) or [""])[0],
        bic_osm=t.get("ref:bic",""), web=t.get("website",""), desc_osm=t.get("description",""), qid=t.get("wikidata"))
unmatched=[]
for e in osm:
    o=osm_row(e)
    if o["qid"] and o["qid"] in rows: rows[o["qid"]]["osm"].append(o); continue
    # spatial + name match
    best=None
    for r in rows.values():
        dd=dist(o["lat"],o["lon"],r["lat"],r["lon"])
        a,b=norm(o["nombre_osm"]),norm(r["nombre"])
        if dd<150 or (dd<800 and a and b and (a in b or b in a)):
            if not best or dd<best[0]: best=(dd,r)
    if best and best[0]<800 and (norm(o["nombre_osm"]) and (norm(o["nombre_osm"]) in norm(best[1]["nombre"]) or norm(best[1]["nombre"]) in norm(o["nombre_osm"])) or best[0]<150):
        best[1]["osm"].append(o); o["match"]=f"cercanía {best[0]:.0f} m"
    else: unmatched.append(o)

out=[]
for r in rows.values():
    os_=r.pop("osm")
    cats=[r["cat_wd"]]+[o["cat_osm"] for o in os_]
    cat=sorted(cats,key=RANK.index)[0] if r["cat_wd"]!="castro/yacimiento" or not os_ else sorted(cats[1:],key=RANK.index)[0]
    out.append(dict(r, categoria=cat, fuentes="Wikidata"+(" + OSM" if os_ else ""), osm_id=", ".join(o["osm_id"] for o in os_),
        nombre_osm="; ".join(o["nombre_osm"] for o in os_ if o["nombre_osm"]), fecha_osm=", ".join(o["fecha_osm"] for o in os_ if o["fecha_osm"]),
        ruina_osm=any(o["ruina_osm"] for o in os_), castillosnet=", ".join(o["castillosnet"] for o in os_ if o["castillosnet"]),
        bic=r["bic"] or ", ".join(o["bic_osm"] for o in os_ if o["bic_osm"]), web=", ".join(o["web"] for o in os_ if o["web"] and "castillosnet" not in o["web"]),
        desc=r["desc_wd"] or "; ".join(o["desc_osm"] for o in os_ if o["desc_osm"])))
for o in unmatched:
    out.append(dict(qid="", nombre=o["nombre_osm"] or "(sin nombre)", nombre_eu=o["nombre_osm_eu"], categoria=o["cat_osm"], tipos_wd="", municipio="",
        lat=o["lat"], lon=o["lon"], fecha_wd="", estado_wd="", proteccion="", bic=o["bic_osm"], wiki_es="", wiki_eu="", imagen="",
        fuentes="OSM", osm_id=o["osm_id"], nombre_osm=o["nombre_osm"], fecha_osm=o["fecha_osm"], ruina_osm=o["ruina_osm"],
        castillosnet=o["castillosnet"], web=o["web"] if "castillosnet" not in o["web"] else "", desc=o["desc_osm"]))
df=pd.DataFrame(out)
df.to_pickle("merged.pkl")
print(len(df)); print(df.categoria.value_counts()); print(df.fuentes.value_counts())
print(pd.crosstab(df.categoria, df.fuentes))