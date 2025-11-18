############# N O T I C E #############
# This program was just made to convert the data.txt into data.json files so the browser could read it
# Apart from that, it has no meaningful function to the project
# And now I feel bad for calling it that...
#######################################

import re
import json

def parse_line(line):
    tokens = line.strip().split()
    
    composite_id = tokens[0]
    
    primitive_id_idx = None
    for i in range(1, len(tokens)):
        if re.match(r'(BP|FMA)\d+', tokens[i]):
            primitive_id_idx = i
            break
    
    if primitive_id_idx is None or primitive_id_idx == 1 or primitive_id_idx == len(tokens) - 1:
        return None
    
    composite_name = ' '.join(tokens[1:primitive_id_idx])
    primitive_id = tokens[primitive_id_idx]
    primitive_name = ' '.join(tokens[primitive_id_idx + 1:])
    
    return {
        "composite_id": composite_id,
        "composite_name": composite_name,
        "primitive_id": primitive_id,
        "primitive_name": primitive_name
    }

def convert_txt_to_json(txt_path='data.txt', json_path='data.json'):
    data = []
    with open(txt_path, 'r') as f:
        for line in f:
            parsed = parse_line(line)
            if parsed:
                data.append(parsed)
    with open(json_path, 'w') as jf:
        json.dump(data, jf, indent=2)

    print(f"Converted {len(data)} entries to {json_path}")

if __name__ == "__main__":
    convert_txt_to_json()
