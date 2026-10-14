# Fresh product list from the store, plus each product page's spec lines and spec-sheet link.
import json, re, html, urllib.request, concurrent.futures as cf
S = 'https://bespokewineandspirits.com'
T = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/'
UA = {'User-Agent': 'Mozilla/5.0'}
def get(u):
    for _ in range(3):
        try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40).read().decode('utf8', 'replace')
        except Exception as e: err = e
    raise err
prods = []
for page in range(1, 6):
    d = json.loads(get(S + '/products.json?limit=250&page=%d' % page))['products']
    if not d: break
    prods += d
print('products', len(prods))
def specs(p):
    s = get(S + '/products/' + p['handle'])
    sp = {}
    for v in re.findall(r'<li class="sales-point">[\s\S]*?<span>([^<]+)</span>', s):
        v = html.unescape(v).strip()
        if ':' in v:
            k, x = v.split(':', 1)
            if x.strip(): sp[k.strip()] = x.strip()
    m = re.search(r'<a[^>]+href="([^"]+)"[^>]*>(?:(?!</a>)[\s\S])*View Spec Sheet', s)
    sheet = html.unescape(m.group(1)) if m else None
    return p['handle'], {'specs': sp, 'sheet': sheet}
out = {}
with cf.ThreadPoolExecutor(8) as ex:
    for h, d in ex.map(lambda p: (lambda: specs(p))() if True else None, prods):
        out[h] = d
json.dump(prods, open(T + 'wines_products.json', 'w', encoding='utf8'))
json.dump(out, open(T + 'wines_specs.json', 'w', encoding='utf8'), indent=0)
from collections import Counter
print(Counter(k for d in out.values() for k in d['specs']).most_common())
print('sheets', sum(1 for d in out.values() if d['sheet']))
