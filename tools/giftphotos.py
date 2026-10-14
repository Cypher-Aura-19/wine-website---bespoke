# Photographs for the gift items, which have none on the store. Free-licence photos from Pexels (pexels.com/license),
# cropped to the site's 4:5 plates and saved as assets/gifts/<handle>-<V>.jpg. winegen.py picks them up.
import io, os, subprocess
from PIL import Image
R = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/'
V = 'v1'
PHOTOS = {   # handle: (pexels id, horizontal focus 0..1)
    'gift-card-100-00': ('9170980', 0.5),            # a bottle tied with a ribbon and a card
    'gift-bags': ('8472742', 0.5),                   # a bottle in a kraft gift bag, glasses and grapes
    'congratulations-pack': ('1050283', 0.5),        # champagne glasses among wrapped gifts
    'holiday-charcuterie': ('5667613', 0.5),         # wine and a charcuterie board
    'valentines-day-web-promotion': ('6699441', 0.45),   # roses, a gift box and two glasses of red
    'sale-fish-gift-packs': ('6127621', 0.5),        # a wrapped gift by candlelight
}
os.makedirs(R + 'assets/gifts', exist_ok=True)
for h, (pid, fx) in PHOTOS.items():
    b = subprocess.run(['curl', '-s', '-A', 'Mozilla/5.0', 'https://images.pexels.com/photos/%s/pexels-photo-%s.jpeg?auto=compress&w=1800' % (pid, pid)], capture_output=True).stdout
    im = Image.open(io.BytesIO(b)).convert('RGB')
    w, h_ = im.size; tw = min(w, int(h_ * 4 / 5)); th = int(tw * 5 / 4)
    x = int(max(0, min(w - tw, w * fx - tw / 2))); y = (h_ - th) // 2
    im = im.crop((x, y, x + tw, y + th)).resize((1200, 1500), Image.LANCZOS)
    im.save(R + 'assets/gifts/%s-%s.jpg' % (h, V), quality=82, optimize=True, progressive=True)
    print(h, pid)
