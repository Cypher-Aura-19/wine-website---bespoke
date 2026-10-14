// The first menu opening on a fresh page load, in a visible GPU window: dropped frames and the longest frame.
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: false, defaultViewport: null, args: ['--window-size=1456,1000'] });
  for (const path of ['/producers/', '/wines/', '/']) {
    const res = [];
    for (let k = 0; k < 3; k++) {
      const pg = await b.newPage();
      await pg.goto('http://localhost:8123' + path, { waitUntil: 'networkidle0' }); await sleep(path === '/' ? 8000 : 3500);
      await pg.evaluate(() => { window.__f = []; let last = performance.now(); window.__run = true; const loop = (t) => { window.__f.push(t - last); last = t; if (window.__run) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
      await pg.click('.nav__toggle'); await sleep(1500);
      res.push(await pg.evaluate(() => { window.__run = false; const f = window.__f.slice(1); return f.filter((x) => x > 34).length + '/' + f.length + ' max ' + Math.round(Math.max(...f)); }));
      await pg.close();
    }
    console.log(path.padEnd(12), res.join(' | '));
  }
  await b.close();
})();
