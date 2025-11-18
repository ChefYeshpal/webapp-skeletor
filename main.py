import sys
import tty
import termios
import re

def parse_line(line):
    tokens = line.strip().split()
    
    # composite ID is the first token
    composite_id = tokens[0]
    
    # Find the position of primitive id by detecting token starting with BP, FMA, or similar patterns
    primitive_id_idx = None
    for i in range(1, len(tokens)):
        if re.match(r'(BP|FMA)\d+', tokens[i]):
            primitive_id_idx = i
            break
    
    if primitive_id_idx is None or primitive_id_idx == 1 or primitive_id_idx == len(tokens)-1:
        # Invalid line format, ignore this line with grace plj
        return None
    
    # composite name is tokens from 1 to primitive_id_idx -1 (join with space)
    composite_name = ' '.join(tokens[1:primitive_id_idx])
    
    # primitive ID token
    primitive_id = tokens[primitive_id_idx]
    
    # primitive name is everything after primitive ID
    primitive_name = ' '.join(tokens[primitive_id_idx+1:])
    
    return {
        "composite_id": composite_id,
        "composite_name": composite_name,
        "primitive_id": primitive_id,
        "primitive_name": primitive_name
    }

def load_data(filename='data.txt'):
    data = []
    with open(filename, 'r') as f:
        for line in f:
            parsed = parse_line(line)
            if parsed:
                data.append(parsed)
    return data

def get_key():
    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        ch = sys.stdin.read(1)
        if ch == '\x1b': 
            ch += sys.stdin.read(2)
        return ch
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)

def clear():
    print('\033[H\033[J', end='')

def print_list(data, selected_idx, offset=0, max_rows=20):
    visible_data = data[offset:offset+max_rows]
    for i, entry in enumerate(visible_data):
        prefix = '→ ' if i+offset == selected_idx else '  '
        line = f"{prefix}{entry['primitive_name']}"
        if i+offset == selected_idx:
            print('\033[7m' + line + '\033[0m')
        else:
            print(line)

def print_detail(entry):
    clear()
    print(f"Primitive name: {entry['primitive_name']}")
    print(f"Primitive ID: {entry['primitive_id']}")
    print(f"Composite name: {entry['composite_name']}")
    print(f"Compositive ID: {entry['composite_id']}")
    print('\nPress q to return to list.')

def main():
    data = load_data()
    if not data:
        print("No data found in data.txt")
        return
    
    selected_idx = 0
    offset = 0
    max_rows = 30

    while True:
        clear()
        print("Use 'j' (down), 'k' (up), Enter to select, 'q' to quit.\n")
        print_list(data, selected_idx, offset, max_rows)

        key = get_key()
        
        if key == 'q':
            break
        elif key == 'j':
            if selected_idx < len(data) - 1:
                selected_idx += 1
                if selected_idx >= offset + max_rows:
                    offset += 1
        elif key == 'k':
            if selected_idx > 0:
                selected_idx -= 1
                if selected_idx < offset:
                    offset -= 1
        elif key == '\r' or key == '\n':
            while True:
                print_detail(data[selected_idx])
                key2 = get_key()
                if key2 == 'q':
                    break

if __name__ == '__main__':
    main()
