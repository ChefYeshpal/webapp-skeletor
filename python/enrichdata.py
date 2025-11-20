############# N O T I C E #############
# This mixes the data of the DCP osteometric xlsx file with the json by corresponding to it's respective entries
# But I think I fucked up somewhere, and now there's incorrect data in multiple places
# If you dont know what I'm taking about, it's the WAYY to many number of `260 mm` height/length that's in the specifications...
#######################################

import json
from pathlib import Path

import pandas as pd
import numpy as np


ASSETS_DIR = Path('assets')
FMA_CSV_PATH = ASSETS_DIR / 'FMA-2017-04-01.csv'
OSTEOMETRIC_CANDIDATES = [
    'DCP osteometric data.xlsx',
    'DCP-osteometric-data.xlsx',
]


def resolve_osteometric_path():
    for candidate in OSTEOMETRIC_CANDIDATES:
        path = ASSETS_DIR / candidate
        if path.exists():
            return path
    raise FileNotFoundError(
        "Missing osteometric spreadsheet. Expected one of: "
        + ', '.join(str(ASSETS_DIR / name) for name in OSTEOMETRIC_CANDIDATES)
    )
with open('data.json') as f:
    anatomy_data = json.load(f)

osteometric_path = resolve_osteometric_path()
osteometric_df = pd.read_excel(osteometric_path)

bone_prefixes = {
    'radius': 'X RAD',
    'ulna': 'X ULNA',
    'femur': 'X FEM',
    'tibia': 'TIB',
    'calcaneus': 'CALC',
    'scapula': 'SCAP',
    'humerus': 'X HUM'
}

def convert_for_json(value):
    """Convert numpy types to native Python types for JSON serialization."""
    if isinstance(value, (np.integer, np.int64)):
        return int(value)
    elif isinstance(value, (np.floating, np.float64)):
        return float(value)
    return value


def split_multi_value(value):
    """Split pipe-delimited cells into a clean list."""
    if not value or not isinstance(value, str):
        return []
    parts = [part.strip() for part in value.split('|') if part.strip()]
    return parts


def normalise_fma_ids(row):
    """Return the set of normalised FMA identifiers for a CSV row."""
    candidates = []
    class_id = str(row.get('Class ID', '')).strip()
    if class_id:
        tail = class_id.rsplit('/', 1)[-1].strip()
        if tail:
            candidates.append(tail)

    fmaid = str(row.get('FMAID', '')).strip()
    if fmaid:
        candidates.append(fmaid)

    prefix_iri = str(row.get('http://data.bioontology.org/metadata/prefixIRI', '')).strip()
    if prefix_iri:
        suffix = prefix_iri.split(':')[-1].strip()
        if suffix:
            candidates.append(suffix)

    normalised = []
    for candidate in candidates:
        if not candidate:
            continue
        upper = candidate.upper()
        if upper.startswith('FMA'):
            normalised.append(upper)
            digits = upper[3:].lstrip('0')
            if digits and digits != upper[3:]:
                normalised.append(f'FMA{digits}')
        elif upper.isdigit():
            stripped = upper.lstrip('0') or '0'
            normalised.append(f'FMA{stripped}')
        else:
            normalised.append(f'FMA{upper}')

    # Preserve order while removing duplicates
    return list(dict.fromkeys(normalised))


def build_fma_lookup(csv_path):
    """Build a lookup of FMA metadata keyed by multiple identifier variants."""
    try:
        fma_df = pd.read_csv(csv_path, dtype=str, keep_default_na=False)
    except FileNotFoundError:
        return {}

    fma_df = fma_df.fillna('')
    lookup = {}

    for _, row in fma_df.iterrows():
        ids = normalise_fma_ids(row)
        if not ids:
            continue

        info = {}
        class_id = str(row.get('Class ID', '')).strip()
        if class_id:
            info['uri'] = class_id

        preferred_label = str(row.get('Preferred Label', '')).strip()
        if preferred_label:
            info['preferred_label'] = preferred_label

        synonyms = split_multi_value(row.get('Synonyms', ''))
        if synonyms:
            info['synonyms'] = synonyms

        definitions = split_multi_value(row.get('Definitions', ''))
        if definitions:
            info['definitions'] = definitions

        parents = split_multi_value(row.get('Parents', ''))
        if parents:
            info['parents'] = parents

        raw_fmaid = str(row.get('FMAID', '')).strip()
        if raw_fmaid:
            info['fmaid'] = int(raw_fmaid) if raw_fmaid.isdigit() else raw_fmaid

        if not info:
            continue

        primary_id = ids[0]
        info['fma_id'] = primary_id

        for fid in ids:
            lookup.setdefault(fid, info)

    return lookup


fma_lookup = build_fma_lookup(FMA_CSV_PATH)

def extract_specs(row, prefix):
    specs = {}
    length_cols = [col for col in osteometric_df.columns if prefix in col and ('L' in col or 'length' in col.lower())]
    breadth_cols = [col for col in osteometric_df.columns if prefix in col and ('BR' in col or 'breadth' in col.lower())]
    height_cols = [col for col in osteometric_df.columns if prefix in col and ('H' in col or 'height' in col.lower())]

    if length_cols:
        specs['length_mm'] = convert_for_json(row[length_cols[0]])
    if breadth_cols:
        specs['breadth_mm'] = convert_for_json(row[breadth_cols[0]])
    if height_cols:
        specs['height_mm'] = convert_for_json(row[height_cols[0]])
    return specs

specimen_row = osteometric_df.iloc[0]

for entry in anatomy_data:
    pname = entry.get('primitive_name', '').lower()
    for bone, prefix in bone_prefixes.items():
        if bone in pname:
            specs = extract_specs(specimen_row, prefix)
            entry['specifications'] = specs
            break
    else:
        entry['specifications'] = {}

    composite_id = entry.get('composite_id')
    if composite_id and composite_id in fma_lookup:
        entry['composite_fma'] = fma_lookup[composite_id]

    primitive_id = entry.get('primitive_id')
    if primitive_id and primitive_id in fma_lookup:
        entry['primitive_fma'] = fma_lookup[primitive_id]

with open('data_enriched.json', 'w') as f:
    json.dump(anatomy_data, f, indent=2)

