/* ==========================================================================
   Bespoke gallery: an endless field of photographs you drag through
   (after the CodeGrid "Phantom" gallery). One full-screen WebGL plane draws a
   repeating grid with a gentle lens curve; the grid pulls back while you drag.
   Recoloured for the site: cream ground, hairline grid, muted red captions.
   Selecting a photograph opens it whole, uncropped, in a viewer.
   ========================================================================== */
import * as THREE from '/vendor/three.module.min.js';

const ITEMS = [
  ['In the cellar', 'Cellar'], ['Old vines', 'Vineyard'], ['Walking the rows', 'Vineyard'], ['Air Canada event', 'Event'],
  ['Vineyard visit', 'Vineyard'], ['Pouring for guests', 'Tasting'], ['Long lunch', 'Table'], ['Inside the winery', 'Cellar'],
  ['Tenimenti Civa', 'Producer'], ['Barrel hall', 'Cellar'], ['Between the rows', 'Vineyard'], ['Barrel room', 'Cellar'],
  ['Estate visit', 'Producer'], ['Setting the tasting', 'Tasting'], ['Trade night', 'Event'], ['Bespoke Wine & Spirits', 'Bespoke'],
  ['Vinitaly Bio', 'Trade fair'], ['Vineyard soil', 'Vineyard'], ['Above the vines', 'Vineyard'], ['Tasting menu', 'Table'],
  ['Cellar walk', 'Cellar'], ['Tasting room', 'Tasting'], ['Pruned vines', 'Vineyard'], ['With Tenimenti Civa', 'Producer'],
  ['Benedetti, Amarone', 'Producer']
].map(([title, tag], i) => {
  const n = String(i).padStart(2, '0');
  return { title, tag, tile: `/assets/gallery/sq${n}.jpg`, full: `/assets/gallery/g${n}.jpg` };
});

const RM = document.documentElement.classList.contains('rm');
const C = {
  cell: 0.95, zoomDrag: 1.25, lerp: 0.075,
  bg: [252 / 255, 244 / 255, 236 / 255],
  line: [138 / 255, 61 / 255, 61 / 255, 0.16],
  text: '#8a3d3d', textSoft: 'rgba(138, 61, 61, 0.55)'
};
const SLOT = 640;

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const fragmentShader = /* glsl */`
  uniform vec2 uOffset; uniform vec2 uResolution; uniform vec4 uLine; uniform vec3 uBg;
  uniform vec2 uMouse; uniform float uZoom; uniform float uCell; uniform float uCount; uniform float uReveal;
  uniform sampler2D uImages; uniform sampler2D uTexts;
  varying vec2 vUv;

  vec2 toWorld(vec2 screen) {
    float r = length(screen);
    vec2 d = screen * (1.0 - 0.08 * r * r);
    return d * vec2(uResolution.x / uResolution.y, 1.0) * uZoom + uOffset;
  }

  void main() {
    vec2 screen = (vUv - 0.5) * 2.0;
    vec2 cellPos = toWorld(screen) / uCell;
    vec2 cellId = floor(cellPos);
    vec2 cellUV = fract(cellPos);

    // the cell under the pointer lifts slightly: its photo grows a touch
    vec2 m = (uMouse / uResolution) * 2.0 - 1.0; m.y = -m.y;
    float hovered = (uMouse.x >= 0.0 && floor(toWorld(m) / uCell) == cellId) ? 1.0 : 0.0;

    float size = 0.6 + 0.04 * hovered;
    vec2 imgUV = (cellUV - (1.0 - size) * 0.5) / size;
    float texIndex = mod(cellId.x + cellId.y * 3.0, uCount);
    float atlas = ceil(sqrt(uCount));
    vec2 slot = vec2(mod(texIndex, atlas), floor(texIndex / atlas));

    vec3 color = uBg;
    float e = 0.004;
    vec2 im = smoothstep(-e, e, imgUV) * smoothstep(-e, e, 1.0 - imgUV);
    float inImg = im.x * im.y;
    if (inImg > 0.0) {
      vec2 iu = clamp(imgUV, 0.0, 1.0);
      vec2 a = (slot + vec2(iu.x, 1.0 - iu.y)) / atlas;   // flip inside the tile, so tile and caption share a slot
      color = mix(color, texture2D(uImages, a).rgb, inImg);
    }

    // caption strip under each photograph
    float ty = 0.86, th = 0.08;
    if (cellUV.x >= 0.06 && cellUV.x <= 0.94 && cellUV.y >= ty && cellUV.y <= ty + th) {
      vec2 tc = vec2((cellUV.x - 0.06) / 0.88, 1.0 - (cellUV.y - ty) / th);
      vec4 t = texture2D(uTexts, (slot + tc) / atlas);
      color = mix(color, t.rgb, t.a);
    }

    // hairline grid
    float lw = 0.004;
    float g = smoothstep(0.0, lw, cellUV.x) * smoothstep(0.0, lw, 1.0 - cellUV.x) * smoothstep(0.0, lw, cellUV.y) * smoothstep(0.0, lw, 1.0 - cellUV.y);
    color = mix(color, uLine.rgb, (1.0 - g) * uLine.a);

    // the field dissolves into the page towards the corners, and fades in on arrival
    float fade = 1.0 - smoothstep(1.15, 1.75, length(screen));
    gl_FragColor = vec4(mix(uBg, color, fade * uReveal), 1.0);
  }
`;

const loadImage = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

function atlasFromImages(images) {
  const n = Math.ceil(Math.sqrt(images.length));
  const cv = document.createElement('canvas'); cv.width = cv.height = n * SLOT;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#f2e2d7'; ctx.fillRect(0, 0, cv.width, cv.height);
  images.forEach((img, i) => { if (img) ctx.drawImage(img, (i % n) * SLOT, Math.floor(i / n) * SLOT, SLOT, SLOT); });
  return finish(new THREE.CanvasTexture(cv));
}
// captions are drawn at the caption strip's own proportions, then fitted into a square slot;
// the shader stretches them back, so the letters come out undistorted
function atlasFromCaptions(items) {
  const n = Math.ceil(Math.sqrt(items.length));
  const cv = document.createElement('canvas'); cv.width = cv.height = n * SLOT;
  const ctx = cv.getContext('2d');
  const W = 2048, H = Math.round(2048 * 0.08 / 0.88);
  const strip = document.createElement('canvas'); strip.width = W; strip.height = H;
  const sx = strip.getContext('2d');
  items.forEach((it, i) => {
    sx.clearRect(0, 0, W, H);
    sx.textBaseline = 'middle';
    sx.font = '400 104px Coconat, Georgia, serif'; sx.fillStyle = C.text; sx.textAlign = 'left';
    sx.fillText(it.title, 0, H * 0.54);
    sx.font = '400 74px "Lexend Deca", sans-serif'; sx.fillStyle = C.textSoft; sx.textAlign = 'right';
    sx.fillText(it.tag, W, H * 0.56);
    ctx.drawImage(strip, (i % n) * SLOT, Math.floor(i / n) * SLOT, SLOT, SLOT);
  });
  return finish(new THREE.CanvasTexture(cv));
}
function finish(t) {
  Object.assign(t, { wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, flipY: false, generateMipmaps: false });
  return t;
}

let FIELD = null;

async function init() {
  const host = document.querySelector('[data-field]');
  if (!host) return;

  if (host.clientWidth < 700) C.cell = 1.05;   // on a phone fewer, larger photographs so captions stay readable
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // colours pass straight through, as authored
  renderer.setClearColor(new THREE.Color(...C.bg), 1);
  host.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10); camera.position.z = 1;

  await (document.fonts ? document.fonts.ready : Promise.resolve());
  const images = await Promise.all(ITEMS.map((it) => loadImage(it.tile)));

  const u = {
    uOffset: { value: new THREE.Vector2(0, 0) },
    uResolution: { value: new THREE.Vector2(host.clientWidth, host.clientHeight) },
    uLine: { value: new THREE.Vector4(...C.line) },
    uBg: { value: new THREE.Vector3(...C.bg) },
    uMouse: { value: new THREE.Vector2(-1, -1) },
    uZoom: { value: 1.7 }, uCell: { value: C.cell }, uCount: { value: ITEMS.length }, uReveal: { value: 0 },
    uImages: { value: atlasFromImages(images) }, uTexts: { value: atlasFromCaptions(ITEMS) }
  };
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: u })));

  // state
  const offset = { x: C.cell / 2, y: C.cell / 2 }, target = { x: C.cell / 2, y: C.cell / 2 };   // a photograph sits in the centre
  let zoom = RM ? 1 : 1.7, targetZoom = 1, reveal = RM ? 1 : 0;
  let dragging = false, moved = false, downAt = 0, last = { x: 0, y: 0 };

  const canvas = renderer.domElement;
  const local = (x, y) => { const r = canvas.getBoundingClientRect(); return { x: x - r.left, y: y - r.top, r }; };
  // where a cell's photograph sits on screen (centre and size), following the lens curve
  const tileAt = (cx, cy, at) => {
    const r = canvas.getBoundingClientRect(), o = at || offset;
    const tx = ((cx + 0.5) * C.cell - o.x) / ((r.width / r.height) * zoom);
    const ty = ((cy + 0.5) * C.cell - o.y) / zoom;
    const tr = Math.hypot(tx, ty), td = 1 / (1 - 0.08 * tr * tr);
    return { x: r.left + (tx * td * 0.5 + 0.5) * r.width, y: r.top + (-ty * td * 0.5 + 0.5) * r.height, size: 0.6 * C.cell / zoom * (r.height / 2) };
  };
  // the field repeats, so a photograph appears many times: find its copy nearest the given point
  const nearestCell = (i, o) => {
    const n = ITEMS.length, ox = o.x / C.cell - 0.5, oy = o.y / C.cell - 0.5;
    let best = null;
    for (let cy = Math.round(oy) - 3; cy <= Math.round(oy) + 3; cy++) {
      const base = i - 3 * cy, cx = base + n * Math.round((ox - base) / n);
      const dist = Math.hypot(cx - ox, (cy - oy) * 1.2);
      if (!best || dist < best.d) best = { cx, cy, d: dist };
    }
    return best;
  };
  FIELD = {
    // glide the field so this photograph's tile sits in the centre
    focus(i) { const c = nearestCell(i, target); target.x = (c.cx + 0.5) * C.cell; target.y = (c.cy + 0.5) * C.cell; },
    // where this photograph's tile will be once the field settles
    tile(i) { const c = nearestCell(i, target); return tileAt(c.cx, c.cy, target); }
  };
  const pickIndex = (x, y) => {
    const r = canvas.getBoundingClientRect();
    const sx = ((x - r.left) / r.width) * 2 - 1, sy = -(((y - r.top) / r.height) * 2 - 1);
    const rad = Math.hypot(sx, sy), d = 1 - 0.08 * rad * rad;
    const wx = sx * d * (r.width / r.height) * zoom + offset.x, wy = sy * d * zoom + offset.y;
    const cx = Math.floor(wx / C.cell), cy = Math.floor(wy / C.cell);
    const k = (cx + cy * 3) % ITEMS.length;
    return { index: k < 0 ? k + ITEMS.length : k, tile: tileAt(cx, cy) };
  };

  const down = (x, y) => { if (viewer.open) return; dragging = true; moved = false; downAt = performance.now(); last = { x, y }; host.classList.add('is-dragging'); };
  const move = (x, y) => {
    const p = local(x, y); u.uMouse.value.set(p.x, p.y);
    if (!dragging) return;
    const dx = x - last.x, dy = y - last.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) { moved = true; targetZoom = C.zoomDrag; }
    target.x -= dx * 0.003; target.y += dy * 0.003; last = { x, y };
  };
  const up = (x, y) => {
    if (!dragging) return;
    dragging = false; host.classList.remove('is-dragging'); targetZoom = 1;
    if (!moved && performance.now() - downAt < 300) { const p = pickIndex(x, y); viewer.show(p.index, p.tile); }
  };

  canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); down(e.clientX, e.clientY); });
  canvas.addEventListener('pointermove', (e) => move(e.clientX, e.clientY));
  canvas.addEventListener('pointerup', (e) => up(e.clientX, e.clientY));
  canvas.addEventListener('pointercancel', () => { dragging = false; targetZoom = 1; host.classList.remove('is-dragging'); });
  canvas.addEventListener('pointerleave', () => u.uMouse.value.set(-1, -1));
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); target.x += e.deltaX * 0.0015; target.y -= e.deltaY * 0.0015; }, { passive: false });
  // arrow keys pan the field for keyboard users
  window.addEventListener('keydown', (e) => {
    if (viewer.open) return;
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (k) { target.x += k[0] * C.cell; target.y += k[1] * C.cell; e.preventDefault(); }
  });

  const resize = () => {
    renderer.setSize(host.clientWidth, host.clientHeight);
    u.uResolution.value.set(host.clientWidth, host.clientHeight);
  };
  window.addEventListener('resize', resize);

  const born = performance.now();
  const tick = () => {
    requestAnimationFrame(tick);
    const l = C.lerp;
    offset.x += (target.x - offset.x) * l; offset.y += (target.y - offset.y) * l;
    zoom += (targetZoom - zoom) * (reveal < 1 ? 0.035 : l);
    reveal = RM ? 1 : Math.min(1, (performance.now() - born) / 1100);
    u.uOffset.value.set(offset.x, offset.y); u.uZoom.value = zoom; u.uReveal.value = reveal;
    renderer.render(scene, camera);
  };
  tick();
  host.classList.add('is-ready');
}

/* Viewer: the photograph whole, never cropped. It grows out of the tile that was selected (starting as
   that same square crop, then uncropping). Next / previous crossfade softly, and the field behind glides
   to the new photograph's tile. Closing always returns the photograph showing to its own tile. ------- */
const SHADOW = 'drop-shadow(0px 24px 32px rgba(95, 38, 38, 0.28))';
const viewer = {
  open: false, busy: false, idx: 0,
  el: document.querySelector('[data-viewer]'),
  cache: {},
  get fig() { return this.el.querySelector('.gl-view__fig'); },
  img(i) {
    const it = ITEMS[i], im = new Image();
    im.className = 'gl-view__img'; im.src = it.full; im.alt = it.title; im.decoding = 'async';
    return im.decode ? im.decode().then(() => im, () => im) : Promise.resolve(im);
  },
  // warm the neighbours so stepping never waits on the network
  preload(i) {
    [1, -1].forEach((d) => {
      const k = (i + d + ITEMS.length) % ITEMS.length;
      if (!this.cache[k]) { const p = new Image(); p.src = ITEMS[k].full; this.cache[k] = p; }
    });
  },
  // the painted photograph inside the figure (object-fit: contain), in screen pixels
  painted(im) {
    const f = this.fig.getBoundingClientRect(), a = (im.naturalWidth || 1) / (im.naturalHeight || 1);
    let w = f.width, h = w / a; if (h > f.height) { h = f.height; w = h * a; }
    return { x: f.left + (f.width - w) / 2, y: f.top + (f.height - h) / 2, w, h };
  },
  // the transform and crop that make the photograph look exactly like its square tile
  asTile(im, tile) {
    const p = this.painted(im), s = Math.min(p.w, p.h);
    const ix = (p.w - s) / 2 / p.w * 100, iy = (p.h - s) / 2 / p.h * 100;
    return { x: tile.x - (p.x + p.w / 2), y: tile.y - (p.y + p.h / 2), scale: tile.size / s, clipPath: 'inset(' + iy + '% ' + ix + '% ' + iy + '% ' + ix + '%)' };
  },
  meta(i, d) {
    const it = ITEMS[i], el = this.el;
    const set = () => {
      el.querySelector('[data-vtitle]').textContent = it.title;
      el.querySelector('[data-vtag]').textContent = it.tag;
      el.querySelector('[data-vcount]').textContent = (i + 1) + ' / ' + ITEMS.length;
    };
    if (!d || RM || !window.gsap) return set();
    const parts = el.querySelectorAll('.gl-view__meta > span, .gl-view__count');
    gsap.to(parts, { y: -10, opacity: 0, duration: 0.3, ease: 'power2.in', overwrite: true, onComplete: () => {
      set(); gsap.fromTo(parts, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: 0.05 });
    } });
  },
  async show(i, tile) {
    if (this.open || this.busy || !this.el) return;
    this.busy = true; this.idx = i;
    const el = this.el, fig = this.fig, bar = el.querySelector('.gl-view__bar');
    const im = await this.img(i);
    fig.querySelectorAll('.gl-view__img').forEach((n) => n.remove());
    fig.appendChild(im);
    this.meta(i); this.preload(i);
    el.hidden = false; this.open = true;
    if (FIELD) FIELD.focus(i);
    const focus = () => el.querySelector('[data-vclose]').focus({ preventScroll: true });
    if (RM || !window.gsap || !tile) { this.busy = false; focus(); return; }

    gsap.set(el, { backgroundColor: 'rgba(252, 244, 236, 0)', backdropFilter: 'blur(0px)' });
    gsap.set(bar, { opacity: 0, y: 24 });
    gsap.set(im, Object.assign({ transformOrigin: '50% 50%', filter: SHADOW }, this.asTile(im, tile)));
    gsap.timeline({ onComplete: () => { this.busy = false; focus(); } })
      .to(el, { backgroundColor: 'rgba(252, 244, 236, 0.9)', backdropFilter: 'blur(18px)', duration: 0.8, ease: 'power2.out' }, 0)
      .to(im, { x: 0, y: 0, scale: 1, duration: 1.05, ease: 'power4.inOut' }, 0)
      .to(im, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.85, ease: 'power3.inOut' }, 0.25)
      .to(bar, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.65);
  },
  async step(d) {
    if (!this.open || this.busy) return;
    this.busy = true;
    const next = (this.idx + d + ITEMS.length) % ITEMS.length;
    this.idx = next;
    if (FIELD) FIELD.focus(next);
    const fig = this.fig, old = fig.querySelector('.gl-view__img:last-of-type');
    const im = await this.img(next);
    this.preload(next);
    fig.appendChild(im);
    this.meta(next, d);
    if (RM || !window.gsap) { if (old) old.remove(); this.busy = false; return; }
    // a soft crossfade: the current photograph eases back and blurs, the next settles in and sharpens
    const tl = gsap.timeline({ onComplete: () => { if (old) old.remove(); this.busy = false; } });
    if (old) tl.to(old, { opacity: 0, scale: 0.965, x: -28 * d, filter: 'blur(10px) ' + SHADOW, duration: 0.7, ease: 'power2.inOut' }, 0);
    tl.fromTo(im, { opacity: 0, scale: 1.035, x: 28 * d, filter: 'blur(10px) ' + SHADOW },
                  { opacity: 1, scale: 1, x: 0, filter: 'blur(0px) ' + SHADOW, duration: 0.85, ease: 'power3.out' }, 0.18);
  },
  hide() {
    if (!this.open || this.busy) return;
    this.busy = true;
    const el = this.el, im = this.fig.querySelector('.gl-view__img:last-of-type'), bar = el.querySelector('.gl-view__bar');
    const done = () => {
      el.hidden = true; this.open = false; this.busy = false;
      if (window.gsap) gsap.set([el, bar], { clearProps: 'all' });
    };
    if (RM || !window.gsap) return done();
    const tl = gsap.timeline({ onComplete: done });
    tl.to(bar, { opacity: 0, y: 16, duration: 0.3, ease: 'power2.in' }, 0);
    if (im && FIELD) {
      // whichever photograph is showing goes back into its own tile, re-cropping to a square on the way
      const t = this.asTile(im, FIELD.tile(this.idx));
      tl.to(im, { clipPath: t.clipPath, duration: 0.6, ease: 'power3.inOut' }, 0)
        .to(im, { x: t.x, y: t.y, scale: t.scale, duration: 0.9, ease: 'power4.inOut' }, 0.08);
    } else if (im) {
      tl.to(im, { scale: 0.94, opacity: 0, duration: 0.6, ease: 'power3.inOut' }, 0);
    }
    tl.to(el, { backgroundColor: 'rgba(252, 244, 236, 0)', backdropFilter: 'blur(0px)', duration: 0.55, ease: 'power2.in' }, 0.4);
  }
};
if (viewer.el) {
  viewer.el.querySelector('[data-vclose]').addEventListener('click', () => viewer.hide());
  viewer.el.querySelector('[data-vprev]').addEventListener('click', () => viewer.step(-1));
  viewer.el.querySelector('[data-vnext]').addEventListener('click', () => viewer.step(1));
  viewer.el.addEventListener('click', (e) => { if (e.target === viewer.el || e.target === viewer.fig) viewer.hide(); });
  window.addEventListener('keydown', (e) => {
    if (!viewer.open) return;
    if (e.key === 'Escape') viewer.hide();
    if (e.key === 'ArrowRight') viewer.step(1);
    if (e.key === 'ArrowLeft') viewer.step(-1);
  });
}

init();
