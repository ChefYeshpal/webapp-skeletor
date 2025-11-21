############# N O T I C E #############
# This scrapes the data off of wiktionary.org to get etymology and pronunciation data for words
# Taking unique words (exceptions include: "of", "the", "and", "in", "on", "to", "with",
# "by", "at", "for", "from", "muscle", "disk", "bone")
# And then stores it in etymologies_only.json
#######################################

import json
import requests
from bs4 import BeautifulSoup
from time import sleep
import re

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; EtymologyFetcher/1.0; +https://yourdomain.example)'
}

def _extract_section(soup: BeautifulSoup, keywords) -> str:
    """Extract the textual content of the first section whose header contains any of the given keywords.
    Stops before the next header of same or higher level.
    Returns an empty string if not found.
    (Used as a generic helper, e.g. for Pronunciation.)
    """
    if isinstance(keywords, str):
        keywords = [keywords]
    keywords = [k.lower() for k in keywords]

    header = None
    for h in soup.find_all(['h2', 'h3', 'h4', 'h5', 'h6']):
        text = h.get_text(separator=' ', strip=True).lower()
        if any(k in text for k in keywords):
            header = h
            break
    if not header:
        return ''

    level = int(header.name[1])
    # some Wiktionary builds wrap headers in div.mw-heading
    cursor = header
    if header.parent.name == 'div' and 'mw-heading' in header.parent.get('class', []):
        cursor = header.parent

    texts = []
    for sib in cursor.next_siblings:
        if getattr(sib, 'name', None):
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

def _clean_etymology_text(text: str) -> str:
    if not text:
        return text

    cut_markers = [
        'Translations ',
        'Translations:',
        ' Synonyms ',
        ' Antonyms ',
        ' Derived terms',
        ' Usage notes',
        ' Coordinate term',
        ' Hypernym',
        ' Hyponyms',
        ' Noun ',
        ' Adjective ',
        ' Verb ',
        ' Pronunciation '
    ]

    lower = text.lower()
    cut_pos = len(text)
    for marker in cut_markers:
        idx = lower.find(marker.lower())
        if idx != -1:
            cut_pos = min(cut_pos, idx)

    return text[:cut_pos].strip()

def _extract_etymologies_for_english(soup: BeautifulSoup) -> dict:
    """Extract English etymology sections as a dict.
    - 'Etymology'          -> {'general': '...'}
    - 'Etymology 1', '2'   -> {'1': '...', '2': '...'}
    Only grabs the first <p> after each Etymology heading and then cleans it.
    """
    etys = {}

    english_h2 = None
    for h2 in soup.find_all('h2'):
        span = h2.find('span', class_='mw-headline')
        txt = (span.get_text(strip=True) if span else h2.get_text(strip=True)).strip().lower()
        if txt == 'english':
            english_h2 = h2
            break

    if not english_h2:
        return etys

    sibling = english_h2
    while True:
        sibling = sibling.find_next_sibling()
        if sibling is None:
            break
        if sibling.name == 'h2':
            break

        if sibling.name == 'h3':
            span = sibling.find('span', class_='mw-headline')
            header_text = (span.get_text(strip=True) if span else sibling.get_text(strip=True)).strip()
            header_lower = header_text.lower()

            if header_lower.startswith('etymology'):
                m = re.match(r'etymology\s*(\d*)', header_lower)
                num = m.group(1).strip() if m and m.group(1) else ''

                if num:
                    key = num
                else:
                    key = 'general' if not etys else str(len(etys) + 1)

                p = sibling.find_next_sibling()
                while p is not None and p.name not in ['p', 'h2', 'h3', 'h4', 'h5', 'h6']:
                    p = p.find_next_sibling()

                if p is None or p.name not in ['p']:
                    continue

                raw_text = p.get_text(separator=' ', strip=True)
                raw_text = raw_text.replace('[ edit ]', '').strip()
                cleaned = _clean_etymology_text(raw_text)

                if cleaned:
                    etys[key] = cleaned

    return etys

def _refine_pronunciation(raw: str) -> list:
    """Parse raw pronunciation text into structured list of entries.
    Each entry: {"dialect": <str>, "ipa": [<forms>]}.
    Removes audio references and ignores Hyphenation/Rhymes/Homophone markers.
    """
    if not raw:
        return []
    raw = re.sub(r'Audio\s*\([^)]*\)\s*:\s*\(\s*file\s*\)', ' ', raw, flags=re.IGNORECASE)
    raw = re.sub(r'\(\s*file\s*\)', ' ', raw, flags=re.IGNORECASE)
    raw = re.sub(r'IPA\s*\(\s*key\s*\)\s*:', 'IPA:', raw, flags=re.IGNORECASE)
    raw = re.sub(r'\s+', ' ', raw).strip()

    entries = []
    pos = 0
    while pos < len(raw):
        ipa_marker = raw.find('IPA:', pos)
        if ipa_marker == -1:
            break
        paren_start = raw.rfind('(', pos, ipa_marker)
        paren_end = raw.find(')', paren_start, ipa_marker) if paren_start != -1 else -1
        dialect = None
        if paren_start != -1 and paren_end != -1 and paren_end < ipa_marker:
            dialect = raw[paren_start+1:paren_end].strip()
        next_paren = raw.find('(', ipa_marker + 4)
        while next_paren != -1:
            future_ipa = raw.find('IPA:', next_paren)
            if future_ipa != -1:
                segment_end = next_paren
                break
            next_paren = raw.find('(', next_paren + 1)
        else:
            segment_end = len(raw)

        segment = raw[ipa_marker + 4:segment_end].strip(' ,')
        segment = re.sub(r'\[\s*\d+\s*\]', '', segment)
        segment = re.split(r'\b(Hyphenation|Rhymes|Homophone|Homophones|Pronunciation)\b', segment)[0].strip()

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

        # New: multiple English etymologies, cleaned
        etymologies = _extract_etymologies_for_english(soup)

        # Fallback: generic single section (any language / weird pages)
        if not etymologies:
            ety = _extract_section(soup, 'etymology')
            ety = _clean_etymology_text(ety)
            if not ety:
                pronunciation_raw = _extract_section(soup, 'pronunciation')
                pronunciation_entries = _refine_pronunciation(pronunciation_raw)
                return {
                    "error": "No etymology section",
                    "pronunciation": pronunciation_entries,
                    "link": url
                }
            etymologies = {"general": ety}

        pronunciation_raw = _extract_section(soup, 'pronunciation')
        pronunciation_entries = _refine_pronunciation(pronunciation_raw)

        return {
            "etymologies": etymologies,
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

limited_words = unique_words[:10]

etymologies = {}
for word in limited_words:
    print(f"Fetching etymology for: {word}")
    etymologies[word] = get_etymology(word)
    sleep(1)

with open('../etymologies_only.json', 'w', encoding='utf-8') as f_out:
    json.dump(etymologies, f_out, indent=2, ensure_ascii=False)

print("done.")
