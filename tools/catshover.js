// "Shop by country" on the home page: sweep the cursor quickly over every row and back, and count how many bottles
// are visible at the same time (must never be more than the one arriving and the one leaving, fading).
const puppeteer = require('puppeteer-core');
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: false, defaultViewport: null, args: ['--window-size=1456,1000'] });
  const pg = await b.newPage();
  await pg.goto('http://localhost:8123/', { waitUntil: 'networkidle0' }); await sleep(7500);
  await pg.evaluate(() => { const el = document.querySelector('[data-cats]'); window.scrollTo(0, el.getBoundingClientRect().top + scrollY + 200); });
  await sleep(2000);
  await pg.evaluate(() => {
    window.__maxVis = 0; window.__run = true;
    const frame = document.querySelector('.cats__frame');
    const loop = () => {
      const vis = [...frame.children].filter((c) => +getComputedStyle(c).opacity > 0.6).length;
      window.__maxVis = Math.max(window.__maxVis, vis);
      if (window.__run) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  const rows = await pg.$$eval('.cat__link', (ls) => ls.map((l) => { const r = l.getBoundingClientRect(); return [r.left + r.width * 0.3, r.top + r.height / 2]; }));
  for (let pass = 0; pass < 3; pass++) {
    for (const [x, y] of rows) await pg.mouse.move(x, y, { steps: 3 });
    for (const [x, y] of [...rows].reverse()) await pg.mouse.move(x + 40, y, { steps: 2 });
  }
  await sleep(150);
  await pg.screenshot({ path: OUT + 'cats_fast.png' });
  const fast = await pg.evaluate(() => ({ maxVisible: window.__maxVis, nodes: document.querySelector('.cats__frame').children.length }));
  await pg.mouse.move(rows[2][0], rows[2][1], { steps: 8 }); await sleep(1200);
  await pg.screenshot({ path: OUT + 'cats_rest.png' });
  const rest = await pg.evaluate(() => { window.__run = false; const f = document.querySelector('.cats__frame'); return { nodes: f.children.length, frameBg: getComputedStyle(f).backgroundColor, img: f.querySelector('img') && f.querySelector('img').getAttribute('src') }; });
  console.log('quick sweeps:', JSON.stringify(fast), ' at rest:', JSON.stringify(rest));
  await b.close();
})();
