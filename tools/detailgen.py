import os, re, json, html as H, urllib.request
os.chdir('C:/Users/HP/Desktop/Galvan ai projects/wine website')
T='C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/'
S='https://bespokewineandspirits.com'

# producers in page order: name, mark file, country, collection handle (or None), vendor match keys
P=[
 ('Poderi Cellario','poderi-cellario','Italy',None,['cellario']),('Virna','virna','Italy',None,['virna']),('Tenimenti Civa','tenimenti-civa','Italy',None,['civa']),
 ('Andrea Paoletti','andrea-paoletti','Italy','andrea-paoletti',['paoletti']),('Benedetti','benedetti','Italy','benedetti',['benedetti']),('Cantina Reguta','cantina-reguta','Italy','reguta',['reguta']),
 ('Dream Whisky','dream-whisky','Italy','dream-whisky',['dream whisk']),('Gabriello Santoni','gabriello-santoni','Italy','gabriello-santoni',['santoni']),('Bella','bella','Italy','bella',['bella glamour']),
 ('Luca Menicucci','luca-menicucci','Italy','menicucci',['menicucci']),('Azienda Agricola Ottomani','ottomani','Italy','azienda-agricola-ottomani',['ottomani']),('Ozzano Selections','ozzano-selections','Italy','ozzano-selection',['ozzano']),
 ('Famille Ternynck','famille-ternynck','France',None,['ternynck']),('Domaine de Croifolie','domaine-de-croifolie','France',None,['croifolie']),('Jean Aubron','jean-aubron','France',None,['aubron']),
 ('Bernard Remy','bernard-remy','France',None,['bernard remy']),('Terre de Vignerons','terre-de-vignerons','France',None,['terre de vignerons']),('Terra Vecchia','terra-vecchia','France',None,['terra vecchia']),
 ('Cellier des Demoiselles','cellier-des-demoiselles','France','cellier-des-demoiselles',['demoiselles']),('Château Viranel','chateau-viranel','France','chateau-viranel',['viranel']),
 ('Les Marmandais','les-marmandais','France','les-marmandais',['marmandais']),('Domaine Sainte-Marie','domaine-sainte-marie','France','domaine-sainte-marie',['sainte marie']),
 ('Aleavini','aleavini','Spain',None,['aleavini']),('Bodegas Verdeal','bodegas-verdeal','Spain','bodegas-verdeal',['verdeal']),('Demencia del Autor','demencia-del-autor','Spain','demencia-del-autor',['demencia']),('Mont-Rubí','mont-rubi','Spain','mont-rubi',['mont rubi']),
 ('Authentique Wine Cellars','authentique-wine-cellars','United States','authentique-wine-cellars',['authentique']),('Falcon Spirits Distillery','falcon-spirits','United States','falcon-spirits-distillery',['falcon']),
 ('Pour Management','pour-mgmt','United States','pour-mgmt',['pour management']),('The Wonderland Project','the-wonderland-project','United States','the-wonderland-project',['wonderland']),
 ('Oxley Estate Winery','oxley-estate','Ontario',None,['oxley']),('Diwald','diwald','Austria','diwald',['diwald']),('Weingut Umathum','weingut-umathum','Austria','weingut-umathum',['umathum']),
 ('Kristinus','kristinus','Hungary',None,['kristinus']),('Adega da Vermelha','adega-da-vermelha','Portugal','adega-da-vermelha',['vermelha']),
]
allp=[]
for l in open(T+'allp.jsonl',encoding='utf8'):
    l=l.strip()
    if l: allp+=json.loads(l)['products']

def fetch(handle):
    try:
        d=urllib.request.urlopen(urllib.request.Request(S+'/collections/%s/products.json?limit=60'%handle,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read()
        return json.loads(d)['products']
    except Exception: return []

def clean(t):
    t=H.unescape(re.sub(r'<br\s*/?>','\n',t or '',flags=re.I))
    t=re.sub(r'</p>|</div>|</li>','\n',t,flags=re.I)
    t=re.sub(r'<[^>]+>','',t)
    paras=[re.sub(r'\s+',' ',p).strip() for p in re.split(r'\n\s*\n|\n',t)]
    return [p for p in paras if len(p)>60]

def kind(p):
    t=(p.get('product_type') or '').lower()+' '+' '.join(p.get('tags',[])).lower()+' '+p['title'].lower()
    # whole words only: "amarone" is a red wine, not an amaro; "origin" is not gin
    for k,lab in ((r'ros[eé]','Rosé'),(r'sparkl\w*','Sparkling'),(r'champagne','Sparkling'),(r'pet nat','Sparkling'),(r'cava','Sparkling'),(r'cr[eé]mant','Sparkling'),(r'prosecco','Sparkling'),(r'amaro','Spirits'),(r'whisk(e)?y','Spirits'),(r'spirits?','Spirits'),(r'gin','Spirits'),(r'vodka','Spirits'),(r'grappa','Spirits'),(r'rum','Spirits'),(r'non-alc\w*','Non-alcoholic'),(r'amarone','Red'),(r'valpolicella','Red'),(r'ripasso','Red'),(r'white','White'),(r'red','Red')):
        if re.search(r'\b'+k+r'\b',t): return lab
    return 'Wine'

def case(p):
    tags=p.get('tags',[])
    for n in ('12','6','3','1'):
        if n in tags: return int(n)
    return None

def story(products, name):
    # paragraphs shared across this producer's products are their own introduction
    seen={}
    for p in products:
        for para in clean(p.get('body_html')):
            seen[para]=seen.get(para,0)+1
    shared=[p for p,c in seen.items() if c>=2]
    pick=shared or [p for p in seen if any(w in p.lower() for w in name.lower().split()[:2])] or list(seen)[:1]
    pick=sorted(set(pick),key=len)
    kept=[]
    for para in pick:
        if any(k in para for k in kept): continue
        kept.append(para)
    order={para:i for i,para in enumerate(seen)}
    pick=sorted(kept,key=lambda x:order.get(x,0))
    out=[]
    for para in pick:
        if len(out)>=3: break
        if 'tasting note' in para.lower() or para.lower().startswith(('origin','vinification','grape')): continue
        out.append(para if len(para)<900 else para[:880].rsplit('. ',1)[0]+'.')
    return out

src=open('producers/index.html',encoding='utf8').read()
head=src[:src.index('  <div class="page" data-page>')]
foot=src[src.index('  <footer class="foot" data-foot>'):]
head=head.replace('/css/producers.css?v=8','/css/producers.css?v=8">\n  <link rel="stylesheet" href="/css/producer.css?v=4')
head=head.replace('<body class="is-producers">','<body class="is-producer">')

CUT=json.load(open(T+'cutouts.json'))
made=[]
for i,(name,mark,country,handle,keys) in enumerate(P):
    prods=fetch(handle) if handle else []
    if not prods:
        prods=[p for p in allp if any(k in p['vendor'].lower() for k in keys)]
    # drop duplicates by title and items with no image
    seenT=set(); wines=[]
    for p in prods:
        t=p['title'].strip()
        if t.lower() in seenT or not p.get('images'): continue
        seenT.add(t.lower()); wines.append(p)
    st=story(wines,name)
    nxt=P[(i+1)%len(P)]
    slug=mark
    kinds=[]
    for w in wines:
        k=kind(w)
        if k not in kinds: kinds.append(k)

    def cut(w):
        """the local cut-out for this wine, if it reads as a whole bottle"""
        r=CUT.get(w['handle'])
        if isinstance(r,dict) and not r.get('closeup'):
            return '/assets/wines/%s.webp' % w['handle'], r['w'], r['h']
        return None

    def card(w):
        c=cut(w)
        price=float(w['variants'][0]['price'] or 0); n=case(w); k=kind(w)
        if price>0 and n and n>1:
            pr='$%.0f<small>a bottle</small>' % (price/n); note='<span class="pcard__note">Case of %d · $%.0f</span>' % (n,price)
        elif price>0:
            pr='$%.0f' % price; note='<span class="pcard__note">%s</span>' % ('Single bottle' if n==1 else 'Per case')
        else:
            pr='Ask us'; note='<span class="pcard__note">Price on request</span>'
        if c:
            img='<img class="pcard__img" src="%s" alt="%s" width="%d" height="%d" loading="lazy" decoding="async">' % (c[0],H.escape(w['title']),c[1],c[2])
        else:   # no clean cut-out: the store photograph, shown whole on the plate
            img='<img class="pcard__img pcard__img--photo" src="%s" alt="%s" loading="lazy" decoding="async">' % (w['images'][0]['src'].split('?')[0]+'?width=700',H.escape(w['title']))
        return '''
            <li class="pcard" data-kind="%s"><a class="pcard__link" href="/wines/%s/" data-reveal>
              <span class="pcard__plate"><span class="pcard__tag">%s</span>%s<span class="pcard__go">View wine<i class="ico ico--arrow" aria-hidden="true"></i></span></span>
              <span class="pcard__body">
                <span class="pcard__meta">%s</span>
                <span class="pcard__row"><span class="pcard__name">%s</span><span class="pcard__price">%s</span></span>
                %s
              </span>
            </a></li>''' % (H.escape(k), w['handle'], H.escape(k), img, H.escape(name), H.escape(w['title']), pr, note)

    filters=''
    if len(kinds)>1:
        filters='<div class="pd-filters" role="group" aria-label="Filter wines"><button type="button" class="pd-filter is-on" data-pdf="all" aria-pressed="true">All <sup>%d</sup></button>%s<i class="pd-filters__bar" aria-hidden="true"></i></div>' % (len(wines), ''.join('<button type="button" class="pd-filter" data-pdf="%s" aria-pressed="false">%s <sup>%d</sup></button>' % (H.escape(k),H.escape(k),sum(1 for w in wines if kind(w)==k)) for k in kinds))
    feature=None
    for w in wines:   # the opening shows a whole cut-out bottle when there is one
        c=cut(w)
        if c: feature=(c[0],w['title']); break
    shop='/wines/?producer='+mark
    if st:
        sents=re.split(r'(?<=[.!?])\s+',st[0]); lead=''
        while sents and (len(lead)<110 or not lead):
            lead=(lead+' '+sents.pop(0)).strip()
            if len(lead)>230: break
        if sents: st=[lead,' '.join(sents)]+st[1:]
        else: st=[lead]+st[1:]
    lead=st[0] if st else '%s is one of the producers we bring to Ontario, from %s.' % (name, country if country!='United States' else 'the United States')
    rest=''.join('<p>%s</p>' % H.escape(p) for p in st[1:])

    main='''  <div class="page" data-page>
  <main id="main">

    <section class="pd-hero" aria-labelledby="pd-title">
      <div class="wrap">
        <nav class="pd-crumbs" aria-label="Breadcrumb"><a href="/producers/">Producers</a><span aria-hidden="true">/</span><a href="/producers/#%s">%s</a></nav>
        <div class="pd-hero__grid">
          <div class="pd-hero__copy">
            <span class="pd-hero__mark" style="--m: url(/assets/producers/%s.svg)" role="img" aria-label="%s logo" data-pdmark></span>
            <h1 class="pd-hero__title" id="pd-title" data-intro>%s</h1>
            <dl class="pd-facts" data-intro-fade>
              <div><dt>Country</dt><dd>%s</dd></div>
              <div><dt>On our list</dt><dd>%s</dd></div>
              <div><dt>Shop</dt><dd><a href="%s">%s<i class="ico ico--arrow" aria-hidden="true"></i></a></dd></div>
            </dl>
          </div>
          %s
        </div>
      </div>
    </section>

    <section class="pd-story" aria-label="About %s">
      <div class="wrap pd-story__grid">
        <p class="pd-story__k">The producer</p>
        <div class="pd-story__text">
          <p class="pd-story__lead" data-ink>%s</p>
          %s
        </div>
      </div>
    </section>

    <section class="pd-wines" aria-labelledby="pd-wines-title">
      <div class="wrap">
        <div class="pd-wines__head">
          <h2 class="pd-wines__title" id="pd-wines-title" data-lines>The wines</h2>
          %s
        </div>
        %s
      </div>
    </section>

    <a class="pd-next" href="/producers/%s/" data-pdnext>
      <span class="pd-next__fill" aria-hidden="true"></span>
      <span class="wrap pd-next__in">
        <span class="pd-next__k">Next producer</span>
        <span class="pd-next__name">%s</span>
        <span class="pd-next__mark" style="--m: url(/assets/producers/%s.svg)" aria-hidden="true"></span>
        <i class="pd-next__arr" aria-hidden="true"></i>
      </span>
    </a>

  </main>

''' % (
        re.sub(r'[^a-z]+','-',country.lower()).strip('-'), H.escape(country),
        mark, H.escape(name), H.escape(name),
        H.escape(country), ('%d %s' % (len(wines), 'wine' if len(wines)==1 else 'wines')) if wines else 'Ask us',
        shop if wines else '/contact/', 'All their wines' if wines else 'Ask about their wines',
        ('<figure class="pd-hero__bottle" data-pdbottle><img src="%s" alt="%s" fetchpriority="high"></figure>' % (feature[0], H.escape(feature[1]))) if feature else '',
        H.escape(name), H.escape(lead), rest,
        filters,
        ('<ul class="pd-grid" data-pdgrid>%s\n        </ul>' % ''.join(card(w) for w in wines)) if wines else ('<div class="pd-none"><p class="pd-none__t">None of their wines are on the list right now</p><p>Ask the team what is coming from %s, or look through the other wines from %s.</p><div class="pd-none__acts"><a class="btn btn--wine" href="/contact/">Ask the team<i class="ico ico--arrow" aria-hidden="true"></i></a><a class="pd-none__link" href="/wines/?country=%s">Wines from %s</a><a class="pd-none__link" href="/producers/">All producers</a></div></div>' % (H.escape(name), H.escape(country), re.sub(r'[^a-z]+', '-', country.lower()).strip('-'), H.escape(country))),
        nxt[1], H.escape(nxt[0]), nxt[1])

    page=head.replace('<title>Producers | Bespoke Wine &amp; Spirits</title>','<title>%s | Producers | Bespoke Wine &amp; Spirits</title>' % H.escape(name))
    page=re.sub(r'<meta name="description" content="[^"]*">','<meta name="description" content="%s from %s, brought to Ontario by Bespoke Wine and Spirits.%s">' % (H.escape(name),H.escape(country),(' %d wines on our list.' % len(wines)) if wines else ''),page)
    page+=main+foot
    os.makedirs('producers/'+slug,exist_ok=True)
    open('producers/%s/index.html'%slug,'w',encoding='utf8').write(page)
    made.append((name,len(wines),len(st)))

# producers index tiles now open the detail page
h=open('producers/index.html',encoding='utf8').read()
for name,mark,country,handle,keys in P:
    h=re.sub(r'<a class="pr-tile" data-tile href="[^"]*">(\s*<span class="pr-fill" aria-hidden="true"></span>\s*<span class="pr-mark" style="--m: url\(/assets/producers/%s\.png\))' % re.escape(mark), r'<a class="pr-tile" data-tile href="/producers/%s/">\1' % mark, h)
open('producers/index.html','w',encoding='utf8').write(h)
print(made)
print(h.count('href="/producers/'))
