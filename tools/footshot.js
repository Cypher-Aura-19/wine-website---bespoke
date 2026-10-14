const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  for (const [w, h, s] of [[1440, 900, 'd'], [390, 844, 'm']]) {
    const pg = await b.newPage(); await pg.setViewport({ width: w, height: h, isMobile: s === 'm' });
    await pg.goto('http://localhost:8123/about/', { waitUntil: 'networkidle0' }); await sleep(1500);
    await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); } });
    await pg.evaluate(() => document.querySelector('.foot__top').scrollIntoView({ block: 'center' })); await sleep(1500);
    await pg.screenshot({ path: 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/foot_' + s + '.png' });
    console.log(s, await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth ? 'overflow' : 'ok'));
    await pg.close();
  }
  await b.close();
})();
