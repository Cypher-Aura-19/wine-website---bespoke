// Wheel-scrolls through the hero film and records frame times plus how long each canvas draw takes.
const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', '--enable-gpu-rasterization'] });
  for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
    const pg = await b.newPage();
    const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.setViewport({ width: w, height: h, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
    await pg.goto('http://localhost:8123/', { waitUntil: 'networkidle0' });
    await sleep(7000);
    await pg.evaluate(() => {
      window.__ft = []; let last = performance.now();
      const loop = (t) => { window.__ft.push(t - last); last = t; if (window.__ft.length < 100000) requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      const c = document.querySelector('[data-film]'), ctx = c.getContext('2d'), orig = ctx.drawImage.bind(ctx);
      window.__draw = 0;
      ctx.drawImage = function () { const s = performance.now(); orig.apply(null, arguments); window.__draw += performance.now() - s; };
    });
    await pg.mouse.move(w / 2, h / 2);
    for (let i = 0; i < 40; i++) { await pg.mouse.wheel({ deltaY: 70 }); await sleep(45); }
    await sleep(600);
    await pg.screenshot({ path: OUT + 'sm_' + w + '_mid.png' });
    for (let i = 0; i < 40; i++) { await pg.mouse.wheel({ deltaY: 70 }); await sleep(45); }
    await sleep(1500);
    await pg.screenshot({ path: OUT + 'sm_' + w + '_end.png' });
    for (let i = 0; i < 30; i++) { await pg.mouse.wheel({ deltaY: 120 }); await sleep(40); }
    await sleep(1500);
    await pg.screenshot({ path: OUT + 'sm_' + w + '_after.png' });
    const r = await pg.evaluate(() => {
      const f = window.__ft.slice(2), s = [...f].sort((a, b) => a - b);
      return { frames: f.length, median: s[s.length >> 1].toFixed(1), p95: s[Math.floor(s.length * 0.95)].toFixed(1), over33: f.filter((x) => x > 33).length, drawMsTotal: window.__draw.toFixed(0), canvas: document.querySelector('[data-film]').width + 'x' + document.querySelector('[data-film]').height, ml: document.querySelector('[data-ml]') && document.querySelector('[data-ml]').textContent, navPos: getComputedStyle(document.querySelector('[data-nav]')).position, navCls: document.querySelector('[data-nav]').className };
    });
    console.log(w, JSON.stringify(r), errs);
    await pg.close();
  }
  // nav over other pages, scrolled
  for (const p of ['/producers/', '/about/', '/contact/', '/producers/aleavini/']) {
    for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
      const pg = await b.newPage();
      await pg.setViewport({ width: w, height: h, isMobile: mob, hasTouch: mob, deviceScaleFactor: 1 });
      await pg.goto('http://localhost:8123' + p, { waitUntil: 'networkidle2' });
      await sleep(1500);
      await pg.evaluate(async () => { for (let k = 1; k <= 15; k++) { window.scrollTo(0, k * 90); await new Promise((r) => setTimeout(r, 60)); } });
      await sleep(1500);
      await pg.screenshot({ path: OUT + 'nav' + p.replace(/\//g, '_') + w + '.png' });
      await pg.close();
    }
  }
  await b.close();
})();
