# Points links that used to leave for the Shopify storefront at the site's own pages, and puts the site's own cart
# on every page. Only checkout (and the contact form) still go to Shopify. Safe to run again: every replacement is idempotent.
import os, re, glob
os.chdir('C:/Users/HP/Desktop/Galvan ai projects/wine website')
S = 'https://bespokewineandspirits.com'
CART_V = 11
COLLECTION_LINKS = [('/wines/?type=non-alcoholic', '/collections/non-alcoholic/'), ('/wines/?type=red', '/collections/red-wine/')]
DROP = [('Wines', [('/wines/', 'All wines'), ('/collections/red-wine/', 'Red'), ('/collections/white-wine/', 'White'), ('/collections/rose-wine/', 'Rosé'),
                   ('/collections/sparkling-wine/', 'Sparkling'), ('/collections/skin-contact-orange-wine-white/', 'Orange'),
                   ('/collections/dessert-wine/', 'Dessert'), ('/collections/non-alcoholic/', 'Non-alcoholic')]),
        ('Spirits', [('/collections/spirits/', 'All spirits'), ('/collections/amaro/', 'Amaro')]),
        ('Style', [('/collections/organic/', 'Organic'), ('/collections/bio-dynamic/', 'Biodynamic')]),
        ('Gifts', [('/gifts/', 'All gifts'), ('/experiences/', 'Mixed cases'), ('/wines/gift-card-100-00/', 'Gift card')])]
NAV_LINKS = ('<div class="nav__links" data-navlinks><div class="nav__shop"><a class="nav__link nav__link--shop" href="/wines/">Shop</a>'
             '<div class="nav__drop"><div class="nav__drop-in">' +
             ''.join('<div class="nav__col"><p>%s</p>%s</div>' % (g, ''.join('<a href="%s">%s</a>' % (h, t) for h, t in links)) for g, links in DROP) +
             '</div></div></div><a class="nav__link" href="/cart/" data-navcart>Cart<span class="nav__n" data-navcount hidden></span></a></div>')
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')
SIMPLE = [
    (S + '/collections/all-wine', '/wines/'),
    (S + '/collections/non-alcoholic', '/wines/?type=non-alcoholic'),
    (S + '/collections/mixed-packs', '/experiences/'),
    (S + '/collections/red-wine', '/wines/?type=red'),
    (S + '/pages/bespoke-producers', '/producers/'),
]
pages = [f for f in glob.glob('**/*.html', recursive=True)
         if not f.replace('\\', '/').startswith(('vendor/', 'cg-', 'codegrid', 'CGM', 'tools/'))]
changed = 0
for f in pages:
    s0 = s = open(f, encoding='utf8').read()
    for a, b in SIMPLE: s = s.replace('href="%s"' % a, 'href="%s"' % b)
    s = re.sub(r'href="%s/search\?type=product&(?:amp;)?q=([^"]+)"' % re.escape(S), lambda m: 'href="/wines/?country=%s"' % slug(m.group(1).replace('+', ' ')), s)
    # a producer page's "Shop: All their wines" goes to the shop, filtered to that producer
    m = re.match(r'producers[\\/]([^\\/]+)[\\/]index\.html$', f)
    if m:
        s = re.sub(r'(<dt>Shop</dt><dd><a href=")[^"]*(")', r'\g<1>/wines/?producer=%s\2' % m.group(1), s)
    # the cart lives on this site: its styles and script on every page, the menu's Cart link to /cart/
    if not f.replace(os.sep, '/').startswith('cart/'): s = s.replace('href="%s/cart"' % S, 'href="/cart/"')   # the cart page's own fallbacks keep the store link
    s = re.sub(r'<link rel="stylesheet" href="/css/cart\.css\?v=\d+">', '<link rel="stylesheet" href="/css/cart.css?v=%d">' % CART_V, s)
    s = re.sub(r'<script src="/js/cart\.js\?v=\d+"></script>', '<script src="/js/cart.js?v=%d"></script>' % CART_V, s)
    if '/css/cart.css' not in s:
        s = re.sub(r'(\n(\s*)<link rel="stylesheet" href="/?css/styles\.css\?v=\d+">)', r'\1\n\2<link rel="stylesheet" href="/css/cart.css?v=%d">' % CART_V, s, count=1)
    if '/js/cart.js' not in s:
        s = re.sub(r'(\n(\s*)<script src="/?js/main\.js\?v=\d+"></script>)', r'\1\n\2<script src="/js/cart.js?v=%d"></script>' % CART_V, s, count=1)
    # the top bar: Shop (with the store's menu of collections under it) and Cart beside Menu, on every page
    if 'data-navlinks' not in s:
        s = re.sub(r'(\n(\s*)<button class="nav__toggle")', r'\n\2<div class="nav__links" data-navlinks></div>\1', s, count=1)
    s = re.sub(r'<div class="nav__links" data-navlinks>.*', lambda m: NAV_LINKS, s, count=1)
    # links that used to filter the shop now open the store's own collections
    for a, b in COLLECTION_LINKS: s = s.replace('href="%s"' % a, 'href="%s"' % b)
    # the menu: the mixed cases get their own line
    if 'menu__link"><a href="/experiences/"' not in s:
        s = re.sub(r'(<div class="menu__link"><a href="/wines/\?type=non-alcoholic" data-img="([^"]*?)menu-nonalc\.jpg"[^>]*>Non-Alcoholic</a></div>)',
                   lambda m: m.group(1) + '\n            <div class="menu__link"><a href="/experiences/" data-img="%smenu-cases-2.jpg">Mixed cases</a></div>' % m.group(2), s, count=1)
    s = s.replace('menu-cases.jpg"', 'menu-cases-2.jpg"')          # the case photo, renamed so no browser shows the old one
    # footer: the shop column names the cases as the site does, and the cart
    s = s.replace('<a href="/experiences/">Mixed packs</a></div>', '<a href="/experiences/">Mixed cases</a>\n        <a href="/cart/">Cart</a></div>')
    # footer: the terms page joins the company column
    if '/terms/' not in s:
        s = s.replace('        <a href="/contact/">Contact</a></div>\n      <div><h3>Get in touch</h3>', '        <a href="/contact/">Contact</a>\n        <a href="/terms/">Terms &amp; conditions</a></div>\n      <div><h3>Get in touch</h3>')
    if s != s0:
        open(f, 'w', encoding='utf8').write(s); changed += 1
left = sorted({u for f in pages for u in re.findall(r'href="(%s[^"]*)"' % re.escape(S), open(f, encoding='utf8').read())})
print('changed', changed, 'of', len(pages)); print('still on Shopify:', left[:20])
