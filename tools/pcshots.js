// "Browse by style" on the home page as it scrolls: the needle sweeps, the circle opens, the "How we choose" grid.
const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = process.argv[2] || 'now';
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
  const errs = [];
  for (const [w, h, s] of [[1440, 900, 'd'], [390, 844, 'm']]) {
    const pg = await b.newPage();
    await pg.setViewport({ width: w, height: h, isMobile: s === 'm', hasTouch: s === 'm', deviceScaleFactor: s === 'm' ? 2 : 1 });
    pg.on('pageerror', (e) => errs.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text()); });
    await pg.goto('http://localhost:8123/', { waitUntil: 'networkidle2' }); await sleep(7500);
    const top = await pg.evaluate(() => document.querySelector('[data-pc]').getBoundingClientRect().top + scrollY);
    const len = h * 5.6;
    const go = async (y) => { await pg.evaluate(async (y) => { const from = scrollY, n = 16; for (let i = 1; i <= n; i++) { window.scrollTo(0, from + (y - from) * i / n); await new Promise((r) => setTimeout(r, 45)); } }, y); await sleep(1600); };
    for (const f of [0.35, 0.78, 0.86, 0.99]) {
      await go(Math.round(top + f * len));
      await pg.screenshot({ path: OUT + 'pc_' + tag + '_' + s + '_' + Math.round(f * 100) + '.png' });
    }
    const info = await pg.evaluate(() => ({ cta: document.querySelector('[data-pccta]').getAttribute('href'), overflow: document.documentElement.scrollWidth > innerWidth }));
    console.log(s, JSON.stringify(info));
    await pg.close();
  }
  console.log('ERRORS', errs.join(' | ') || 'none');
  await b.close();
})();
