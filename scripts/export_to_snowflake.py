"""Export species metadata and GloBI interactions to CSVs for Snowflake ingestion."""
import csv
import json
import os

DATA_DIR = "frontend/public/data"
OUT_DIR = "data/snowflake"
os.makedirs(OUT_DIR, exist_ok=True)

with open(f"{DATA_DIR}/app-data.json") as f:
    app_data = json.load(f)

globi_cache = {}
if os.path.exists("data/globi_cache.json"):
    with open("data/globi_cache.json") as f:
        globi_cache = json.load(f)

HABITAT_MAP = {
    "Plantae": "terrestrial", "Fungi": "terrestrial", "Insecta": "terrestrial",
    "Arachnida": "terrestrial", "Mammalia": "terrestrial", "Aves": "terrestrial",
    "Reptilia": "terrestrial", "Amphibia": "freshwater",
    "Actinopterygii": "aquatic", "Mollusca": "aquatic", "Animalia": "unknown",
}

# 1. Species metadata
nodes = app_data.get("nodes", [])
with open(f"{OUT_DIR}/species_metadata.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "scientific_name", "common_name", "trophic_level", "iconic_taxon",
        "taxon_order", "family", "observation_count", "zone_count",
        "decline_trend", "keystone_score", "habitat"
    ])
    writer.writeheader()
    for n in nodes:
        writer.writerow({
            "scientific_name": n["id"],
            "common_name": n.get("common_name", ""),
            "trophic_level": n.get("trophic_level", ""),
            "iconic_taxon": n.get("iconic_taxon", ""),
            "taxon_order": n.get("order", ""),
            "family": n.get("family", ""),
            "observation_count": n.get("observations", 0),
            "zone_count": n.get("zone_count", 0),
            "decline_trend": n.get("decline_trend", 0),
            "keystone_score": n.get("keystone_score", 0),
            "habitat": HABITAT_MAP.get(n.get("iconic_taxon", ""), "unknown"),
        })

print(f"Wrote {len(nodes)} species to {OUT_DIR}/species_metadata.csv")

# 2. Species interactions (with data source tagging)
edges = app_data.get("edges", [])
globi_pairs = set()
for sid, interactions in globi_cache.items():
    for inter in interactions:
        target = inter.get("target", "")
        globi_pairs.add((sid, target))

with open(f"{OUT_DIR}/species_interactions.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "source_species", "target_species", "interaction_type", "strength", "data_source"
    ])
    writer.writeheader()
    for e in edges:
        is_globi = (e["source"], e["target"]) in globi_pairs
        writer.writerow({
            "source_species": e["source"],
            "target_species": e["target"],
            "interaction_type": e["type"],
            "strength": e.get("strength", 0.5),
            "data_source": "globi" if is_globi else "modeled",
        })

globi_count = sum(1 for e in edges if (e["source"], e["target"]) in globi_pairs)
print(f"Wrote {len(edges)} interactions ({globi_count} from GloBI, {len(edges) - globi_count} modeled)")
print(f"\nTo load into Snowflake:")
print(f"  PUT file://{os.path.abspath(OUT_DIR)}/species_metadata.csv @%SPECIES_METADATA;")
print(f"  COPY INTO SPECIES_METADATA FROM @%SPECIES_METADATA FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);")
print(f"  PUT file://{os.path.abspath(OUT_DIR)}/species_interactions.csv @%SPECIES_INTERACTIONS;")
print(f"  COPY INTO SPECIES_INTERACTIONS FROM @%SPECIES_INTERACTIONS FILE_FORMAT = (TYPE = CSV SKIP_HEADER = 1);")
