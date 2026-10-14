# The store renames product photos now and then. For every listed product shown with a store photo, check that the
# photo still loads; if it does not, take the current images from the live product and save them in the data file.
import json, urllib.request, urllib.error
T = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/'
_src = open('C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/winegen.py', encoding='utf8').read()
exec(_src[:_src.index('def page(p, i):')])
UA = {'User-Agent': 'Mozilla/5.0'}
def ok(url):
    try: return urllib.request.urlopen(urllib.request.Request(url, headers=UA, method='HEAD'), timeout=20).status == 200
    except urllib.error.HTTPError: return False
fixed = []
for p in LIST:
    im = image(p)
    if not im or im[0] != 'photo' or ok(im[1] + '?width=700'): continue
    live = json.loads(urllib.request.urlopen(urllib.request.Request(S + '/products/%s.json' % p['handle'], headers=UA), timeout=20).read())['product']
    p['images'] = live['images']; fixed.append(p['handle'])
if fixed:
    json.dump(PRODS, open(T + 'wines_products.json', 'w', encoding='utf8'))
print('refreshed', fixed)
