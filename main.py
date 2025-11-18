import sys
import tty
import termios
import re



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



def load_data(filename='data.txt'):
    data = []
    with open(filename, 'r') as f:
        for line in f:
            parsed = parse_line(line)
            if parsed:
                data.append(parsed)
    return data



def keyword_priority(entry):
    keywords = ['bone', 'bones', 'vertebra', 'vertebrae']
    text = (entry['composite_name'] + ' ' + entry['primitive_name']).lower()
    return any(kw in text for kw in keywords)



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



def print_list(data, selected_idx, offset=0, max_rows=20, match_indices=None, search_query=""):
    visible_data = data[offset:offset + max_rows]
    for i, entry in enumerate(visible_data):
        global_idx = i + offset
        prefix = '→ ' if global_idx == selected_idx else '  '
        line = entry['primitive_name']
        if match_indices is not None and global_idx in match_indices:
            line_display = f"\033[32m{line}\033[0m"
        else:
            line_display = line
        if global_idx == selected_idx:
            print('\033[7m' + prefix + line_display + '\033[0m')
        else:
            print(prefix + line_display)



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


    data.sort(key=lambda e: (not keyword_priority(e),))


    selected_idx = 0
    offset = 0
    max_rows = 30


    search_mode = False
    search_query = ""
    match_indices = []
    match_pos = 0


    while True:
        clear()
        if not search_mode:
            print("Use 'j' (down), 'k' (up), ↑ / ↓ arrows also, Enter to select, 'q' to quit, / to search.\n")
            print_list(data, selected_idx, offset, max_rows)
        else:
            print("Search: " + search_query)
            print_list(data, selected_idx, offset, max_rows, match_indices, search_query)


        key = get_key()


        if not search_mode:
            if key == 'q':
                break
            elif key == 'j' or key == '\x1b[B':
                if selected_idx < len(data) - 1:
                    selected_idx += 1
                    if selected_idx >= offset + max_rows:
                        offset += 1
            elif key == 'k' or key == '\x1b[A':
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
            elif key == '/':
                search_mode = True
                search_query = ""
                match_indices = []
                match_pos = 0
        else:
            if key == '\x7f' or key == '\b':
                search_query = search_query[:-1]
            elif key == '\r' or key == '\n':
                if match_indices:
                    selected_idx = match_indices[match_pos]
                    if selected_idx < offset:
                        offset = selected_idx
                    elif selected_idx >= offset + max_rows:
                        offset = selected_idx - max_rows + 1
                search_mode = False
            elif key == '\x1b':
                search_mode = False
                match_indices = []
                search_query = ""
            elif key == 'n':
                if match_indices:
                    match_pos = (match_pos + 1) % len(match_indices)
                    selected_idx = match_indices[match_pos]
                    if selected_idx < offset:
                        offset = selected_idx
                    elif selected_idx >= offset + max_rows:
                        offset = selected_idx - max_rows + 1
            else:
                if key == ':':
                    next_char = sys.stdin.read(1)
                    if next_char == 'q':
                        search_mode = False
                        match_indices = []
                        search_query = ""
                        continue
                    else:
                        search_query += ':' + next_char
                elif len(key) == 1 and key.isprintable():
                    search_query += key


            if search_query:
                lq = search_query.lower()
                match_indices = [i for i, e in enumerate(data)
                                 if lq in e['primitive_name'].lower() or lq in e['composite_name'].lower()]
                if match_indices:
                    match_pos = 0
                    selected_idx = match_indices[match_pos]
                    if selected_idx < offset:
                        offset = selected_idx
                    elif selected_idx >= offset + max_rows:
                        offset = selected_idx - max_rows + 1
                else:
                    match_pos = 0
            else:
                match_indices = []
                match_pos = 0



if __name__ == '__main__':
    main()
