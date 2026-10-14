// Control: frame intervals on pages doing nothing, in a visible GPU window and in headless.
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  for (const headless of [false, 'new']) {
    const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless, defaultViewport: headless ? { width: 1440, height: 900 } : null, args: ['--window-size=1456,1000'] });
    for (const url of ['about:blank', 'http://localhost:8123/terms/', 'http://localhost:8123/producers/']) {
      const pg = await b.newPage();
      await pg.goto(url, { waitUntil: 'networkidle0' }); await sleep(2500);
      const r = await pg.evaluate(async () => { const f = []; let last = performance.now(); await new Promise((res) => { const loop = (t) => { f.push(t - last); last = t; if (f.length < 120) requestAnimationFrame(loop); else res(); }; requestAnimationFrame(loop); }); f.shift(); const s = [...f].sort((a, b) => a - b); return 'median ' + s[60].toFixed(1) + ' p95 ' + s[114].toFixed(1) + ' >34ms ' + f.filter((x) => x > 34).length + '/119'; });
      console.log(headless ? 'headless' : 'visible ', url.replace('http://localhost:8123', ''), r);
      await pg.close();
    }
    await b.close();
  }
})();
