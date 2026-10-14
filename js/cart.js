/* ==========================================================================
   Bespoke Wine & Spirits, the cart
   The cart lives on this site: adding a wine keeps it in this browser, a
   blush drawer slides in to show it, and /cart/ shows it in full. Checkout
   hands the whole cart to the Shopify store in one link
   (/cart/<variant>:<qty>,...), which opens the store's own secure checkout.
   ========================================================================== */
(function () {
  var html = document.documentElement;
  var RM = html.classList.contains('rm');
  var SHOP = 'https://bespokewineandspirits.com';
  var KEY = 'bw-cart';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var cad = function (v) {
    var whole = Math.abs(v - Math.round(v)) < 0.005;
    return '$' + v.toLocaleString('en-CA', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
  };

  /* Store ------------------------------------------------------------------------------ */
  var items = [];
  function load() { try { items = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { items = items || []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} draw(); }
  function count() { return items.reduce(function (s, i) { return s + i.qty; }, 0); }
  function total() { return items.reduce(function (s, i) { return s + i.qty * i.price; }, 0); }
  function find(id) { for (var k = 0; k < items.length; k++) if (items[k].id === id) return items[k]; return null; }
  function add(it, qty) {
    var have = find(it.id);
    if (have) have.qty = Math.min(99, have.qty + qty); else { it.qty = Math.min(99, qty); items.push(it); }
    save();
  }
  function setQty(id, q) {
    var it = find(id); if (!it) return;
    if (q <= 0) items = items.filter(function (x) { return x.id !== id; }); else it.qty = Math.min(99, q);
    save();
  }
  function checkoutUrl() { return SHOP + '/cart/' + items.map(function (i) { return i.id + ':' + i.qty; }).join(','); }

  /* Rows: one renderer for the drawer and the cart page -------------------------------------- */
  function isCase(i) { return i.n > 1 || i.maker === 'Mixed case'; }
  function unitText(i) { return i.n > 1 ? 'Case of ' + i.n + ' · ' + cad(i.price) : i.maker === 'Mixed case' ? 'Mixed case · ' + cad(i.price) : cad(i.price) + ' each'; }
  function row(i) {
    var pic = i.img ? '<img src="' + esc(i.img) + '" alt="" loading="lazy" decoding="async"' + (i.pic ? ' class="is-pic"' : i.photo ? ' class="is-photo"' : '') + '>' : '<i class="ct-row__blank" aria-hidden="true"></i>';
    var qtyWord = isCase(i) ? (i.qty === 1 ? 'case' : 'cases') : (i.qty === 1 ? 'item' : 'items');
    return '<li class="ct-row" data-id="' + i.id + '">' +
      '<a class="ct-row__plate" href="/wines/' + esc(i.handle) + '/" tabindex="-1" aria-hidden="true">' + pic + '</a>' +
      '<div class="ct-row__main">' +
        '<p class="ct-row__maker">' + esc(i.maker) + '</p>' +
        '<a class="ct-row__name" href="/wines/' + esc(i.handle) + '/">' + esc(i.title) + '</a>' +
        '<p class="ct-row__unit">' + unitText(i) + '</p>' +
        '<div class="ct-row__acts">' +
          '<div class="ct-qty"><button type="button" data-ctstep="-1" aria-label="One ' + (isCase(i) ? 'case' : 'item') + ' fewer of ' + esc(i.title) + '">&minus;</button>' +
          '<span aria-live="polite"><b>' + i.qty + '</b> ' + qtyWord + '</span>' +
          '<button type="button" data-ctstep="1" aria-label="One ' + (isCase(i) ? 'case' : 'item') + ' more of ' + esc(i.title) + '"' + (i.qty >= 99 ? ' disabled' : '') + '>+</button></div>' +
          '<button type="button" class="ct-row__rm" data-ctrm>Remove</button>' +
        '</div>' +
      '</div>' +
      '<p class="ct-row__sum">' + cad(i.qty * i.price) + (i.n > 1 ? '<small>' + i.qty * i.n + ' bottles</small>' : '') + '</p>' +
    '</li>';
  }
  function summary() {
    var c = count(), cases = items.every(isCase);
    var word = cases ? (c === 1 ? 'case' : 'cases') : (c === 1 ? 'item' : 'items');
    return '<div class="ct-sum__line"><span>Subtotal · ' + c + ' ' + word + '</span><b>' + cad(total()) + '</b></div>' +
      '<p class="ct-sum__note">HST and bottle deposit are added at checkout. Delivery is free within the GTA and arrives in 2 to 3 business days.</p>';
  }
  function empty(where) {
    return '<div class="ct-empty"><p class="ct-empty__title">Your cart is empty</p><p>Wines are sold by the case and delivered across Ontario.</p>' +
      '<div class="ct-empty__acts"><a class="btn btn--wine" href="/wines/">Browse the wines<i class="ico ico--arrow" aria-hidden="true"></i></a>' +
      (where === 'page' ? '<a class="ct-link" href="/experiences/">See the mixed cases</a>' : '') + '</div></div>';
  }

  /* Drawer ------------------------------------------------------------------------------ */
  var drawer = null, opener = null;
  function build() {
    drawer = document.createElement('aside');
    drawer.className = 'cd'; drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-labelledby', 'cd-title'); drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = '<div class="cd__shade" data-cdclose></div><div class="cd__panel">' +
      '<div class="cd__head"><h2 class="cd__title" id="cd-title">Your cart</h2><button type="button" class="cd__x" data-cdclose>Close</button></div>' +
      '<p class="cd__added" data-cdadded role="status" aria-live="polite"></p>' +
      '<div class="cd__body" data-lenis-prevent><ul class="ct-list" data-cdlist></ul><div data-cdempty></div></div>' +
      '<div class="cd__foot" data-cdfoot><div class="ct-sum" data-cdsum></div>' +
      '<div class="cd__acts"><a class="ct-link" href="/cart/">View cart</a><a class="btn btn--wine" data-checkout href="#">Checkout<i class="ico ico--arrow" aria-hidden="true"></i></a></div></div>' +
    '</div>';
    document.body.appendChild(drawer);
    $$('[data-cdclose]', drawer).forEach(function (b) { b.addEventListener('click', close); });
    // following a link inside the drawer closes it first, so the page turn plays over a clear page
    drawer.addEventListener('click', function (e) { var a = e.target.closest('a[href]'); if (a && !a.hasAttribute('data-checkout')) close(true); });
  }
  function open(from, note) {
    if (!drawer) build();
    draw();
    opener = from || document.activeElement;
    $('[data-cdadded]', drawer).textContent = note || '';
    drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false');
    if (window.bwLenis) window.bwLenis.stop();
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('.cd__x', drawer).focus({ preventScroll: true }); }, 60);
  }
  function close(silent) {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (window.bwLenis) window.bwLenis.start();
    if (!silent && opener && opener.focus) opener.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', function (e) {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    if (e.key === 'Escape') return close();
    if (e.key === 'Tab') {
      var f = $$('button, a[href]', $('.cd__panel', drawer)).filter(function (x) { return !x.disabled && x.offsetParent; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* Drawing every view of the cart ---------------------------------------------------------------- */
  var page = $('[data-cartpage]');
  function draw() {
    var c = count();
    html.classList.toggle('has-cart', c > 0);
    // the count rides on the top bar's Cart link, and on the menu's
    $$('[data-navcount]').forEach(function (b) { b.innerHTML = c + '<span class="sr-only"> in cart</span>'; b.hidden = !c; });
    $$('.menu__social a[href$="/cart"], .menu__social a[href="/cart/"]').forEach(function (a) { a.setAttribute('href', '/cart/'); a.textContent = c ? 'Cart (' + c + ')' : 'Cart'; });
    var url = checkoutUrl();
    $$('[data-checkout]').forEach(function (a) { a.href = url; });
    if (drawer) {
      $('[data-cdlist]', drawer).innerHTML = items.map(row).join('');
      $('[data-cdempty]', drawer).innerHTML = c ? '' : empty('drawer');
      $('[data-cdsum]', drawer).innerHTML = summary();
      $('[data-cdfoot]', drawer).hidden = !c;
    }
    if (page) {
      $('[data-ctlist]', page).innerHTML = items.map(row).join('');
      $('[data-ctempty]', page).innerHTML = c ? '' : empty('page');
      $('[data-ctsum]', page).innerHTML = summary();
      $('[data-ctside]', page).hidden = !c;
      page.classList.toggle('is-empty', !c);
      var n = $('[data-ctcount]'), allCases = items.every(isCase);
      if (n) n.textContent = c ? c + ' ' + (allCases ? (c === 1 ? 'case' : 'cases') : (c === 1 ? 'item' : 'items')) + ' · ' + cad(total()) : 'Nothing in it yet';
    }
  }

  // steppers and remove, wherever a row is shown
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-ctstep],[data-ctrm]'); if (!t) return;
    var r = t.closest('.ct-row'), id = +r.dataset.id, it = find(id); if (!it) return;
    if (t.hasAttribute('data-ctrm')) {
      var go = function () { setQty(id, 0); };
      if (RM || !window.gsap) return go();
      gsap.to(r, { opacity: 0, x: 24, duration: 0.3, ease: 'power2.in', onComplete: go });
      return;
    }
    var keep = t.dataset.ctstep;
    setQty(id, it.qty + parseInt(keep, 10));
    var again = $('.ct-row[data-id="' + id + '"] [data-ctstep="' + keep + '"]', r.parentNode);
    if (again) again.focus({ preventScroll: true });
  });

  /* Adding: every buy form on the site ------------------------------------------------------------- */
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-cartadd]'); if (!f) return;
    e.preventDefault();
    var d = f.dataset, q = parseInt(($('[name="quantity"]', f) || {}).value, 10) || 1;
    add({ id: +d.id, handle: d.handle, title: d.title, maker: d.maker, img: d.img, photo: d.photo === '1', pic: d.photo === '2', price: parseFloat(d.price), n: parseInt(d.n, 10) || 1 }, q);
    var l = $('[data-addlabel]', f) || $('button[type="submit"] span', f);
    f.removeAttribute('aria-busy');
    if (l) { var was = l.dataset.was || l.textContent; l.dataset.was = was; l.textContent = 'Added to cart'; setTimeout(function () { l.textContent = was; }, 1800); }
    var unitWord = (parseInt(d.n, 10) || 1) > 1 ? (q === 1 ? 'case' : 'cases') : (q === 1 ? 'item' : 'items');
    open(e.submitter || $('button[type="submit"]', f), 'Added ' + q + ' ' + unitWord + ' of ' + d.title + '.');
  });

  // the cart in another tab changed
  window.addEventListener('storage', function (e) { if (e.key === KEY) { load(); draw(); } });

  // the top bar's Shop and Cart mark the section being read
  var here = location.pathname;
  var inShop = /^\/(wines|collections|experiences)\//.test(here);
  $$('[data-navlinks] .nav__link').forEach(function (a) { var h = a.getAttribute('href'); if (h === '/cart/' ? here === '/cart/' : inShop) a.setAttribute('aria-current', 'page'); });
  $$('.nav__col a').forEach(function (a) { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });

  load();
  draw();
})();
