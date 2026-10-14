# Draws a picture for each listed product the store has no photograph of, in the site's own style, so no page shows
# an empty ghost bottle: a bottle with glass coloured by type, a foil capsule and a cream label printed with the
# real producer and name (wines); a muted red card (the gift card); a cream bag with rope handles (gift bags).
# The site's fonts and logo are embedded, so the SVGs render the same as an <img> anywhere: cards, pages, the cart.
# Writes assets/wines/drawn/<handle>-<V>.svg and prints their sizes; winegen.py picks them up.
import os, re, base64, html as H
R = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/'
V = 'v4'
os.chdir(R)
_src = open('tools/winegen.py', encoding='utf8').read()
exec(_src[:_src.index('def page(p, i):')])

def b64(path): return base64.b64encode(open(path, 'rb').read()).decode()
FONTS = ('<style>@font-face{font-family:C;src:url(data:font/woff2;base64,%s) format("woff2")}'
         '@font-face{font-family:L;font-weight:300 600;src:url(data:font/woff2;base64,%s) format("woff2")}</style>') % (
    b64('assets/fonts/Coconat-400.woff2'), b64('assets/fonts/LexendDeca-var.woff2'))
LOGO = 'data:image/png;base64,' + b64('assets/brand/logo.png')
esc = lambda s: H.escape(s, quote=True)

def wrap(text, per_line):
    words, lines, cur = text.split(), [], ''
    for w in words:
        if cur and len(cur) + 1 + len(w) > per_line: lines.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    if cur: lines.append(cur)
    return lines

# the bottle outline the site already uses (100 x 360), drawn at three times the size
BOTTLE = 'M117 0h66v186c0 90 93 138 93 264v576c0 30-18 54-48 54H72c-30 0-48-24-48-54V450c0-126 93-174 93-264Z'
GLASS = {   # glass top, glass bottom, capsule, capsule shine
    'White': ('#d7d6a0', '#a9a75c', '#c6a25a', '#e9d39b'),
    'Red': ('#3a1a1d', '#1c0b0d', '#6e2a2c', '#9a4a48'),
    'Sparkling': ('#2c3b2c', '#121b13', '#b8913f', '#e6c77d'),
    'Rosé': ('#f0c4b4', '#d99a86', '#c9a27a', '#ecd2b4'),
}

def bottle_svg(p):
    k = kind(p); g = GLASS.get(k, GLASS['Red'])
    mk = maker_name(p)
    name = title(p)
    vin = vintage(p)
    if vin: name = re.sub(r'\s*\b%s\b\s*' % vin, ' ', name).strip()
    mk = re.sub(r'\s*(Soc\.?\s*Agr\.?|S\.?L\.?|LLC|GMBH|S\.?r\.?l\.?|S\.?p\.?A\.?)\s*$', '', mk, flags=re.I).strip(' ,.')   # company suffixes off the label
    mk_u = mk.upper()
    nlines = wrap(name, 13)[:4]
    fs = 30 if len(nlines) <= 2 else 26
    y0 = 700 - (len(nlines) - 1) * fs * 0.55
    name_t = ''.join('<text x="150" y="%.0f" font-family="C" font-size="%d" text-anchor="middle" fill="#2b0609">%s</text>' % (y0 + i * fs * 1.1, fs, esc(l)) for i, l in enumerate(nlines))
    mk_lines = wrap(mk_u, 18)[:2]
    mk_t = ''.join('<text x="150" y="%.0f" font-family="L" font-weight="500" font-size="11" letter-spacing="2.2" text-anchor="middle" fill="#8a3d3d">%s</text>' % (612 + i * 15, esc(l)) for i, l in enumerate(mk_lines))
    vin_t = ('<text x="150" y="860" font-family="C" font-size="24" text-anchor="middle" fill="#8a3d3d">%s</text>' % vin) if vin else ''
    kind_t = '<text x="150" y="%d" font-family="L" font-size="10" letter-spacing="1.6" text-anchor="middle" fill="#7a3434">%s</text>' % (888 if vin else 860, esc((k + ' wine' if k in ('White', 'Red') else k).upper()))
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 1080" width="300" height="1080">%s
<defs>
  <clipPath id="b"><path d="%s"/></clipPath>
  <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>
  <linearGradient id="side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/></linearGradient>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".38"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="foil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="%s"/><stop offset=".45" stop-color="%s"/><stop offset="1" stop-color="%s"/></linearGradient>
</defs>
<g clip-path="url(#b)">
  <rect width="300" height="1080" fill="url(#glass)"/>
  <rect x="0" y="0" width="300" height="250" fill="url(#foil)"/>
  <rect x="0" y="246" width="300" height="6" fill="#000" opacity=".18"/>
  <rect x="44" y="540" width="212" height="380" fill="#f7efe4"/>
  <rect x="54" y="550" width="192" height="360" fill="none" stroke="#8a3d3d" stroke-opacity=".45" stroke-width="1.5"/>
  <rect width="300" height="1080" fill="url(#side)"/>
  <rect x="62" y="300" width="34" height="760" fill="url(#sheen)"/>
  <rect x="120" y="10" width="10" height="220" fill="#fff" opacity=".18"/>
</g>
%s%s%s%s
</svg>''' % (FONTS, BOTTLE, g[0], g[1], g[2], g[3], g[2], mk_t, name_t, vin_t, kind_t)

def giftcard_svg(p):
    amount = re.search(r'\$\s*([\d,]+)(?:\.\d+)?', title(p))
    amt = '$' + amount.group(1) if amount else ''
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">%s
<defs><mask id="lg"><rect width="640" height="400" fill="#000"/><image href="%s" x="40" y="38" width="78" height="69" style="filter:invert(1)"/></mask></defs>
<rect width="640" height="400" fill="#8a3d3d"/>
<rect width="640" height="400" fill="#fcf4ec" mask="url(#lg)"/>
<text x="600" y="102" font-family="C" font-size="84" text-anchor="end" fill="#fcf4ec" letter-spacing="-2">%s</text>
<text x="38" y="356" font-family="C" font-size="54" fill="#fcf4ec" letter-spacing="-1.4">Gift card</text>
</svg>''' % (FONTS, LOGO, amt)

def giftbag_svg(p):
    return '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 600" width="440" height="600">%s
<defs>
  <mask id="lg"><rect width="440" height="600" fill="#000"/><image href="%s" x="150" y="300" width="120" height="106" style="filter:invert(1)"/></mask>
  <linearGradient id="bag" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#efe1cf"/><stop offset=".55" stop-color="#f8efe3"/><stop offset="1" stop-color="#e3d0ba"/></linearGradient>
  <linearGradient id="side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d6bfa4"/><stop offset="1" stop-color="#c8ad8f"/></linearGradient>
</defs>
<path d="M150 200 C150 90 200 60 220 60 C240 60 290 90 290 200" fill="none" stroke="#8a3d3d" stroke-width="9" stroke-linecap="round"/>
<path d="M170 200 C170 110 205 84 220 84 C235 84 270 110 270 200" fill="none" stroke="#6e2a2c" stroke-width="5" stroke-linecap="round" opacity=".55"/>
<rect x="60" y="180" width="300" height="400" fill="url(#bag)"/>
<path d="M360 180 L392 200 L392 580 L360 580 Z" fill="url(#side)"/>
<rect x="60" y="180" width="300" height="34" fill="#000" opacity=".05"/>
<circle cx="150" cy="206" r="6" fill="#8a3d3d" opacity=".7"/><circle cx="290" cy="206" r="6" fill="#8a3d3d" opacity=".7"/>
<rect width="440" height="600" fill="#8a3d3d" mask="url(#lg)"/>
</svg>''' % (FONTS, LOGO)

os.makedirs('assets/wines/drawn', exist_ok=True)
made = []
for p in LIST:
    h = p['handle']
    has_photo = bool(p.get('images')) or (isinstance(CUT.get(h), dict) and os.path.exists('assets/wines/%s.webp' % h))
    if has_photo or os.path.exists('assets/cases/%s-%s.webp' % (h, CASE_V)): continue
    if h == 'gift-card-100-00': svg = giftcard_svg(p)
    elif h == 'gift-bags': svg = giftbag_svg(p)
    else: svg = bottle_svg(p)
    open('assets/wines/drawn/%s-%s.svg' % (h, V), 'w', encoding='utf8').write(svg)
    made.append(h)
print('drawn', made)
