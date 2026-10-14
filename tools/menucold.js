const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  for (const path of ['/producers/', '/wines/']) {
    const res = [];
    for (let k = 0; k < 4; k++) {
      const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: false, defaultViewport: null, args: ['--window-size=1456,1000'] });
      const pg = (await b.pages())[0];
      await pg.goto('http://localhost:8123' + path, { waitUntil: 'networkidle0' }); await sleep(4000);
      await pg.evaluate(() => { window.__f = []; let last = performance.now(); window.__run = true; const loop = (t) => { window.__f.push(t - last); last = t; if (window.__run) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
      await pg.click('.nav__toggle'); await sleep(1500);
      res.push(await pg.evaluate(() => { window.__run = false; const f = window.__f.slice(1); return f.filter((x) => x > 34).length + '/' + f.length + ' max ' + Math.round(Math.max(...f)); }));
      await b.close();
    }
    console.log(path.padEnd(12), res.join(' | '));
  }
})();
