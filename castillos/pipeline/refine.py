import os; os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))  # run from anywhere
import json, re, math, unicodedata
import pandas as pd
df = pd.read_pickle("merged.pkl")
mun = json.load(open("municipios.json"))
for m in mun:
    a = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", m["coord"]); m["lat"], m["lon"] = float(a[2]), float(a[1])
def dist(a,b,c,d):
    R=6371000; p1,p2=math.radians(a),math.radians(c)
    return 2*R*math.asin(math.sqrt(math.sin((p2-p1)/2)**2+math.cos(p1)*math.cos(p2)*math.sin(math.radians(d-b)/2)**2))
def asc(s): return unicodedata.normalize("NFKD", s or "").encode("ascii","ignore").decode().lower()

# municipality: keep Wikidata's (clean "Navarra"), else nearest municipality centre
def fix_mun(r):
    ms = [x.strip() for x in str(r.municipio).split(",") if x.strip() and x.strip() not in ("Navarra","Ribera Navarra")]
    if ms: return ms[0], ""
    m = min(mun, key=lambda m: dist(r.lat, r.lon, m["lat"], m["lon"]))
    return m["nombre"], "aprox."
df[["municipio","municipio_nota"]] = df.apply(lambda r: pd.Series(fix_mun(r)), axis=1)

# Spanish name for Basque-only labels "Xko gaztelua"
def nombre_es(r):
    n = r.nombre
    if r.nombre_osm and not re.search(r"(gaztelua|jauregia)$", r.nombre_osm.split(";")[0].strip(), re.I):
        if re.search(r"(gaztelua|jauregia|dorretxea)$", n, re.I): return r.nombre_osm.split(";")[0].strip(), ""
    if re.search(r"gaztelua$", n, re.I): return f"Castillo de {r.municipio}", "provisional"
    return n[0].upper()+n[1:], ""
df[["nombre","nombre_nota"]] = df.apply(lambda r: pd.Series(nombre_es(r)), axis=1)

# reclassify
T = df.tipos_wd.fillna("")
roman = T.str.contains("castrum|castellum") & ~T.str.contains(r"\bcastillo\b")
df.loc[roman | df.nombre.str.contains("romano|erromatar", case=False), "categoria"] = "castro/yacimiento"
prehist = T.str.contains("castro|oppidum") & ~T.str.contains(r"\bcastillo\b") & (df.fuentes=="Wikidata")
df.loc[prehist, "categoria"] = "castro/yacimiento"
ciud = df.nombre.str.contains("Ciudadela de Pamplona|Baluarte|Sala de Armas|Pabellón de Mixtos|Murallas de Pamplona|Fuerte del Príncipe|Interpretación de las Murallas", case=False) & (df.nombre!="Ciudadela de Pamplona")
df.loc[ciud, "categoria"] = "parte de recinto amurallado"
df.loc[df.nombre.str.contains("Murallas de Tudela"), "categoria"] = "puerta/muralla"
# Irulegui: OSM ruin castle sits on the oppidum hill -> medieval castle
iru = df.nombre.str.contains("Irulegui")
df.loc[iru, ["nombre","categoria"]] = ["Castillo de Irulegui", "castillo/fortaleza"]
df.loc[iru, "nota_revision"] = "El QID de Wikidata es el poblado prehistórico; el castillo medieval está en la misma cima"
df.loc[df.nombre=="Torre del Chapitel", "categoria"] = "torre/casa-torre"

# estado
def estado(r):
    e = str(r.estado_wd).lower()
    if "demolido" in e or "desaparec" in str(r.tipos_wd): return "desaparecido"
    if r.ruina_osm: return "ruina"
    if "conservado" in e: return "en pie"
    if r.fuentes != "Wikidata" and r.categoria != "castro/yacimiento" and not r.ruina_osm and "OSM" in r.fuentes:
        return "en pie (según OSM)"
    return ""
df["estado"] = df.apply(estado, axis=1)
df["fecha"] = df.apply(lambda r: r.fecha_wd or r.fecha_osm.replace("C13","s. XIII"), axis=1)

# duplicate detection among castles/towers: same municipio & < 2.5 km
core = df.categoria.isin(["castillo/fortaleza","torre/casa-torre"])
df["posible_duplicado"] = ""
idx = df[core].index.tolist()
for i in idx:
    for j in idx:
        if j <= i: continue
        a, b = df.loc[i], df.loc[j]
        d = dist(a.lat,a.lon,b.lat,b.lon)
        same_name = asc(a.nombre).replace("castillo de ","") == asc(b.nombre).replace("castillo de ","")
        if (d < 2500 and a.municipio == b.municipio) or (same_name and d < 6000):
            for k, o in ((i, b), (j, a)):
                df.at[k, "posible_duplicado"] = (df.at[k, "posible_duplicado"] + "; " if df.at[k, "posible_duplicado"] else "") + f"{o.nombre} ({d/1000:.1f} km)"
df.to_pickle("refined.pkl")
c = df[df.categoria.isin(["castillo/fortaleza","torre/casa-torre"])]
print(df.categoria.value_counts()); print("dup flags", (c.posible_duplicado!="").sum())
pd.set_option("display.width",250,"display.max_rows",200,"display.max_colwidth",60)
print(c[c.posible_duplicado!=""][["nombre","municipio","fuentes","posible_duplicado"]].to_string())