import json
import requests
from bs4 import BeautifulSoup
from time import sleep

# Load data
with open('../data_enriched.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

def get_etymology_and_links(word):
    url = f"https://en.wiktionary.org/wiki/{word}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; EtymologyFetcher/1.0; +https://yourdomain.example)'
    }
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 404:
            return {"error": "Page not found", "link": url}
        if response.status_code != 200:
            return {"error": f"HTTP {response.status_code}", "link": url}
        soup = BeautifulSoup(response.text, 'html.parser')
        ety_header = soup.find(lambda t: t.name in ['h2', 'h3'] and 'etymology' in t.get_text().lower())
        if not ety_header:
            return {"error": "No etymology section", "link": url}

        etymology_texts = []
        sublinks = set()
        for sibling in ety_header.find_next_siblings():
            if sibling.name and sibling.name.startswith('h'):
                break
            if sibling.name in ['p', 'ul']:
                text = sibling.get_text(separator=' ', strip=True)
                etymology_texts.append(text)
                for a in sibling.find_all('a', href=True):
                    href = a['href']
                    if href.startswith('/wiki/') and not href.startswith('/w/'):
                        full_link = 'https://en.wiktionary.org' + href
                        sublinks.add(full_link)

        etymology = ' '.join(etymology_texts).strip()
        return {
            'etymology': etymology if etymology else "No detailed etymology available",
            'sublinks': list(sublinks),
            'link': url
        }
    except Exception as e:
        return {"error": str(e), "link": url}

unique_words = set()
for item in data:
    for key in ['composite_name', 'primitive_name']:
        words = item.get(key, "").lower().split()
        unique_words.update(words)

stop_words = {"of", "the", "and", "in", "on", "to", "with", "by", "at", "for", "from", "muscle", "disk", "bone"}
unique_words -= stop_words

etym_dict = {}
for word in unique_words:
    print(f"Fetching data for: {word}")
    etym_dict[word] = get_etymology_and_links(word)
    sleep(1)  # no no rate limit please dont kick me out

output = {
    "items": data,
    "etymologies": etym_dict
}
with open('../enriched_data_with_etymology_links.json', 'w', encoding='utf-8') as f_out:
    json.dump(output, f_out, indent=2, ensure_ascii=False)

print("All done.")
