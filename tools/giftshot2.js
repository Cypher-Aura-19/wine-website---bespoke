const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
  const errs = [];
  for (const [w, h, s] of [[1440, 900, 'd'], [390, 844, 'm']]) {
    for (const u of ['/wines/gift-card-100-00/', '/wines/valentines-day-web-promotion/', '/gifts/']) {
      const pg = await b.newPage();
      await pg.setViewport({ width: w, height: h, isMobile: s === 'm', deviceScaleFactor: 1 });
      pg.on('pageerror', (e) => errs.push(e.message));
      pg.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
      await pg.goto('http://localhost:8123' + u, { waitUntil: 'networkidle0' }); await sleep(2500);
      await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
      await sleep(1500);
      const tag = u.split('/').filter(Boolean).pop();
      await pg.screenshot({ path: OUT + 'g2_' + s + '_' + tag + '.png' });
      await pg.screenshot({ path: OUT + 'g2_' + s + '_' + tag + '_full.png', fullPage: true });
      if (u.includes('valentines') && s === 'd') {
        await pg.click('[data-add]'); await sleep(1200);
        await pg.screenshot({ path: OUT + 'g2_d_cartdrawer.png' });
      }
      await pg.close();
    }
  }
  console.log('ERRORS', errs.join(' | ') || 'none');
  await b.close();
})();
