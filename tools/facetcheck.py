# How complete and clean the store's filter fields are across the listed products.
import json, re, collections
T = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/'
_src = open('C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/winegen.py', encoding='utf8').read()
exec(_src[:_src.index('def page(p, i):')])
C = json.load(open(T + 'collections.json', encoding='utf8'))
print('spirits', C['spirits']['products']); print('amaro', C['amaro']['products'])
print('nonalc', C['non-alcoholic']['products'])
for k in ('Varietal', 'Region', 'Bottle Size', 'Bottles Per Case', 'Country'):
    vals = collections.Counter(spec(p).get(k, '') for p in LIST)
    print(k, 'missing', vals.get('', 0), 'distinct', len(vals)); print('   ', list(vals.most_common(60))[:60])
print('published_at sample', [p.get('published_at') for p in LIST[:3]], [p.get('created_at') for p in LIST[:2]])
