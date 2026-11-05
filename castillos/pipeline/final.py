import os; os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))  # run from anywhere
import pandas as pd
df = pd.read_pickle("refined.pkl")
# merge clear duplicates: keep first index, absorb ids/sources of the second
pairs = [("Castillo de Leguín","Castillo de Izagaondoa"), ("Castillo de Milagro","Castillo de Milagro"),
         ("Castillo de Falces","Castillo de Falces"), ("Castillo de Punicastro","Castillo de Punicastro")]
drop = []
for a, b in pairs:
    ia = df[df.nombre==a].index; ib = df[df.nombre==b].index
    keep = ia[0]; other = [i for i in ib if i != keep][0]
    for col in ["qid","osm_id","wiki_es","wiki_eu","castillosnet","fecha","bic","imagen","web"]:
        vals = [str(x) for x in (df.at[keep,col], df.at[other,col]) if str(x) not in ("","nan","None")]
        df.at[keep,col] = ", ".join(dict.fromkeys(vals))
    if df.at[other,"estado"] and not df.at[keep,"estado"]: df.at[keep,"estado"] = df.at[other,"estado"]
    df.at[keep,"fuentes"] = "Wikidata + OSM" if ("OSM" in df.at[keep,"fuentes"]+df.at[other,"fuentes"]) else "Wikidata"
    df.at[keep,"nombre_nota"] = ""; df.at[keep,"municipio_nota"] = ""
    df.at[keep,"posible_duplicado"] = ""; drop.append(other)
    df.at[keep,"nota_revision"] = "Fusionado: aparecía duplicado en Wikidata/OSM"
df = df.drop(drop)
df.loc[df.nombre=="Castillo de Punicastro","municipio"] = "Torralba del Río"
fix = {"Rocaforteko gaztelua":"Castillo de Rocaforte","Arradako gaztelua":"Castillo de Arrada","Arlekiko gaztelua":"Castillo de Arlekia"}
for eu, es in fix.items():
    m = df.nombre_eu.eq(eu) | df.nombre.str.contains(eu.split("ko")[0], case=False)
    df.loc[df.nombre_eu.eq(eu), ["nombre","nombre_nota"]] = [es, "provisional"]
df.loc[df.posible_duplicado.ne(""), "posible_duplicado"] = df.posible_duplicado.str.replace(r"Castillo de Izagaondoa", "Castillo de Leguín", regex=False)
df.loc[df.nombre.isin(["Castillo de Leguín"]), "posible_duplicado"] = ""

incl = {"castillo/fortaleza":"sí","torre/casa-torre":"sí","puerta/muralla":"capa aparte","parte de recinto amurallado":"capa aparte",
        "castro/yacimiento":"capa aparte (futura)","palacio/casa señorial":"no","otro":"no"}
df["incluir"] = df.categoria.map(incl)
pal_fort = df.nombre.str.contains("fortificad|torre", case=False) & df.categoria.eq("palacio/casa señorial")
df.loc[pal_fort, "incluir"] = "revisar"

def faltan(r):
    if r.incluir != "sí": return ""
    f = []
    if not r.fecha: f.append("fecha")
    if not r.estado: f.append("estado")
    if not (r.wiki_es or r.wiki_eu or r.castillosnet): f.append("fuente con historia")
    if r.nombre_nota: f.append("nombre (provisional)")
    if r.municipio_nota: f.append("municipio (aprox.)")
    return ", ".join(f)
df["faltan"] = df.apply(faltan, axis=1)
def link_cn(x):
    return ", ".join(f"https://www.castillosnet.org/espana/informacion.php?ref={c.strip()}" for c in str(x).split(",") if c.strip())
df["castillosnet_url"] = df.castillosnet.apply(link_cn)
df["wikidata_url"] = df.qid.apply(lambda q: ", ".join("https://www.wikidata.org/wiki/"+x.strip() for x in str(q).split(",") if x.strip() and x!="nan"))
df["osm_url"] = df.osm_id.apply(lambda o: ", ".join("https://www.openstreetmap.org/"+x.strip() for x in str(o).split(",") if x.strip()))
order = {"sí":0,"revisar":1,"capa aparte":2,"capa aparte (futura)":3,"no":4}
df = df.sort_values(["incluir","nombre"], key=lambda s: s.map(order) if s.name=="incluir" else s.str.lower())
cols = ["nombre","nombre_eu","incluir","categoria","municipio","estado","fecha","faltan","posible_duplicado","nota_revision",
        "lat","lon","fuentes","bic","wiki_es","wiki_eu","castillosnet_url","wikidata_url","osm_url","tipos_wd"]
out = df[cols].fillna("")
out["lat"] = out.lat.astype(float).round(5); out["lon"] = out.lon.astype(float).round(5)
out.to_csv("inventario_castillos_navarra.csv", index=False)
print(out.incluir.value_counts())
s = out[out.incluir=="sí"]
print("núcleo", len(s), "| con fecha", (s.fecha!="").sum(), "| con estado", (s.estado!="").sum(),
      "| con fuente", ((s.wiki_es!="")|(s.wiki_eu!="")|(s.castillosnet_url!="")).sum(), "| wiki_es", (s.wiki_es!="").sum(),
      "| solo OSM", (out.loc[s.index,"fuentes"]=="OSM").sum())
print(s.estado.value_counts(dropna=False))