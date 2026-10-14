# Makes the favicon from the logo's grape mark (the wordmark is unreadable at tab size), in the site's muted red.
from PIL import Image
D = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/'
logo = Image.open(D + 'assets/brand/logo.png').convert('RGBA')
a = logo.split()[3]
# the mark sits above the wordmark: find the first fully empty row band below it
w, h = logo.size
rows = [any(a.getpixel((x, y)) > 20 for x in range(w)) for y in range(h)]
top = rows.index(True)
y = top
while y < h and rows[y]: y += 1
mark = logo.crop((0, top, w, y))
mark = mark.crop(mark.split()[3].getbbox())
red = Image.new('RGBA', mark.size, (138, 61, 61, 255)); red.putalpha(mark.split()[3])

def square(img, size, pad, bg=None):
    s = max(img.size); c = Image.new('RGBA', (s, s), bg or (0, 0, 0, 0))
    c.paste(img, ((s - img.size[0]) // 2, (s - img.size[1]) // 2), img)
    inner = int(size * (1 - 2 * pad)); c = c.resize((inner, inner), Image.LANCZOS)
    out = Image.new('RGBA', (size, size), bg or (0, 0, 0, 0)); out.paste(c, ((size - inner) // 2,) * 2, c)
    return out

square(red, 64, 0.04).save(D + 'favicon.png')
square(red, 180, 0.16, (252, 244, 236, 255)).convert('RGB').save(D + 'apple-touch-icon.png')
square(red, 48, 0.04).save(D + 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
print('mark', mark.size, 'rows', top, y)
