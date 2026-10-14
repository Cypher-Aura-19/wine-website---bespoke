// The About page as it scrolls: the red field widening with the statement inking to white, and the bottle strip.
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
    pg.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text()); });
    await pg.goto('http://localhost:8123/about/', { waitUntil: 'networkidle2' }); await sleep(2500);
    const top = await pg.evaluate(() => document.querySelector('.ab-field').getBoundingClientRect().top + scrollY);
    const steps = [0.15, 0.45, 0.75, 1.0, 1.25].map((f) => Math.round(top - h + f * h));
    for (let k = 0; k < steps.length; k++) {
      await pg.evaluate(async (y) => { const from = scrollY, n = 10; for (let i = 1; i <= n; i++) { window.scrollTo(0, from + (y - from) * i / n); await new Promise((r) => setTimeout(r, 50)); } }, steps[k]);
      await sleep(1200);
      await pg.screenshot({ path: OUT + 'about_' + s + '_field' + k + '.png' });
    }
    const ink = await pg.evaluate(() => { const w = [...document.querySelectorAll('.ab-say__text .wd')]; return [getComputedStyle(w[0]).color, getComputedStyle(w[w.length - 1]).color]; });
    console.log(s, 'first/last word colour after scrolling past', ink.join(' / '));
    // the bottle strip: where it sits as it passes through the screen
    const st = await pg.evaluate(() => { const e = document.querySelector('.ab-shelf'); return e.getBoundingClientRect().top + scrollY; });
    const xs = [];
    for (const f of [0, 0.5, 1]) {
      await pg.evaluate((y) => window.scrollTo(0, y), Math.round(st - h + f * (h + 400))); await sleep(1300);
      xs.push(await pg.evaluate(() => Math.round(document.querySelector('[data-drift]').getBoundingClientRect().left)));
      if (f === 0.5) await pg.screenshot({ path: OUT + 'about_' + s + '_shelf.png' });
    }
    const over = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    console.log(s, 'bottle strip left edge while passing', xs.join(' -> '), 'overflow', over);
    await pg.close();
  }
  console.log('ERRORS', errs.join(' | ') || 'none');
  await b.close();
})();
