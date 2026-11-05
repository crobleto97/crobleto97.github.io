import os; os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"))  # run from anywhere
import json, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wdlib import sparql, v
q="""SELECT ?m ?mLabel ?coord ?eu WHERE { ?m wdt:P31 wd:Q2074737 ; wdt:P131 wd:Q4018 ; wdt:P625 ?coord .
 OPTIONAL { ?m rdfs:label ?eu FILTER(lang(?eu)="eu") } SERVICE wikibase:label { bd:serviceParam wikibase:language "es". } }"""
r=sparql(q); json.dump([dict(nombre=v(x,"mLabel"),eu=v(x,"eu"),coord=v(x,"coord")) for x in r],open("municipios.json","w"),ensure_ascii=False)
print(len(r))