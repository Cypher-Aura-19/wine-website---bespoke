// Which part of the menu animation costs frames? Opens and closes the menu on one page under variations.
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VARIANTS = {
  baseline: '',
  noPageMove: '.page { transform: none !important; }',
  noPreview: '.menu__preview { display: none !important; }',
  noClip: '.menu { clip-path: none !important; }',
  noShadowsBlur: '* { box-shadow: none !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }',
};
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
  const path = process.argv[2] || '/producers/';
  for (const [name, css] of Object.entries(VARIANTS)) {
    const pg = await b.newPage();
    await pg.setViewport({ width: 1440, height: 900 });
    await pg.goto('http://localhost:8123' + path, { waitUntil: 'networkidle0' }); await sleep(2500);
    if (css) await pg.addStyleTag({ content: css });
    const r = [];
    for (let k = 0; k < 2; k++) {
      for (const step of ['open', 'close']) {
        await pg.evaluate(() => { window.__f = []; let last = performance.now(); window.__run = true; const loop = (t) => { window.__f.push(t - last); last = t; if (window.__run) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
        await pg.click('.nav__toggle'); await sleep(1500);
        r.push(await pg.evaluate(() => { window.__run = false; const f = window.__f.slice(1); return f.filter((x) => x > 34).length + '/' + f.length + ' max ' + Math.round(Math.max(...f)); }));
      }
    }
    console.log(name.padEnd(14), r.join(' | '));
    await pg.close();
  }
  await b.close();
})();
