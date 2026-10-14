const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tag = process.argv[2] || 'h';
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  for (const [w, h] of [[390, 844], [375, 667], [360, 780], [430, 932], [768, 1024]]) {
    const pg = await b.newPage(); await pg.setViewport({ width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await pg.goto('http://localhost:8123/', { waitUntil: 'networkidle0' }); await sleep(8000);
    await pg.screenshot({ path: 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/hero_' + tag + '_' + w + 'x' + h + '_0.png' });
    const len = await pg.evaluate(() => innerHeight * 2.6);
    await pg.evaluate((y) => window.scrollTo(0, y), Math.round(len * 0.55)); await sleep(2500);
    await pg.screenshot({ path: 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/hero_' + tag + '_' + w + 'x' + h + '_1.png' });
    await pg.close();
  }
  await b.close();
})();
