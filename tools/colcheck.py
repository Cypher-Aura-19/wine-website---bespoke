# Coverage of the store's shopping collections by the site's product list, and each collection's own words.
import json, re, html
T = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/'
_src = open('C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/winegen.py', encoding='utf8').read()
exec(_src[:_src.index('def page(p, i):')])
C = json.load(open(T + 'collections.json', encoding='utf8'))
have = {p['handle'] for p in PRODS}
listed = {p['handle'] for p in LIST}
SHOP = ['frontpage', 'all-wine', 'red-wine', 'white-wine', 'rose-wine', 'sparkling-wine', 'skin-contact-orange-wine-white', 'dessert-wine', 'non-alcoholic', 'spirits', 'amaro', 'organic', 'bio-dynamic', 'mixed-packs']
for h in SHOP:
    c = C[h]; ps = c['products']
    missing = [x for x in ps if x not in have]
    unlisted = [x for x in ps if x in have and x not in listed]
    body = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', c['body_html']))).strip()
    print('%-32s %-28s %3d  missing-from-data %d %s  not-listed %d %s' % (h, c['title'], len(ps), len(missing), missing[:4], len(unlisted), unlisted[:4]))
    if body: print('      ', body[:300])
# products in the store's own list that the site lists, but no shopping collection holds
inany = {x for h in SHOP for x in C[h]['products']}
print('listed but in no shop collection:', sorted(listed - inany)[:40])
