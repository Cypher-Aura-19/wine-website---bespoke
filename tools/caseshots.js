// Screenshots of every place the mixed cases appear, plus the menu's Mixed cases preview, desktop and phone.
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
    pg.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
    await pg.goto('http://localhost:8123/experiences/', { waitUntil: 'networkidle2' }); await sleep(2200);
    for (const id of ['sommeliers-choice', 'pretty-in-pink', 'pop-pour']) {
      await pg.evaluate((id) => { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); }, id);
      await sleep(1600);
      await pg.screenshot({ path: OUT + 'case_' + s + '_' + id + '.png' });
    }
    const imgs = await pg.evaluate(() => [...document.querySelectorAll('.ex-case__plate img')].map((i) => i.complete && i.naturalWidth > 0));
    console.log(s, 'case plates loaded', imgs.join(','));
    await pg.goto('http://localhost:8123/wines/viva-italia/', { waitUntil: 'networkidle2' }); await sleep(2400);
    await pg.screenshot({ path: OUT + 'case_' + s + '_product.png' });
    await pg.goto('http://localhost:8123/wines/', { waitUntil: 'networkidle2' }); await sleep(1500);
    await pg.evaluate(() => { const el = document.getElementById('cases'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 100); }); await sleep(1800);
    await pg.screenshot({ path: OUT + 'case_' + s + '_shop.png' });
    if (s === 'd') {
      await pg.goto('http://localhost:8123/about/', { waitUntil: 'networkidle2' }); await sleep(1500);
      await pg.click('.nav__toggle'); await sleep(1800);
      const a = await pg.$('.menu__link a[href="/experiences/"]');
      await a.hover(); await sleep(1200);
      await pg.screenshot({ path: OUT + 'case_menu.png' });
      console.log('menu preview', await pg.$eval('[data-preview] img', (i) => i.src.split('/').pop() + ' ' + i.naturalWidth));
    }
    await pg.close();
  }
  console.log('ERRORS', errs.join(' | ') || 'none');
  await b.close();
})();
