// End-to-end test of the migrated shop: every collection page, every filter option, every sort, price, search,
// the address round trip, old store addresses, the Shop dropdown, and phone layout. Prints PASS/FAIL lines.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const BASE = 'http://localhost:8123';
const OUT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/tools/shots/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ROOT = 'C:/Users/HP/Desktop/Galvan ai projects/wine website/';
let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('FAIL', msg); } };

// expected members per collection, straight from the store's data and the site's own pages list
const COL = JSON.parse(fs.readFileSync(ROOT + 'tools/data/collections.json', 'utf8'));
const PAGES = ['red-wine', 'white-wine', 'rose-wine', 'sparkling-wine', 'skin-contact-orange-wine-white', 'dessert-wine', 'non-alcoholic', 'spirits', 'amaro', 'organic', 'bio-dynamic'];

(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--hide-scrollbars'] });
  const errs = [];
  const newPage = async (mobile) => {
    const pg = await b.newPage();
    if (mobile) await pg.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    else await pg.setViewport({ width: 1440, height: 900 });
    pg.on('pageerror', (e) => errs.push(pg.url() + ' pageerror ' + e.message));
    pg.on('console', (m) => { if (m.type() === 'error' && !/favicon|404 \(File not found\)/.test(m.text())) errs.push(pg.url() + ' console ' + m.text()); });
    pg.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url()) && !/\/(products|wines)\/[a-z0-9-]+\/?$/.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
    return pg;
  };
  const go = async (pg, url, wait = 1800) => { await pg.goto(BASE + url, { waitUntil: 'networkidle2' }); await sleep(wait); };
  const st = (pg) => pg.evaluate(() => {
    const vis = [...document.querySelectorAll('.sh-grid > .pcard')].filter((li) => !li.hidden);
    return {
      total: +(document.querySelector('[data-total]') || {}).textContent,
      shown: vis.length,
      handles: vis.map((li) => li.querySelector('a').getAttribute('href').split('/')[2]),
      url: location.pathname + location.search,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });

  // 1. Every collection page holds exactly what the store's collection holds -----------------------------------------
  const pg = await newPage(false);
  for (const h of PAGES) {
    await go(pg, '/collections/' + h + '/');
    const handlesOnPage = await pg.evaluate(() => [...document.querySelectorAll('.sh-grid > .pcard a.pcard__link')].map((a) => a.getAttribute('href').split('/')[2]));
    // every product the store lists in the collection must have its page here (directly, or as its one listed twin)
    const storeProducts = COL[h].products;
    const twins = await pg.evaluate(async (hs) => {
      const out = {};
      for (const x of hs) { const r = await fetch('/products/' + x + '/'); const t = await r.text(); const m = t.match(/url=([^"]+)"/); out[x] = m ? m[1] : null; }
      return out;
    }, storeProducts);
    const expected = [...new Set(Object.values(twins).filter((u) => u && u !== '/wines/').map((u) => u.split('/')[2]))];
    const missing = expected.filter((x) => !handlesOnPage.includes(x));
    const extra = handlesOnPage.filter((x) => !expected.includes(x));
    ok(!missing.length && !extra.length, h + ' membership: missing ' + missing.join(',') + ' extra ' + extra.join(','));
    if (!expected.length) {
      const txt = await pg.evaluate(() => document.querySelector('main').innerText);
      ok(/no .* on the list at the moment/i.test(txt), h + ' empty collection says so');
      continue;
    }
    const s0 = await st(pg);
    ok(s0.total === expected.length && s0.shown === expected.length, h + ' count ' + s0.total + '/' + s0.shown + ' expected ' + expected.length);
    ok(!s0.overflow, h + ' no horizontal overflow');
    console.log('collection', h, expected.length, 'ok');
  }

  // 2. Every filter option on every page: the count it shows is what you get, and every card shown has that value -------
  for (const path of ['/wines/', ...PAGES.map((h) => '/collections/' + h + '/')]) {
    await go(pg, path, 1500);
    const groups = await pg.evaluate(() => [...document.querySelectorAll('[data-drawer] [data-f]')].map((b) => ({ f: b.dataset.f, v: b.dataset.v, n: +b.querySelector('sup').textContent })));
    if (!groups.length) { console.log('filters', path, 'none (empty page)'); continue; }
    let checked = 0;
    for (const o of groups) {
      const r = await pg.evaluate(async (o) => {
        const btn = document.querySelector('[data-drawer] [data-f="' + o.f + '"][data-v="' + o.v + '"]');
        btn.click();
        await new Promise((r) => setTimeout(r, 450));
        const vis = [...document.querySelectorAll('.sh-grid > .pcard')].filter((li) => !li.hidden);
        const bad = vis.filter((li) => !(li.dataset[o.f] || '').split(' ').includes(o.v)).length;
        const total = +document.querySelector('[data-total]').textContent;
        const url = location.search;
        btn.click();                                     // and off again
        await new Promise((r) => setTimeout(r, 450));
        return { shown: vis.length, bad, total, url, after: +document.querySelector('[data-total]').textContent };
      }, o);
      ok(r.shown === o.n && r.total === o.n && r.bad === 0, path + ' filter ' + o.f + '=' + o.v + ' shows ' + r.shown + ' (count said ' + o.n + ', wrong cards ' + r.bad + ')');
      ok(r.url.includes(o.f + '=' + o.v), path + ' filter ' + o.f + '=' + o.v + ' written to the address (' + r.url + ')');
      checked++;
    }
    const facets = [...new Set(groups.map((g) => g.f))];
    console.log('filters', path, checked, 'options across', facets.join(','));
  }

  // 3. Sorts, price, stock, search, combined filters, the address round trip, clear --------------------------------------
  await go(pg, '/collections/red-wine/');
  for (const s of ['low', 'high', 'az', 'za', 'new', 'old', 'best']) {
    const r = await pg.evaluate(async (s) => {
      document.querySelector('[data-drawer] [data-sort="' + s + '"]').click();
      await new Promise((r) => setTimeout(r, 450));
      const vis = [...document.querySelectorAll('.sh-grid')].map((g) => [...g.children].filter((li) => !li.hidden).map((li) => ({ a: li.dataset.avail, p: +li.dataset.price, n: li.querySelector('.pcard__name').textContent, d: +li.dataset.date, i: +li.dataset.i })));
      return { vis, url: location.search };
    }, s);
    let good = true;
    for (const g of r.vis) {
      for (let k = 1; k < g.length; k++) {
        const x = g[k - 1], y = g[k];
        if (x.a !== y.a) { if (x.a === '0') good = false; continue; }            // sold out last
        if (s === 'low' && x.p && y.p && x.p > y.p) good = false;
        if (s === 'low' && !x.p && y.p) good = false;
        if (s === 'high' && x.p && y.p && x.p < y.p) good = false;
        if (s === 'az' && x.n.localeCompare(y.n) > 0) good = false;
        if (s === 'za' && x.n.localeCompare(y.n) < 0) good = false;
        if (s === 'new' && x.d < y.d) good = false;
        if (s === 'old' && x.d > y.d) good = false;
        if (s === 'best' && x.i > y.i) good = false;
      }
    }
    ok(good, 'red-wine sort ' + s + ' orders every chapter correctly');
    ok(s === 'best' ? !r.url.includes('sort=') : r.url.includes('sort=' + s), 'sort ' + s + ' in the address');
  }
  // price range
  let r = await pg.evaluate(async () => {
    const a = document.querySelector('[data-pmin]'), b = document.querySelector('[data-pmax]');
    a.value = '20'; a.dispatchEvent(new Event('change')); await new Promise((r) => setTimeout(r, 500));
    b.value = '30'; b.dispatchEvent(new Event('change')); await new Promise((r) => setTimeout(r, 500));
    const vis = [...document.querySelectorAll('.sh-grid > .pcard')].filter((li) => !li.hidden).map((li) => +li.dataset.price);
    const all = [...document.querySelectorAll('.sh-grid > .pcard')].map((li) => +li.dataset.price);
    return { vis, expect: all.filter((p) => p && p >= 20 && p <= 30).length, url: location.search, chip: [...document.querySelectorAll('.sh-chip')].map((c) => c.textContent).join('|') };
  });
  ok(r.vis.length === r.expect && r.vis.every((p) => p >= 20 && p <= 30), 'price $20 to $30: ' + r.vis.length + ' bottles, expected ' + r.expect);
  ok(/min=20/.test(r.url) && /max=30/.test(r.url) && /\$20 to \$30/.test(r.chip), 'price in address and chip (' + r.url + ' / ' + r.chip + ')');
  // combined with a country and stock, then reload: the same list comes back
  r = await pg.evaluate(async () => {
    const c = document.querySelector('[data-drawer] [data-f="country"]:not([disabled])'); c.click(); await new Promise((r) => setTimeout(r, 450));
    const sw = document.querySelector('[data-stock]'); sw.checked = true; sw.dispatchEvent(new Event('change')); await new Promise((r) => setTimeout(r, 450));
    return { url: location.pathname + location.search, total: +document.querySelector('[data-total]').textContent };
  });
  const before = await st(pg);
  await go(pg, r.url, 2600);
  const after = await st(pg);
  ok(after.total === before.total && after.handles.join() === before.handles.join(), 'reload of ' + r.url + ' gives the same ' + before.total + ' bottles');
  r = await pg.evaluate(async () => { document.querySelector('[data-active] .sh-active__clear, [data-drawer] [data-clear]').click(); await new Promise((r) => setTimeout(r, 500)); return { url: location.search, total: +document.querySelector('[data-total]').textContent, chips: document.querySelectorAll('.sh-chip').length }; });
  const full = await pg.evaluate(() => document.querySelectorAll('.sh-grid > .pcard').length);
  ok(r.total === full && r.chips === 0 && r.url === '', 'clear all returns to all ' + full + ' (' + r.url + ')');
  // search
  r = await pg.evaluate(async () => {
    const q = document.querySelector('[data-q]'); q.value = 'nebbiolo'; q.dispatchEvent(new Event('input')); await new Promise((r) => setTimeout(r, 900));
    const vis = [...document.querySelectorAll('.sh-grid > .pcard')].filter((li) => !li.hidden);
    return { n: vis.length, all: vis.every((li) => li.dataset.q.includes('nebbiolo')), url: location.search };
  });
  ok(r.n > 0 && r.all && r.url.includes('q=nebbiolo'), 'search "nebbiolo" on red: ' + r.n + ' bottles, all match');
  // the whole list's tabs: each collection tab shows that collection's members
  await go(pg, '/wines/');
  for (const h of ['red-wine', 'white-wine', 'rose-wine', 'sparkling-wine', 'skin-contact-orange-wine-white', 'non-alcoholic', 'spirits', 'amaro']) {
    const has = await pg.$('.sh-tab[data-type="' + h + '"]');
    if (!has) continue;
    r = await pg.evaluate(async (h) => {
      const t = document.querySelector('.sh-tab[data-type="' + h + '"]'); const n = +t.querySelector('sup').textContent; t.click();
      await new Promise((r) => setTimeout(r, 600));
      const vis = [...document.querySelectorAll('.sh-grid > .pcard')].filter((li) => !li.hidden);
      return { n, shown: vis.length, bad: vis.filter((li) => !li.dataset.cols.split(' ').includes(h)).length };
    }, h);
    const colPage = await (await fetch(BASE + '/collections/' + h + '/')).text();
    const colCount = (colPage.match(/<li class="pcard/g) || []).length;
    ok(r.shown === r.n && r.bad === 0 && r.n === colCount, '/wines/ tab ' + h + ' shows ' + r.shown + ', its collection page has ' + colCount);
  }
  // legacy address from earlier links
  await go(pg, '/wines/?type=red&country=france', 2400);
  r = await st(pg);
  ok(r.total > 0 && r.url.includes('type=red-wine'), 'old /wines/?type=red still works (' + r.url + ', ' + r.total + ')');

  // 4. The top bar's Shop menu, and following its links ---------------------------------------------------------------------
  await go(pg, '/about/');
  await pg.hover('.nav__link--shop'); await sleep(600);
  r = await pg.evaluate(() => { const d = document.querySelector('.nav__drop'); const cs = getComputedStyle(d); return { vis: cs.visibility, op: cs.opacity, links: [...d.querySelectorAll('a')].map((a) => a.getAttribute('href')) }; });
  ok(r.vis === 'visible' && +r.op > 0.9 && r.links.length === 15, 'Shop menu opens on hover with ' + r.links.length + ' links');
  await pg.screenshot({ path: OUT + 'mig_dropdown.png' });
  for (const href of r.links) {
    const res = await pg.evaluate(async (h) => (await fetch(h)).status, href);
    ok(res === 200, 'Shop menu link ' + href + ' loads (' + res + ')');
  }
  await pg.click('.nav__drop a[href="/collections/rose-wine/"]'); await sleep(2500);
  ok(pg.url().endsWith('/collections/rose-wine/'), 'clicking Rosé in the Shop menu opens it (' + pg.url() + ')');

  // 5. Old store addresses land in the right place ---------------------------------------------------------------------------
  const OLD = [['/collections/red-wine', '/collections/red-wine/'], ['/collections/frontpage', '/wines/'], ['/collections/all-wine', '/wines/'],
    ['/collections/mixed-packs', '/experiences/'], ['/collections/benedetti', '/producers/benedetti/'], ['/collections/menicucci', '/producers/luca-menicucci/'],
    ['/products/roka-2021', '/wines/roka-2021/'], ['/collections/red-wine/products/roka-2021', '/wines/roka-2021/'], ['/products/taxes', '/wines/'],
    ['/pages/about-us', '/about/'], ['/pages/contact', '/contact/'], ['/pages/faq', '/terms/#questions'], ['/pages/policies-terms-conditions', '/terms/'],
    ['/pages/bespoke-producers', '/producers/'], ['/pages/experiences', '/experiences/'], ['/pages/gallery', '/gallery/'], ['/search?q=barolo', '/wines/?q=barolo'],
    ['/collections/12-bottles-630ml', '/wines/']];
  for (const [from, to] of OLD) {
    await pg.goto(BASE + from, { waitUntil: 'networkidle2' }); await sleep(900);
    const u = new URL(pg.url());
    ok(u.pathname + u.search + u.hash === to, 'old ' + from + ' -> ' + u.pathname + u.search + u.hash + ' (want ' + to + ')');
  }
  await pg.close();

  // 6. Phone: every listing page, the floating filter button, the drawer, a filter -----------------------------------------
  const m = await newPage(true);
  for (const path of ['/wines/', '/collections/red-wine/', '/collections/non-alcoholic/', '/collections/amaro/', '/collections/organic/', '/collections/dessert-wine/', '/terms/']) {
    await go(m, path, 2200);
    r = await m.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, sw: document.documentElement.scrollWidth }));
    ok(!r.overflow, 'phone ' + path + ' no overflow (' + r.sw + ')');
    await m.screenshot({ path: OUT + 'mig_m' + path.replace(/\//g, '_') + '.png' });
  }
  await go(m, '/collections/red-wine/', 2200);
  await m.evaluate(() => window.scrollTo(0, 1400)); await sleep(1200);
  r = await m.evaluate(() => document.querySelector('.sh-fab').classList.contains('is-shown'));
  ok(r, 'phone floating Filter & sort shows over the list');
  await m.click('.sh-fab'); await sleep(1000);
  await m.screenshot({ path: OUT + 'mig_m_drawer.png' });
  r = await m.evaluate(async () => {
    const g = document.querySelector('[data-group="grape"] [data-more]'); if (g) g.click();
    const o = document.querySelector('[data-drawer] [data-f="grape"]:not([disabled])'); const n = +o.querySelector('sup').textContent; o.click();
    await new Promise((r) => setTimeout(r, 500));
    return { n, total: +document.querySelector('[data-total]').textContent, label: document.querySelector('[data-showlabel]').textContent };
  });
  ok(r.n === r.total && r.label.includes(String(r.n)), 'phone grape filter: ' + r.total + ' (' + r.label + ')');
  await m.screenshot({ path: OUT + 'mig_m_drawer2.png' });
  await m.close();

  // desktop screenshots of the main views
  const d = await newPage(false);
  for (const path of ['/collections/red-wine/', '/collections/amaro/', '/collections/dessert-wine/', '/wines/', '/terms/']) {
    await go(d, path, 2600); await d.screenshot({ path: OUT + 'mig_d' + path.replace(/\//g, '_') + '.png' });
  }
  await go(d, '/collections/white-wine/', 2000);
  await d.click('.sh-filterbtn'); await sleep(900);
  await d.screenshot({ path: OUT + 'mig_d_drawer.png' });
  await d.close();

  console.log('ERRORS', errs.length ? '\n' + [...new Set(errs)].slice(0, 20).join('\n') : 'none');
  console.log('PASS', passes, 'FAIL', fails);
  await b.close();
})();
