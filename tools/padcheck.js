// "How we choose": at the end of the section, measure the space between the panel's last content and its edges.
const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
  for (const [w, h, mob] of [[1536, 730, 0], [1440, 900, 0], [1366, 650, 0], [1280, 720, 0], [1920, 1000, 0], [390, 844, 1], [375, 667, 1]]) {
    const pg = await b.newPage();
    await pg.setViewport({ width: w, height: h, isMobile: !!mob, hasTouch: !!mob, deviceScaleFactor: mob ? 2 : 1 });
    await pg.goto('http://localhost:8123/', { waitUntil: 'networkidle2' }); await sleep(7000);
    const top = await pg.evaluate(() => document.querySelector('[data-pc]').getBoundingClientRect().top + scrollY);
    await pg.evaluate(async (y) => { const from = scrollY, n = 20; for (let i = 1; i <= n; i++) { window.scrollTo(0, from + (y - from) * i / n); await new Promise((r) => setTimeout(r, 40)); } }, Math.round(top + 0.99 * h * 4.6));
    await sleep(1800);
    const r = await pg.evaluate(() => {
      const g = document.querySelector('[data-pcgrid]').getBoundingClientRect();
      const kids = [...document.querySelectorAll('[data-pcgrid] .pc-cell')].map((c) => c.getBoundingClientRect());
      const bottom = Math.max(...kids.map((k) => k.bottom)), right = Math.max(...[...document.querySelectorAll('[data-pcgrid] .pc-cell *')].map((e) => e.getBoundingClientRect().right));
      const topC = Math.min(...kids.map((k) => k.top));
      return { panel: [Math.round(g.left), Math.round(g.top), Math.round(g.right), Math.round(g.bottom)], gapBottom: Math.round(g.bottom - bottom), gapRight: Math.round(g.right - right), gapTop: Math.round(topC - g.top), vh: innerHeight };
    });
    const ok = r.gapBottom >= 24 && r.gapRight >= 16 && r.gapTop >= 16;
    console.log((ok ? 'OK  ' : 'BAD ') + w + 'x' + h, JSON.stringify(r));
    await pg.screenshot({ path: OUT + 'pad_' + w + 'x' + h + '.png' });
    await pg.close();
  }
  await b.close();
})();
