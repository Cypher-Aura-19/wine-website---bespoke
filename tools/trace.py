import numpy as np, os, sys, potrace
from PIL import Image, ImageFilter
from concurrent.futures import ProcessPoolExecutor
T=r'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/logos_hi/'
OUT=r'C:/Users/HP/Desktop/Galvan ai projects/wine website/assets/producers/'
slugs=['poderi-cellario','virna','tenimenti-civa','andrea-paoletti','benedetti','cantina-reguta','dream-whisky','gabriello-santoni','bella','luca-menicucci','ottomani','ozzano-selections',
'famille-ternynck','domaine-de-croifolie','jean-aubron','bernard-remy','terre-de-vignerons','terra-vecchia','cellier-des-demoiselles','chateau-viranel','les-marmandais','domaine-sainte-marie',
'aleavini','bodegas-verdeal','demencia-del-autor','mont-rubi','authentique-wine-cellars','falcon-spirits','pour-mgmt','the-wonderland-project','oxley-estate','diwald','weingut-umathum','kristinus','adega-da-vermelha']
EDGE={'cellier-des-demoiselles','diwald','poderi-cellario','domaine-de-croifolie','famille-ternynck'}

def mask_of(i,s):
    im=Image.open(T+'H%02d.png'%i).convert('RGBA')
    a=np.asarray(im).astype(float)
    rgb=a[...,:3]; al=a[...,3:]/255
    rgb=rgb*al+255*(1-al)
    L=rgb@np.array([0.299,0.587,0.114])
    h,w=L.shape
    bg=np.median(np.concatenate([L[0],L[-1],L[:,0],L[:,-1]]))
    if bg<128:
        hi=np.percentile(L,99.5); m=np.clip((L-bg-12)/max(hi-bg-12,1),0,1)
    else:
        lo=np.percentile(L,0.5); m=np.clip((bg-L-12)/max(bg-lo-12,1),0,1)
    if s=='famille-ternynck': m=np.clip((m-0.3)/0.7,0,1)
    if s in EDGE:
        e=max(2,int(0.018*max(h,w))); m[:e,:]=0; m[-e:,:]=0; m[:,:e]=0; m[:,-e:]=0
    return m

def run(arg):
    i,s=arg
    m=mask_of(i,s)
    h,w=m.shape
    # work at a generous size: smooth upscale first, so the traced outline follows the real curves
    k=max(1,int(np.ceil(1800/max(h,w))))
    big=Image.fromarray((m*255).astype('uint8')).resize((w*k,h*k),Image.BICUBIC).filter(ImageFilter.GaussianBlur(k*0.35))
    TH={'aleavini':40,'oxley-estate':50,'virna':55,'kristinus':50,'terre-de-vignerons':65,'famille-ternynck':55,'the-wonderland-project':40}
    b=np.asarray(big)>TH.get(s,110)   # light, fine logos keep their small lettering
    if s=='famille-ternynck':   # drop stray specks left from the ornamental frame
        from scipy import ndimage as ndi
        lab,n=ndi.label(b); sz=ndi.sum(b,lab,range(1,n+1)); keep=np.isin(lab,1+np.where(sz>0.02*sz.max())[0])
        yy0,xx0=np.where(keep); cy=np.median(yy0); keep&=(np.abs(np.arange(b.shape[0])[:,None]-cy)<b.shape[0]*0.2)
        b=keep
    bm=potrace.Bitmap(~b)   # this tracer treats False as ink
    path=bm.trace(turdsize=int(4*k*k/4)+2, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.2)
    H,W=b.shape
    parts=[]
    xs=[];ys=[]
    for curve in path:
        sp=curve.start_point
        d=['M%.1f %.1f'%(sp.x,sp.y)]; xs.append(sp.x); ys.append(sp.y)
        for seg in curve.segments:
            if seg.is_corner:
                d.append('L%.1f %.1f L%.1f %.1f'%(seg.c.x,seg.c.y,seg.end_point.x,seg.end_point.y))
                xs+= [seg.c.x,seg.end_point.x]; ys+=[seg.c.y,seg.end_point.y]
            else:
                d.append('C%.1f %.1f %.1f %.1f %.1f %.1f'%(seg.c1.x,seg.c1.y,seg.c2.x,seg.c2.y,seg.end_point.x,seg.end_point.y))
                xs+=[seg.end_point.x]; ys+=[seg.end_point.y]
        d.append('Z'); parts.append(''.join(d))
    if not xs: return s,'EMPTY'
    pad=0.01*max(W,H)
    yy,xx=np.where(b)
    x0,x1,y0,y1=xx.min()-pad,xx.max()+1+pad,yy.min()-pad,yy.max()+1+pad
    svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="%.1f %.1f %.1f %.1f"><path fill="#000" fill-rule="evenodd" d="%s"/></svg>'%(x0,y0,x1-x0,y1-y0,''.join(parts))
    open(OUT+s+'.svg','w').write(svg)
    return s,len(svg)

if __name__=='__main__':
    with ProcessPoolExecutor(6) as ex:
        for r in ex.map(run,list(enumerate(slugs))): print(r)
