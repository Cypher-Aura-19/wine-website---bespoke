# Compares each producer page's wine count with what the shop shows for ?producer=<slug>.
import os, re
os.chdir('C:/Users/HP/Desktop/Galvan ai projects/wine website')
shop = open('wines/index.html', encoding='utf8').read()
for d in sorted(os.listdir('producers')):
    f = 'producers/%s/index.html' % d
    if not os.path.isfile(f): continue
    page = open(f, encoding='utf8').read()
    on_page = len(re.findall(r'<li class="pcard"', page))
    in_shop = len(re.findall(r'data-producer="%s"' % re.escape(d), shop))
    if on_page != in_shop: print(d, 'page', on_page, 'shop', in_shop)
