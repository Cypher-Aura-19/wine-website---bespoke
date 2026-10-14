// Drives the real Chrome through every page at desktop and phone sizes: errors, overflow, stuck reveals, screenshots.
const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
require('fs').mkdirSync(OUT, { recursive: true });
const PAGES = (process.argv[2] || '/,/about/,/contact/,/producers/,/producers/aleavini/,/gallery/').split(',');
const SIZES = (process.argv[3] || 'd,m').split(',');
const SHOTS = +(process.argv[4] || 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
  for (const s of SIZES) {
    for (const p of PAGES) {
      const pg = await b.newPage();
      if (s === 'd') await pg.setViewport({ width: 1440, height: 900 });
      else await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const errs = [];
      pg.on('pageerror', (e) => errs.push('pageerror ' + e.message));
      pg.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
      pg.on('requestfailed', (r) => errs.push('failed ' + r.url()));
      pg.on('response', (r) => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url()); });
      await pg.goto('http://localhost:8123' + p, { waitUntil: 'networkidle2' });
      await sleep(p === '/' ? 6500 : 2500);
      const name = (p.replace(/\//g, '_') || 'home') + s;
      const H = await pg.evaluate(() => document.documentElement.scrollHeight);
      const vh = s === 'd' ? 900 : 844;
      for (let i = 0; i < SHOTS; i++) {
        const y = Math.round((H - vh) * i / Math.max(1, SHOTS - 1));
        // scroll in steps so scroll-driven effects run as they would for a person
        await pg.evaluate(async (y) => {
          const from = window.scrollY, n = 12;
          for (let k = 1; k <= n; k++) { window.scrollTo(0, from + (y - from) * k / n); await new Promise((r) => setTimeout(r, 60)); }
        }, y);
        await sleep(1600);
        await pg.screenshot({ path: OUT + name + i + '.png' });
      }
      const info = await pg.evaluate(() => {
        const vw = document.documentElement.clientWidth, wide = [];
        document.querySelectorAll('body *').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width && (r.right > vw + 1 || r.left < -1)) {
            let clipped = false, a = el.parentElement;
            while (a && a !== document.body) { const o = getComputedStyle(a).overflowX; if (o === 'hidden' || o === 'clip' || o === 'auto') { clipped = true; break; } a = a.parentElement; }
            if (!clipped && getComputedStyle(el).position !== 'fixed') wide.push((el.className && el.className.baseVal === undefined ? el.className : el.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
          }
        });
        const stuck = [];
        document.querySelectorAll('[data-reveal],[data-lines] .line__in,[data-ink],[data-tile],.pcard').forEach((el) => {
          const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
          if ((+cs.opacity < 0.99) && r.height) stuck.push((el.className || el.tagName) + ' op=' + cs.opacity);
        });
        return { sw: document.documentElement.scrollWidth, vw, wide: wide.slice(0, 8), stuck: stuck.slice(0, 8), stuckN: stuck.length, lenis: document.documentElement.className };
      });
      console.log(name, JSON.stringify(info), errs.length ? '\n  ERR ' + errs.slice(0, 6).join('\n  ERR ') : '');
      await pg.close();
    }
  }
  await b.close();
})();
