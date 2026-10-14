/* ==========================================================================
   Bespoke Wine & Spirits, listings: the whole list and every collection
   One state drives every card: the collection tab, the store's filters
   (type, farming, country, region, producer, grape, bottle size, bottles per
   case), price per bottle, stock, search and sort. It is read from and written
   to the address, so /collections/red-wine/?country=italy&grape=nebbiolo opens
   already filtered. Changing it: the visible cards fade out, the list settles,
   the new cards rise back in; counts follow, and any choice that would leave
   nothing is greyed out before it is chosen.
   ========================================================================== */
(function () {
  var html = document.documentElement;
  var RM = html.classList.contains('rm');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var list = $('[data-list]');
  if (!list) return;

  var NAMES = JSON.parse($('#sh-names').textContent);          // {facet: {slug: label}}
  var FACETS = Object.keys(NAMES);
  var cards = $$('.sh-grid > .pcard');
  var chapters = $$('[data-ch]');
  var grids = chapters.map(function (ch) { return $('[data-grid]', ch); });
  var tabs = $$('[data-tabs] button[data-type]'), tbar = $('[data-tbar]'), tabsEl = $('[data-tabs]');
  var bar = $('[data-shbar]');
  var drawer = $('[data-drawer]'), panel = $('[data-panel]');
  var fab = $('.sh-fab');
  var qInput = $('[data-q]');
  var pmin = $('[data-pmin]', drawer), pmax = $('[data-pmax]', drawer);
  var empty = $('[data-empty]'), active = $('[data-active]');
  var TYPES = tabs.map(function (b) { return b.dataset.type; });
  var optsBy = {}; FACETS.forEach(function (k) { optsBy[k] = $$('[data-f="' + k + '"]', drawer); });
  // the old addresses of the shop used short names for the collections
  var ALIAS = { red: 'red-wine', white: 'white-wine', rose: 'rose-wine', sparkling: 'sparkling-wine', orange: 'skin-contact-orange-wine-white' };
  var SORTS = ['best', 'low', 'high', 'az', 'za', 'new', 'old'];

  var state;
  function blank() {
    var f = {}; FACETS.forEach(function (k) { f[k] = []; });
    return { type: 'all', f: f, stock: false, q: '', sort: 'best', pmin: null, pmax: null };
  }

  /* State <-> address -------------------------------------------------------------------- */
  function read() {
    state = blank();
    var p = new URLSearchParams(location.search);
    var t = ALIAS[p.get('type')] || p.get('type');
    if (t && TYPES.indexOf(t) > -1) state.type = t;
    FACETS.forEach(function (k) {
      state.f[k] = (p.get(k) || '').split(',').filter(function (v) { return v && NAMES[k][v]; });
    });
    state.stock = p.get('stock') === '1';
    state.q = (p.get('q') || '').trim();
    state.sort = SORTS.indexOf(p.get('sort')) > -1 ? p.get('sort') : 'best';
    var a = parseFloat(p.get('min')), b = parseFloat(p.get('max'));
    state.pmin = a >= 0 ? a : null; state.pmax = b >= 0 ? b : null;
  }
  function write() {
    var p = new URLSearchParams();
    if (state.type !== 'all') p.set('type', state.type);
    FACETS.forEach(function (k) { if (state.f[k].length) p.set(k, state.f[k].join(',')); });
    if (state.pmin !== null) p.set('min', state.pmin);
    if (state.pmax !== null) p.set('max', state.pmax);
    if (state.stock) p.set('stock', '1');
    if (state.q) p.set('q', state.q);
    if (state.sort !== 'best') p.set('sort', state.sort);
    var s = p.toString().replace(/%2C/g, ',');
    history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }

  /* Matching ------------------------------------------------------------------------------ */
  var fold = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  cards.forEach(function (li) {
    li._q = fold(li.dataset.q);
    li._f = {}; FACETS.forEach(function (k) { li._f[k] = (li.dataset[k] || '').split(' ').filter(Boolean); });
    li._cols = (li.dataset.cols || '').split(' ');
    li._name = $('.pcard__name', li).textContent;
  });
  function fails(li) {
    var out = [];
    if (state.type !== 'all' && li._cols.indexOf(state.type) < 0) out.push('type');
    for (var i = 0; i < FACETS.length; i++) {
      var k = FACETS[i], sel = state.f[k];
      if (sel.length && !sel.some(function (v) { return li._f[k].indexOf(v) > -1; })) out.push(k);
    }
    var bp = +li.dataset.price;
    if ((state.pmin !== null && (!bp || bp < state.pmin)) || (state.pmax !== null && (!bp || bp > state.pmax))) out.push('price');
    if (state.stock && li.dataset.avail !== '1') out.push('stock');
    if (state.q) { var w = fold(state.q).split(/\s+/).filter(Boolean); for (var j = 0; j < w.length; j++) if (li._q.indexOf(w[j]) < 0) { out.push('q'); break; } }
    return out;
  }
  function order(a, b) {
    var x = a.dataset, y = b.dataset;
    if (x.avail !== y.avail) return x.avail === '1' ? -1 : 1;     // sold out stays last whatever the sort
    var s = state.sort;
    if (s === 'low' || s === 'high') {
      var pa = +x.price || Infinity, pb = +y.price || Infinity;   // "Ask us" prices sit at the end either way
      if (pa !== pb) { if (pa === Infinity) return 1; if (pb === Infinity) return -1; return s === 'low' ? pa - pb : pb - pa; }
    } else if (s === 'az' || s === 'za') {
      var c = a._name.localeCompare(b._name);
      if (c) return s === 'az' ? c : -c;
    } else if (s === 'new' || s === 'old') {
      var d = (+x.date) - (+y.date);
      if (d) return s === 'old' ? d : -d;
    }
    return +x.i - +y.i;
  }

  /* Drawing the result --------------------------------------------------------------------- */
  var UNIT = list.dataset.unit || 'bottle';      // the gifts page counts items
  var plural = function (n) { return n === 1 ? UNIT : UNIT + 's'; };
  var money = function (v) { return '$' + (Math.round(v) === v ? v : v.toFixed(2)); };
  function filterCount() {
    var n = (state.stock ? 1 : 0) + (state.sort !== 'best' ? 1 : 0) + (state.pmin !== null || state.pmax !== null ? 1 : 0);
    FACETS.forEach(function (k) { n += state.f[k].length; });
    return n;
  }

  function render() {
    var shown = 0, tcount = { all: 0 }, fcount = {};
    FACETS.forEach(function (k) { fcount[k] = {}; });
    cards.forEach(function (li) {
      var f = fails(li);
      li.hidden = f.length > 0; if (!f.length) shown++;
      if (!f.length || (f.length === 1 && f[0] === 'type')) {
        tcount.all++;
        li._cols.forEach(function (c) { tcount[c] = (tcount[c] || 0) + 1; });
      }
      FACETS.forEach(function (k) {
        if (!f.length || (f.length === 1 && f[0] === k)) li._f[k].forEach(function (v) { fcount[k][v] = (fcount[k][v] || 0) + 1; });
      });
    });
    grids.forEach(function (g) { $$('.pcard', g).sort(order).forEach(function (li) { g.appendChild(li); }); });
    var lastShown = null;
    chapters.forEach(function (ch) {
      var n = $$('.pcard', ch).filter(function (li) { return !li.hidden; }).length;
      ch.hidden = !n; ch.classList.remove('is-last');
      if (n) { $('[data-chcount]', ch).textContent = n; $('[data-chword]', ch).textContent = plural(n); lastShown = ch; }
    });
    if (lastShown) lastShown.classList.add('is-last');
    empty.hidden = shown > 0;
    $('[data-total]').textContent = shown;
    $('[data-totalword]').textContent = plural(shown);
    var sl = $('[data-showlabel]'); if (sl) sl.textContent = shown ? 'Show ' + shown + ' ' + plural(shown) : 'No bottles match';
    // each tab and each option counts what choosing it would show, given every other choice
    tabs.forEach(function (b) {
      var t = b.dataset.type, n = tcount[t] || 0;
      $('[data-tcount]', b).textContent = n;
      var on = t === state.type;
      b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on));
      b.disabled = !n && !on;
    });
    placeBar(false);
    $$('[data-sort]', drawer).forEach(function (b) { var on = b.dataset.sort === state.sort; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    FACETS.forEach(function (k) {
      var opts = optsBy[k]; if (!opts.length) return;
      opts.forEach(function (b) {
        var v = b.dataset.v, on = state.f[k].indexOf(v) > -1;
        var n = fcount[k][v] || 0;
        $('sup', b).textContent = n;
        b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on));
        b.disabled = !n && !on;
      });
    });
    $('[data-stock]', drawer).checked = state.stock;
    if (pmin && document.activeElement !== pmin) pmin.value = state.pmin === null ? '' : state.pmin;
    if (pmax && document.activeElement !== pmax) pmax.value = state.pmax === null ? '' : state.pmax;
    var fc = filterCount();
    $$('[data-fcount]').forEach(function (el) { el.hidden = !fc; el.textContent = fc; });
    if (qInput && document.activeElement !== qInput) qInput.value = state.q;
    drawActive();
    observe();
  }

  var escHtml = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function drawActive() {
    var chips = [];
    if (state.q) chips.push(['q', '', '“' + state.q + '”']);
    FACETS.forEach(function (k) { state.f[k].forEach(function (v) { chips.push([k, v, NAMES[k][v]]); }); });
    if (state.pmin !== null || state.pmax !== null) {
      chips.push(['price', '', state.pmin !== null && state.pmax !== null ? money(state.pmin) + ' to ' + money(state.pmax) + ' a bottle'
        : state.pmin !== null ? 'From ' + money(state.pmin) + ' a bottle' : 'Up to ' + money(state.pmax) + ' a bottle']);
    }
    if (state.stock) chips.push(['stock', '', 'Ready to ship']);
    active.hidden = !chips.length;
    active.innerHTML = chips.map(function (c) {
      return '<button type="button" class="sh-chip" data-rm="' + c[0] + '" data-v="' + escHtml(c[1]) + '" aria-label="Remove filter: ' + escHtml(c[2]) + '">' + escHtml(c[2]) + '<i aria-hidden="true"></i></button>';
    }).join('') + (chips.length > 1 ? '<button type="button" class="sh-active__clear" data-clear>Clear all</button>' : '');
  }

  /* Cards rise in as they reach the screen; ones already seen stay put ------------------------ */
  var io = null, queue = [], flush = null;
  if (!RM && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { queue.push(e.target); io.unobserve(e.target); } });
      if (!flush) flush = requestAnimationFrame(function () {
        queue.sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left; });
        queue.forEach(function (li, k) { li.style.setProperty('--d', Math.min(k, 8) * 0.07 + 's'); li.classList.add('is-in'); });
        queue = []; flush = null;
      });
    }, { rootMargin: '0px 0px -8% 0px' });
  } else {
    cards.forEach(function (li) { li.classList.add('is-in'); });
  }
  function observe() { if (io) cards.forEach(function (li) { if (!li.hidden && !li.classList.contains('is-in')) io.observe(li); }); }

  /* Changing the state: fade the visible cards, redraw, bring the new ones in --------------------- */
  var busy = null;
  function change(fn, opts) {
    fn();
    write();
    var scroll = opts && opts.scroll;
    var go = function () {
      cards.forEach(function (li) { li.classList.remove('is-in'); li.style.removeProperty('--d'); });
      render();
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      if (scroll) toList();
    };
    if (RM || !window.gsap) return go();
    var vis = cards.filter(function (li) { if (li.hidden) return false; var r = li.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
    if (busy) busy.kill();
    busy = gsap.to(vis, { opacity: 0, y: -12, duration: 0.22, ease: 'power2.in', onComplete: function () { gsap.set(vis, { clearProps: 'opacity,transform' }); busy = null; go(); } });
  }
  function toList() {
    var top = list.getBoundingClientRect().top + window.scrollY - (bar ? bar.offsetHeight : 0) - 8;
    if (window.scrollY > top + 4 || window.scrollY < top - innerHeight * 0.25) {
      if (window.bwLenis) window.bwLenis.scrollTo(top, { duration: 1.2, force: true });
      else window.scrollTo({ top: top, behavior: RM ? 'auto' : 'smooth' });
    }
  }

  /* The underline under the chosen tab; on phones the chosen tab scrolls to the middle */
  function placeBar(instant) {
    if (!tbar) return;
    var b = $('.sh-tab.is-on', tabsEl);
    if (!b) { tbar.style.opacity = '0'; return; }
    tbar.style.opacity = '';
    var x = b.offsetLeft, w = b.offsetWidth;
    if (tabsEl.scrollWidth > tabsEl.clientWidth + 2) tabsEl.scrollTo({ left: x + w / 2 - tabsEl.clientWidth / 2, behavior: instant || RM ? 'auto' : 'smooth' });
    if (window.gsap && !instant && !RM) gsap.to(tbar, { x: x, scaleX: w, duration: 0.55, ease: 'power3.inOut', overwrite: true });
    else { tbar.style.transform = 'translateX(' + x + 'px) scaleX(' + w + ')'; }
  }

  /* Controls -------------------------------------------------------------------------------- */
  tabs.forEach(function (b) { b.addEventListener('click', function () { if (b.dataset.type !== state.type) change(function () { state.type = b.dataset.type; }, { scroll: true }); }); });
  var qt = null;
  if (qInput) {
    qInput.addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(function () { change(function () { state.q = qInput.value.trim(); }); }, 260); });
    $('[data-search]').addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(qt); change(function () { state.q = qInput.value.trim(); }, { scroll: true }); qInput.blur(); });
  }
  var pt = null;
  function readPrice() {
    var a = parseFloat(pmin.value), b = parseFloat(pmax.value);
    a = a >= 0 ? a : null; b = b >= 0 ? b : null;
    if (a !== null && b !== null && a > b) { var t = a; a = b; b = t; }
    if (a === state.pmin && b === state.pmax) return;
    change(function () { state.pmin = a; state.pmax = b; });
  }
  [pmin, pmax].forEach(function (inp) {
    if (!inp) return;
    inp.addEventListener('input', function () { clearTimeout(pt); pt = setTimeout(readPrice, 500); });
    inp.addEventListener('change', function () { clearTimeout(pt); readPrice(); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(pt); readPrice(); } });
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-rm],[data-clear],[data-sort],[data-f],[data-more]');
    if (!t) return;
    if (t.hasAttribute('data-more')) {
      var g = t.closest('.sh-group'), open = g.classList.toggle('is-open');
      t.setAttribute('aria-expanded', String(open));
      t.textContent = open ? 'Show fewer' : 'Show all ' + $$('[data-f]', g).length;
      return;
    }
    if (t.hasAttribute('data-clear')) return change(function () { var keepType = state.type; state = blank(); state.type = keepType; });
    if (t.dataset.rm) {
      var k = t.dataset.rm, v = t.dataset.v;
      return change(function () {
        if (state.f[k]) state.f[k] = state.f[k].filter(function (x) { return x !== v; });
        else if (k === 'stock') state.stock = false;
        else if (k === 'price') { state.pmin = null; state.pmax = null; }
        else if (k === 'q') state.q = '';
      });
    }
    if (t.dataset.sort) return change(function () { state.sort = t.dataset.sort; });
    var f = t.dataset.f, val = t.dataset.v;
    change(function () { var i = state.f[f].indexOf(val); if (i > -1) state.f[f].splice(i, 1); else state.f[f].push(val); });
  });
  $('[data-stock]', drawer).addEventListener('change', function (e) { change(function () { state.stock = e.target.checked; }); });

  /* Drawer ------------------------------------------------------------------------------------ */
  var opener = null;
  function openDrawer(from) {
    opener = from || null;
    drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false');
    $$('[data-openf]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    if (window.bwLenis) window.bwLenis.stop();
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var f = $('.sh-drawer__x', drawer); if (f) f.focus({ preventScroll: true }); }, 60);
  }
  function closeDrawer() {
    if (!drawer.classList.contains('is-open')) return;
    if (pmin && (document.activeElement === pmin || document.activeElement === pmax)) { clearTimeout(pt); readPrice(); }
    drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true');
    $$('[data-openf]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    document.body.style.overflow = '';
    if (window.bwLenis) window.bwLenis.start();
    if (opener) opener.focus({ preventScroll: true });
  }
  $$('[data-openf]').forEach(function (b) { b.addEventListener('click', function () { openDrawer(b); }); });
  $$('[data-closef]', drawer).forEach(function (b) { b.addEventListener('click', closeDrawer); });
  document.addEventListener('keydown', function (e) {
    if (!drawer.classList.contains('is-open')) return;
    if (e.key === 'Escape') { closeDrawer(); return; }
    if (e.key === 'Tab') {   // keep focus inside the drawer while it is open
      var f = $$('button, input, a[href]', panel).filter(function (x) { return !x.disabled && x.offsetParent; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* The floating filter button appears once the list is reached, and steps aside for the footer */
  if (fab) {
    var foot = $('[data-foot]');
    var tick = function () {
      var y = list.getBoundingClientRect().top, fy = foot ? foot.getBoundingClientRect().top : Infinity;
      fab.classList.toggle('is-shown', y < innerHeight * 0.6 && fy > innerHeight * 0.85);
    };
    window.addEventListener('scroll', tick, { passive: true });
    tick();
  }

  function overflow() { if (tabsEl && innerWidth > 700) tabsEl.classList.toggle('is-overflow', tabsEl.scrollWidth > tabsEl.clientWidth + 2 && tabsEl.scrollLeft + tabsEl.clientWidth < tabsEl.scrollWidth - 2); }
  if (tabsEl) tabsEl.addEventListener('scroll', overflow, { passive: true });
  window.addEventListener('resize', function () { placeBar(true); overflow(); });
  window.addEventListener('popstate', function () { read(); render(); });

  read();
  if (location.search) write();            // old short names in the address are rewritten to the collection's own
  render();
  placeBar(true);
  overflow();
  if (location.search && filterCount() + (state.type !== 'all' ? 1 : 0) + (state.q ? 1 : 0)) {
    // arrived already filtered: open at the list once the page has settled
    window.addEventListener('load', function () { setTimeout(toList, 500); });
  }
})();
