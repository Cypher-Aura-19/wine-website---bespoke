# Composes each mixed case's picture from the site's own clean bottle cut-outs (the ones on the wine pages), in the
# order the store's own photo of that case shows them: one height, even spacing, a soft contact shadow under each.
# Bottles the site has no cut-out for are lifted from the store's photo of the case (it is already transparent).
# Writes assets/cases/<handle>-<V>.webp (transparent); the page sets them on its blush plate.
import io, os, json, subprocess
from PIL import Image, ImageFilter, ImageChops
R = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/'
V = 'v3'
CASES = {   # left to right, as in the store's photo of each case
    'sommeliers-choice': ['chardonnay-arvum-2024', 'rober-perots-bordeaux-2019', 'solo-super-tuscan-12-pack-2021', 'viognier-blanc-2022'],
    'pretty-in-pink': ['croifolie-beaujolais-villages-rose-labise-2024', 'diwald-rose-2025', 'rosa-2022', 'gr20-rose-2'],
    'viva-italia': ['garda-soave-2024', 'nascetta-2017', 'chianti-d-o-c-g-2026', 'ripasso-red-label-2020'],
    'weeknight-pours': ['terra-vallona-2026', 'montepulciano-trecciaia-2021', 'ronc-laris-pinot-grigio-2025', 'chardonnay'],
    'frank-matts-picks': ['ried-goldberg-2019', 'rancore-2015', 'barbera-d-alba-virna-2023', 'petite-marie-white-2023'],
    'pop-pour': ['lancestral-pet-nat', 'blanc-de-blanc-1', ('photo', 2), 'prosecco'],   # the Villa Folini Prosecco is not sold alone
}
PRODS = {p['handle']: p for p in json.load(open(R + 'tools/data/wines_products.json', encoding='utf8'))}

def trim(im):
    return im.crop(im.split()[3].point(lambda a: 255 if a > 8 else 0).getbbox())

def from_store_photo(handle, index):
    """the index-th bottle (0-based, left to right) of the store's transparent photo of the case"""
    u = PRODS[handle]['images'][0]['src'].split('?')[0]
    im = Image.open(io.BytesIO(subprocess.run(['curl', '-s', u], capture_output=True).stdout)).convert('RGBA')
    a = im.split()[3]
    w, h = im.size
    cols = [sum(1 for y in range(0, h, 4) if a.getpixel((x, y)) > 40) for x in range(w)]
    # the gaps between bottles are the columns with the least alpha; split at the three deepest valleys
    inside = [x for x in range(w) if cols[x] > 0]
    x0, x1 = inside[0], inside[-1]
    span = x1 - x0
    cuts = []
    for k in (1, 2, 3):
        c = x0 + span * k // 4
        lo, hi = c - span // 10, c + span // 10
        cuts.append(min(range(lo, hi), key=lambda x: cols[x]))
    edges = [x0] + cuts + [x1 + 1]
    piece = im.crop((edges[index], 0, edges[index + 1], h))
    # defringe: the photo's edges carry a light halo; pull the alpha in by a pixel
    a = piece.split()[3].filter(ImageFilter.MinFilter(3))
    piece.putalpha(a)
    return trim(piece)

def bottle(spec, handle):
    if isinstance(spec, tuple): return from_store_photo(handle, spec[1])
    return trim(Image.open(R + 'assets/wines/%s.webp' % spec).convert('RGBA'))

def shadow(w, h):
    """a soft oval contact shadow, muted red like the plates' ground shadow"""
    s = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    m = Image.new('L', (w, h), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(m).ellipse((w * 0.12, h * 0.2, w * 0.88, h * 0.8), fill=70)
    m = m.filter(ImageFilter.GaussianBlur(h / 2.2))
    s.putalpha(m)
    tint = Image.new('RGBA', (w, h), (95, 38, 38, 255)); tint.putalpha(m)
    return tint

H = 1400                      # every bottle drawn at one height
os.makedirs(R + 'assets/cases', exist_ok=True)
for handle, specs in CASES.items():
    bs = [bottle(s, handle) for s in specs]
    bs = [b.resize((max(1, round(b.width * H / b.height)), H), Image.LANCZOS) for b in bs]
    gap = round(H * 0.045)
    W = sum(b.width for b in bs) + gap * (len(bs) - 1)
    pad = round(H * 0.04)
    sh_h = round(H * 0.05)
    canvas = Image.new('RGBA', (W + pad * 2, H + pad + sh_h), (0, 0, 0, 0))
    x = pad
    for b in bs:
        canvas.alpha_composite(b, (x, pad // 2))
        x += b.width + gap
    out = canvas.resize((1200, round(canvas.height * 1200 / canvas.width)), Image.LANCZOS)
    out.save(R + 'assets/cases/%s-%s.webp' % (handle, V), quality=88, method=6)
    print(handle, out.size)
