// Drives the site's cart in the real Chrome: add from a wine page and a mixed case, change cases, remove, the cart
// page, the empty state, and the checkout link. Never follows checkout (that is the live store).
const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
  const errs = [];
  const open = async (pg, url) => {
    await pg.goto('http://localhost:8123' + url, { waitUntil: 'networkidle2' });
    await sleep(2400);
  };
  const info = (pg) => pg.evaluate(() => ({
    stored: JSON.parse(localStorage.getItem('bw-cart') || '[]').map((i) => i.handle + ' x' + i.qty).join(', '),
    badge: (document.querySelector('[data-navcount]') || {}).textContent || '',
    checkout: (document.querySelector('[data-checkout]') || {}).href || '',
    drawerOpen: !!document.querySelector('.cd.is-open'),
  }));
  for (const mobile of [false, true]) {
    const pg = await b.newPage();
    if (mobile) await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    else await pg.setViewport({ width: 1440, height: 900 });
    pg.on('pageerror', (e) => errs.push('pageerror ' + e.message));
    pg.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
    const s = mobile ? 'm' : 'd';
    await open(pg, '/cart/');
    await pg.evaluate(() => localStorage.removeItem('bw-cart'));
    await open(pg, '/cart/');
    await pg.screenshot({ path: OUT + 'cart_empty_' + s + '.png' });

    await open(pg, '/wines/roka-2021/');
    await pg.click('[data-step="1"]'); await sleep(400);
    await pg.click('[data-add]'); await sleep(1100);
    console.log(s, 'after add', JSON.stringify(await info(pg)));
    await pg.screenshot({ path: OUT + 'cart_drawer_' + s + '.png' });
    await pg.keyboard.press('Escape'); await sleep(900);

    await open(pg, '/experiences/');
    await pg.evaluate(() => document.querySelector('.ex-buy button').scrollIntoView({ block: 'center' })); await sleep(900);
    await pg.click('.ex-buy button'); await sleep(1100);
    console.log(s, 'after case', JSON.stringify(await info(pg)));
    await pg.keyboard.press('Escape'); await sleep(900);

    await open(pg, '/cart/');
    await pg.screenshot({ path: OUT + 'cart_page_' + s + '.png' });
    await pg.click('.ct-page .ct-row [data-ctstep="1"]'); await sleep(500);
    console.log(s, 'after +1', JSON.stringify(await info(pg)), await pg.$eval('[data-ctcount]', (e) => e.textContent));
    await pg.click('.ct-page .ct-row:last-child [data-ctrm]'); await sleep(900);
    console.log(s, 'after remove', JSON.stringify(await info(pg)));
    await pg.screenshot({ path: OUT + 'cart_page2_' + s + '.png' });
    await pg.close();
  }
  // old store search link
  const pg = await b.newPage();
  await pg.goto('http://localhost:8123/search?q=barolo', { waitUntil: 'networkidle2' }); await sleep(1500);
  console.log('search redirect', pg.url(), await pg.$eval('[data-total]', (e) => e.textContent));
  console.log('ERRORS', errs.length ? errs.join('\n') : 'none');
  await b.close();
})();
