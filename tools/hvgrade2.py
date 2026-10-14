import numpy as np, glob, os
from PIL import Image
T='C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/data/'
fs=sorted(glob.glob(T+'hv/f*.png'))
frames=[np.asarray(Image.open(f).convert('RGB')).astype(np.float32) for f in fs]
H,W,_=frames[0].shape
# 1. a clean plate: per-pixel median over time removes the moving hand and bottle
plate=np.percentile(np.stack(frames[::2]),92,axis=0)   # the hand and bottle are darker than the wall, so a high percentile is the bare wall
# 2. background mask on the plate: exclude the glass (centre) and the band the bottle sweeps through (top right)
yy,xx=np.mgrid[0:H,0:W]/np.array([H,W]).reshape(2,1,1)
lum=plate.mean(2)
med=np.median(lum)
mask=(np.abs(lum-med)<40)
mask&=~((xx>0.30)&(xx<0.66)&(yy>0.15))          # glass and stem
# 3. fit a smooth light field to the backdrop (2D polynomial per channel), robustly
def basis(x,y,deg=4):
    cols=[]
    for i in range(deg+1):
        for j in range(deg+1-i): cols.append((x**i)*(y**j))
    return np.stack(cols,-1)
sub=mask.copy(); sub[::1]=sub[::1]
ys,xs=np.where(sub); pick=np.random.default_rng(0).choice(len(xs),min(60000,len(xs)),replace=False)
xs,ys=xs[pick],ys[pick]
A=basis(xs/W,ys/H)
Bfull=basis(xx.ravel(),yy.ravel()).reshape(H,W,-1)
field=np.zeros((H,W,3),np.float32)
for c in range(3):
    v=plate[ys,xs,c]; coef,*_=np.linalg.lstsq(A,v,rcond=None)
    for _ in range(2):   # drop outliers and refit
        r=v-A@coef; keep=np.abs(r)<2.5*np.std(r); coef,*_=np.linalg.lstsq(A[keep],v[keep],rcond=None)
    field[...,c]=Bfull@coef
cream=np.array([252,244,236],np.float32)
gain=cream/np.maximum(field,1)
os.makedirs('C:/Users/HP/Desktop/Galvan ai projects/wine website/assets/pour',exist_ok=True)
for k,f in enumerate(frames):
    out=np.clip(f*gain,0,255)
    # anything that is within a hair of the backdrop becomes exactly cream, so edges never show a seam
    d=np.abs(out-cream).max(2,keepdims=True)
    w=np.clip((d-4)/10,0,1)
    out=out*w+cream*(1-w)
    Image.fromarray(out.astype('uint8')).save('C:/Users/HP/Desktop/Galvan ai projects/wine website/assets/pour/p%03d.jpg'%k,quality=82,optimize=True,progressive=True)
# a check sheet
ks=[0,40,70,100,120]
sheet=Image.new('RGB',(1600,900*len(ks)//4+10),(252,244,236))
row=[Image.open('C:/Users/HP/Desktop/Galvan ai projects/wine website/assets/pour/p%03d.jpg'%k).resize((400,225)) for k in ks]
s=Image.new('RGB',(2000,225),(252,244,236))
for i,im in enumerate(row): s.paste(im,(i*400,0))
s.save(T+'hvgraded.png')
print(field.min(),field.max())
