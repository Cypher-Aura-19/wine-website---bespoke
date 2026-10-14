// Wine pages at desktop and phone: first viewport after the opening, then the label section, then the end.
const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAGES = (process.argv[2] || 'adrian-serrano-joven-rioja-2023,alice-2023,andretta-brunello-di-montalcino-2016,chateau-peyredon-lagravette-blanc-2024').split(',');
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
  for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
    for (const p of PAGES) {
      const pg = await b.newPage();
      const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
      await pg.setViewport({ width: w, height: h, isMobile: mob, hasTouch: mob, deviceScaleFactor: 1 });
      await pg.goto('http://localhost:8123/wines/' + p + '/', { waitUntil: 'networkidle2' });
      await sleep(3800);
      const tag = p.slice(0, 18) + '_' + w;
      await pg.screenshot({ path: OUT + 'w_' + tag + '_0.png' });
      // two more cases: the slots refill and the count climbs
      const can = await pg.evaluate(() => !!document.querySelector('[data-step="1"]'));
      if (can) {
        await pg.evaluate(() => { document.querySelector('[data-step="1"]').click(); document.querySelector('[data-step="1"]').click(); });
        await sleep(350); await pg.screenshot({ path: OUT + 'w_' + tag + '_mid.png' });
        await sleep(1500); await pg.screenshot({ path: OUT + 'w_' + tag + '_1.png' });
      }
      await pg.evaluate(async () => { for (let k = 1; k <= 14; k++) { window.scrollTo(0, k * 70); await new Promise((r) => setTimeout(r, 50)); } });
      await sleep(1200);
      await pg.evaluate(async () => { const y = document.querySelector('.wn-detail').offsetTop - 60; const f = window.scrollY; for (let k = 1; k <= 12; k++) { window.scrollTo(0, f + (y - f) * k / 12); await new Promise((r) => setTimeout(r, 50)); } });
      await sleep(1600); await pg.screenshot({ path: OUT + 'w_' + tag + '_2.png' });
      await pg.evaluate(async () => { const y = (document.querySelector('.wn-more') || document.querySelector('.pd-next')).offsetTop - 40; const f = window.scrollY; for (let k = 1; k <= 12; k++) { window.scrollTo(0, f + (y - f) * k / 12); await new Promise((r) => setTimeout(r, 50)); } });
      await sleep(1600); await pg.screenshot({ path: OUT + 'w_' + tag + '_3.png' });
      const info = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: document.documentElement.clientWidth, bar: document.querySelector('[data-wnbar]') ? document.querySelector('[data-wnbar]').className : '-', count: document.querySelector('[data-bottles]') ? document.querySelector('[data-bottles]').textContent : '-', sum: document.querySelector('[data-sum]') ? document.querySelector('[data-sum]').textContent : '-' }));
      console.log(tag, JSON.stringify(info), errs.slice(0, 4));
      await pg.close();
    }
  }
  await b.close();
})();
