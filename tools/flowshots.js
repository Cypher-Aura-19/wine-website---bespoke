// The home page's image-spread section as it scrolls: the red field growing and the words turning white,
// then scrolling back up to check the colours return.
const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
  const errs = [];
  for (const [w, h, s] of [[1440, 900, 'd'], [390, 844, 'm']]) {
    const pg = await b.newPage();
    await pg.setViewport({ width: w, height: h, isMobile: s === 'm', hasTouch: s === 'm', deviceScaleFactor: s === 'm' ? 2 : 1 });
    pg.on('pageerror', (e) => errs.push(e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text()); });
    await pg.goto('http://localhost:8123/', { waitUntil: 'networkidle2' }); await sleep(7500);
    const top = await pg.evaluate(() => document.querySelector('[data-flow]').getBoundingClientRect().top + scrollY);
    const len = h * 3.6;
    const go = async (y) => { await pg.evaluate(async (y) => { const from = scrollY, n = 14; for (let i = 1; i <= n; i++) { window.scrollTo(0, from + (y - from) * i / n); await new Promise((r) => setTimeout(r, 45)); } }, y); await sleep(1500); };
    const read = () => pg.evaluate(() => {
      const t = document.querySelector('.flow-title .wc'), sub = document.querySelector('.flow-sub'), cv = document.querySelector('.flow .img.cover');
      return { title: getComputedStyle(t).color, sub: getComputedStyle(sub).color, cover: getComputedStyle(cv).backgroundColor, scale: cv.style.transform.match(/scale\(([^)]+)\)/) ? cv.style.transform.match(/scale\(([^)]+)\)/)[1] : '' };
    });
    const marks = [0.3, 0.5, 0.62, 0.72, 0.8, 0.9];
    for (const f of marks) {
      await go(Math.round(top + f * len));
      await pg.screenshot({ path: OUT + 'flow_' + s + '_' + Math.round(f * 100) + '.png' });
      console.log(s, f, JSON.stringify(await read()));
    }
    await go(Math.round(top + 0.4 * len));
    console.log(s, 'back to 0.4', JSON.stringify(await read()));
    await pg.screenshot({ path: OUT + 'flow_' + s + '_back.png' });
    await pg.close();
  }
  console.log('ERRORS', errs.join(' | ') || 'none');
  await b.close();
})();
