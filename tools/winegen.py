# Builds /wines/<handle>/index.html for every product in the store, from the store's own data.
import os, re, json, glob, urllib.parse, html as H
os.chdir('C:/Users/HP/Desktop/Galvan ai projects/wine website')
T = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/'
S = 'https://bespokewineandspirits.com'
src_dg = open('C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/detailgen.py', encoding='utf8').read()
exec(src_dg[src_dg.index('# producers in page order'):src_dg.index('allp=[]')])                    # P
exec(src_dg[src_dg.index('def clean(t):'):src_dg.index('def story(')])                             # clean, kind, case
_kind = kind
def kind(p):
    if p['handle'] in MIXED: return 'Mixed case'
    if p['handle'] in GIFTS: return 'Gift'
    return _kind(p)

PRODS = json.load(open(T + 'wines_products.json', encoding='utf8'))
SPECS = json.load(open(T + 'wines_specs.json', encoding='utf8'))
CUT = json.load(open(T + 'cutouts.json'))
for f in glob.glob(T + 'cutmeta/*.json'):
    r = json.load(open(f)); r['closeup'] = r['h'] / r['w'] < 1.9
    CUT[os.path.basename(f)[:-5]] = r

COUNTRIES = ['Italy', 'France', 'Spain', 'United States', 'Austria', 'Argentina', 'Canada', 'Portugal', 'Germany', 'Hungary', 'Mexico', 'Australia']
def esc(s): return H.escape(s or '', quote=True)
def money(x): return ('$%d' % x) if abs(x - round(x)) < 0.005 else ('$%.2f' % x)
def maker(p):
    v = (p.get('vendor') or '').lower()
    for name, slug, country, handle, keys in P:
        if any(k in v for k in keys): return name, slug, country
    return None
def maker_name(p):
    m = maker(p)
    if m: return m[0]
    v = re.sub(r'\s+', ' ', (p.get('vendor') or '')).strip()
    if v.lower() == 'local': return ''                # the store's own items: no maker to name
    m = re.search(r'\(\s*([^)]+?)\s*\)', v)          # "GP IMPORTS ( Andretta Brunello )": the maker is in brackets
    if m: v = m.group(1)
    return v.title() if v.isupper() else v
def spec(p): return SPECS.get(p['handle'], {}).get('specs', {})
def n_of(p):
    s = spec(p).get('Bottles Per Case')
    if s and s.isdigit() and int(s) > 0: return int(s)
    return case(p) or 1
def typ(p):
    t = (spec(p).get('Type') or p.get('product_type') or '').strip().rstrip('.')
    return t if t and t.lower() not in ('other',) else ''
def vintage(p):
    m = re.search(r'\b(19[5-9]\d|20[0-4]\d)\b', p['title'])
    if m: return m.group(1)              # the year printed in the title is the one on the bottle we list
    v = spec(p).get('Vintage')
    return v if v and v != '0' else ''
def country(p):
    c = spec(p).get('Country')
    if c: return c
    for c in COUNTRIES:
        if c in p.get('tags', []): return c
    m = maker(p)
    return m[2] if m and m[2] != 'Ontario' else ('Canada' if m else '')
def fmt(p):
    b = spec(p).get('Bottle Size') or ''
    m = re.search(r'x\s*([\d.]+)\s*mL', b, re.I)
    if not m or float(m.group(1)) <= 0: return ''
    ml = float(m.group(1))
    return ('%g L' % (ml / 1000)) if ml >= 1000 else ('%d mL' % ml)
def farming(p):
    t = [x.lower() for x in p.get('tags', [])]
    return ' and '.join(x for x in ('Organic', 'Biodynamic') if x.lower() in t)
CASE_V = 'v3'
DRAWN_V = 'v4'
BAD_CUTS = {'amarone-white-label-riserva-2006', 'rose-idylle-2024'}   # the cut-out lost the bottle: show the store photo
SAME_BOTTLE = {'roberperots-bordeaux-2024': 'rober-perots-bordeaux-2019'}   # identical label; the 2024 cut-out is damaged
def image(p):
    """('cut', src, w, h) | ('pic', src, w, h) | ('photo', src) | None"""
    gp = 'assets/gifts/%s-%s.jpg' % (p['handle'], GIFT_V)          # a gift: a photograph, cropped 4:5
    if os.path.exists(gp): return ('pic', '/' + gp, 1200, 1500)
    case = 'assets/cases/%s-%s.webp' % (p['handle'], CASE_V)     # a mixed case: its bottles, drawn by casecomp.py
    if os.path.exists(case):
        from PIL import Image as _I
        w, h_ = _I.open(case).size
        return ('cut', '/' + case, w, h_)
    drawn = 'assets/wines/drawn/%s-%s.svg' % (p['handle'], DRAWN_V)   # no photograph anywhere: drawn by drawn.py
    if os.path.exists(drawn):
        sv = open(drawn, encoding='utf8').read()
        m = re.search(r'<svg[^>]*width="(\d+)" height="(\d+)"', sv)
        return ('cut', '/' + drawn, int(m.group(1)), int(m.group(2)))
    h = SAME_BOTTLE.get(p['handle'], p['handle'])
    r = CUT.get(h)
    if h not in BAD_CUTS and isinstance(r, dict) and not r.get('closeup') and os.path.exists('assets/wines/%s.webp' % h):
        return ('cut', '/assets/wines/%s.webp' % h, r['w'], r['h'])
    r = CUT.get(p['handle'])
    if p['handle'] not in BAD_CUTS and isinstance(r, dict) and not r.get('closeup') and os.path.exists('assets/wines/%s.webp' % p['handle']):
        return ('cut', '/assets/wines/%s.webp' % p['handle'], r['w'], r['h'])
    if p.get('images'):
        return ('photo', p['images'][0]['src'].split('?')[0])
    return None
KEEP_CAPS = {'DOC', 'DOCG', 'IGT', 'AOC', 'AOP', 'IGP', 'DO', 'DOCa', 'VS', 'VSOP', 'XO', 'II', 'III', 'IV', 'NV', 'GT', 'USA', 'GTA', 'VQA', 'IPA'}
def _case_word(w):
    core = re.sub(r'[^A-Za-z]', '', w)
    if len(core) >= 3 and core.isupper() and core not in KEEP_CAPS:
        return re.sub(r"[A-Za-z]+(?:'[A-Za-z]+)?", lambda m: m.group(0).capitalize() if not m.group(0).lower().startswith(("d'", "l'")) else m.group(0)[:2].lower() + m.group(0)[2:].capitalize(), w)
    return w
def title(p):
    if p['handle'] in GIFT_NAMES: return GIFT_NAMES[p['handle']]
    t = re.sub(r'\s+', ' ', p['title']).strip()
    t = ' '.join(_case_word(w) for w in t.split(' '))
    return t[:1].upper() + t[1:]

def cart_attrs(p, im, name, mname):
    """what the site's cart keeps for a buy form: the store's variant id, and how to show the wine"""
    img = im[1] if im and im[0] in ('cut', 'pic') else ((im[1] + '?width=400') if im else '')
    return 'data-cartadd data-id="%d" data-handle="%s" data-title="%s" data-maker="%s" data-img="%s" data-photo="%d"' % (
        p['variants'][0]['id'], p['handle'], esc(name), esc(mname), esc(img), 2 if im and im[0] == 'pic' else 1 if im and im[0] == 'photo' else 0)

def card(p):
    im = image(p); n = n_of(p); price = float(p['variants'][0]['price'] or 0); k = kind(p)
    if price > 0 and n > 1:
        pr = '%s<small>a bottle</small>' % money(price / n); note = '<span class="pcard__note">Case of %d · %s</span>' % (n, money(price))
    elif price > 0:
        pr = money(price) + ('<small>the case</small>' if p['handle'] in MIXED else '')
        note = '<span class="pcard__note">%s</span>' % ('Mixed case' if p['handle'] in MIXED else 'Gift' if p['handle'] in GIFTS else 'Single bottle')
    else:
        pr = 'Ask us'; note = '<span class="pcard__note">Price on request</span>'
    if im and im[0] == 'pic':
        img = '<img class="pcard__img pcard__img--pic" src="%s" alt="%s" width="%d" height="%d" loading="lazy" decoding="async">' % (im[1], esc(title(p)), im[2], im[3])
    elif im and im[0] == 'cut':
        img = '<img class="pcard__img" src="%s" alt="%s" width="%d" height="%d" loading="lazy" decoding="async">' % (im[1], esc(title(p)), im[2], im[3])
    elif im:
        img = '<img class="pcard__img pcard__img--photo" src="%s?width=700" alt="%s" loading="lazy" decoding="async">' % (im[1], esc(title(p)))
    else:
        img = '<span class="pcard__blank" aria-hidden="true"><i></i></span>'
    return '''
            <li class="pcard" data-kind="%s"><a class="pcard__link" href="/wines/%s/" data-reveal>
              <span class="pcard__plate"><span class="pcard__tag">%s</span>%s<span class="pcard__go">View wine<i class="ico ico--arrow" aria-hidden="true"></i></span></span>
              <span class="pcard__body">
                <span class="pcard__meta">%s</span>
                <span class="pcard__row"><span class="pcard__name">%s</span><span class="pcard__price">%s</span></span>
                %s
              </span>
            </a></li>''' % (esc(k), p['handle'], esc(k), img, esc(maker_name(p)), esc(title(p)), pr, note)

# ---- shell: head, nav and menu from the producers page; footer likewise ----
src = open('producers/index.html', encoding='utf8').read()
HEAD = src[:src.index('  <div class="page" data-page>')]
FOOT = src[src.index('  <footer class="foot" data-foot>'):]
HEAD = re.sub(r'<link rel="stylesheet" href="/css/producers\.css\?v=\d+">', '<link rel="stylesheet" href="/css/producer.css?v=4">\n  <link rel="stylesheet" href="/css/wine.css?v=10">', HEAD)
HEAD = HEAD.replace('<body class="is-producers">', '<body class="is-wine">').replace(' aria-current="page"', '')
assert 'wine.css' in HEAD

# The store also holds internal items: client-only packs, fees (Taxes, Delivery, Custom Item), Open Wine and
# teas. Only the public mixed packs, the gift card and gift bags are shown from the "Local" vendor.
MIXED = ['sommeliers-choice', 'pretty-in-pink', 'viva-italia', 'weeknight-pours', 'frank-matts-picks', 'pop-pour']
GIFTS = ['gift-card-100-00', 'gift-bags', 'congratulations-pack', 'holiday-charcuterie', 'valentines-day-web-promotion', 'sale-fish-gift-packs']
GIFT_NAMES = {'gift-card-100-00': 'Gift card', 'gift-bags': 'Gift bag', 'congratulations-pack': 'Congratulations pack',
              'holiday-charcuterie': 'Holiday charcuterie', 'valentines-day-web-promotion': "Valentine's Day pack", 'sale-fish-gift-packs': 'Sale Fish gift pack'}
GIFT_V = 'v1'      # tools/giftphotos.py
def hidden(p):
    v = (p.get('vendor') or '').strip().lower()
    return (v == 'local' and p['handle'] not in MIXED + GIFTS) or v.startswith('tea')

# skip internal items, and duplicates the store lists twice under one title
seen = set(); LIST = []; TWIN_OF = {}
for p in PRODS:
    if hidden(p): continue
    t = title(p).lower()
    if t in seen: continue
    seen.add(t); LIST.append(p); TWIN_OF[t] = p
TWINS = {q['handle']: TWIN_OF[title(q).lower()]['handle'] for q in PRODS if title(q).lower() in TWIN_OF}
by_vendor = {}
for p in LIST: by_vendor.setdefault(maker_name(p), []).append(p)

def pack_parts(p):
    """The store writes each case as: NAME | subtitle | 01 | wine | appellation line | notes ... | 02 | ..."""
    t = H.unescape(re.sub(r'<br\s*/?>', '\n', p.get('body_html') or '', flags=re.I))
    segs = [re.sub(r'\s+', ' ', x).strip() for x in re.split(r'<[^>]+>|\n', t)]
    segs = [x for x in segs if x]
    if not segs: return '', []
    sub = segs[1] if len(segs) > 1 and not re.fullmatch(r'\d\d', segs[1]) else ''
    wines = []; cur = None; stage = 0
    for x in segs[2:]:
        if re.fullmatch(r'\d\d', x):
            cur = {'n': x, 'name': '', 'line': [], 'notes': []}; wines.append(cur); stage = 0; continue
        if cur is None: continue
        if x in ('★', '✦'): continue
        if x == '◆':
            if stage < 2: stage = 2
            continue
        if stage == 0: cur['name'] = x; stage = 1
        elif stage == 1: cur['line'].append(x)
        else: cur['notes'].append(x)
    return sub, wines

import ast as _ast
_cc = open('tools/casecomp.py', encoding='utf8').read()
CASE_BOTTLES = _ast.literal_eval(_cc[_cc.index('CASES = {') + len('CASES = '):_cc.index('}', _cc.index('CASES = {')) + 1])
PICTURED_EXTRA = {('pop-pour', 2): ('Villa Folini Prosecco', 'Tenimenti Civa', 'Sparkling')}   # shown in the case, not sold alone

import unicodedata as _ud
_STOP = {'the', 'and', 'doc', 'docg', 'igp', 'aop', 'wine', 'rose', 'red', 'white', 'blanc', 'rouge', 'rosso', 'bianco', 'classico', 'superiore'}
def _words(s):
    s = _ud.normalize('NFD', s.lower()).encode('ascii', 'ignore').decode()
    return set(w for w in re.findall(r'[a-z]{3,}', s) if w not in _STOP)
def case_contents(p):
    """(subtitle, [{n, name, line, note, href}], pictured): the bottles in a mixed case. The store's own text names them
    for most cases; for the rest, the store's photograph of the case shows them (casecomp.py lists them in order)."""
    sub, ws = pack_parts(p)
    back = {v: k for k, v in SAME_BOTTLE.items()}     # a picture borrowed from another vintage: the case holds the listed one
    mine = [back.get(x, x) for x in CASE_BOTTLES.get(p['handle'], []) if isinstance(x, str)]
    byh = {q['handle']: q for q in PRODS}
    items = []
    if ws:
        for w in ws:
            best = max(mine, key=lambda h: len(_words(w['name']) & _words(title(byh[h]) + ' ' + maker_name(byh[h]))), default=None)
            ok = best and len(_words(w['name']) & _words(title(byh[best]) + ' ' + maker_name(byh[best]))) >= 1
            items.append({'n': w['n'], 'name': w['name'], 'line': ' '.join(w['line']), 'note': w['notes'][0] if w['notes'] else '',
                          'href': ('/wines/%s/' % TWINS.get(best, best)) if ok else ''})
        return sub, items, False
    for k, x in enumerate(CASE_BOTTLES.get(p['handle'], [])):
        if isinstance(x, str): x = back.get(x, x)
        if isinstance(x, str) and x in byh:
            q = byh[x]
            line = ' · '.join(y for y in (maker_name(q), kind(q), country(q)) if y)
            items.append({'n': '%02d' % (k + 1), 'name': title(q), 'line': line, 'note': '', 'href': '/wines/%s/' % TWINS.get(x, x)})
        else:
            nm, mk, kd = PICTURED_EXTRA.get((p['handle'], x[1]), ('', '', ''))
            if nm: items.append({'n': '%02d' % (k + 1), 'name': nm, 'line': ' · '.join((mk, kd)), 'note': '', 'href': ''})
    return sub, items, True

def contents_html(items, pictured):
    if not items:
        return '<p class="ex-ask">The bottles in this case change with what is in stock. <a href="/contact/">Ask the team</a> what is in it now.</p>'
    rows = ''.join('''
              <li class="ex-wine">
                <span class="ex-wine__n">%s</span>
                <div class="ex-wine__body">
                  <h4 class="ex-wine__name">%s</h4>
                  <p class="ex-wine__line">%s</p>%s
                </div>
              </li>''' % (w['n'], ('<a href="%s">%s</a>' % (w['href'], esc(w['name']))) if w['href'] else esc(w['name']), esc(w['line']),
                            ('\n                  <p class="ex-wine__note">%s</p>' % esc(w['note'])) if w['note'] else '') for w in items)
    note = '<p class="ex-wines__k">Pictured in the case. Bottles can change with stock; ask the team for this week&rsquo;s.</p>' if pictured else ''
    return '%s<ol class="ex-wines">%s\n            </ol>' % (note, rows)

def page(p, i):
    v = p['variants'][0]; price = float(v['price'] or 0); n = n_of(p); avail = any(x['available'] for x in p['variants'])
    name = title(p); mk = maker(p); mname = maker_name(p); k = kind(p); im = image(p)
    t = typ(p); vin = vintage(p); ctry = country(p); f = fmt(p); farm = farming(p)
    sheet = SPECS.get(p['handle'], {}).get('sheet')
    if sheet: sheet = urllib.parse.quote(sheet, safe=':/?=&%#')
    if p['handle'] in MIXED: mname = 'Mixed case'
    gift = p['handle'] in GIFTS
    line = ' · '.join(x for x in ((t[:1].upper() + t[1:].lower()) if t else '', vin, ctry) if x)
    # stage
    if im and im[0] == 'pic':
        plate = '<div class="wn-plate wn-plate--pic" data-wnplate><img class="wn-plate__pic" src="%s" alt="%s" width="%d" height="%d" fetchpriority="high" data-wnbottle></div>' % (im[1], esc(name), im[2], im[3])
    elif im and im[0] == 'cut':
        plate = '<div class="wn-plate" data-wnplate><span class="wn-plate__tag">%s</span><img class="wn-plate__img" src="%s" alt="%s" width="%d" height="%d" fetchpriority="high" data-wnbottle></div>' % (esc(k), im[1], esc(name), im[2], im[3])
    elif im:
        plate = '<div class="wn-plate is-photo" data-wnplate><span class="wn-plate__tag">%s</span><img class="wn-plate__img wn-plate__img--photo" src="%s?width=1200" alt="%s" fetchpriority="high" data-wnbottle></div>' % (esc(k), im[1], esc(name))
    else:
        plate = '<div class="wn-plate" data-wnplate><span class="wn-plate__tag">%s</span><div class="wn-plate__blank" data-wnbottle><i aria-hidden="true"></i><span>%s</span></div></div>' % (esc(k), esc(name))
    slots = ''
    if gift and price > 0:
        slots = '''
            <div class="wn-case wn-case--gift">
              <p class="wn-case__k"><b>%s</b>%s</p>
              <span></span>
              <p class="wn-case__n">%s<small>%s</small></p>
            </div>''' % (esc(name), 'Shipped door to door in Ontario', money(price), 'value' if 'card' in p['handle'] else 'each')
    elif n > 1:
        slots = '''
            <div class="wn-case">
              <p class="wn-case__k"><b>Case of %d</b>%s</p>
              <div class="wn-slots" aria-hidden="true" data-slots data-per="%d"><span class="wn-slots__more" data-morecases hidden></span><span class="wn-stack" data-stack><span class="wn-grp">%s</span></span></div>
              <p class="wn-case__n"><span data-bottles>%d</span><small>bottles</small></p>
            </div>''' % (n, (f + ' bottles') if f else 'Sold by the case', min(n, 24), '<i class="wn-slot is-in"></i>' * min(n, 24), n)
    # price
    if price > 0 and n > 1:
        pmain = '<p class="wn-price__main">%s<small>a bottle</small></p><p class="wn-price__case">%s for a case of %d</p>' % (money(price / n), money(price), n)
        unit, units = 'case', 'cases'
    elif price > 0:
        pmain = '<p class="wn-price__main">%s</p><p class="wn-price__case">%s</p>' % (money(price), 'The case' if p['handle'] in MIXED else 'Sold by the bottle' if f else 'Each')
        unit, units = 'item', 'items'
    else:
        pmain = '<p class="wn-price__main">Ask us</p><p class="wn-price__case">Price on request</p>'
        unit, units = 'item', 'items'
    if avail and price > 0:
        buy = '''
              <form class="wn-buy" id="buy" action="%s/cart/add" method="post" data-buy data-n="%d" data-price="%s" data-unit="%s" data-units="%s">
                <input type="hidden" name="id" value="%d">
                <input type="hidden" name="return_to" value="/cart">
                <div class="wn-buy__row">
                  <div class="wn-qty">
                    <button type="button" data-step="-1" aria-label="One %s fewer">&minus;</button>
                    <input type="number" name="quantity" value="1" min="1" max="99" inputmode="numeric" aria-label="Number of %s" data-qty>
                    <button type="button" data-step="1" aria-label="One %s more">+</button>
                  </div>
                  <button class="btn btn--wine wn-add" type="submit" data-add><span data-addlabel>Add to cart</span><i class="ico ico--arrow" aria-hidden="true"></i></button>
                </div>
                <p class="wn-buy__sum" role="status" aria-live="polite"><span data-sumtext>1 %s%s</span><b data-sum>%s</b></p>
              </form>
              <p class="wn-stock">In stock, ready to ship</p>''' % (S, n, '%.2f' % price, unit, units, v['id'], unit, units, unit, unit, (' · %d bottles' % n) if n > 1 else '', money(price))
        buy = buy.replace(' data-buy ', ' data-buy %s ' % cart_attrs(p, im, name, mname), 1)
    else:
        buy = '''
              <div class="wn-buy">
                <button class="btn wn-add" type="button" disabled><span>%s</span></button>
              </div>
              <p class="wn-stock is-out">%s</p>
              <a class="wn-ask" href="/contact/">Ask us about this wine</a>''' % ('Coming soon' if price > 0 else 'Price on request', 'Inventory on the way' if price > 0 else 'Call or write to us for a price')
    crumbs = '<a href="/experiences/">Mixed cases</a>' if p['handle'] in MIXED else '<a href="/wines/">Wines &amp; Spirits</a><span aria-hidden="true">/</span><a href="/gifts/">Gifts</a>' if gift else ('<a href="/producers/">Producers</a><span aria-hidden="true">/</span><a href="/producers/%s/">%s</a>' % (mk[1], esc(mk[0]))) if mk else '<a href="/wines/">Wines &amp; Spirits</a>'
    makerlink = '' if p['handle'] in MIXED else ('<a class="wn-maker" href="/producers/%s/"><span class="wn-maker__mark" style="--m: url(/assets/producers/%s.svg)" aria-hidden="true"></span><span class="wn-maker__name">%s</span></a>' % (mk[1], mk[1], esc(mk[0]))) if mk else ('<p class="wn-maker"><span class="wn-maker__name">%s</span></p>' % esc(mname) if mname else '')
    # back label
    rows = [('Producer', mname), ('Type', (t[:1].upper() + t[1:].lower()) if t else ''), ('Vintage', vin), ('Grape', spec(p).get('Varietal', '')), ('Country', ctry), ('Region', spec(p).get('Region', '')), ('Bottle', f), ('Case', ('%d bottles' % n) if n > 1 else ('Single bottle' if f else '')), ('Farming', farm)]
    label = ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (a, esc(b)) for a, b in rows if b)
    sheetlink = ('<a class="wn-sheet" href="%s" target="_blank" rel="noopener">Spec sheet<i class="ico ico--arrow" aria-hidden="true"></i></a>' % esc(sheet)) if sheet else ''
    paras = [re.sub(r'\s*[.;]?\s+-\s+', '. ', re.sub(r'\s*\|\s*', ' ', x)).replace('..', '.').strip(' -') for x in clean(p.get('body_html'))][:4]
    if paras:
        story = ''.join(('<p class="wn-story__lead" data-ink>%s</p>' if j == 0 and len(x) <= 230 and not re.search(r'\d', x) else '<p>%s</p>') % esc(x) for j, x in enumerate(paras))
    else:
        story = '''<div class="wn-none">
            <p class="wn-none__t">Not written up yet</p>
            <p>This one is new to our notes. Ask the team how it drinks and what to pour it with, and they will tell you.</p>
            <div class="wn-none__acts"><a class="btn btn--wine" href="/contact/">Ask about this wine<i class="ico ico--arrow" aria-hidden="true"></i></a><a class="wn-none__tel" href="tel:+16472861153">647-286-1153</a></div>
          </div>'''
    # more from the producer, else the same style; a gift is paired with the mixed cases
    peers = [q for q in by_vendor.get(mname, []) if q['handle'] != p['handle']] if mname else []
    more_t = 'More from %s' % (mk[0] if mk else mname)
    if gift:
        peers = [q for q in LIST if q['handle'] in GIFTS and q['handle'] != p['handle']] + [q for q in LIST if q['handle'] in MIXED]
        more_t = 'More gifts'
    elif len(peers) < 2:
        peers = [q for q in LIST if q['handle'] != p['handle'] and kind(q) == k and q not in peers][:4]
        more_t = 'More %s' % ({'Red': 'red wines', 'White': 'white wines', 'Rosé': 'rosé', 'Sparkling': 'sparkling wines', 'Spirits': 'spirits', 'Non-alcoholic': 'non-alcoholic'}.get(k, 'from our list'))
    peers = sorted(peers, key=lambda q: (not any(x['available'] for x in q['variants']), image(q) is None))[:4]
    if gift: all_more = '<a class="wn-more__all" href="/gifts/">All gifts</a>'
    more = ''
    if peers:
        all_link = ('<a class="wn-more__all" href="/producers/%s/">All their wines</a>' % mk[1]) if mk and more_t.startswith('More from') else ''
        if gift: all_link = all_more
        more = '''
    <section class="wn-more" aria-labelledby="wn-more-title">
      <div class="wrap">
        <div class="wn-more__head"><h2 class="wn-more__title" id="wn-more-title" data-lines>%s</h2>%s</div>
        <ul class="wn-grid">%s
        </ul>
      </div>
    </section>''' % (esc(more_t), all_link, ''.join(card(q) for q in peers))
    nxt = LIST[(i + 1) % len(LIST)]
    nm = maker(nxt)
    nextblock = '''
    <a class="pd-next" href="/wines/%s/">
      <span class="pd-next__fill" aria-hidden="true"></span>
      <span class="wrap pd-next__in">
        <span class="pd-next__k">Next wine</span>
        <span class="pd-next__name">%s</span>
        %s
        <i class="pd-next__arr" aria-hidden="true"></i>
      </span>
    </a>''' % (nxt['handle'], esc(title(nxt)), ('<span class="pd-next__mark" style="--m: url(/assets/producers/%s.svg)" aria-hidden="true"></span>' % nm[1]) if nm else '<span></span>')
    bar = ''
    if avail and price > 0:
        bar = '''
  <div class="wn-bar" data-wnbar aria-hidden="true">
    <p class="wn-bar__p">%s<small>%s</small></p>
    <button class="btn btn--wine" type="submit" form="buy" tabindex="-1">Add to cart<i class="ico ico--arrow" aria-hidden="true"></i></button>
  </div>''' % ((money(price / n), 'a bottle · case of %d' % n) if n > 1 else (money(price), 'each'))
    ship = '''
          <ul class="wn-ship" data-intro-fade>
            <li><b>Delivery</b>Across Ontario, Monday to Friday</li>
            <li><b>Free</b>Within the GTA</li>
            <li><b>Arrives</b>In 2 to 3 business days</li>
          </ul>'''
    detail = '''
    <section class="wn-detail" aria-label="About this wine">
      <div class="wrap wn-detail__grid">
        <div>
          <h2 class="wn-detail__title" data-lines>On the label</h2>
          <dl class="wn-label" data-reveal>%s</dl>
          %s
        </div>
        <div class="wn-story">
          <h2 class="wn-detail__title" data-lines>The story</h2>
          %s
        </div>
      </div>
    </section>''' % (label, sheetlink, story)
    if p['handle'] in MIXED:
        csub, citems, cpict = case_contents(p)
        detail = '''
    <section class="wn-get" aria-labelledby="wn-get-title">
      <div class="wrap wn-get__in">
        <div><h2 class="wn-get__title" id="wn-get-title" data-lines>In the case</h2>%s</div>
        <div class="wn-get__body ex-in" data-reveal>%s
        </div>
      </div>
    </section>''' % (('<p class="wn-get__sub">%s</p>' % esc(csub)) if csub else '', contents_html(citems, cpict))
    if gift:
        ship = '''
          <ul class="wn-ship" data-intro-fade>
            <li><b>%s</b>%s</li>
            <li><b>Add it</b>To any order of wine</li>
            <li><b>Questions</b><a href="tel:+16472861153">647-286-1153</a></li>
          </ul>''' % (('Value', money(price)) if 'card' in p['handle'] else ('Price', money(price) + ' each'))
        what = {
            'gift-card-100-00': 'A Bespoke Wine &amp; Spirits gift card worth %s.' % money(price),
            'gift-bags': 'A Bespoke gift bag, added to your order.',
        }.get(p['handle'], 'What goes into this pack changes with the season, so the store does not list it. Ask the team what is in it now, or for one made to a budget.')
        detail = '''
    <section class="wn-get" aria-labelledby="wn-get-title">
      <div class="wrap wn-get__in">
        <h2 class="wn-get__title" id="wn-get-title" data-lines>What you get</h2>
        <div class="wn-get__body" data-reveal>
          <p class="wn-get__lead">%s</p>
          <dl class="wn-get__facts">
            <div><dt>Price</dt><dd>%s</dd></div>
            <div><dt>Sold as</dt><dd>One per order</dd></div>
            <div><dt>Delivery</dt><dd>Door to door in Ontario</dd></div>
            <div><dt>Arrives</dt><dd>In 2 to 3 business days</dd></div>
          </dl>
          <div class="wn-give__acts"><a class="btn btn--wine" href="/contact/">Ask about this gift<i class="ico ico--arrow" aria-hidden="true"></i></a><a class="wn-give__link" href="tel:+16472861153">647-286-1153</a></div>
        </div>
      </div>
    </section>''' % (what, money(price))
    desc = '%s by %s%s. %s' % (name, mname or 'Bespoke Wine & Spirits', (', ' + ctry) if ctry else '', ('%s a bottle, sold by the case of %d. ' % (money(price / n), n) if price > 0 and n > 1 else '') + 'Delivered across Ontario by Bespoke Wine & Spirits.')
    head = re.sub(r'<title>.*?</title>', '<title>%s | Bespoke Wine &amp; Spirits</title>' % esc(name), HEAD, 1)
    head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="%s">' % esc(desc), head, 1)
    return head + '''  <div class="page" data-page>
  <main id="main">
<!--
THESIS: A wine is bought here by the case, so the page shows the case: the bottle stands tall, and under it one slot per bottle fills as you choose how many cases. Refuses the stock product page of thumbnails, tabs and an accordion of specs.
OWN-WORLD: Cream ground, blush plate, muted red type, Coconat over Lexend Deca, hairlines and square corners; specs set as a ruled back label.
STORY: See the bottle, know who made it, see the bottle and case price, choose cases, add to the real store cart; read the label and the story; move to the producer's other wines.
FIRST VIEWPORT: Left 6.5/12: the bottle on a tall blush plate, the case row beneath with the bottle count. Right: crumbs, producer mark, name, one line of type, vintage and country, price, cases stepper with Add to cart, stock, delivery facts.
FORM: Candidate 4 of 6 (the case as the hero device), seed 8f6cb68b; staging: split stage with a sticky plate.
-->
    <section class="wn-hero" aria-labelledby="wn-title">
      <div class="wrap wn-hero__grid">
        <figure class="wn-stage">
          %s%s
        </figure>
        <div class="wn-info">
          <nav class="wn-crumbs" aria-label="Breadcrumb">%s</nav>
          %s
          <h1 class="wn-title" id="wn-title" data-intro>%s</h1>
          %s
          <div class="wn-price" data-intro-fade>%s</div>
          <div class="wn-buyblock" data-intro-fade>%s
          </div>%s
        </div>
      </div>
    </section>
%s
%s
%s
  </main>

''' % (plate, slots, crumbs, makerlink, esc(name), ('<p class="wn-line" data-intro-fade>%s</p>' % esc(line)) if line else '', pmain, buy, ship, detail, more, nextblock) + FOOT.replace('  </div>\n\n  <script', '  </div>\n' + bar + '\n\n  <script', 1)

os.makedirs('wines', exist_ok=True)
import shutil
for p in PRODS:          # pages left over from items that are no longer listed
    if hidden(p) and os.path.isdir('wines/' + p['handle']): shutil.rmtree('wines/' + p['handle'])
for i, p in enumerate(LIST):
    os.makedirs('wines/' + p['handle'], exist_ok=True)
    open('wines/%s/index.html' % p['handle'], 'w', encoding='utf8').write(page(p, i))
json.dump(sorted(p['handle'] for p in LIST), open(T + 'wine_handles.json', 'w'))
print('pages', len(LIST), 'cut', sum(1 for p in LIST if image(p) and image(p)[0] == 'cut'), 'photo', sum(1 for p in LIST if image(p) and image(p)[0] == 'photo'), 'none', sum(1 for p in LIST if not image(p)))
