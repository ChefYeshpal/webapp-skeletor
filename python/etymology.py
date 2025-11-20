import json
import requests
from bs4 import BeautifulSoup
from time import sleep

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; EtymologyFetcher/1.0; +https://yourdomain.example)'
}

def get_etymology(word: str) -> dict:
    url = f"https://en.wiktionary.org/wiki/{word}"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code == 404:
            return {"error": "Page not found", "link": url}
        if resp.status_code != 200:
            return {"error": f"HTTP {resp.status_code}", "link": url}

        soup = BeautifulSoup(resp.text, 'html.parser')
        ety_header = None
        for header in soup.find_all(['h2', 'h3', 'h4']):
            header_text = header.get_text(separator=' ', strip=True).lower()
            if 'etymology' in header_text:
                ety_header = header
                break

        if not ety_header:
            return {"error": "No etymology section", "link": url}

        etymology_texts = []
        sublinks = set()
        current_level = int(ety_header.name[1])
        
        parent = ety_header.parent
        for sibling in parent.find_next_siblings():
            if sibling.name and sibling.name.startswith('h'):
                level = int(sibling.name[1])
                if level <= current_level:
                    break
            if sibling.name in ['p', 'ul', 'ol', 'div']:
                text = sibling.get_text(separator=' ', strip=True)
                if text and text.lower() != '[ edit ]':
                    etymology_texts.append(text)
                for a in sibling.find_all('a', href=True):
                    href = a['href']
                    if href.startswith('/wiki/') and not href.startswith('/w/'):
                        sublinks.add('https://en.wiktionary.org' + href)

        etymology = ' '.join(etymology_texts).strip()
        if not etymology:
            return {"error": "No detailed etymology available", "link": url}

        return {
            "etymology": etymology,
            "sublinks": sorted(sublinks),
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

unique_words = list(unique_words)[:10]

etymologies = {}
for word in unique_words:
    print(f"Fetching etymology for: {word}")
    etymologies[word] = get_etymology(word)
    sleep(1)

with open('../etymologies_only.json', 'w', encoding='utf-8') as f_out:
    json.dump(etymologies, f_out, indent=2, ensure_ascii=False)

print("done.")
