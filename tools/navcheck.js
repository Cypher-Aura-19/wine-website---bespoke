// Phone and desktop check of the top bar (Shop, Cart with a count, Menu) over sticky bars, and no overlaps.
const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
  const errs = [];
  for (const [w, h, s] of [[390, 844, 'm'], [1024, 768, 't'], [1440, 900, 'd']]) {
    const pg = await b.newPage();
    await pg.setViewport({ width: w, height: h, isMobile: s === 'm', hasTouch: s === 'm', deviceScaleFactor: s === 'm' ? 2 : 1 });
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto('http://localhost:8123/', { waitUntil: 'domcontentloaded' });
    await pg.evaluate(() => localStorage.setItem('bw-cart', JSON.stringify([{ id: 47951162048829, handle: 'roka-2021', title: 'Roka 2021', maker: 'Kristinus', img: '/assets/wines/roka-2021.webp', price: 300, n: 12, qty: 2 }])));
    for (const [url, scroll] of [['/wines/?type=red', 1], ['/producers/', 1600], ['/about/', 0], ['/', 0]]) {
      await pg.goto('http://localhost:8123' + url, { waitUntil: 'networkidle2' });
      await sleep(url === '/' ? 7000 : 2600);
      if (scroll > 1) { await pg.evaluate((y) => window.scrollTo(0, y), scroll); await sleep(1500); }
      const r = await pg.evaluate(() => {
        const box = (el) => el && el.getBoundingClientRect();
        const cart = box(document.querySelector('[data-navcart]')), menu = box(document.querySelector('.nav__toggle span'));
        // anything of a sticky bar sitting under Cart or Shop?
        const links = [...document.querySelectorAll('.nav__link')].filter((a) => a.offsetParent).map(box);
        const clash = [...document.querySelectorAll('.sh-tab, .sh-bar__side > *, .pr-chip')].filter((el) => {
          const r = el.getBoundingClientRect(); if (!r.width || r.top > 120) return false;
          const op = parseFloat(getComputedStyle(el.closest('.sh-tabs, .pr-index__in, .sh-bar__side') ).opacity || 1);
          return links.some((l) => r.left < l.right && r.right > l.left && r.top < l.bottom && r.bottom > l.top) && op > 0;
        }).map((el) => el.textContent.trim());
        return { count: document.querySelector('[data-navcount]').textContent, cartX: Math.round(cart.left), menuX: Math.round(menu.left), shop: getComputedStyle(document.querySelector('.nav__link--shop')).display, overflow: document.documentElement.scrollWidth > innerWidth, clash };
      });
      console.log(s, url, JSON.stringify(r));
      await pg.screenshot({ path: OUT + 'nav_' + s + url.replace(/[/?=]/g, '_') + '.png' });
    }
    await pg.close();
  }
  console.log('ERRORS', errs.join(' | ') || 'none');
  await b.close();
})();
