# Compares the site's product data with the live store: stock and price per product, and products the store added.
import json, time, subprocess
T = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/'
local = {p['handle']: p for p in json.load(open(T + 'wines_products.json', encoding='utf8'))}
live = []
for page in range(1, 6):
    out = subprocess.run(['curl', '-s', '-A', 'Mozilla/5.0', 'https://bespokewineandspirits.com/products.json?limit=250&page=%d' % page], capture_output=True).stdout
    d = json.loads(out)['products']
    if not d: break
    live += d; time.sleep(1)
L = {p['handle']: p for p in live}
av = lambda p: any(v['available'] for v in p['variants'])
diffs = [(h, av(local[h]), av(L[h]), local[h]['variants'][0]['price'], L[h]['variants'][0]['price']) for h in L if h in local and (av(local[h]) != av(L[h]) or local[h]['variants'][0]['price'] != L[h]['variants'][0]['price'])]
print('live', len(L), 'local', len(local), 'changed', len(diffs))
for d in diffs: print('  ', d)
print('new on store:', [h for h in L if h not in local])
print('gone from store:', [h for h in local if h not in L])

# with --apply: take each product's variants (stock and price) from the live store
import sys
if '--apply' in sys.argv and diffs:
    for p in local.values():
        if p['handle'] in L: p['variants'] = L[p['handle']]['variants']
    json.dump(list(local.values()), open(T + 'wines_products.json', 'w', encoding='utf8'))
    print('applied')
