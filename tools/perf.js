// Where do animations stutter? Records frame intervals and main-thread long tasks (>50ms) through each moving
// part of the site: hero film, image spread, browse-by-style sweep, menu open, menu navigation, page-turn link.
const puppeteer = require('puppeteer-core');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'http://localhost:8123';
const INSTR = () => {
  window.__ft = []; window.__lt = [];
  let last = performance.now(); window.__fts = [];
  const loop = (t) => { window.__ft.push(t - last); window.__fts.push([t, t - last]); last = t; requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
};
// frames inside the reveal animation only (main.js marks it as window.__bwAnim = [start, end])
const ANIM = () => {
  const a = window.__bwAnim; if (!a) return 'no reveal recorded';
  const f = window.__fts.filter((x) => x[0] >= a[0] && x[0] <= a[1] + 50).map((x) => x[1]), s = [...f].sort((p, q) => p - q);
  return { revealMs: Math.round(a[1] - a[0]), frames: f.length, median: +(s[s.length >> 1] || 0).toFixed(1), max: +(s[s.length - 1] || 0).toFixed(0), janky: f.filter((x) => x > 34).length };
};
const READ = () => {
  const f = window.__ft.slice(2), s = [...f].sort((a, b) => a - b);
  const r = { frames: f.length, median: +(s[s.length >> 1] || 0).toFixed(1), p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(1), max: +(s[s.length - 1] || 0).toFixed(0), janky: f.filter((x) => x > 34).length, longTasks: window.__lt.slice(0, 12) };
  window.__ft = []; window.__lt = [];
  return r;
};
(async () => {
  const which = (process.argv[2] || 'all').split(',');
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage();
  await pg.setViewport({ width: 1440, height: 900 });
  await pg.evaluateOnNewDocument(INSTR);
  const wheel = async (n, dy, gap) => { for (let i = 0; i < n; i++) { await pg.mouse.wheel({ deltaY: dy }); await sleep(gap); } };

  if (which.includes('all') || which.includes('home')) {
    await pg.goto(BASE + '/', { waitUntil: 'networkidle0' });
    await sleep(800); console.log('home load+intro (first 0.8s)', JSON.stringify(await pg.evaluate(READ)));
    await sleep(6500); await pg.evaluate(READ);
    await pg.mouse.move(720, 450);
    await wheel(60, 60, 33); await sleep(800);
    console.log('hero film scroll   ', JSON.stringify(await pg.evaluate(READ)));
    const flowTop = await pg.evaluate(() => document.querySelector('[data-flow]').getBoundingClientRect().top + scrollY);
    await pg.evaluate((y) => window.bwLenis ? window.bwLenis.scrollTo(y, { immediate: true }) : scrollTo(0, y), flowTop - 10); await sleep(1200); await pg.evaluate(READ);
    await wheel(70, 60, 33); await sleep(800);
    console.log('image spread       ', JSON.stringify(await pg.evaluate(READ)));
    const pcTop = await pg.evaluate(() => document.querySelector('[data-pc]').getBoundingClientRect().top + scrollY);
    await pg.evaluate((y) => window.bwLenis ? window.bwLenis.scrollTo(y, { immediate: true }) : scrollTo(0, y), pcTop - 10); await sleep(1500); await pg.evaluate(READ);
    await wheel(90, 60, 33); await sleep(800);
    console.log('browse by style    ', JSON.stringify(await pg.evaluate(READ)));
  }
  if (which.includes('all') || which.includes('menu')) {
    await pg.goto(BASE + '/about/', { waitUntil: 'networkidle0' }); await sleep(2500); await pg.evaluate(READ);
    await pg.click('.nav__toggle'); await sleep(1600);
    console.log('menu open          ', JSON.stringify(await pg.evaluate(READ)));
    await pg.hover('.menu__link a[href="/producers/"]'); await sleep(900); await pg.evaluate(READ);
    await Promise.all([pg.waitForNavigation({ waitUntil: 'load' }), pg.click('.menu__link a[href="/producers/"]')]);
    await sleep(2600);
    console.log('menu -> producers  ', JSON.stringify(await pg.evaluate(ANIM)));
    await pg.evaluate(READ);
    await Promise.all([pg.waitForNavigation({ waitUntil: 'load' }), pg.evaluate(() => document.querySelector('a.pr-tile').click())]);
    await sleep(2600);
    console.log('page turn -> prod. ', JSON.stringify(await pg.evaluate(ANIM)));
    await Promise.all([pg.waitForNavigation({ waitUntil: 'load' }), pg.evaluate(() => document.querySelector('a[href="/wines/"]').click())]);
    await sleep(2600);
    console.log('page turn -> shop  ', JSON.stringify(await pg.evaluate(ANIM)));
  }
  await b.close();
})();
