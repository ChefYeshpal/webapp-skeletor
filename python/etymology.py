############# N O T I C E #############
# This scrapes the data off of wikitionary.org to get etymology and pronunciation data for words
# Taking unique words (exceptions include: "of", "the", "and", "in", "on", "to", "with", "by", "at", "for", "from", "muscle", "disk", "bone")
# And then stores it in etymologies_only.json
#
# I wanna thank Pebble Fischer (https://hackclub.slack.com/team/U09UTARN116) for helping me in how to think for this section, seriously... I probably would still be poking and prodding if not for them...
#######################################

import json
import requests
from bs4 import BeautifulSoup
from time import sleep

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; EtymologyFetcher/1.0; +https://yourdomain.example)'
}

def _extract_section(soup: BeautifulSoup, keywords) -> str:
    """Extract the textual content of the first section whose header contains any of the given keywords.
    Stops before the next header of same or higher level.
    Returns an empty string if not found.
    """
    if isinstance(keywords, str):
        keywords = [keywords]
    keywords = [k.lower() for k in keywords]

    header = None
    for h in soup.find_all(['h2','h3','h4','h5','h6']):
        text = h.get_text(separator=' ', strip=True).lower()
        if any(k in text for k in keywords):
            header = h
            break
    if not header:
        return ''

    level = int(header.name[1])
    # cause some Wiktionary builds wrap headers in div.mw-heading
    cursor = header
    if header.parent.name == 'div' and 'mw-heading' in header.parent.get('class', []):
        cursor = header.parent

    texts = []
    for sib in cursor.next_siblings:
        if getattr(sib, 'name', None):
            # Determine if this sibling starts a new section
            next_header = None
            if sib.name.startswith('h') and len(sib.name) == 2:
                next_header = sib
            elif sib.name == 'div' and 'mw-heading' in sib.get('class', []):
                next_header = sib.find(['h2','h3','h4','h5','h6'])
            if next_header:
                next_level = int(next_header.name[1])
                if next_level <= level:
                    break
            if sib.name in ['p','ul','ol','dl','div']:
                t = sib.get_text(separator=' ', strip=True)
                t = t.replace('[ edit ]','').strip()
                if t:
                    texts.append(t)
    return ' '.join(texts).strip()

def _refine_pronunciation(raw: str) -> list:
    """Parse raw pronunciation text into structured list of entries.
    Each entry: {"dialect": <str>, "ipa": [<forms>]}.
    Removes audio references and ignores Hyphenation/Rhymes/Homophone markers.
    """
    if not raw:
        return []
    import re
    raw = re.sub(r'Audio\s*\([^)]*\)\s*:\s*\(\s*file\s*\)', ' ', raw, flags=re.IGNORECASE)
    raw = re.sub(r'\(\s*file\s*\)', ' ', raw, flags=re.IGNORECASE)
    raw = re.sub(r'IPA\s*\(\s*key\s*\)\s*:', 'IPA:', raw, flags=re.IGNORECASE)
    raw = re.sub(r'\s+', ' ', raw).strip()

    # Split heuristically at dialect parentheses that precede IPA:
    entries = []
    pos = 0
    while pos < len(raw):
        ipa_marker = raw.find('IPA:', pos)
        if ipa_marker == -1:
            break
        # Okay, this section is REALLY REALLY IMPORTANT
        # lkook backwards for the preceding '(' that closes before ipa_marker
        paren_start = raw.rfind('(', pos, ipa_marker)
        paren_end = raw.find(')', paren_start, ipa_marker) if paren_start != -1 else -1
        dialect = None
        if paren_start != -1 and paren_end != -1 and paren_end < ipa_marker:
            dialect = raw[paren_start+1:paren_end].strip()
        # determine end of this segment (next '(' followed by something + 'IPA:' or end)
        next_paren = raw.find('(', ipa_marker + 4)
        # advance search to find a future 'IPA:' after next '('; if none, segment to end
        while next_paren != -1:
            future_ipa = raw.find('IPA:', next_paren)
            if future_ipa != -1:
                segment_end = next_paren
                break
            next_paren = raw.find('(', next_paren + 1)
        else:
            segment_end = len(raw)

        segment = raw[ipa_marker + 4:segment_end].strip(' ,')
        # Remove bracketed reference numbers like [ 1 ]
        segment = re.sub(r'\[\s*\d+\s*\]', '', segment)
        segment = re.split(r'\b(Hyphenation|Rhymes|Homophone|Homophones|Hyphenation|Pronunciation)\b', segment)[0].strip()

        ipa_forms = re.findall(r'/[^/]+/', segment)
        if not ipa_forms and segment:
            bracket_forms = re.findall(r'\[[^\]]+\]', segment)
            ipa_forms.extend(bracket_forms)
        if ipa_forms:
            entries.append({
                'dialect': dialect or 'general',
                'ipa': sorted(set(f.strip() for f in ipa_forms))
            })
        pos = segment_end

    return entries

def get_etymology(word: str) -> dict:
    url = f"https://en.wiktionary.org/wiki/{word}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code == 404:
            return {"error": "Page not found", "link": url}
        if resp.status_code != 200:
            return {"error": f"HTTP {resp.status_code}", "link": url}

        soup = BeautifulSoup(resp.text, 'html.parser')

        etymology = _extract_section(soup, 'etymology')
        pronunciation_raw = _extract_section(soup, 'pronunciation')
        pronunciation_entries = _refine_pronunciation(pronunciation_raw)

        if not etymology:
            # Retain previous semantics if etymology missing
            return {"error": "No etymology section", "pronunciation": pronunciation_entries, "link": url}

        return {
            "etymology": etymology,
            "pronunciation": pronunciation_entries,
            "link": url
        }
    except Exception as e:
        return {"error": str(e), "link": url}

with open('../data_enriched.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

unique_words = set()
for item in data:
    for key in ['composite_name', 'primitive_name']:
        words = item.get(key, "").lower().split()
        unique_words.update(words)

stop_words = {
    "of", "the", "and", "in", "on", "to", "with",
    "by", "at", "for", "from", "muscle", "disk", "bone"
}
unique_words -= stop_words

unique_words = sorted(unique_words)

etymologies = {}
for word in unique_words:
    print(f"Fetching etymology for: {word}")
    etymologies[word] = get_etymology(word)
    sleep(1)

with open('../etymologies_only.json', 'w', encoding='utf-8') as f_out:
    json.dump(etymologies, f_out, indent=2, ensure_ascii=False)

print("done.")
