const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900 });
  for (const [from, link] of [['/about/', '/producers/'], ['/producers/', '/gallery/'], ['/', '/contact/']]) {
    await pg.goto('http://localhost:8123' + from, { waitUntil: 'networkidle0' }); await sleep(from === '/' ? 7500 : 2000);
    await pg.click('.nav__toggle'); await sleep(1600);
    await pg.hover('.menu__link a[href="' + link + '"]'); await sleep(900);
    const want = await pg.$eval('.menu__link a[href="' + link + '"]', (a) => a.dataset.img.split('/').pop());
    // record every src the preview shows from the very first frames of the next page
    await pg.evaluateOnNewDocument(() => { window.__srcs = []; const t = setInterval(() => { const pv = document.querySelector('[data-preview]'); const i = pv && pv.querySelector('img:last-child'); if (pv && document.body) { const ent = document.documentElement.classList.contains('is-entering'); const s = ent ? (getComputedStyle(pv).backgroundImage.match(/([\w-]+\.jpg)/) || ['','(none)'])[1] : (i ? i.getAttribute('src').split('/').pop() : '(none)'); if (window.__srcs[window.__srcs.length - 1] !== s) window.__srcs.push(s); } }, 5); setTimeout(() => clearInterval(t), 3000); });
    await Promise.all([pg.waitForNavigation({ waitUntil: 'domcontentloaded' }), pg.click('.menu__link a[href="' + link + '"]')]);
    await sleep(1300);
    const seen = await pg.evaluate(() => window.__srcs);
    console.log(from, '->', link, 'clicked photo', want, '| preview showed', JSON.stringify(seen), seen.length === 1 && seen[0] === want ? 'OK' : 'CHANGED');
  }
  await b.close();
})();
