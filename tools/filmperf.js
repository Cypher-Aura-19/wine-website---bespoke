// Hero film: how long each canvas drawImage takes while scrolling, and the frame intervals.
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 60000, args: ['--hide-scrollbars', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
  for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
    const pg = await b.newPage();
    await pg.setViewport({ width: w, height: h, isMobile: mob, hasTouch: mob, deviceScaleFactor: mob ? 2 : 1 });
    await pg.goto('http://localhost:8123/', { waitUntil: 'networkidle0' });
    await sleep(8000);
    await pg.evaluate(() => {
      window.__ft = []; let last = performance.now();
      const loop = (t) => { window.__ft.push(t - last); last = t; requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      const c = document.querySelector('[data-film]'), ctx = c.getContext('2d'), orig = ctx.drawImage.bind(ctx);
      window.__d = [];
      ctx.drawImage = function () { const s = performance.now(); orig.apply(null, arguments); window.__d.push(performance.now() - s); };
    });
    console.log('instrumented', w); await pg.mouse.move(w / 2, h / 2);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < 50; i++) { await pg.mouse.wheel({ deltaY: 60 }); await sleep(33); }
      for (let i = 0; i < 50; i++) { await pg.mouse.wheel({ deltaY: -60 }); await sleep(33); }
    }
    await sleep(800);
    const r = await pg.evaluate(() => {
      const f = window.__ft.slice(2), s = [...f].sort((a, b) => a - b), d = [...window.__d].sort((a, b) => a - b);
      return { frames: f.length, p50: s[s.length >> 1].toFixed(1), p95: s[Math.floor(s.length * 0.95)].toFixed(1), over20: f.filter((x) => x > 20).length,
        draws: d.length, drawP50: d[d.length >> 1].toFixed(2), drawP95: d[Math.floor(d.length * 0.95)].toFixed(2), drawMax: d[d.length - 1].toFixed(1), slowDraws: d.filter((x) => x > 8).length,
        canvas: document.querySelector('[data-film]').width + 'x' + document.querySelector('[data-film]').height };
    });
    console.log(w, JSON.stringify(r));
    await pg.close();
  }
  await b.close();
})();
