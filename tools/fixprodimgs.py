# Producer pages (built by detailgen.py from live data, so not rebuilt here) get the same picture as the wine's own
# page: winegen's image() choice, including the replacements for damaged cut-outs.
import os, re, glob
os.chdir('C:/Users/HP/Desktop/Galvan ai projects/wine website')
_src = open('tools/winegen.py', encoding='utf8').read()
exec(_src[:_src.index('def page(p, i):')])
by = {p['handle']: p for p in PRODS}
changed = 0
for f in glob.glob('producers/*/index.html'):
    s0 = s = open(f, encoding='utf8').read()
    def swap(m):
        h = m.group(1); p = by.get(h)
        if not p: return m.group(0)
        im = image(p); alt = re.search(r'alt="([^"]*)"', m.group(0)).group(1)
        if im and im[0] == 'cut':
            return '<img class="pcard__img" src="%s" alt="%s" width="%d" height="%d" loading="lazy" decoding="async">' % (im[1], alt, im[2], im[3])
        if im:
            return '<img class="pcard__img pcard__img--photo" src="%s?width=700" alt="%s" loading="lazy" decoding="async">' % (im[1], alt)
        return m.group(0)
    # each card: the link names the wine, the image follows
    s = re.sub(r'(?s)(<a class="pcard__link" href="/wines/([^/]+)/".*?)(<img class="pcard__img[^>]*>)',
               lambda m: m.group(1) + swap(type('M', (), {'group': lambda self, k=0: {0: m.group(3), 1: m.group(2)}[k]})()), s)
    if s != s0:
        open(f, 'w', encoding='utf8').write(s); changed += 1
print('producer pages updated', changed)
