// Scrolls the whole shop like a person would, then checks no visible card was left hidden; logs failed requests.
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
  for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
    const pg = await b.newPage();
    await pg.setViewport({ width: w, height: h, isMobile: mobile, hasTouch: mobile });
    const bad = [];
    pg.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
    await pg.goto('http://localhost:8123/wines/?type=red&country=france', { waitUntil: 'networkidle2' });
    await pg.goto('http://localhost:8123/wines/', { waitUntil: 'networkidle2' });
    await sleep(2000);
    const H = await pg.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += Math.round(h * 0.7)) { await pg.evaluate((y) => window.scrollTo(0, y), y); await sleep(140); }
    await sleep(1500);
    const r = await pg.evaluate(() => {
      const all = [...document.querySelectorAll('.sh-grid > .pcard')].filter((li) => !li.hidden);
      return { cards: all.length, notIn: all.filter((li) => !li.classList.contains('is-in')).length, faded: all.filter((li) => +getComputedStyle(li).opacity < 0.99).length,
        brokenImgs: [...document.querySelectorAll('.pcard__img')].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src) };
    });
    console.log(w, JSON.stringify(r), bad.filter((x) => !/favicon/.test(x)).join(' | ') || 'no failed requests (besides favicon)');
    await pg.close();
  }
  await b.close();
})();
