# Re-cuts bottles whose label or glass was eaten by the background removal: everything enclosed by the
# bottle's outline is kept solid, with the photograph's own pixels.
import os, io, json, sys, urllib.request
import numpy as np
from PIL import Image
from scipy import ndimage
from rembg import remove, new_session
T = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/'
W = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/assets/wines/'
K, NW = int(sys.argv[1]), int(sys.argv[2])
P = {p['handle']: p for p in json.load(open(T + 'wines_products.json', encoding='utf8'))}
todo = json.load(open(T + 'damaged.json'))[K::NW]
sess = new_session('isnet-general-use')
for h in todo:
    p = P.get(h)
    if not p or not p['images']: print('skip', h, flush=True); continue
    src = p['images'][0]['src'].split('?')[0] + '?width=1400'
    try:
        d = urllib.request.urlopen(urllib.request.Request(src, headers={'User-Agent': 'Mozilla/5.0'}), timeout=40).read()
        im = Image.open(io.BytesIO(d)).convert('RGB')
        al = np.asarray(remove(im, session=sess, only_mask=True)).astype(float) / 255
        al = np.clip((al - 0.12) / 0.76, 0, 1)
        solid = ndimage.binary_erosion(ndimage.binary_fill_holes(al > 0.3), iterations=2)
        al[solid] = 1.0
        rgb = np.asarray(im).astype(float)
        out = np.dstack([rgb, al * 255]).astype('uint8')
        ys, xs = np.where(al > 0.05)
        cut = Image.fromarray(out, 'RGBA').crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        if cut.height > 1100: cut = cut.resize((round(cut.width * 1100 / cut.height), 1100), Image.LANCZOS)
        cut.save(W + h + '.webp', 'WEBP', quality=88, method=6)
        json.dump({'w': cut.width, 'h': cut.height, 'cropped': False}, open(T + 'cutmeta/' + h + '.json', 'w'))
        print('ok', h, cut.size, flush=True)
    except Exception as e:
        print('err', h, str(e)[:80], flush=True)
print('done', flush=True)
