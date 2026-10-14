const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = process.argv[2] || 'g';
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
  for (const [w, h, s] of [[1440, 900, 'd'], [390, 844, 'm']]) {
    for (const u of ['/wines/gift-card-100-00/', '/wines/gift-bags/']) {
      const pg = await b.newPage();
      await pg.setViewport({ width: w, height: h, isMobile: s === 'm', deviceScaleFactor: 1 });
      await pg.goto('http://localhost:8123' + u, { waitUntil: 'networkidle0' }); await sleep(2500);
      await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
      await sleep(1500);
      await pg.screenshot({ path: OUT + tag + '_' + s + u.split('/')[2] + '.png', fullPage: s === 'd' ? false : false });
      await pg.screenshot({ path: OUT + tag + '_' + s + u.split('/')[2] + '_full.png', fullPage: true });
      await pg.close();
    }
  }
  await b.close();
})();
