const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  for (const [w, h, s] of [[1440, 900, 'd'], [390, 844, 'm']]) {
    const pg = await b.newPage();
    await pg.setViewport({ width: w, height: h, isMobile: s === 'm', deviceScaleFactor: s === 'm' ? 2 : 1 });
    for (const u of ['/wines/gift-card-100-00/', '/wines/sauvignon-atlantique-2023/', '/wines/gift-bags/']) {
      await pg.goto('http://localhost:8123' + u, { waitUntil: 'networkidle0' }); await sleep(2500);
      await pg.screenshot({ path: OUT + 'drawn_' + s + u.split('/')[2] + '.png' });
    }
    await pg.goto('http://localhost:8123/wines/?q=gift', { waitUntil: 'networkidle0' }); await sleep(3000);
    await pg.screenshot({ path: OUT + 'drawn_' + s + '_shop.png' });
    const bad = await pg.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.complete && !i.naturalWidth && i.getBoundingClientRect().height).map((i) => i.src));
    console.log(s, 'broken images', bad.length);
    await pg.close();
  }
  await b.close();
})();
