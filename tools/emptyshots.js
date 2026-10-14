// Full-page screenshots of every empty or sparse state: gift items, producers with no wines, an empty collection,
// a filter with no results, the empty cart, a wine with no write-up.
const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = process.argv[2] || 'e';
const PAGES = ['/wines/gift-card-100-00/', '/wines/gift-bags/', '/producers/ottomani/', '/collections/dessert-wine/', '/wines/?q=zzzz', '/cart/', '/wines/sauvignon-atlantique-2023/'];
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
  for (const [w, h, s] of [[1440, 900, 'd'], [390, 844, 'm']]) {
    for (const u of PAGES) {
      const pg = await b.newPage();
      await pg.setViewport({ width: w, height: h, isMobile: s === 'm', deviceScaleFactor: 1 });
      await pg.goto('http://localhost:8123/', { waitUntil: 'domcontentloaded' });
      await pg.evaluate(() => localStorage.removeItem('bw-cart'));
      await pg.goto('http://localhost:8123' + u, { waitUntil: 'networkidle0' }); await sleep(2500);
      // scroll through so every reveal has run, then back to the top
      await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
      await sleep(1500);
      const name = u.replace(/[/?=]+/g, '_');
      await pg.screenshot({ path: OUT + tag + '_' + s + name + '.png', fullPage: true });
      await pg.close();
    }
  }
  await b.close();
})();
