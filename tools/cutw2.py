import os, re, glob, io, json, urllib.request
import numpy as np
from PIL import Image
from rembg import remove, new_session
os.chdir('C:/Users/HP/Desktop/Galvan ai projects/wine website')
OUT='assets/wines/'; os.makedirs(OUT,exist_ok=True)
# every product with a photo and no cut-out yet
P=json.load(open('C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/wines_products.json',encoding='utf8'))
jobs={p['handle']:p['images'][0]['src'].split('?')[0] for p in P if p['images'] and not os.path.exists(OUT+p['handle']+'.webp')}
print('images',len(jobs),flush=True)
sess=new_session('isnet-general-use')
report={}
import sys
K=int(sys.argv[1])
items=sorted(jobs.items())
items=items[::-1] if K==1 else (items[len(items)//3:]+items[:len(items)//3] if K==2 else items[2*len(items)//3:]+items[:2*len(items)//3])
for n,(handle,src) in enumerate(items):
    dst=OUT+handle+'.webp'
    if os.path.exists(dst) or os.path.exists(dst+'.lock'): continue
    open(dst+'.lock','w').close()
    try:
        d=urllib.request.urlopen(urllib.request.Request(src+'?width=1400',headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read()
        im=Image.open(io.BytesIO(d)).convert('RGB')
        cut=remove(im,session=sess)
        a=np.asarray(cut).astype(float)
        al=a[...,3]/255
        al=np.clip((al-0.12)/0.76,0,1)            # firm the matte edge, keep a fine anti-aliased rim
        a[...,3]=al*255
        ys,xs=np.where(al>0.05)
        if len(xs)==0: report[handle]='empty'; continue
        H,W=al.shape
        cropped=ys.min()<=2 or ys.max()>=H-3     # the bottle runs off the photo's top or bottom edge
        x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
        out=Image.fromarray(a.astype('uint8')).crop((x0,y0,x1,y1))
        if out.height>1100: out=out.resize((round(out.width*1100/out.height),1100),Image.LANCZOS)
        out.save(dst,'WEBP',quality=88,method=6)
        report[handle]={'w':out.width,'h':out.height,'cropped':bool(cropped)}
        json.dump(report[handle],open('C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/cutmeta/'+handle+'.json','w'))
    except Exception as e:
        report[handle]='err '+str(e)[:80]
    print(n,handle,report.get(handle),flush=True)
    try: os.remove(dst+'.lock')
    except Exception: pass

print('done',flush=True)
