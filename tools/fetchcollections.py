# Saves every collection on the store (title, description, image) and which products are in it, from the store's
# public JSON, to tools/data/collections.json. The collection pages are built from this, so they hold exactly what
# the store's own collections hold.
import json, urllib.request, time
T = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/'
S = 'https://bespokewineandspirits.com'
UA = {'User-Agent': 'Mozilla/5.0'}
def get(path):
    for attempt in range(6):
        try:
            r = json.loads(urllib.request.urlopen(urllib.request.Request(S + path, headers=UA), timeout=30).read())
            time.sleep(0.8)          # the store rate-limits quick runs of requests
            return r
        except Exception:
            time.sleep(10 + attempt * 15)
    raise SystemExit('could not fetch ' + path)

cols = []
page = 1
while True:
    d = get('/collections.json?limit=250&page=%d' % page)['collections']
    if not d: break
    cols += d; page += 1
import os
out = json.load(open(T + 'collections.json', encoding='utf8')) if os.path.exists(T + 'collections.json') and os.environ.get('RESUME') else {}
for c in cols:
    if c['handle'] in out: continue
    handles = []; page = 1
    while True:
        d = get('/collections/%s/products.json?limit=250&page=%d' % (c['handle'], page))['products']
        if not d: break
        handles += [p['handle'] for p in d]; page += 1
    out[c['handle']] = {'title': c['title'], 'body_html': c.get('body_html') or '', 'image': (c.get('image') or {}).get('src', ''),
                        'products': handles}
    print(c['handle'], len(handles))
    json.dump(out, open(T + 'collections.json', 'w', encoding='utf8'), ensure_ascii=False, indent=0)   # progress, for RESUME=1
json.dump(out, open(T + 'collections.json', 'w', encoding='utf8'), ensure_ascii=False, indent=0)
print('collections', len(out))
