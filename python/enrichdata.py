import json
import pandas as pd
import numpy as np
with open('data.json') as f:
    anatomy_data = json.load(f)

osteometric_df = pd.read_excel('DCP-osteometric-data.xlsx')

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

with open('data_enriched.json', 'w') as f:
    json.dump(anatomy_data, f, indent=2)

