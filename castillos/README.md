# Castillos de Navarra

Interactive 3D map of 80 castles and fortifications in Navarre, Spain, built from open data. Live at https://crobleto97.github.io/castillos/ (the map is in Spanish).

## What's here

| Path | Contents |
|---|---|
| `index.html` | The map. Built by `pipeline/build_mapa.py`; don't edit it by hand. |
| `data/inventario_castillos_navarra.csv` | Phase 1 output: every candidate from Wikidata and OSM, its category and whether it is in the map. |
| `data/fichas_castillos.csv` | Phase 2 output: one record per castle with date, condition, short history, source and a confidence level. |
| `data/*.json` | Raw inputs as downloaded (Wikidata, OSM castles, municipalities). |
| `geo/` | Province outlines and the rivers, roads and towns layer (`capas.json`). |
| `dem/` | Terrarium elevation tiles (zoom 7–10) from the AWS Terrain Tiles open dataset, used for the 3D relief. |
| `pipeline/` | The Python scripts below. |

## Pipeline

Run from any folder; every script resolves its own paths.

1. `wd.py`, `wd_details.py`, `municipios.py`: query Wikidata with SPARQL for castles, fortresses, towers and gates in Navarre, then their details.
2. `merge.py`: join Wikidata with the OSM export (`data/osm_navarra.json`) by Wikidata ID, then by distance and name.
3. `refine.py`, `final.py`: fix Basque-only names, separate prehistoric hillforts and city gates, flag and merge duplicates. 295 candidates become 80 castles.
4. `wiki.py`, `wiki_retry.py`: download the Spanish and Basque Wikipedia articles for each castle (rate limited, so it retries).
5. `fichas_data.py`: the hand-written record for each castle, drafted from those articles. `fichas.py` joins it with the inventory.
6. `capas.py`: rivers, roads and towns for the map, from OpenStreetMap (Overpass). Town labels use the OSM town centre (`data/osm_places.json`), because Wikidata's municipality coordinate can be kilometres away from the town. Raw downloads go in `geo/raw/`, which isn't committed.
7. `build_mapa.py`: writes `index.html` from `mapa_template.html`, the records and the layers.

Python 3 with pandas. The map uses MapLibre GL JS 4.7.

## Confidence levels

Each record says how far the sources back it: `confirmado` (the source states it), `dudoso` (sources disagree or hedge), `parcial` (date or condition missing) or `sin datos` (no source found yet).

## Sources and licences

Wikidata (CC0), OpenStreetMap (© OpenStreetMap contributors, ODbL), Wikipedia (CC BY-SA; histories are summaries, not copies), AWS Terrain Tiles (Mapzen, mixed open licences), province outlines from Code for Germany's click_that_hood.
