# Builds the shop (/wines/) and the collection pages (/collections/<handle>/), the mixed cases (/experiences/), the terms (/terms/) and the 404 page, from the store's
# own data and words. Run after winegen.py, which it borrows its product helpers from.
import os, re, json, html as H
os.chdir('C:/Users/HP/Desktop/Galvan ai projects/wine website')
_src = open('tools/winegen.py', encoding='utf8').read()
exec(_src[:_src.index('def page(p, i):')])      # PRODS, LIST, hidden, MIXED, GIFTS, card, title, kind, country, ...

CSS_V = {'shop': 8, 'pages': 6}
JS_SHOP_V = 9

def slug(s): return re.sub(r'[^a-z0-9]+', '-', (s or '').lower()).strip('-')
def avail(p): return any(v['available'] for v in p['variants'])

# ---- shell: head, menu and footer from the producers page --------------------------------------------------
src = open('producers/index.html', encoding='utf8').read()
BASE_HEAD = src[:src.index('  <div class="page" data-page>')]
BASE_FOOT = src[src.index('  <footer class="foot" data-foot>'):]
def shell(css, body, title_, desc, current=None, script=''):
    head = re.sub(r'\s*<link rel="stylesheet" href="/css/producers\.css\?v=\d+">', ''.join('\n  <link rel="stylesheet" href="/css/%s.css?v=%d">' % (c, CSS_V[c]) for c in css), BASE_HEAD)
    head = head.replace('<body class="is-producers">', '<body class="%s">' % body).replace(' aria-current="page"', '')
    head = re.sub(r'<title>.*?</title>', lambda m: '<title>%s</title>' % title_, head, count=1)
    head = re.sub(r'<meta name="description" content="[^"]*">', lambda m: '<meta name="description" content="%s">' % esc(desc), head, count=1)
    if current: head = head.replace('<a href="%s" data-img' % current, '<a href="%s" aria-current="page" data-img' % current, 1)
    foot = BASE_FOOT
    if script: foot = foot.replace('</script>\n</body>', '</script>\n  %s\n</body>' % script, 1)
    return head, foot

# =============================================================================================================
# 1. Listings: the whole list (/wines/) and one page per store collection (/collections/<handle>/), one template
# =============================================================================================================
COL = json.load(open(T + 'collections.json', encoding='utf8'))
PACKS = [p for p in LIST if p['handle'] in MIXED + GIFTS]
WINES = [p for p in LIST if p not in PACKS]
BY_HANDLE = {p['handle']: p for p in PRODS}
TWIN = {title(p).lower(): p for p in LIST}              # the store lists some wines twice; the site has one page each
def listed(h):
    p = BY_HANDLE.get(h)
    if not p or hidden(p): return None
    return TWIN.get(title(p).lower())

# The store's menu: WINES, SPIRITS and STYLE, each a set of collections. (handle, short label, page title)
GROUPS = [
    ('Wines', [('red-wine', 'Red', 'Red wine'), ('white-wine', 'White', 'White wine'), ('rose-wine', 'Rosé', 'Rosé'),
               ('sparkling-wine', 'Sparkling', 'Sparkling wine'), ('skin-contact-orange-wine-white', 'Orange', 'Orange wine'),
               ('dessert-wine', 'Dessert', 'Dessert wine'), ('non-alcoholic', 'Non-alcoholic', 'Non-alcoholic')]),
    ('Spirits', [('spirits', 'All spirits', 'Spirits'), ('amaro', 'Amaro', 'Amaro')]),
    ('Style', [('organic', 'Organic', 'Organic'), ('bio-dynamic', 'Biodynamic', 'Biodynamic')]),
]
COLS = [c for g in GROUPS for c in g[1]]
MEMBERS = {}
for h, _, _ in COLS:
    seen = []
    for x in COL.get(h, {}).get('products', []):
        p = listed(x)
        if p and p not in seen: seen.append(p)
    MEMBERS[h] = seen
IN_COLS = {}
for h, ps in MEMBERS.items():
    for p in ps: IN_COLS.setdefault(p['handle'], []).append(h)

def bottle_price(p):
    price = float(p['variants'][0]['price'] or 0); n = n_of(p)
    return price / n if price > 0 else 0
def rank(p):          # the default order: ready to ship with a price, then "ask us", then sold out; whole bottles first
    im = image(p)
    return (not avail(p), not bottle_price(p), 0 if im and im[0] == 'cut' else (1 if im else 2))

# ---- filter values, from the store's own fields (the same ones its collection filters use) ----
def _grape_split(v):
    v = re.sub(r'\*+[^*]*\*+', '', v or '')                 # "Montepulciano **Organic**"
    out = []
    for g in re.split(r',|/|&|\band\b', v):
        g = re.sub(r'\d+\s*%|[-–]\s*$', '', g).strip(' -–.')
        if len(g) > 2: out.append(g[:1].upper() + g[1:])
    return out
GRAPES = {}                                                 # every grape the store names, by its slug
for p in LIST:
    for g in _grape_split(spec(p).get('Varietal')): GRAPES.setdefault(slug(g), g)
def grapes(p):
    gs = {slug(g): g for g in _grape_split(spec(p).get('Varietal'))}
    for t in p.get('tags', []):                             # the store also tags many wines with their grapes
        if slug(t) in GRAPES: gs.setdefault(slug(t), GRAPES[slug(t)])
    return gs
def facet_values(p):
    """{facet: {slug: label}} for one product"""
    mk = maker(p); mname = mk[0] if mk else maker_name(p)
    reg = spec(p).get('Region', ''); f = fmt(p); n = n_of(p); ctry = country(p)
    return {
        'producer': {(mk[1] if mk else slug(mname)): mname} if mname and mname.lower() != 'local' else {},
        'country': {slug(ctry): ctry} if ctry and p not in PACKS else {},
        'region': {slug(reg): reg} if reg else {},
        'grape': grapes(p),
        'size': {slug(f): f} if f else {},
        'case': {str(n): ('%d bottles' % n) if n > 1 else 'Single bottle'},
        'farm': {slug(x): x for x in farming(p).split(' and ') if x},
        'kind': {slug(kind(p)): kind(p)} if kind(p) != 'Wine' else {},
    }
FACETS = [('kind', 'Type'), ('farm', 'Farming'), ('country', 'Country'), ('region', 'Region'), ('producer', 'Producer'),
          ('grape', 'Grape'), ('size', 'Bottle size'), ('case', 'Bottles per case')]
SORTS = [('best', 'Featured'), ('low', 'Price, low to high'), ('high', 'Price, high to low'), ('az', 'Name, A to Z'),
         ('za', 'Name, Z to A'), ('new', 'Newest first'), ('old', 'Oldest first')]

def shop_card(p, i):
    k = kind(p); fv = facet_values(p)
    q = ' '.join(x for x in (title(p), maker_name(p), spec(p).get('Varietal', ''), spec(p).get('Region', ''), country(p), k, ' '.join(fv['grape'].values())) if x)
    c = card(p).replace(' data-reveal', '', 1)
    pub = (p.get('published_at') or p.get('created_at') or '')[:10].replace('-', '')
    attrs = ' '.join('data-%s="%s"' % (f, ' '.join(fv[f])) for f, _ in FACETS)
    attrs += ' data-cols="%s" data-avail="%d" data-price="%.2f" data-date="%s" data-i="%d" data-q="%s"' % (
        ' '.join(IN_COLS.get(p['handle'], [])), avail(p), bottle_price(p), pub or '0', i, esc(q.lower()))
    c = re.sub(r'<li class="pcard" data-kind="[^"]*">', '<li class="pcard%s" %s>' % ('' if avail(p) else ' pcard--out', attrs), c, 1)
    if not avail(p):
        c = c.replace('<span class="pcard__go">', '<span class="pcard__flag">Sold out</span><span class="pcard__go">', 1)
    return c

def bottle_for(ps):
    """a whole bottle for a word in the hero list: the first ready-to-ship cut-out"""
    for p in sorted(ps, key=rank):
        im = image(p)
        if im and im[0] == 'cut': return im
    return None
def word(href, label, n, ps, on=False):
    im = bottle_for(ps)
    pic = ('<img class="sh-type__bottle" src="%s" alt="" width="%d" height="%d" loading="lazy" decoding="async">' % (im[1], im[2], im[3])) if im else ''
    return '<li><a class="sh-type%s" href="%s"%s><span class="sh-type__name">%s</span><sup>%d</sup>%s</a></li>' % (
        ' is-on' if on else '', href, ' aria-current="page"' if on else '', esc(label), n, pic)

def drawer(items, with_kind):
    """the filter drawer: sort, availability, price, then every filter that offers a choice on this page"""
    vals = {f: {} for f, _ in FACETS}; counts = {f: {} for f, _ in FACETS}
    for p in items:
        for f, d in facet_values(p).items():
            for s_, lab in d.items():
                vals[f].setdefault(s_, lab); counts[f][s_] = counts[f].get(s_, 0) + 1
    groups = ''
    for f, lab in FACETS:
        if f == 'kind' and not with_kind: continue
        if len(vals[f]) < 2: continue                       # a filter with one choice filters nothing
        keys = sorted(vals[f], key=lambda k: (int(k) if f == 'case' else 0, -counts[f][k] if f in ('country', 'kind', 'farm') else 0,
                                              float(re.sub(r'[^\d.]', '', vals[f][k]) or 0) * (1000 if 'L' in vals[f][k] and 'mL' not in vals[f][k] else 1) if f == 'size' else 0,
                                              vals[f][k].lower()))
        opts = ''.join('<button type="button" class="sh-opt" data-f="%s" data-v="%s" aria-pressed="false">%s <sup>%d</sup></button>' % (f, k, esc(vals[f][k]), counts[f][k]) for k in keys)
        more = ('<button type="button" class="sh-more" data-more aria-expanded="false">Show all %d</button>' % len(keys)) if len(keys) > 8 else ''
        groups += '\n        <fieldset class="sh-group%s" data-group="%s"><legend>%s</legend><div class="sh-opts">%s</div>%s</fieldset>' % (' is-clamped' if more else '', f, lab, opts, more)
    names = {f: vals[f] for f, _ in FACETS}
    sorts = ''.join('<button type="button" class="sh-opt%s" data-sort="%s" aria-pressed="%s">%s</button>' % (' is-on' if k == 'best' else '', k, 'true' if k == 'best' else 'false', lab) for k, lab in SORTS)
    html_ = '''
  <aside class="sh-drawer" id="sh-drawer" data-drawer aria-hidden="true" aria-labelledby="sh-drawer-title" role="dialog" aria-modal="true">
    <div class="sh-drawer__shade" data-closef></div>
    <div class="sh-drawer__panel" data-panel>
      <div class="sh-drawer__head">
        <h2 class="sh-drawer__title" id="sh-drawer-title">Filter &amp; sort</h2>
        <button type="button" class="sh-drawer__x" data-closef>Close</button>
      </div>
      <div class="sh-drawer__body" data-lenis-prevent>
        <fieldset class="sh-group"><legend>Sort by</legend><div class="sh-opts">%s</div></fieldset>
        <fieldset class="sh-group"><legend>Availability</legend>
          <label class="sh-switch"><input type="checkbox" data-stock><span class="sh-switch__track" aria-hidden="true"></span>Ready to ship only</label>
        </fieldset>
        <fieldset class="sh-group"><legend>Price per bottle</legend>
          <div class="sh-price">
            <label><span>From</span><span class="sh-price__in">$<input type="number" inputmode="numeric" min="0" step="1" placeholder="%d" data-pmin aria-label="Lowest price per bottle"></span></label>
            <label><span>To</span><span class="sh-price__in">$<input type="number" inputmode="numeric" min="0" step="1" placeholder="%d" data-pmax aria-label="Highest price per bottle"></span></label>
          </div>
        </fieldset>%s
      </div>
      <div class="sh-drawer__foot">
        <button type="button" class="sh-drawer__clear" data-clear>Clear all</button>
        <button type="button" class="btn btn--wine" data-closef><span data-showlabel>Show %d bottles</span></button>
      </div>
    </div>
  </aside>''' % (sorts, int(min([bottle_price(p) for p in items if bottle_price(p)] or [0])), int(max([bottle_price(p) for p in items] or [0]) + 0.99), groups, len(items))
    return html_, names

def chapters_for(items, start):
    by = {}
    packs = [p for p in items if p in PACKS]
    for p in items:
        if p not in packs: by.setdefault(country(p) or '', []).append(p)
    order = sorted((c for c in by if c), key=lambda c: (-len(by[c]), c)) + ([''] if '' in by else [])
    chs = [(slug(c) or 'more', c or 'More from the list', sorted(by[c], key=rank)) for c in order]
    if packs: chs.append(('cases', 'Mixed cases & gifts', sorted(packs, key=lambda p: (p['handle'] in GIFTS, rank(p)))))
    i = start; out = ''
    for cid, cname, ps in chs:
        cards = ''
        for p in ps: cards += shop_card(p, i); i += 1
        extra = '<a class="sh-ch__more" href="/experiences/">About our mixed cases<i class="ico ico--arrow" aria-hidden="true"></i></a>' if cid == 'cases' else ''
        out += '''
      <section class="sh-ch" id="%s" data-ch="%s" aria-labelledby="h-%s">
        <div class="sh-ch__side">
          <h2 class="sh-ch__title" id="h-%s" data-lines>%s</h2>
          <p class="sh-ch__count"><span data-chcount>%d</span> <span data-chword>%s</span></p>
          %s
        </div>
        <ul class="sh-grid" data-grid>%s
        </ul>
      </section>''' % (cid, cid, cid, cid, esc(cname), len(ps), 'bottle' if len(ps) == 1 else 'bottles', extra, cards)
    return out, len([c for c in by if c])

def countries_of(ps): return len({country(p) for p in ps if country(p) and p not in PACKS})
def producers_of(ps): return len({(maker(p) or (None, maker_name(p)))[1] for p in ps if p not in PACKS})

def listing(path, page_title, h1, lede, items, words, tabs, crumbs='', with_kind=True, body='is-shop', desc='', aside_links='', noun=''):
    chapters, n_c = chapters_for(items, 0)
    drawer_html, names = drawer(items, with_kind)
    n_ready = sum(1 for p in items if avail(p))
    search_action = '/' + path.strip('/') + '/' if path else '/wines/'
    head, foot = shell(['shop'], body, page_title, desc, current='/wines/', script='<script src="/js/shop.js?v=%d"></script>' % JS_SHOP_V)
    if not items:     # an empty collection: say so, and offer the others
        main = '''
    <section class="sh-hero sh-hero--empty" aria-labelledby="sh-title">
      <div class="wrap sh-hero__grid">
        <div class="sh-hero__copy">
          %s
          <h1 class="sh-hero__title" id="sh-title" data-intro>%s</h1>
          <div class="sh-hero__aside" data-intro-fade>
            <p>There are no %s on the list at the moment. Ask the team and they will tell you what is coming, or look through the rest of the list.</p>
            <div class="sh-empty__acts sh-empty__acts--start"><a class="btn btn--wine" href="/wines/">See all the wines<i class="ico ico--arrow" aria-hidden="true"></i></a><a class="sh-empty__link" href="/contact/">Ask the team</a></div>
          </div>
        </div>
        <nav class="sh-types" aria-label="Other collections" data-intro-fade><ul>%s</ul></nav>
      </div>
    </section>''' % (crumbs, esc(h1), esc((noun or h1).lower()), words)
        foot = foot.replace('\n  <script src="/js/shop.js?v=%d"></script>' % JS_SHOP_V, '')
        return head + '  <div class="page" data-page>\n  <main id="main">' + main + '\n  </main>\n' + foot
    main = '''
<!--
THESIS: The whole list on one page, laid out like the producers page: country chapters with a pinned title, the
wine cards beside them, and one frosted bar that keeps the store's own collections within reach. Every filter the
store's collections offer sits in one blush drawer. Refuses the stock catalogue of a facet sidebar beside an endless
undifferentiated grid.
OWN-WORLD: Cream ground, blush plates, muted red Coconat over Lexend Deca, hairlines and square corners; filters
are words with an underline, the drawer is the menu's blush.
STORY: See how large the list is, pick a collection from the giant word list, narrow by any of the store's filters,
open a wine.
FIRST VIEWPORT: Left 6/12: the title, the line about the list, the counts, a search field. Right: the collections
as a stacked word list in Coconat, each with its count; hovering one stands its bottle beside it.
FORM: Candidate 5 of 6 (country chapters), seed 0e36fbc0; staging: hero word index, sticky bar, drawer.
-->
    <section class="sh-hero" aria-labelledby="sh-title">
      <div class="wrap sh-hero__grid">
        <div class="sh-hero__copy">
          %s
          <h1 class="sh-hero__title" id="sh-title" data-intro>%s</h1>
          <div class="sh-hero__aside" data-intro-fade>
            <p>%s</p>
            <p class="sh-hero__k">%d %s &middot; %d ready to ship</p>
            <form class="sh-search" role="search" data-search action="%s">
              <label class="sr-only" for="sh-q">Search %s</label>
              <input id="sh-q" name="q" type="search" placeholder="Search a wine, producer or grape" autocomplete="off" data-q>
              <button type="submit" aria-label="Search"><i class="ico ico--arrow" aria-hidden="true"></i></button>
            </form>
          </div>
        </div>
        <nav class="sh-types" aria-label="Collections" data-intro-fade>
          <ul>%s</ul>%s
        </nav>
      </div>
    </section>

    <div class="sh-bar%s" data-shbar>
      <div class="sh-bar__in">
        <div class="sh-tabs" role="group" aria-label="Collections" data-tabs><i class="sh-tabs__bar" data-tbar aria-hidden="true"></i>%s</div>
        <div class="sh-bar__side">
          <p class="sh-bar__count" role="status" aria-live="polite"><b data-total>%d</b> <span data-totalword>bottles</span></p>
          <button type="button" class="sh-filterbtn" data-openf aria-expanded="false" aria-controls="sh-drawer">Filter &amp; sort<span class="sh-filterbtn__n" data-fcount hidden></span></button>
        </div>
      </div>
    </div>

    <div class="wrap sh-active" data-active hidden></div>

    <div class="wrap sh-list" data-list>%s
      <div class="sh-empty" data-empty hidden>
        <p class="sh-empty__title">Nothing on the list matches that.</p>
        <p>Try fewer filters, or tell us what you are after and we will find it.</p>
        <p class="sh-empty__also">Or browse <a href="/collections/red-wine/">Red</a><a href="/collections/white-wine/">White</a><a href="/collections/rose-wine/">Rosé</a><a href="/collections/sparkling-wine/">Sparkling</a><a href="/experiences/">Mixed cases</a></p>
        <div class="sh-empty__acts"><button type="button" class="btn btn--wine" data-clear>Clear all filters</button><a class="sh-empty__link" href="/contact/">Ask the team</a></div>
      </div>
    </div>

    <section class="sh-close" aria-labelledby="sh-close-title">
      <div class="wrap sh-close__in">
        <h2 class="sh-close__title" id="sh-close-title" data-lines>Not sure where to start?</h2>
        <div class="sh-close__side" data-reveal>
          <p>Take a mixed case we have put together, or tell us what you like to drink and our sommelier will choose for you.</p>
          <div class="sh-close__acts">
            <a class="btn btn--wine" href="/experiences/">See the mixed cases<i class="ico ico--arrow" aria-hidden="true"></i></a>
            <a class="sh-close__link" href="/contact/">Ask for a recommendation</a>
          </div>
        </div>
      </div>
    </section>
  </main>
%s

  <button type="button" class="sh-fab" data-openf aria-controls="sh-drawer" aria-expanded="false">Filter &amp; sort<span class="sh-filterbtn__n" data-fcount hidden></span></button>
  <script type="application/json" id="sh-names">%s</script>
''' % (crumbs, esc(h1), lede, len(items), 'bottle' if len(items) == 1 else 'bottles', n_ready, search_action, esc(h1.lower()),
       words, aside_links, ' sh-bar--many' if tabs.count('class="sh-tab') > 7 else '', tabs, len(items), chapters, drawer_html, json.dumps(names, ensure_ascii=False).replace('</', '<\\/'))
    return head + '  <div class="page" data-page>\n  <main id="main">' + main + foot

def lede_for(ps, what):
    return '%s from %d producers in %d countries. Sold by the case, delivered across Ontario.' % (what, producers_of(ps), countries_of(ps)) if countries_of(ps) > 1 else \
           '%s from %d %s. Sold by the case, delivered across Ontario.' % (what, producers_of(ps), 'producer' if producers_of(ps) == 1 else 'producers')

# ---- /wines/: everything. The bar's tabs filter in place by collection; the hero's words open each collection ----
HERO_COLS = ['red-wine', 'white-wine', 'rose-wine', 'sparkling-wine', 'skin-contact-orange-wine-white', 'non-alcoholic', 'spirits']
LABEL = {h: lab for h, lab, _ in COLS}; TITLE = {h: t for h, _, t in COLS}
words = ''.join(word('/collections/%s/' % h, LABEL[h] if h != 'spirits' else 'Spirits', len(MEMBERS[h]), MEMBERS[h]) for h in HERO_COLS if MEMBERS[h])
also = '<p class="sh-also">Also <a href="/collections/amaro/">Amaro</a><a href="/collections/organic/">Organic</a><a href="/collections/bio-dynamic/">Biodynamic</a><a href="/experiences/">Mixed cases</a></p>'
TAB_COLS = [h for h in HERO_COLS + ['amaro'] if MEMBERS[h]]
tabs = '<button type="button" class="sh-tab is-on" data-type="all" aria-pressed="true">All <sup data-tcount="all">%d</sup></button>' % len(LIST)
tabs += ''.join('<button type="button" class="sh-tab" data-type="%s" aria-pressed="false">%s <sup data-tcount="%s">%d</sup></button>' % (h, LABEL[h] if h != 'spirits' else 'Spirits', h, len(MEMBERS[h]), ) for h in TAB_COLS)
n_countries = countries_of(LIST)
open('wines/index.html', 'w', encoding='utf8').write(listing(
    '/wines/', 'Wines &amp; Spirits | Bespoke Wine &amp; Spirits', 'The wines',
    'Every bottle we bring to Ontario, from small growers and distillers in %d countries. Sold by the case, delivered across the province.' % n_countries,
    LIST, words, tabs, with_kind=False,
    desc='Every wine and spirit Bespoke Wine & Spirits brings to Ontario: %d bottles from %d countries, sold by the case and delivered across Ontario.' % (len(LIST), n_countries),
    aside_links=also))

# ---- /collections/<handle>/: one page per collection in the store's menu ----
for gname, cols in GROUPS:
    for h, lab, ttl in cols:
        ps = MEMBERS[h]
        sib = [c for c in cols if MEMBERS[c[0]] or c[0] == h]
        words = ''.join(word('/collections/%s/' % c, c_lab, len(MEMBERS[c]), MEMBERS[c], on=(c == h)) for c, c_lab, _ in sib)
        tabs = '<a class="sh-tab" href="/wines/">All wines</a>' + ''.join(
            '<a class="sh-tab%s" href="/collections/%s/"%s>%s <sup>%d</sup></a>' % (' is-on' if c == h else '', c, ' aria-current="page"' if c == h else '', c_lab, len(MEMBERS[c]))
            for c, c_lab, _ in sib)
        crumbs = '<nav class="sh-crumbs" aria-label="Breadcrumb" data-intro-fade><a href="/wines/">Wines &amp; Spirits</a><span aria-hidden="true">/</span><span aria-current="page">%s</span></nav>' % esc(ttl)
        what = {'organic': 'Organic wines and spirits', 'bio-dynamic': 'Biodynamic wines', 'non-alcoholic': 'Non-alcoholic aperitivi, liqueurs and spirits',
                'spirits': 'Spirits and liqueurs', 'amaro': 'Amari'}.get(h, ttl[:1].upper() + ttl[1:] + ('s' if h.endswith('-wine') and not ttl.endswith('é') else ''))
        os.makedirs('collections/' + h, exist_ok=True)
        open('collections/%s/index.html' % h, 'w', encoding='utf8').write(listing(
            '/collections/%s/' % h, '%s | Bespoke Wine &amp; Spirits' % esc(ttl), ttl, lede_for(ps, what) if ps else '', ps, words, tabs, crumbs=crumbs,
            with_kind=h in ('organic', 'bio-dynamic', 'spirits', 'non-alcoholic'), noun=what,
            desc='%s at Bespoke Wine & Spirits: %d bottles, sold by the case and delivered across Ontario.' % (ttl, len(ps))))
print('collections', {h: len(MEMBERS[h]) for h, _, _ in COLS})

# ---- /gifts/: every gift the store sells, with the mixed cases beside them ----
GIFT_ITEMS = [p for p in LIST if p['handle'] in GIFTS] + [p for p in LIST if p['handle'] in MIXED]
gwords = ''.join(word(h, lab, n, ps) for h, lab, n, ps in [
    ('/wines/gift-card-100-00/', 'Gift card', 1, [p for p in LIST if p['handle'] == 'gift-card-100-00']),
    ('/wines/gift-bags/', 'Gift bag', 1, [p for p in LIST if p['handle'] == 'gift-bags']),
    ('/experiences/', 'Mixed cases', len(MIXED), [p for p in LIST if p['handle'] in MIXED])])
gtabs = '<a class="sh-tab" href="/wines/">All wines</a><a class="sh-tab is-on" href="/gifts/" aria-current="page">Gifts <sup>%d</sup></a><a class="sh-tab" href="/experiences/">Mixed cases <sup>%d</sup></a>' % (len(GIFT_ITEMS), len(MIXED))
os.makedirs('gifts', exist_ok=True)
def as_items(html_):
    """the gifts page counts items, not bottles (a gift card is not a bottle)"""
    for a, b in (('<span data-chword>bottles</span>', '<span data-chword>items</span>'), ('<span data-chword>bottle</span>', '<span data-chword>item</span>'),
                 (' bottles &middot; ', ' items &middot; '), ('<span data-totalword>bottles</span>', '<span data-totalword>items</span>'),
                 ('Show %d bottles' % len(GIFT_ITEMS), 'Show %d items' % len(GIFT_ITEMS)), ('data-list>', 'data-list data-unit="item">')):
        html_ = html_.replace(a, b)
    return html_
open('gifts/index.html', 'w', encoding='utf8').write(as_items(listing(
    '/gifts/', 'Gifts | Bespoke Wine &amp; Spirits', 'Gifts',
    'Gift cards, gift bags, seasonal packs and our mixed cases, delivered door to door across Ontario.',
    GIFT_ITEMS, gwords, gtabs, with_kind=False,
    crumbs='<nav class="sh-crumbs" aria-label="Breadcrumb" data-intro-fade><a href="/wines/">Wines &amp; Spirits</a><span aria-hidden="true">/</span><span aria-current="page">Gifts</span></nav>',
    desc='Gifts from Bespoke Wine & Spirits: gift cards, gift bags, seasonal packs and mixed cases, delivered across Ontario.')))

# =============================================================================================================
# 2. Experiences: the mixed cases
# =============================================================================================================
CASE_V = 'v3'      # tools/casecomp.py draws each case from the site's own bottle cut-outs
def case_img(p, nm):
    f = 'assets/cases/%s-%s.webp' % (p['handle'], CASE_V)
    if os.path.exists(f):
        from PIL import Image as _I
        w, h = _I.open(f).size
        return '<img src="/%s" alt="%s: the bottles in the case" width="%d" height="%d" loading="lazy" decoding="async">' % (f, esc(nm), w, h)
    img = p['images'][0]['src'].split('?')[0] if p.get('images') else ''
    return ('<img src="%s?width=1000" alt="%s" loading="lazy" decoding="async">' % (img, esc(nm))) if img else ''
PACK_LIST = [p for p in LIST if p['handle'] in MIXED]
PACK_LIST.sort(key=lambda p: (not avail(p), MIXED.index(p['handle'])))   # sold out last
spreads = ''
for j, p in enumerate(PACK_LIST):
    sub, ws = pack_parts(p)
    price = float(p['variants'][0]['price'] or 0); v = p['variants'][0]
    img = p['images'][0]['src'].split('?')[0] if p.get('images') else ''
    nm = title(p)
    sub2, items, pictured = case_contents(p)
    inside = contents_html(items, pictured)
    buy = ''
    if avail(p) and price > 0:
        buy = '''<form class="ex-buy" action="%s/cart/add" method="post" data-n="1" data-price="%.2f" ''' % (S, price) + cart_attrs(p, ('photo', img) if img else None, nm, 'Mixed case') + '''>
              <input type="hidden" name="id" value="%d"><input type="hidden" name="quantity" value="1">
              <button class="btn btn--wine" type="submit"><span>Add the case to cart</span><i class="ico ico--arrow" aria-hidden="true"></i></button>
            </form>''' % (v['id'],)
    else:
        buy = '<span class="ex-case__out">%s</span>' % ('Sold out' if price > 0 else 'Price on request')
    spreads += '''
      <article class="ex-case%s" id="%s" aria-labelledby="ex-%s">
        <figure class="ex-case__plate" data-explate>%s</figure>
        <div class="ex-case__info">
          <h3 class="ex-case__name" id="ex-%s" data-lines>%s</h3>
          %s
          <div class="ex-case__buy" data-reveal>
            <p class="ex-case__price">%s<small>%s</small></p>
            <div class="ex-case__acts">%s<a class="ex-case__link" href="/wines/%s/">View the case</a></div>
          </div>
          %s
        </div>
      </article>''' % (' ex-case--flip' if j % 2 else '', p['handle'], p['handle'],
                       case_img(p, nm),
                       p['handle'], esc(nm), ('<p class="ex-case__sub">%s</p>' % esc(sub)) if sub else '',
                       money(price) if price else 'Ask us', ' the case' if price else '', buy, p['handle'], inside)

head, foot = shell(['pages'], 'is-exp', 'Mixed cases | Bespoke Wine &amp; Spirits',
                   'Mixed cases from Bespoke Wine & Spirits, put together for every occasion, or a case our sommelier chooses for your palate. Delivered across Ontario.')
exp = head + '''  <div class="page" data-page>
  <main id="main">
<!--
THESIS: A mixed case is four bottles chosen to be opened together, so each one is shown as an open case: the four
bottles on a blush plate beside the list of what is inside, numbered as the store numbers them. Refuses a grid of
product thumbnails with prices.
OWN-WORLD: Cream ground, blush plates, muted red Coconat over Lexend Deca; the contents set as a ruled list.
STORY: Understand the two ways in (a ready case, or one chosen for you), read what is in each case, add one.
FIRST VIEWPORT: "Tailored wine experiences" across the left, the store's own lede and two routes on the right;
below, the first case begins.
FORM: Extension of the wine page world; staging: alternating case spreads, a closing sommelier offer.
-->
    <section class="ex-hero" aria-labelledby="ex-title">
      <div class="wrap ex-hero__grid">
        <h1 class="ex-hero__title" id="ex-title" data-intro>Tailored wine experiences</h1>
        <div class="ex-hero__aside" data-intro-fade>
          <p>We offer personalized wine experiences tailored to your taste and budget. Whether you are a fan of bold reds, crisp whites, or something in between, our team carefully curates each selection to match your preferences.</p>
          <ul class="ex-routes">
            <li><a href="#cases"><b>Our mixed cases</b><span>%d cases, ready to order</span><i class="ico ico--down" aria-hidden="true"></i></a></li>
            <li><a href="#yours"><b>A case chosen for you</b><span>Picked by our sommelier</span><i class="ico ico--down" aria-hidden="true"></i></a></li>
          </ul>
        </div>
      </div>
    </section>

    <section class="ex-cases" id="cases" aria-labelledby="ex-cases-title">
      <div class="wrap">
        <div class="ex-cases__head">
          <h2 class="ex-cases__title" id="ex-cases-title" data-lines>Our mixed cases</h2>
          <p>Thoughtfully put together for every occasion.</p>
        </div>%s
      </div>
    </section>

    <section class="ex-yours" id="yours" aria-labelledby="ex-yours-title">
      <div class="wrap ex-yours__in">
        <h2 class="ex-yours__title" id="ex-yours-title" data-lines>Or let our sommelier choose</h2>
        <div class="ex-yours__side" data-reveal>
          <p>Tell us what you like to drink, what it is for and what you would like to spend, and our sommelier will handpick a case for you from the whole list.</p>
          <div class="ex-yours__acts">
            <a class="btn btn--cream" href="/contact/">Ask for a case<i class="ico ico--arrow" aria-hidden="true"></i></a>
            <a class="ex-yours__tel" href="tel:+16472861153">647-286-1153</a>
          </div>
        </div>
      </div>
    </section>
  </main>
''' % (sum(1 for p in PACK_LIST if avail(p)), spreads) + foot
os.makedirs('experiences', exist_ok=True)
open('experiences/index.html', 'w', encoding='utf8').write(exp)

# =============================================================================================================
# 3. Terms: the store's policy page, set for reading
# =============================================================================================================
TERMS = [
    ('questions', 'Common questions', '''
          <dl class="tm-faq">
            <div><dt>How can I pay for the products?</dt><dd>You can use the credit card method provided when you check out.</dd></div>
            <div><dt>How does delivery work?</dt><dd>We deliver throughout the province of Ontario, and deliveries take place between 9am and 5pm, Monday to Friday.</dd></div>
            <div><dt>What does delivery cost?</dt><dd>Delivery is free within the GTA.</dd></div>
            <div><dt>How long does it take to receive the wine once I have placed an order online?</dt><dd>You will receive your order in 2 to 3 business days.</dd></div>
          </dl>'''),
    ('prices', 'Prices', '''
          <p>Prices listed are per bottle, but must be sold by case lot, and all prices are in Canadian dollars. Due to currency fluctuations and LCBO policy changes, prices are subject to change without notice.</p>
          <p>For your convenience, prices include:</p>
          <ul class="tm-list"><li>Export price</li><li>Freight</li><li>Customs charges</li><li>Duties</li><li>Excise</li><li>LCBO markup of 64%</li><li>LCBO wine levy</li><li>LCBO environmental fee</li><li>Agency fee</li><li>Gallonage fee, where applicable</li></ul>
          <p class="tm-note">Prices do not include HST and bottle deposit.</p>'''),
    ('lcbo', 'Buying through the LCBO', '''
          <p>Bespoke Wine &amp; Spirits is not permitted to sell beverage alcohol, but we facilitate an arrangement whereby you can purchase directly from the LCBO.</p>
          <p>The LCBO&rsquo;s price for the products is available in advance from Bespoke Wine &amp; Spirits upon request.</p>'''),
    ('cases', 'Cases', '''
          <p>Wine may only be purchased in case lots. There are twelve bottles in a case unless otherwise noted.</p>'''),
    ('delivery', 'Orders and delivery', '''
          <p>The LCBO requires 36 hours to process an order. Please expect a minimum of two business days before receiving your order. All rush orders will be subject to a surcharge.</p>
          <p>We deliver five days a week in the Toronto area, and to most parts of central Ontario on a weekly basis.</p>'''),
    ('refunds', 'Damage and returns', '''
          <p>Loss or damage of goods should be notified to Bespoke Wine &amp; Spirits immediately upon receipt. Failure to notify us in due time may result in denial of liability.</p>
          <p>All products returned are subject to a 20% restocking fee.</p>'''),
    ('age', 'Age', '''
          <p>You must be 19 years of age or older to place or receive a beverage alcohol order.</p>'''),
]
index = ''.join('<li><a href="#%s" data-tmlink="%s">%s</a></li>' % (a, a, t) for a, t, _ in TERMS)
body = ''.join('''
        <section class="tm-sec" id="%s" data-tmsec="%s" aria-labelledby="tm-%s">
          <h2 class="tm-sec__title" id="tm-%s">%s</h2>
          <div class="tm-sec__text">%s
          </div>
        </section>''' % (a, a, a, a, t, txt) for a, t, txt in TERMS)
head, foot = shell(['pages'], 'is-terms', 'Terms &amp; conditions | Bespoke Wine &amp; Spirits',
                   'Common questions, policies, terms and conditions of Bespoke Wine & Spirits: payment, delivery, case lots, prices, ordering through the LCBO and returns.')
terms = head + '''  <div class="page" data-page>
  <main id="main">
<!--
THESIS: The store's own terms, unchanged in substance, set like a well-made wine list's back page: short ruled
sections with a pinned index, so a trade buyer finds the clause they need at once. Refuses the wall of text.
OWN-WORLD: Cream ground, muted red Coconat headings over Lexend Deca, hairline rules, a sticky index.
STORY: Find how pricing, the LCBO arrangement, cases, delivery and returns work; call if anything is unclear.
FIRST VIEWPORT: The title large on the left with a one-line lead; below, the index of six sections beside the first clause.
FORM: Read surface in the site's world; staging: sticky index beside ruled sections.
-->
    <section class="tm-hero" aria-labelledby="tm-title">
      <div class="wrap">
        <h1 class="tm-hero__title" id="tm-title" data-intro>Terms &amp; conditions</h1>
        <p class="tm-hero__lead" data-intro-fade>Common questions, and how buying wine through an agency works in Ontario: prices, case lots, ordering through the LCBO, delivery and returns.</p>
      </div>
    </section>
    <div class="wrap tm-grid">
      <nav class="tm-index" aria-label="On this page" data-intro-fade>
        <ol>%s</ol>
        <p class="tm-index__help">Questions? Call <a href="tel:+16472861153">647-286-1153</a> or <a href="/contact/">write to us</a>.</p>
      </nav>
      <div class="tm-body">%s
      </div>
    </div>
  </main>
''' % (index, body) + foot
os.makedirs('terms', exist_ok=True)
open('terms/index.html', 'w', encoding='utf8').write(terms)

# =============================================================================================================
# 4. 404
# =============================================================================================================
head, foot = shell(['pages'], 'is-404', 'Page not found | Bespoke Wine &amp; Spirits', 'This page could not be found on Bespoke Wine & Spirits.')
nf = head.replace('<meta name="theme-color"', '<meta name="robots" content="noindex">\n  <meta name="theme-color"', 1) + '''  <div class="page" data-page>
  <main id="main">
<!--
THESIS: A dead link still lands inside the site: the headline says so plainly and the way on is set as the menu's
own large links. Refuses the stock error page of a number and a single home button.
OWN-WORLD: Cream ground, muted red Coconat over Lexend Deca, hairline rows that fill with oxblood on hover, an empty
bottle tipped on its side in blush.
STORY: Understand the page is gone, pick where to go next.
FIRST VIEWPORT: The headline on the left, the tipped bottle on the right, the four links beneath.
FORM: Extension of the site's menu grammar; staging: headline over a link list.
-->
    <section class="nf" aria-labelledby="nf-title">
      <div class="wrap nf__grid">
        <div>
          <p class="nf__k" data-intro-fade>Error 404</p>
          <h1 class="nf__title" id="nf-title" data-intro>This page is not on the list</h1>
          <p class="nf__lead" data-intro-fade>The link may be from our old shop, or the wine may have sold through. Everything else is still here.</p>
        </div>
        <span class="nf__bottle" aria-hidden="true" data-intro-fade></span>
      </div>
      <div class="wrap">
        <ul class="nf__links" data-intro-fade>
          <li><a href="/wines/"><span>Wines &amp; Spirits</span><i class="ico ico--arrow" aria-hidden="true"></i></a></li>
          <li><a href="/experiences/"><span>Mixed cases</span><i class="ico ico--arrow" aria-hidden="true"></i></a></li>
          <li><a href="/producers/"><span>Producers</span><i class="ico ico--arrow" aria-hidden="true"></i></a></li>
          <li><a href="/"><span>Home</span><i class="ico ico--arrow" aria-hidden="true"></i></a></li>
        </ul>
      </div>
    </section>
  </main>
''' + foot
nf = nf.replace('  <main id="main">', '''  <script>
    // an old store link to a product: go straight to that wine's page here
    (function () { var m = location.pathname.match(/\/products\/([a-z0-9-]+)/); if (m) location.replace('/wines/' + m[1] + '/'); })();
  </script>
  <main id="main">''', 1)
open('404.html', 'w', encoding='utf8').write(nf)
# =============================================================================================================
# 5. Cart: drawn by js/cart.js from what this browser has added; checkout opens the store's own checkout
# =============================================================================================================
head, foot = shell([], 'is-cart', 'Your cart | Bespoke Wine &amp; Spirits', 'Your cart at Bespoke Wine & Spirits.')
cart = head.replace('<meta name="theme-color"', '<meta name="robots" content="noindex">\n  <meta name="theme-color"', 1) + '''  <div class="page" data-page>
  <main id="main">
<!--
THESIS: The cart reads like a delivery note: each case on its own ruled line with its bottle, the count of bottles it
adds up to, and one blush panel with the total and the way to checkout. Refuses the boxed table of a stock cart.
OWN-WORLD: Cream ground, blush plates and panel, muted red Coconat over Lexend Deca, hairline rows, square steppers.
STORY: See what is in the cart, change cases, see the total and what is added at checkout, go to the secure checkout.
FIRST VIEWPORT: "Your cart" with the item count and total; the rows on the left, the total panel pinned on the right.
FORM: Extension of the wine page world; staging: ruled rows beside a sticky summary.
-->
    <section class="ct-hero" aria-labelledby="ct-title">
      <div class="wrap">
        <h1 class="ct-hero__title" id="ct-title" data-intro>Your cart</h1>
        <p class="ct-hero__k" data-intro-fade data-ctcount>&nbsp;</p>
      </div>
    </section>
    <div class="wrap ct-page" data-cartpage>
      <div>
        <ul class="ct-list ct-page__list" data-ctlist></ul>
        <div data-ctempty></div>
        <section class="ct-suggest" aria-labelledby="ct-suggest-title">
          <div class="ct-suggest__head"><h2 class="ct-suggest__title" id="ct-suggest-title">Start with a mixed case</h2><a class="ct-link" href="/experiences/">All mixed cases</a></div>
          <ul class="ct-suggest__grid">%s
          </ul>
        </section>
        <noscript><p class="ct-side__how">The cart needs JavaScript. You can also <a href="%s/cart">open the cart on our store</a>.</p></noscript>
      </div>
      <aside class="ct-side" data-ctside hidden aria-label="Order summary">
        <div class="ct-sum" data-ctsum></div>
        <a class="btn btn--wine" data-checkout href="%s/cart">Checkout<i class="ico ico--arrow" aria-hidden="true"></i></a>
        <ul class="ct-ship">
          <li><b>Delivery</b>Across Ontario, Monday to Friday</li>
          <li><b>Free</b>Within the GTA</li>
          <li><b>Arrives</b>In 2 to 3 business days</li>
        </ul>
        <p class="ct-side__how">Checkout opens on our secure store, where you pay by credit card. Orders are placed through the LCBO; see our <a href="/terms/">terms</a>.</p>
      </aside>
    </div>
  </main>
''' % (''.join(card(p) for p in sorted([q for q in LIST if q['handle'] in MIXED], key=lambda q: MIXED.index(q['handle']))[:4]), S, S) + foot
os.makedirs('cart', exist_ok=True)
open('cart/index.html', 'w', encoding='utf8').write(cart)

# old store search links (/search?q=...) land on the shop's search
os.makedirs('search', exist_ok=True)
open('search/index.html', 'w', encoding='utf8').write('''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Search | Bespoke Wine &amp; Spirits</title>
<script>var q = new URLSearchParams(location.search).get('q'); location.replace('/wines/' + (q ? '?q=' + encodeURIComponent(q) : ''));</script>
<meta http-equiv="refresh" content="0; url=/wines/"></head><body style="background:#fcf4ec"></body></html>
''')

# =============================================================================================================
# 6. The old store's addresses: every page, collection and product URL lands on its page here
# =============================================================================================================
REDIRECT = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Bespoke Wine &amp; Spirits</title>
<link rel="canonical" href="%s"><meta http-equiv="refresh" content="0; url=%s">
<script>location.replace(%s + location.search + location.hash);</script></head>
<body style="background:#fcf4ec;color:#8a3d3d;font-family:system-ui,sans-serif;padding:2rem">This page has moved: <a href="%s">continue</a>.</body></html>
'''
def redirect(frm, to):
    d = frm.strip('/')
    if os.path.exists(d + '/index.html') and 'location.replace(' not in open(d + '/index.html', encoding='utf8').read(): return   # a real page
    os.makedirs(d, exist_ok=True)
    open(d + '/index.html', 'w', encoding='utf8').write(REDIRECT % (to, to, json.dumps(to), to))
    RULES.append((frm.rstrip('/'), to))
RULES = []
PAGES = {'about-us': '/about/', 'contact': '/contact/', 'gallery': '/gallery/', 'producers': '/producers/', 'bespoke-producers': '/producers/',
         'producer-list': '/producers/', 'faq': '/terms/#questions', 'policies-terms-conditions': '/terms/', 'experiences': '/experiences/',
         'tea-collection': '/wines/', 'bespoke-wine-amp-spirits': '/about/'}
for k, v in PAGES.items(): redirect('/pages/%s/' % k, v)
PROD_COL = {c[3]: c[1] for c in P if c[3]}                      # producer collections on the store -> producer pages
for h in COL:
    if h in MEMBERS: continue                                   # built above as a real page
    if h == 'mixed-packs': to = '/experiences/'
    elif h in PROD_COL: to = '/producers/%s/' % PROD_COL[h]
    else:
        to = '/wines/'
        mk = [maker(BY_HANDLE[x]) for x in COL[h]['products'] if x in BY_HANDLE]
        mk = [m for m in mk if m]
        if mk and len({m[1] for m in mk}) == 1: to = '/producers/%s/' % mk[0][1]    # a producer's collection under another name
    redirect('/collections/%s/' % h, to)
redirect('/collections/', '/wines/')
for p in PRODS:
    tw = listed(p['handle'])
    redirect('/products/%s/' % p['handle'], ('/wines/%s/' % tw['handle']) if tw else '/wines/')
redirect('/blogs/news/', '/')
redirect('/account/', S + '/account')
# the same moves for hosts that read a redirects file (Netlify, Cloudflare Pages): permanent, before any file
lines = ['/collections/:c/products/:p  /products/:p  301'] + ['%s  %s  301' % (a, b) for a, b in RULES]
open('_redirects', 'w', encoding='utf8').write(chr(10).join(lines) + chr(10))
print('redirects', len(RULES))
print('shop', len(LIST))
