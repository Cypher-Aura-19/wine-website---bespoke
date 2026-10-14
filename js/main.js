/* ==========================================================================
   Bespoke landing page: motion
   Nothing pins or hijacks scroll. Each effect has one job:
     hero      a slow-motion pour, scrubbed frame by frame by scroll
     titles    lines rise out of a mask as they enter (reading pace)
     cards     a short fade-up, left to right (arrival)
     images    open from an edge, then drift slightly (depth)
     numbers   count up once (emphasis)
     rows      fill with oxblood on hover (feedback)
     wines     the grape cluster drops onto the title, tabs swap the shelf
   Only transform, opacity and one clip-path animate.
   ========================================================================== */
(function () {
  var html = document.documentElement;
  var RM = html.classList.contains('rm');
  // set when this page was opened from the menu of another page: it arrives with that menu still open
  var ENTER = html.classList.contains('is-entering');
  // set when this page was reached through an ordinary link: it arrives under the page-turn panel
  var TURN = html.classList.contains('is-turning');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  gsap.registerPlugin(ScrollTrigger, SplitText);

  var nav = $('[data-nav]');

  /* Smooth scroll ----------------------------------------------------------------- */
  var lenis = null;
  if (!RM && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.bwLenis = lenis;   // the shop's filters scroll with it
  }

  // the fixed bar tightens once the page has moved
  if (nav) {
    var navScrolled = function () { nav.classList.toggle('is-scrolled', window.scrollY > 24); };
    window.addEventListener('scroll', navScrolled, { passive: true });
    navScrolled();
  }

  /* Fit giant type to the viewport width ---------------------------------------------- */
  function fit() {
    var vw = document.documentElement.clientWidth;
    $$('[data-fit]').forEach(function (el) {
      if (el.matches('.wines__title') && vw <= 700) { el.style.fontSize = ''; return; }
      var frac = parseFloat(el.dataset.fit);
      var keep = [el.style.display, el.style.width];
      el.style.fontSize = '100px';
      el.style.display = 'inline-block';
      el.style.width = 'max-content';
      var w = el.getBoundingClientRect().width;
      el.style.display = keep[0];
      el.style.width = keep[1];
      el.style.fontSize = (100 * (el.parentElement.clientWidth * frac) / w) + 'px';
    });
  }

  /* Menu: a logo and one word. The overlay wipes in, the page tilts away. ---------------- */
  var page = $('[data-page]');
  var overlay = $('[data-menu]');
  var content = $('[data-menucontent]');
  var toggle = $('[data-toggle]');
  var preview = $('[data-preview]');
  var LINK_TEXT = '.menu__link a, .menu__social a';
  var FOOT_TEXT = '.menu__foot p span';
  var CLOSED = 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)';
  var OPEN = 'polygon(0% 0%, 100% 0%, 100% 175%, 0% 100%)';
  var menuOpen = false, menuBusy = false;

  function lockScroll() { if (lenis) lenis.stop(); document.body.style.overflow = 'hidden'; }
  function unlockScroll() { document.body.style.overflow = ''; if (lenis) lenis.start(); }
  function hideMenuText() {
    gsap.killTweensOf([LINK_TEXT, FOOT_TEXT]);
    gsap.set(LINK_TEXT, { y: '140%', opacity: 0.25 });
    gsap.set(FOOT_TEXT, { y: '120%', opacity: 0.25 });
  }
  function resetPreview() {
    preview.innerHTML = '';
    var img = document.createElement('img');
    img.src = $('.menu__link a').dataset.img; img.alt = '';
    preview.appendChild(img);
  }
  function toggleLabels(opening) {
    gsap.to(opening ? '#nav-toggle-open' : '#nav-toggle-close', { x: -5, y: opening ? -10 : 10, rotation: opening ? -5 : 5, opacity: 0, delay: 0.25, duration: 0.5, ease: 'power2.out' });
    gsap.to(opening ? '#nav-toggle-close' : '#nav-toggle-open', { x: 0, y: 0, rotation: 0, opacity: 1, delay: 0.5, duration: 0.5, ease: 'power2.out' });
  }

  function moving(on) {
    page.classList.toggle('is-moving', on);
    overlay.classList.toggle('is-moving', on);
  }
  function quiet(on) {
    html.classList.toggle('is-quiet', on);
    document.dispatchEvent(new CustomEvent('bw:quiet', { detail: on }));
  }

  function openMenu() {
    if (menuBusy || menuOpen) return;
    menuBusy = true;
    var sy = window.scrollY;
    lockScroll();
    overlay.classList.add('is-live');
    overlay.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    nav.classList.add('is-open');
    page.style.transformOrigin = 'right ' + sy + 'px';
    toggleLabels(true);
    hideMenuText();
    quiet(true);
    moving(true);
    gsap.to(page, { rotation: 10, x: 300, y: 450, scale: 1.5, duration: 1.25, ease: 'power4.inOut' });
    gsap.to(content, { rotation: 0, x: 0, y: 0, scale: 1, opacity: 1, duration: 1.25, ease: 'power4.inOut' });
    gsap.to([LINK_TEXT, FOOT_TEXT], { y: '0%', opacity: 1, delay: 0.75, duration: 1, ease: 'power3.out', stagger: 0.1 });
    gsap.to(overlay, { clipPath: OPEN, duration: 1.25, ease: 'power4.inOut', onComplete: function () { menuOpen = true; menuBusy = false; moving(false); } });
  }

  function closeMenu() {
    if (menuBusy || !menuOpen) return;
    menuBusy = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggleLabels(false);
    gsap.killTweensOf([LINK_TEXT, FOOT_TEXT]);
    moving(true);
    gsap.to(page, { rotation: 0, x: 0, y: 0, scale: 1, duration: 1.25, ease: 'power4.inOut', onComplete: function () { gsap.set(page, { clearProps: 'all' }); page.style.transformOrigin = ''; } });
    gsap.to(content, { rotation: -15, x: -100, y: -100, scale: 1.5, opacity: 0.25, duration: 1.25, ease: 'power4.inOut' });
    gsap.to(overlay, {
      clipPath: CLOSED, duration: 1.25, ease: 'power4.inOut',
      onComplete: function () {
        menuOpen = false; menuBusy = false;
        moving(false); quiet(false);
        overlay.classList.remove('is-live');
        overlay.setAttribute('aria-hidden', 'true');
        nav.classList.remove('is-open');
        hideMenuText(); resetPreview(); unlockScroll();
      }
    });
  }

  toggle.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  $$('.menu__link a').forEach(function (a) {
    a.addEventListener('mouseover', function () {
      if (!menuOpen || menuBusy) return;
      var src = a.dataset.img;
      var last = preview.querySelector('img:last-child');
      if (last && last.src.endsWith(src)) return;
      var img = document.createElement('img');
      img.src = src; img.alt = ''; img.style.opacity = '0'; img.style.transform = 'scale(1.25) rotate(10deg)';
      preview.appendChild(img);
      var all = preview.querySelectorAll('img');
      for (var i = 0; i < all.length - 3; i++) preview.removeChild(all[i]);
      gsap.to(img, { opacity: 1, scale: 1, rotation: 0, duration: 0.75, ease: 'power2.out' });
    });
  });

  // Leaving from the menu: on this site the next page opens with the menu still showing, then closes it.
  // The current page's link just closes the menu.
  $$('.menu__link a, .menu__social a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || a.target === '_blank') return;
      var href = a.getAttribute('href');
      if (!href || href === '#') return;
      var url = new URL(href, location.href);
      e.preventDefault();
      if (url.origin === location.origin && url.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '')) { closeMenu(); return; }
      if (url.origin !== location.origin) { location.href = url.href; return; }
      // same site: hand the open menu over to the next page, which closes it as if Close was pressed
      try { sessionStorage.setItem('bw-nav', new URL(a.dataset.img || '', location.href).href); } catch (err) {}
      location.href = url.href;
    });
  });
  // Coming back with the browser's back button restores a frozen page with the menu half-gone: reload it
  window.addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });

  // Initial resting state of the menu
  gsap.set(overlay, { clipPath: CLOSED });
  hideMenuText();

  // Arriving from the menu: the page opens with the menu still on screen, exactly as it was left (same
  // links, same photo), then closes it with the Close button's own animation to reveal the page.
  if (ENTER) {
    var fromImg = null;
    try { fromImg = sessionStorage.getItem('bw-nav'); sessionStorage.removeItem('bw-nav'); } catch (err) {}
    if (RM) { html.classList.remove('is-entering'); }
    else {
      if (fromImg && fromImg.indexOf('http') === 0) { preview.innerHTML = ''; var pim = document.createElement('img'); pim.src = fromImg; pim.alt = ''; preview.appendChild(pim); }
      overlay.classList.add('is-live');
      overlay.setAttribute('aria-hidden', 'false');
      nav.classList.add('is-open');
      gsap.set(overlay, { clipPath: OPEN });
      gsap.set(content, { rotation: 0, x: 0, y: 0, scale: 1, opacity: 1 });
      gsap.set([LINK_TEXT, FOOT_TEXT], { y: '0%', opacity: 1 });
      gsap.set('#nav-toggle-open', { x: -5, y: -10, rotation: -5, opacity: 0 });
      gsap.set('#nav-toggle-close', { x: 0, y: 0, rotation: 0, opacity: 1 });
      page.style.transformOrigin = 'right 0px';
      gsap.set(page, { rotation: 10, x: 300, y: 450, scale: 1.5 });
      html.classList.add('is-quiet');      // the arriving page stays still until the menu has closed
      menuOpen = true;
      lockScroll();
      html.classList.remove('is-entering');
      settle().then(function () { gsap.delayedCall(0.12, function () { window.__bwAnim = [performance.now(), performance.now() + 1500]; closeMenu(); }); });
    }
  }

  // The page has settled: fonts are in (so the lines are split), two frames have painted and the main thread has
  // had a quiet moment. Arrivals wait for this before they move, so nothing heavy runs under an animation.
  function settle() {
    var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    var cap = new Promise(function (r) { setTimeout(r, 900); });
    var calm = fonts.then(function () {
      return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
    }).then(function () {
      return new Promise(function (r) { if (window.requestIdleCallback) requestIdleCallback(r, { timeout: 250 }); else setTimeout(r, 60); });
    });
    return Promise.race([calm, cap]);
  }

  /* Page turn: every other link on the site. A muted-red panel rises over the page with the logo at its
     centre, the next page opens under the same panel, and the panel lifts away to reveal it. The panel
     and logo are html::after / html::before, driven by custom properties, so no page needs extra markup. */
  var turning = false;
  var pt = document.createElement('div');
  pt.className = 'pt'; pt.setAttribute('aria-hidden', 'true');
  pt.innerHTML = '<i class="pt__logo"></i>';
  document.body.appendChild(pt);
  var ptLogo = pt.firstChild;
  var SHUT = 'inset(0% 0% 0% 0%)';
  function turnTo(href) {
    if (turning) return;
    turning = true;
    lockScroll();
    try { sessionStorage.setItem('bw-pt', '1'); } catch (err) {}
    gsap.set(pt, { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(ptLogo, { opacity: 0, y: 24 });
    gsap.to(pt, { clipPath: SHUT, duration: 0.75, ease: 'power4.inOut', onComplete: function () { location.href = href; } });
    gsap.to(ptLogo, { opacity: 1, y: 0, duration: 0.5, delay: 0.4, ease: 'power3.out' });
    if (page) gsap.to(page, { y: -40, duration: 0.75, ease: 'power4.inOut' });
  }
  document.addEventListener('click', function (e) {
    if (RM || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.closest('[data-menu]')) return;
    var raw = a.getAttribute('href');
    if (!raw || raw.charAt(0) === '#' || /^(mailto|tel|sms|javascript):/i.test(raw)) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;   // same page: anchors scroll
    e.preventDefault();
    turnTo(url.href);
  });
  if (TURN) {
    try { sessionStorage.removeItem('bw-pt'); } catch (err) {}
    // the element takes over from the first-paint cover in the same frame, then lifts once the page has settled
    gsap.set(pt, { clipPath: SHUT });
    gsap.set(ptLogo, { opacity: 1, y: 0 });
    html.classList.remove('is-turning');
    if (RM) gsap.set(pt, { clipPath: 'inset(100% 0% 0% 0%)' });
    else {
      if (page) gsap.set(page, { y: 60 });
      var lift = gsap.timeline({ paused: true });
      lift.to(ptLogo, { opacity: 0, y: -24, duration: 0.4, ease: 'power2.in' });
      lift.to(pt, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.95, ease: 'power4.inOut' }, '-=0.1');
      if (page) lift.to(page, { y: 0, duration: 1.1, ease: 'power4.out', clearProps: 'transform' }, '<0.15');
      lift.set(pt, { clipPath: 'inset(100% 0% 0% 0%)' });
      lift.add(function () { ScrollTrigger.refresh(); });
      lift.eventCallback('onStart', function () { window.__bwAnim = [performance.now(), performance.now() + lift.duration() * 1000]; });
      settle().then(function () { lift.play(); });
    }
  }

  /* Reveal: colour wipes, floating bottles, the logo, then the hero ----------------------
     Timeline taken from the reference reveal and recoloured for Bespoke. -------------------- */
  var preloader = $('[data-preloader]');

  function runReveal() {
    var heading = SplitText.create('.hero-header h1', { type: 'lines, words, chars', charsClass: 'char', wordsClass: 'word' });
    var footerText = SplitText.create('.hero-footer p', { type: 'lines', mask: 'lines', linesClass: 'footer-line' });

    gsap.set('.nav__logo', { scale: 0 });
    gsap.set('.nav__toggle', { opacity: 0, y: -8 });
    gsap.set(heading.chars, { y: 50, opacity: 0, scale: 0.5 });
    gsap.set(footerText.lines, { yPercent: 100 });
    gsap.set('.hero-film', { opacity: 0, scale: 1.06 });
    gsap.set('[data-pour]', { opacity: 0, x: 30 });

    // Tidy composition: the logo in the middle, evenly spaced
    var narrow = window.innerWidth < 700;

    gsap.set('.preloader-logo', { xPercent: -50, yPercent: -50, y: 0, scale: 0.8, opacity: 0 });

    var tl = gsap.timeline({ delay: ENTER || TURN ? 0.45 : 0.4 });
    if (ENTER || TURN) {
      // opened from another page's menu or link: no loader, the hero builds as the menu or panel clears
      gsap.set('.preloader', { display: 'none' });
      tl.to({}, { duration: 0.6 });
    } else {

    // 1. Wipes: cream, soft red, cream, mid red, muted red (the logo screen)
    tl.to('.preloader-revealer', { clipPath: 'circle(100% at 50% 50%)', duration: 0.95, stagger: 0.2, ease: 'power2.inOut' });
    tl.set('.preloader-bg', { display: 'none' });

    // 2. Logo screen: the logo settles, the bottles rise into place one after another
    tl.to('.preloader-logo', { opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out' }, '-=0.35');
    tl.to({}, { duration: 0.9 });

    // 3. Hand-off: the whole screen lifts away as one piece, taking logo and bottles with it
    tl.to('.preloader', { yPercent: -100, duration: 1.15, ease: 'power4.inOut' });
    }

    // 4. Hero reveal underneath, starting while the screen is still moving
    tl.to('.nav__logo', { scale: 1, duration: 0.75, ease: 'power3.out', clearProps: 'transform' }, '-=0.55');
    tl.to('.nav__toggle', { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', clearProps: 'transform' }, '<0.1');
    tl.to(heading.chars, { y: 0, opacity: 1, scale: 1, duration: 1.5, stagger: 0.015, ease: 'elastic.out(0.75, 0.25)' }, '<0.15');
    tl.to(footerText.lines, { yPercent: 0, duration: 0.75, stagger: 0.1, ease: 'power3.out' }, '<0.2');
    tl.to('.hero-film', { opacity: 1, scale: 1, duration: 1.6, ease: 'power3.out' }, '<-0.2');
    tl.to('[data-pour]', { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out' }, '<0.5');
    tl.set('.preloader', { display: 'none' });
    tl.add(function () { html.classList.add('intro-done'); unlockScroll(); ScrollTrigger.refresh(); });
  }

  if (!preloader) {
    // inner pages have no loader
  } else if (RM) {
    preloader.style.display = 'none';
  } else {
    lockScroll();
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(runReveal);
  }

  /* Text: lines rise out of a mask -------------------------------------------------------------------- */
  function splitLines(el) {
    if (!el.dataset.orig) el.dataset.orig = el.textContent.trim().replace(/\s+/g, ' ');
    el.innerHTML = el.dataset.orig.split(' ').map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    var lines = [], top = null;
    $$('.w', el).forEach(function (w) {
      if (top === null || Math.abs(w.offsetTop - top) > 4) { lines.push([]); top = w.offsetTop; }
      lines[lines.length - 1].push(w.textContent);
    });
    el.innerHTML = lines.map(function (l) { return '<span class="line"><span class="line__in">' + l.join(' ') + '</span></span>'; }).join('');
    return $$('.line__in', el);
  }

  var lineCtx = null;
  var splitW = 0;
  function initLines() {
    if (RM) return;
    if (lineCtx) lineCtx.revert();
    splitW = document.documentElement.clientWidth;
    lineCtx = gsap.context(function () {
      $$('[data-lines]').forEach(function (el) {
        var rows = splitLines(el);
        if (el.dataset.done) return;
        gsap.set(rows, { yPercent: 112 });
        ScrollTrigger.create({
          trigger: el, start: 'top 88%', once: true,
          onEnter: function () {
            el.dataset.done = '1';
            gsap.to(rows, { yPercent: 0, duration: 1.2, ease: 'power4.out', stagger: 0.09 });
          }
        });
      });
    });
    ScrollTrigger.refresh();
  }

  /* Arrival: cards, rows and blocks fade up, left to right ---------------------------------------------- */
  var ARRIVE = '[data-reveal]';
  if (!RM) {
    gsap.set(ARRIVE, { y: 44, opacity: 0 });
    ScrollTrigger.batch(ARRIVE, {
      start: 'top 91%', once: true,
      onEnter: function (els) { gsap.to(els, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.09 }); }
    });
  }

  /* Hero film: a hand pours the Chianti Classico into a glass, one take, scrubbed by scroll. The backdrop is
     graded to the page cream in every frame, so the film has no edge. For a glide rather than steps:
       - every frame is decoded before it is needed, so drawing never waits on a JPEG
       - the canvas is no sharper than the footage itself, so each draw is cheap
       - the edge fade is painted once per size, not every frame
       - the playhead eases toward the scroll position at the same rate on any refresh rate
       - between two frames the next one is blended in, so motion is continuous
     ------------------------------------------------------------------------------------------------- */
  var heroEl = $('[data-hero]'), film = $('[data-film]');
  if (heroEl && film) (function () {   // own scope: later sections reuse names like render and prog
    var N = 121, SRC_W = 1600, frames = new Array(N), ready = new Array(N), prog = RM ? 1 : 0, target = prog;
    var POUR_A = 34, POUR_B = 104;      // frames where wine is running into the glass
    var ctx = film.getContext('2d', { alpha: false });
    var edge = document.createElement('canvas'), ectx = edge.getContext('2d');
    var src = function (i) { return 'assets/film/f' + ('00' + i).slice(-3) + '.jpg'; };
    var nearest = function (i) {
      for (var d = 0; d < N; d++) {
        if (ready[i - d]) return frames[i - d];
        if (ready[i + d]) return frames[i + d];
      }
      return null;
    };
    var clamp = function (t) { return Math.min(1, Math.max(0, t)); };
    var b = null, drawn = -1;

    // where the frame sits: cover on wide screens; on a phone the glass and the pour stay in view
    var place = function () {
      var W = film.width, H = film.height, iw = SRC_W, ih = SRC_W * 9 / 16;
      if (W / H >= 1) { var s = Math.max(W / iw, H / ih); return { x: (W - iw * s) * 0.5, y: (H - ih * s) * 0.5, w: iw * s, h: ih * s }; }
      // portrait: the whole pour in one clean picture. The glass sits left of centre so the neck, the stream and
      // most of the label fit across the screen; the frame is centred in the space between the top bar and the
      // headline, so nothing runs under the logo or Menu and nothing touches the words.
      var k = film.width / (film.clientWidth || 1);
      var head = $('.hero-header'), hr = heroEl.getBoundingClientRect();
      var top = H * 0.11, bottom = head ? (head.getBoundingClientRect().top - hr.top) * k - H * 0.025 : H * 0.62;
      var sp = Math.min((W * 1.55) / iw, Math.max(H * 0.25, bottom - top) / ih);
      var fw = iw * sp, fh = ih * sp;
      return { x: W * 0.34 - fw * 0.5, y: top + Math.max(0, (bottom - top - fh) / 2), w: fw, h: fh };
    };
    // the frame's own edges dissolve into the cream, so wherever it sits there is no seam
    var paintEdge = function () {
      edge.width = film.width; edge.height = film.height;
      var side = function (x0, y0, x1, y1, rx, ry, rw, rh) {
        var g = ectx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, 'rgba(252,244,236,1)'); g.addColorStop(1, 'rgba(252,244,236,0)');
        ectx.fillStyle = g; ectx.fillRect(rx, ry, rw, rh);
      };
      var t = b.h * 0.04, r = b.w * 0.03, l = b.w * 0.08, btm = b.h * 0.16;
      ectx.fillStyle = '#fcf4ec';   // outside the frame: plain cream
      ectx.fillRect(0, 0, edge.width, Math.max(0, b.y)); ectx.fillRect(0, b.y + b.h, edge.width, edge.height);
      ectx.fillRect(0, 0, Math.max(0, b.x), edge.height); ectx.fillRect(b.x + b.w, 0, edge.width, edge.height);
      side(b.x, 0, b.x + l, 0, b.x - 1, b.y, l + 1, b.h);
      side(b.x + b.w, 0, b.x + b.w - r, 0, b.x + b.w - r, b.y, r + 1, b.h);
      side(0, b.y, 0, b.y + t, b.x, b.y - 1, b.w, t + 1);
      side(0, b.y + b.h, 0, b.y + b.h - btm, b.x, b.y + b.h - btm, b.w, btm + 1);
    };
    var size = function () {
      var cw = film.clientWidth, ch = film.clientHeight;
      // never sharper than the footage: on a wide screen ~1 device pixel per source pixel, phones up to 2x
      var dpr = Math.min(window.devicePixelRatio || 1, 2, Math.max(1, (cw < ch ? SRC_W / 2 : SRC_W * 1.1) / cw));
      film.width = Math.round(cw * dpr); film.height = Math.round(ch * dpr);
      ctx.fillStyle = '#fcf4ec'; ctx.fillRect(0, 0, film.width, film.height);
      b = place(); paintEdge(); drawn = -1; render();
    };
    var render = function () {
      var f = prog * (N - 1);
      if (Math.abs(f - drawn) < 0.004) return;            // nothing new to show
      var i0 = Math.floor(f), i1 = Math.min(N - 1, i0 + 1), mix = f - i0;
      var img = nearest(i0);
      if (!img) return;
      ctx.drawImage(img, b.x, b.y, b.w, b.h);
      if (mix > 0.01 && ready[i0] && ready[i1]) { ctx.globalAlpha = mix; ctx.drawImage(frames[i1], b.x, b.y, b.w, b.h); ctx.globalAlpha = 1; }
      ctx.drawImage(edge, 0, 0);
      drawn = ready[i0] ? f : -1;
    };
    var load = function (i) {
      if (frames[i]) return;
      var im = new Image();
      frames[i] = im;
      im.src = src(i);
      // decode up front, so the first time a frame is drawn costs no more than any other time
      (im.decode ? im.decode() : new Promise(function (r) { im.onload = r; })).then(function () {
        ready[i] = true; drawn = -1; render();
      }, function () {});
    };
    load(RM ? N - 1 : 0);
    size();
    window.addEventListener('resize', size);
    // coarse to fine: early on, any scroll position has a frame close by
    var loadAll = function () { for (var step = 16; step >= 1; step = step / 2) for (var i = 0; i < N; i += step) load(i); };
    if (document.readyState === 'complete') loadAll(); else window.addEventListener('load', loadAll);

    var ml = $('[data-ml]'), bar = $('[data-mlbar]'), lastMl = -1;
    var meter = function () {
      var v = clamp((prog * (N - 1) - POUR_A) / (POUR_B - POUR_A)), n = Math.round(v * 150);
      if (ml && n !== lastMl) { ml.textContent = n; lastMl = n; }
      if (bar) bar.style.transform = 'scaleX(' + v.toFixed(4) + ')';
    };
    meter();
    if (!RM) {
      ScrollTrigger.create({
        trigger: heroEl, start: 'top top', end: function () { return '+=' + window.innerHeight * 2.6; },
        pin: true, pinSpacing: true, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function (self) { target = self.progress; }
      });
      // the playhead follows the scroll with a soft, frame-rate independent ease
      gsap.ticker.add(function (time, dt) {
        var d = target - prog;
        if (Math.abs(d) < 0.00005) { if (prog !== target) { prog = target; render(); meter(); } return; }
        prog += d * (1 - Math.exp(-Math.min(dt, 64) / 1000 * 7.5));
        render(); meter();
      });
    }
  })();

  /* Image spread: a pinned stage where photographs fly out of the centre (after the
     scroll-image-spread demo). The statement colours in as a wave; then a field of the muted red
     grows from the centre to fill the screen and the words turn white with it. ---------------- */
  var flow = $('[data-flow]');
  if (flow && !RM) {
    var wave = SplitText.create('[data-wave]', { type: 'words, chars', wordsClass: 'ww', charsClass: 'wc' });
    var C_INACTIVE = '#e6d4ca', C_WAVE = '#c9625c', C_BASE = '#8a3d3d', C_CREAM = '#fcf4ec';

    var flowTitle = $('.flow-title'), flowSub = $('.flow-sub');
    var toWhite = gsap.utils.interpolate(C_BASE, '#ffffff');
    var tinted = false, waveTl;
    var flowImgs = gsap.utils.toArray('.flow .img');
    var squares = flowImgs.slice(0, -1);
    var cover = flowImgs[flowImgs.length - 1];
    // x and y are fractions of the viewport. Squares fly out of the centre.
    var POS = [
      [-0.78, -0.55], [0.72, 0.5], [-0.55, 0.72], [0.62, -0.6], [-0.85, 0.15], [0.85, -0.12], [-0.2, -0.85], [0.25, 0.85]
    ];
    var scrollLen = function () { return window.innerHeight * 3.6; };
    var COVER_FROM = 0.58, COVER_TO = 0.86;   // the cover grows between these, then holds still until the stage unpins
    var clamp01 = function (v) { return Math.min(1, Math.max(0, v)); };

    flowImgs.forEach(function (img) {
      gsap.set(img, { xPercent: -50, yPercent: -50, x: 0, y: 0, z: -1000, scale: 0 });
    });

    ScrollTrigger.create({
      trigger: flow, start: 'top top', end: function () { return '+=' + scrollLen(); },
      pin: true, pinSpacing: true, scrub: 1, invalidateOnRefresh: true,
      onUpdate: function (self) {
        var p = self.progress, W = window.innerWidth, H = window.innerHeight;
        var spread = W < 800 ? 1.5 : 0.7;

        squares.forEach(function (img, i) {
          var ip = Math.max(0, (p - i * 0.065) * 3.2);
          gsap.set(img, {
            x: gsap.utils.interpolate(0, POS[i][0] * W * spread, ip),
            y: gsap.utils.interpolate(0, POS[i][1] * H * spread, ip),
            z: gsap.utils.interpolate(-1000, 2000, ip),
            scale: gsap.utils.interpolate(0, 1, ip)
          });
        });

        // The cover travels from far away to z = 0 at scale 1, which is exactly the size of the
        // screen. No over-zoom, so the photograph lands cleanly and then simply holds.
        var cp = clamp01((p - COVER_FROM) / (COVER_TO - COVER_FROM));
        var ce = 1 - Math.pow(1 - cp, 3);
        gsap.set(cover, { x: 0, y: 0, z: gsap.utils.interpolate(-1000, 0, ce), scale: ce });

        // the words turn white as the red field fills the screen; the cream glow behind them fades out.
        // Before the field starts, the colour wave below owns the letters.
        var c = toWhite(ce);
        if (cp > 0) { gsap.set(wave.chars, { color: c }); tinted = true; }
        else if (tinted) {
          // back above the field: replay the wave up to here so every letter has its own colour again
          tinted = false;
          var at = waveTl.progress();
          waveTl.progress(0, true).progress(at);
        }
        flowSub.style.color = c;
        var glow = Math.max(0, 1 - ce * 4);     // gone before the red reaches the letters
        flowTitle.style.textShadow = '0 0 36px rgba(252, 244, 236, ' + (0.7 * glow).toFixed(3) + ')';
        flowSub.style.textShadow = '0 0 24px rgba(252, 244, 236, ' + (0.75 * glow).toFixed(3) + ')';
      }
    });

    // Statement colour wave, scrubbed over the same scroll distance
    gsap.set(wave.chars, { color: C_INACTIVE });
    waveTl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: flow, start: 'top top', end: function () { return '+=' + scrollLen(); }, scrub: true, invalidateOnRefresh: true }
    });
    var step = (46 - 12) / Math.max(1, wave.chars.length - 1);
    wave.chars.forEach(function (ch, i) {
      waveTl.to(ch, { keyframes: [{ color: C_WAVE, duration: 6 }, { color: C_BASE, duration: 6 }] }, i * step);
    });
    waveTl.set({}, {}, 100);
  } else if (flow) {
    SplitText.create('[data-wave]', { type: 'words, chars', wordsClass: 'ww', charsClass: 'wc' });
  }

  /* Browse by style: a needle sweeps around a circular photograph and reveals the next one behind it;
     at the end the circle opens into a harvest photograph and the "How we choose" panel slides in beside it. */
  var pc = $('[data-pc]');
  if (pc && !RM) {
    var SHOP = '/collections/';     // the collection pages here; counts are what each holds
    var DATA = [
      { t: 'Red wine', s: 'From light and fruity to deep and structured', n: 87, cta: 'Shop red wine', href: SHOP + 'red-wine/' },
      { t: 'White wine', s: 'Crisp, mineral and aromatic', n: 60, cta: 'Shop white wine', href: SHOP + 'white-wine/' },
      { t: 'Rosé', s: 'Dry, bright and easy to pour', n: 14, cta: 'Shop rosé', href: SHOP + 'rose-wine/' },
      { t: 'Sparkling', s: 'Prosecco, crémant, lambrusco and more', n: 12, cta: 'Shop sparkling', href: SHOP + 'sparkling-wine/' },
      { t: 'Non-alcoholic', s: 'Zero-proof aperitifs and spirits', n: 10, cta: 'Shop non-alcoholic', href: SHOP + 'non-alcoholic/' }
    ];
    var pcSlides = gsap.utils.toArray('.pc-slide', pc);
    var pcItems = $$('[data-pcindex] li', pc);
    var pcDisc = $('[data-pcdisc]', pc), pcNeedle = $('[data-pcneedle]', pc), pcLine = $('.pc-line', pc), pcDot = $('.pc-dot', pc);
    var pcBg = $('[data-pcbg]', pc), pcBgImg = $('img', pcBg), pcGrid = $('[data-pcgrid]', pc), pcCells = $$('.pc-cell', pcGrid);
    var pcTitle = $('[data-pctitle]', pc), pcSub = $('[data-pcsub]', pc), pcNum = $('[data-pcnum]', pc), pcCta = $('[data-pccta]', pc);
    var pcFade = [$('[data-pcindex]', pc), $('[data-pcinfo]', pc), $('[data-pccount]', pc), $('[data-pclabel]', pc), pcCta, pcDisc];

    var REST = 36;                    // resting angle of the needle (pointing down-left)
    var INTRO = 1.2, SWEEPS = slidesCount(), EXPAND = 2.2, HOLD = 0.8;
    function slidesCount() { return pcSlides.length - 1; }
    var TOTAL = INTRO + SWEEPS + EXPAND + HOLD;
    var clp = function (v) { return Math.min(1, Math.max(0, v)); };
    var ease = function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
    var active = -2;

    gsap.set(pcLine, { transformOrigin: '0 0', rotation: REST });

    // Reveal a slide through a wedge that starts at the resting angle and grows clockwise
    function wedge(el, deg) {
      if (deg <= 0) { el.style.visibility = 'hidden'; return; }
      el.style.visibility = 'visible';
      var m = deg >= 360 ? 'none' : 'conic-gradient(from ' + (REST + 180) + 'deg at 50% 50%, #000 0deg, #000 ' + deg + 'deg, transparent ' + (deg + 0.4) + 'deg)';
      el.style.webkitMaskImage = m; el.style.maskImage = m;
    }

    function setActive(i) {
      pcItems.forEach(function (li, k) { li.classList.toggle('is-on', k === i); });
      if (i < 0) { gsap.set([pcTitle, pcSub], { opacity: 0 }); return; }
      var d = DATA[i];
      pcTitle.textContent = d.t; pcSub.textContent = d.s; pcCta.textContent = d.cta; pcCta.href = d.href;
      gsap.fromTo([pcTitle, pcSub], { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.07, overwrite: true });
    }

    function render(u) {
      var arrive = clp(u / 0.4);
      var angle = REST, num = DATA[0].n, now = -1;

      pcSlides.forEach(function (slide, k) {
        var from = k === 0 ? 0.4 : INTRO + (k - 1);
        var len = k === 0 ? INTRO - 0.4 : 1;
        var s = clp((u - from) / len), e = ease(s);
        wedge(slide, 360 * e);
        if (s > 0 && s < 1) angle = REST + 360 * e;
        if (s > 0.5) now = k;
        if (k > 0 && s > 0) num = Math.round(gsap.utils.interpolate(DATA[k - 1].n, DATA[k].n, e));
      });

      if (now !== active) { active = now; setActive(now); }
      pcNum.textContent = num;

      // Expansion: the circle opens into the landscape, the controls fade, the grid arrives
      var x = clp((u - (INTRO + SWEEPS)) / EXPAND), ex = ease(x);
      var R0 = pcDisc.offsetWidth / 2, R1 = Math.hypot(window.innerWidth, window.innerHeight);
      var cy = window.innerWidth < 900 ? 36 : 47;
      pcBg.style.opacity = clp(x / 0.25);
      pcBg.style.clipPath = 'circle(' + (x > 0 ? R0 + (R1 - R0) * ex : 0) + 'px at 50% ' + cy + '%)';
      var gx = clp((x - 0.5) / 0.5), wide = window.innerWidth > 900;
      gsap.set(pcBgImg, { scale: 1.16 - 0.16 * ex, xPercent: wide ? -24 * ease(gx) : 0, yPercent: wide ? 0 : -14 * ease(gx) });

      var fade = 1 - clp(x / 0.4);
      pcFade.forEach(function (el) { el.style.opacity = fade; });
      gsap.set(pcLine, { rotation: angle });
      pcNeedle.style.opacity = arrive * fade;
      gsap.set(pcDot, { scale: arrive });

      var g = clp((x - 0.5) / 0.5);
      pcGrid.style.setProperty('--g', ease(g));
      pcCells.forEach(function (c, i) {
        var k = clp(g * 2 - 0.4 - i * 0.1);
        c.style.opacity = k; c.style.transform = 'translateY(' + ((1 - k) * 18) + 'px)';
      });
      pcGrid.classList.toggle('is-live', g > 0.95);
    }

    // The sweep follows a playhead that eases toward the scroll position at the same rate on any refresh rate, so
    // the needle turns in one continuous motion instead of in the steps the wheel delivers.
    var pcTarget = 0, pcProg = 0;
    ScrollTrigger.create({
      trigger: pc, start: 'top top', end: function () { return '+=' + window.innerHeight * 5.6; },
      pin: true, pinSpacing: true, invalidateOnRefresh: true,
      onUpdate: function (self) { pcTarget = self.progress * TOTAL; }
    });
    gsap.ticker.add(function (time, dt) {
      var d = pcTarget - pcProg;
      if (Math.abs(d) < 0.0005) { if (pcProg !== pcTarget) { pcProg = pcTarget; render(pcProg); } return; }
      pcProg += d * (1 - Math.exp(-Math.min(dt, 64) / 1000 * 4.5));
      render(pcProg);
    });
    render(0);
  }

  /* The shelf: filter with a sliding underline, cards arrive in a staggered rise --------------------- */
  var shelf = $('[data-shelf]');
  if (shelf) {
    var cards = $$('.pcard', shelf), filters = $$('.filter', shelf), fwrap = $('[data-filters]', shelf), fbar = $('.filters__bar', shelf);
    var placeBar = function (btn, instant) {
      var r = btn.getBoundingClientRect(), p = fwrap.getBoundingClientRect();
      var to = { x: r.left - p.left, scaleX: r.width / 100 };
      if (instant || RM) gsap.set(fbar, to); else gsap.to(fbar, Object.assign({ duration: 0.6, ease: 'power3.out' }, to));
    };
    var applyFilter = function (key) {
      var show = function (c) { return key === 'all' || c.dataset.kind === key; };
      if (RM) { cards.forEach(function (c) { c.hidden = !show(c); }); return; }
      var tl = gsap.timeline();
      tl.to(cards.filter(function (c) { return !c.hidden && !show(c); }), { opacity: 0, y: 16, duration: 0.35, ease: 'power2.in', stagger: 0.03 });
      tl.add(function () { cards.forEach(function (c) { c.hidden = !show(c); }); ScrollTrigger.refresh(); });
      tl.fromTo(cards.filter(show), { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06 });
    };
    filters.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (btn.classList.contains('is-on')) return;
        filters.forEach(function (f) { f.classList.toggle('is-on', f === btn); f.setAttribute('aria-pressed', String(f === btn)); });
        placeBar(btn); applyFilter(btn.dataset.filter);
      });
    });
    var onBtn = filters[0];
    var settleBar = function () { placeBar($('.filter.is-on', shelf) || onBtn, true); };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(settleBar);
    window.addEventListener('resize', settleBar);

    if (!RM) {
      gsap.set(cards, { y: 44, opacity: 0 });
      ScrollTrigger.batch(cards, {
        start: 'top 92%', once: true,
        onEnter: function (els) { gsap.to(els, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.09 }); }
      });
    }
  }

  /* Countries: a bottle follows the cursor over the list and swaps per country ------------------------------- */
  var cats = $('[data-cats]');
  var follow = $('[data-follow]');
  if (cats && follow && !RM && window.matchMedia('(hover: hover) and (min-width: 981px)').matches) {
    var frame = $('.cats__frame', follow), cw = follow.offsetWidth, chh = follow.offsetHeight;
    var fx = gsap.quickTo(follow, 'x', { duration: 0.7, ease: 'power3.out' });
    var fy = gsap.quickTo(follow, 'y', { duration: 0.7, ease: 'power3.out' });
    var frot = gsap.quickTo(follow, 'rotation', { duration: 0.9, ease: 'power3.out' });
    var lastX = 0, shown = false, curSrc = '';
    var place = function (e) { fx(e.clientX - cw / 2); fy(e.clientY - chh / 2); frot(gsap.utils.clamp(-7, 7, (e.clientX - lastX) * 0.12)); lastX = e.clientX; };
    // One bottle at a time: the one showing sinks out quickly as the next rises in. Anything still on its way out
    // from an earlier quick hover is dropped at once, so bottles never pile up on top of each other.
    var swap = function (src) {
      if (src === curSrc) return;
      curSrc = src;
      var olds = Array.prototype.slice.call(frame.children);
      olds.forEach(function (o, k) {
        gsap.killTweensOf(o);
        if (k < olds.length - 1 || o.dataset.leaving) { frame.removeChild(o); return; }
        o.dataset.leaving = '1';
        gsap.to(o, { opacity: 0, yPercent: 10, duration: 0.22, ease: 'power2.in', onComplete: function () { if (o.parentNode) o.parentNode.removeChild(o); } });
      });
      var el = document.createElement('div'); el.innerHTML = '<img src="' + src + '" alt="">';
      frame.appendChild(el);
      gsap.fromTo(el, { opacity: 0, yPercent: 14 }, { opacity: 1, yPercent: 0, duration: 0.55, delay: olds.length ? 0.1 : 0, ease: 'power3.out' });
    };
    var cl = $$('.cat__link', cats);
    cl.forEach(function (a) {
      a.addEventListener('mouseenter', function (e) {
        if (!shown) {
          gsap.set(follow, { x: e.clientX - cw / 2, y: e.clientY - chh / 2, rotation: 0 }); lastX = e.clientX;
          follow.style.visibility = 'visible';
          gsap.fromTo(follow, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
          shown = true;
        }
        swap(a.getAttribute('data-img'));
      });
    });
    cats.addEventListener('mousemove', place);
    $('.cats__list', cats).addEventListener('mouseleave', function () {
      shown = false;
      gsap.to(follow, { opacity: 0, scale: 0.6, duration: 0.4, ease: 'power3.in', overwrite: 'auto', onComplete: function () {
        if (shown) return;
        follow.style.visibility = 'hidden';
        while (frame.firstChild) { gsap.killTweensOf(frame.firstChild); frame.removeChild(frame.firstChild); }
        curSrc = '';
      } });
    });
    cl.forEach(function (a) { var p = new Image(); p.src = a.getAttribute('data-img'); });
  }

  /* Mixed packs: the photograph opens from the top and drifts slightly ------------------------------------- */
  var bandImg = $('[data-bandimg]');
  if (bandImg && !RM) {
    gsap.fromTo(bandImg, { clipPath: 'inset(0% 0% 100% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'power3.inOut',
      scrollTrigger: { trigger: bandImg, start: 'top 82%', once: true }
    });
    gsap.fromTo($('img', bandImg), { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: bandImg, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  /* About page -------------------------------------------------------------------------------------------- */
  // Opening: the title rises line by line, the aside follows
  var intro = $('[data-intro]');
  if (intro && !RM) {
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
      var rows = splitLines(intro);
      gsap.set(rows, { yPercent: 112 });
      gsap.to(rows, { yPercent: 0, duration: 1.4, ease: 'power4.out', stagger: 0.1, delay: ENTER ? 0.75 : 0.15 });
      gsap.fromTo('[data-intro-fade]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: ENTER ? 1.15 : 0.6 });
    });
  }

  // The landscape widens from the page margins to the screen edges, and drifts slower than the page
  var widen = $('[data-widen]');
  if (widen && !RM) {
    var gut = function () { var g = parseFloat(getComputedStyle($('.wrap')).paddingLeft) || 24; return 'inset(0px ' + g + 'px 0px ' + g + 'px)'; };
    gsap.fromTo(widen, { clipPath: gut }, {
      clipPath: 'inset(0px 0px 0px 0px)', ease: 'none',
      scrollTrigger: { trigger: widen, start: 'top 85%', end: 'top 10%', scrub: true, invalidateOnRefresh: true }
    });
    if ($('img', widen)) gsap.fromTo($('img', widen), { yPercent: -4 }, {
      yPercent: 4, ease: 'none',
      scrollTrigger: { trigger: widen, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  }

  // Statement: each word inks in from pale to muted red as it passes the middle of the screen
  var ink = $('[data-ink]');
  if (ink && !RM) {
    var inkWords = ink.textContent.trim().split(/\s+/);
    ink.innerHTML = inkWords.map(function (w) { return '<span class="wd">' + w + '</span>'; }).join(' ');
    var wds = $$('.wd', ink);
    gsap.set(wds, { color: ink.dataset.inkFrom || '#e8d6cc' });
    gsap.to(wds, {
      color: ink.dataset.inkTo || '#8a3d3d', ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: ink, start: 'top 78%', end: 'bottom 45%', scrub: 0.6 }
    });
  }

  // Principles: the hairline under the pinned title fills as the three rows go by
  var wayBar = $('[data-waybar]');
  if (wayBar && !RM) {
    gsap.to(wayBar, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '.ab-way__list', start: 'top 60%', end: 'bottom 60%', scrub: true }
    });
  }

  // Portfolio: the bottles drift sideways against the scroll
  var drift = $('[data-drift]');
  if (drift && !RM) {
    gsap.fromTo(drift, { xPercent: 12 }, {
      xPercent: -12, ease: 'none',
      scrollTrigger: { trigger: drift, start: 'top bottom', end: 'bottom top', scrub: 0.5 }
    });
  }

  // Leadership: after the CodeGrid team section. Hovering a portrait grows it and rolls its name up out
  // of the giant title line. Selecting one glides the photo out to the left as a large square (it stays
  // square the whole way, so the crop never shifts) and the story slides out from beneath it. "Next"
  // moves through the team without closing; "All leaders" sends the photo back to its place.
  var team = $('[data-team]');
  if (team) (function () {
    var stage = $('[data-tmstage]', team), thumbsWrap = $('[data-thumbs]', team);
    var thumbs = $$('[data-thumb]', team), big = $('[data-big]', team), bigImg = $('[data-bigimg]', team);
    var card = $('[data-tmcard]', team), bios = $$('[data-bio]', card);
    var closeBtn = $('[data-tmclose]', card), nextBtn = $('[data-tmnext]', card), nextName = $('[data-tmnextname]', card);
    var namesWrap = $('.tm__names', team), hint = $('.tm__hint', team);
    var hoverable = window.matchMedia('(hover: hover) and (min-width: 901px)').matches;
    var SMALL = 132, LARGE = 216;
    var people = thumbs.map(function (t) { return $('img', t).alt; });

    var letters = {};
    $$('[data-name]', team).forEach(function (n) {
      var h = $('h2, h3', n), txt = h.textContent;
      h.innerHTML = txt.split('').map(function (ch) { return '<span class="tm-ch">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>'; }).join('');
      letters[n.dataset.name] = $$('.tm-ch', h);
    });
    // one name on the line at a time, ticker style: the current name exits upward as the next rises
    // from below, so two names never sit over each other
    gsap.set($$('.tm-ch', team), { y: 0, yPercent: 130 });
    gsap.set(letters['-1'], { yPercent: 0 });
    gsap.set($$('.tm__name', team), { visibility: 'visible' });
    var cur = -1;
    var show = function (k, instant) {
      if (k === cur) return;
      var out = letters[cur], inn = letters[k];
      if (instant) { gsap.set(out, { yPercent: 130 }); gsap.set(inn, { yPercent: 0 }); cur = k; return; }
      gsap.to(out, { yPercent: -130, duration: 0.6, ease: 'power3.inOut', overwrite: true, stagger: { each: 0.018, from: 'center' } });
      gsap.fromTo(inn, { yPercent: 130 }, { yPercent: 0, duration: 0.75, ease: 'power4.out', overwrite: true, delay: 0.08, stagger: { each: 0.022, from: 'center' } });
      cur = k;
    };

    var openIdx = -1, busy = false, viaKeys = false, geo = null;

    if (hoverable) {
      thumbs.forEach(function (t, i) {
        t.addEventListener('mouseenter', function () {
          if (openIdx >= 0 || busy) return;
          gsap.to(t, { width: LARGE, height: LARGE, duration: 0.5, ease: 'power4.out', overwrite: true });
          show(i);
        });
        t.addEventListener('mouseleave', function () {
          if (openIdx >= 0 || busy) return;
          gsap.to(t, { width: SMALL, height: SMALL, duration: 0.5, ease: 'power4.out', overwrite: true });
        });
      });
      thumbsWrap.addEventListener('mouseleave', function () { if (openIdx < 0 && !busy) show(-1); });
    }

    var rectIn = function (el) {
      var s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { left: r.left - s.left, top: r.top - s.top, width: r.width, height: r.height };
    };
    var showBio = function (i) {
      bios.forEach(function (b, k) { b.hidden = k !== i; });
      nextName.textContent = people[(i + 1) % people.length];
    };
    // the text column is clipped at the photo's far edge, so it reads as sliding out from beneath it
    var clip = function () {
      if (!geo) return;
      var cut = geo.desk ? Math.max(0, geo.edge - (geo.cL + gsap.getProperty(card, 'x'))) : Math.max(0, geo.edge - (geo.cT + gsap.getProperty(card, 'y')));
      card.style.clipPath = geo.desk ? 'inset(0 0 0 ' + cut + 'px)' : 'inset(' + cut + 'px 0 0 0)';
    };
    var layout = function () {
      var W = stage.clientWidth, Hs = stage.clientHeight;
      var g = parseFloat(getComputedStyle(stage).paddingLeft) || 24;
      var desk = W > 900, o = { desk: desk };
      card.hidden = false;
      if (desk) {
        o.gap = Math.round(Math.max(32, W * 0.045));
        o.S = Math.round(Math.min(W * 0.36, Hs * 0.72, 480));
        o.cW = Math.round(Math.min(W - 2 * g - o.S - o.gap, 640));
        o.L = Math.round(Math.max(g, (W - (o.S + o.gap + o.cW)) / 2));
        gsap.set(card, { width: o.cW, height: 'auto', x: 0, y: 0 });
        o.cH = Math.max(o.S, card.offsetHeight);
        o.T = Math.round(Math.max(g, (Hs - o.cH) / 2));
        o.cL = o.L + o.S + o.gap; o.cT = o.T; o.edge = o.L + o.S;
      } else {
        o.S = Math.round(Math.min(W - 2 * g, 460));
        o.L = Math.round((W - o.S) / 2); o.T = 88; o.cL = o.L; o.cT = o.T + o.S; o.cW = o.S;
        gsap.set(card, { width: o.cW, height: 'auto', x: 0, y: 0 });
        o.cH = card.offsetHeight; o.edge = o.T + o.S;
        o.stageH = Math.max(Hs, o.cT + o.cH + 64);
      }
      gsap.set(card, { left: o.cL, top: o.cT, width: o.cW, height: o.cH });
      return o;
    };

    function open(i) {
      if (busy || openIdx >= 0) return;
      busy = true; openIdx = i;
      var img = $('img', thumbs[i]);
      var from = rectIn(img);
      showBio(i);
      geo = layout();
      if (!geo.desk) gsap.to(stage, { height: geo.stageH, duration: 0.8, ease: 'power3.inOut' });

      bigImg.src = img.currentSrc || img.src;
      gsap.set(big, { visibility: 'visible', left: from.left, top: from.top, width: from.width, height: from.height });
      gsap.set(thumbs[i], { visibility: 'hidden' });
      gsap.set(card, geo.desk ? { x: -(geo.cW + geo.gap) } : { y: -geo.cH }); clip();

      var kids = $$('.tm__meta, .tm__bname, .tm__lead, .tm__body p', bios[i]).concat($$('.tm__btn', card));
      var tl = gsap.timeline({ onComplete: function () { busy = false; card.focus({ preventScroll: true }); } });
      tl.to([namesWrap, hint].concat(thumbs.filter(function (t, k) { return k !== i; })), { opacity: 0, y: -16, duration: 0.5, ease: 'power2.in' }, 0);
      tl.to(big, { left: geo.L, top: geo.T, width: geo.S, height: geo.S, duration: 1.15, ease: 'power4.inOut' }, 0);
      tl.to(card, Object.assign({ duration: 1, ease: 'power4.out', onUpdate: clip }, geo.desk ? { x: 0 } : { y: 0 }), 0.85);
      tl.fromTo(kids, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05 }, 1.0);
      if (RM) tl.progress(1);
    }

    function next() {
      if (busy || openIdx < 0) return;
      busy = true;
      var from = openIdx, to = (openIdx + 1) % thumbs.length;
      var outKids = $$('.tm__meta, .tm__bname, .tm__lead, .tm__body p', bios[from]);
      // the incoming portrait wipes across the current one
      var layer = document.createElement('img');
      layer.src = $('img', thumbs[to]).currentSrc || $('img', thumbs[to]).src; layer.alt = '';
      big.appendChild(layer);
      var tl = gsap.timeline({ onComplete: function () {
        bigImg.src = layer.src; big.removeChild(layer);
        gsap.set(thumbs[from], { visibility: 'visible', opacity: 0, y: -16 });
        gsap.set(thumbs[to], { visibility: 'hidden', opacity: 0 });
        openIdx = to; busy = false;
      } });
      tl.fromTo(layer, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power4.inOut' }, 0);
      tl.to(outKids, { opacity: 0, y: -12, duration: 0.35, ease: 'power2.in', stagger: 0.03 }, 0);
      tl.add(function () {
        showBio(to);
        var g2 = layout();
        if (!g2.desk) gsap.to(stage, { height: g2.stageH, duration: 0.5, ease: 'power3.inOut' });
        geo = g2; clip();
        gsap.set(big, { left: g2.L, top: g2.T, width: g2.S, height: g2.S });
        gsap.fromTo($$('.tm__meta, .tm__bname, .tm__lead, .tm__body p', bios[to]), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05 });
      }, 0.45);
      if (RM) tl.progress(1);
    }

    function close(instant, keys) {
      if (openIdx < 0 || (busy && !instant)) return;
      busy = true; viaKeys = !!keys;
      var i = openIdx, t = thumbs[i];
      if (hoverable) gsap.set(t, { width: SMALL, height: SMALL });
      show(-1, true);
      gsap.set(t, { opacity: 1, y: 0 });
      var to = rectIn($('img', t));
      var done = function () {
        gsap.set(big, { visibility: 'hidden' });
        gsap.set(t, { visibility: 'visible' });
        card.hidden = true; card.style.clipPath = ''; geo = null;
        gsap.set(stage, { clearProps: 'height' });
        openIdx = -1; busy = false;
        if (viaKeys) t.focus({ preventScroll: true });
      };
      var others = [namesWrap, hint].concat(thumbs.filter(function (x, k) { return k !== i; }));
      if (instant || RM) { gsap.set(others, { opacity: 1, y: 0 }); done(); return; }
      var tl = gsap.timeline({ onComplete: done });
      tl.to(card, Object.assign({ duration: 0.7, ease: 'power3.in', onUpdate: clip }, geo.desk ? { x: -(geo.cW + geo.gap) } : { y: -geo.cH }), 0);
      tl.to(big, { left: to.left, top: to.top, width: to.width, height: to.height, duration: 1.05, ease: 'power4.inOut' }, 0.45);
      if (!geo.desk) tl.to(stage, { height: stage.scrollHeight > 0 ? Math.max(window.innerHeight, 704) : 'auto', duration: 0.8, ease: 'power3.inOut' }, 0.45);
      tl.to(others, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05 }, 1.1);
    }

    card.setAttribute('tabindex', '-1');
    thumbs.forEach(function (t, i) { t.addEventListener('click', function () { open(i); }); });
    big.addEventListener('click', function () { close(); });
    closeBtn.addEventListener('click', function (e) { close(false, e.detail === 0); });
    nextBtn.addEventListener('click', next);
    window.addEventListener('keydown', function (e) {
      if (openIdx < 0) return;
      if (e.key === 'Escape') close(false, true);
      if (e.key === 'ArrowRight') next();
    });
    var lastW = window.innerWidth;
    window.addEventListener('resize', function () { if (openIdx >= 0 && Math.abs(window.innerWidth - lastW) > 40) close(true); lastW = window.innerWidth; });
  })();

  /* Contact page ------------------------------------------------------------------------------------------- */
  // Form: checks each field when it is left and on submit, says exactly what to fix, then sends the
  // message to the store's own contact endpoint so it lands in the same inbox as today.
  var cform = $('[data-contact]');
  if (cform) {
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var rules = {
      'c-name': function (v) { return v ? '' : 'Add your name so we know who to reply to.'; },
      'c-email': function (v) { return !v ? 'Add your email so we can reply.' : (EMAIL.test(v) ? '' : 'Check the email, it should look like name@example.com.'); },
      'c-phone': function (v) { return !v || /^[\d\s()+.-]{7,}$/.test(v) ? '' : 'Use digits only, for example 647-286-1153.'; },
      'c-msg': function (v) { return v.length >= 5 ? '' : 'Tell us a little about what you are looking for.'; }
    };
    var check = function (id) {
      var el = $('#' + id, cform), err = rules[id](el.value.trim());
      el.setAttribute('aria-invalid', String(!!err));
      $('#' + id + '-err', cform).textContent = err;
      return !err;
    };
    Object.keys(rules).forEach(function (id) {
      var el = $('#' + id, cform);
      el.addEventListener('blur', function () { if (el.value.trim() || el.getAttribute('aria-invalid')) check(id); });
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid') === 'true') check(id); });
    });
    cform.addEventListener('submit', function (e) {
      var bad = Object.keys(rules).filter(function (id) { return !check(id); });
      var status = $('[data-status]', cform);
      if (bad.length) {
        e.preventDefault();
        status.textContent = bad.length === 1 ? 'One field needs a look before we can send this.' : bad.length + ' fields need a look before we can send this.';
        $('#' + bad[0], cform).focus();
        return;
      }
      var btn = $('.ct-send__btn', cform);
      btn.setAttribute('aria-busy', 'true');
      $('[data-sendlabel]', cform).textContent = 'Sending';
      status.textContent = '';
    });
  }

  // Map: a hairline draws across the frame, the map opens out of it top and bottom, then the card lands
  var mapFrame = $('[data-mapframe]');
  if (mapFrame && !RM) {
    var mline = $('.ct-map__line', mapFrame.parentNode), mcard = $('.ct-map__card', mapFrame);
    gsap.set(mline, { scaleX: 0 });
    gsap.set(mapFrame, { clipPath: 'inset(50% 0% 50% 0%)' });
    gsap.set(mcard, { opacity: 0, y: 24 });
    var mtl = gsap.timeline({ paused: true });
    mtl.to(mline, { scaleX: 1, duration: 0.9, ease: 'power3.inOut' })
       .to(mapFrame, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut' }, '-=0.1')
       .to(mline, { opacity: 0, duration: 0.3 }, '<0.2')
       .to(mcard, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.45');
    ScrollTrigger.create({ trigger: mapFrame.parentNode, start: 'top 72%', once: true, onEnter: function () { mtl.play(); } });
  }

  /* Producers page -------------------------------------------------------------------------------------------- */
  // Country index: one underline glides to the chapter being read; chips jump smoothly to their chapter
  var prIndex = $('[data-prindex]');
  if (prIndex) {
    var chips = $$('[data-chip]', prIndex), ibar = $('[data-ibar]', prIndex), ibox = prIndex.firstElementChild;
    var setChip = function (id, instant) {
      var on = null;
      chips.forEach(function (c) {
        var is = c.dataset.chip === id;
        c.classList.toggle('is-on', is);
        if (is) { c.setAttribute('aria-current', 'true'); on = c; } else c.removeAttribute('aria-current');
      });
      if (!on) return;
      gsap.to(ibar, { x: on.offsetLeft, scaleX: on.offsetWidth, opacity: 1, duration: instant || RM ? 0 : 0.6, ease: 'power3.inOut', overwrite: true });
      ibox.scrollTo({ left: on.offsetLeft - ibox.clientWidth / 2 + on.offsetWidth / 2, behavior: RM ? 'auto' : 'smooth' });
    };
    chips.forEach(function (c) {
      c.addEventListener('click', function (e) {
        var target = document.getElementById(c.dataset.chip);
        if (!target) return;
        e.preventDefault();
        setChip(c.dataset.chip);
        if (lenis) lenis.scrollTo(target, { offset: -prIndex.offsetHeight + 1, duration: 1.4 });
        else target.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
        history.replaceState(null, '', '#' + c.dataset.chip);
      });
    });
    $$('[data-ch]').forEach(function (ch) {
      ScrollTrigger.create({ trigger: ch, start: 'top 40%', end: 'bottom 40%', onToggle: function (self) { if (self.isActive) setChip(ch.dataset.ch); } });
    });
    window.addEventListener('resize', function () { var on = $('.pr-chip.is-on', prIndex); if (on) setChip(on.dataset.chip, true); });
  }

  // Hero reel: three columns of marks drift endlessly, the middle one against the others. Hovering eases
  // the whole reel to a crawl so a mark can be read; it rests while off screen.
  var reel = $('[data-reel]');
  if (reel && !RM) {
    var reelTweens = $$('[data-reelcol]', reel).map(function (col, k) {
      var up = k % 2 === 0;
      return gsap.fromTo(col, { yPercent: up ? 0 : -50 }, { yPercent: up ? -50 : 0, duration: [46, 54, 50][k] || 50, ease: 'none', repeat: -1 });
    });
    var setSpeed = function (s, d) { reelTweens.forEach(function (t) { gsap.to(t, { timeScale: s, duration: d, ease: 'power2.out', overwrite: true }); }); };
    reel.addEventListener('mouseenter', function () { setSpeed(0.18, 0.8); });
    reel.addEventListener('mouseleave', function () { setSpeed(1, 1.2); });
    var reelSeen = true;
    var reelRun = function () { var on = reelSeen && !html.classList.contains('is-quiet'); reelTweens.forEach(function (t) { on ? t.resume() : t.pause(); }); };
    ScrollTrigger.create({ trigger: reel, start: 'top bottom', end: 'bottom top', onToggle: function (self) { reelSeen = self.isActive; reelRun(); } });
    document.addEventListener('bw:quiet', reelRun);
    reelRun();
    gsap.from(reel, { y: 40, opacity: 0, duration: 1.4, ease: 'power3.out', delay: ENTER ? 1.1 : 0.4 });
  }
  // the "Browse by country" link uses the index's smooth jump
  var jumpLink = $('[data-chipjump]');
  if (jumpLink) jumpLink.addEventListener('click', function (e) {
    var chip = $('[data-chip="' + jumpLink.dataset.chipjump + '"]');
    if (chip) { e.preventDefault(); chip.click(); }
  });

  // Ticker: a slow steady drift; scrolling eases it faster and turns it with the scroll direction, then it
  // settles back. Speed is smoothed every frame so it never jerks.
  var mtrack = $('[data-mtrack]');
  if (mtrack && !RM) {
    var mx = 0, mdir = -1, speed = 0.45, aim = 0.45;
    if (lenis) lenis.on('scroll', function (e) {
      if (Math.abs(e.velocity) > 0.2) { mdir = e.velocity > 0 ? -1 : 1; aim = Math.min(0.45 + Math.abs(e.velocity) * 0.35, 6); }
    });
    gsap.ticker.add(function (t, dt) {
      if (html.classList.contains('is-quiet')) return;      // the menu is on screen
      aim += (0.45 - aim) * 0.04;
      speed += (aim * mdir - speed) * 0.08;
      mx += speed * (dt / 16.67);
      var w = mtrack.scrollWidth / 2;
      if (w) { if (mx <= -w) mx += w; if (mx > 0) mx -= w; }
      mtrack.style.transform = 'translate3d(' + mx.toFixed(2) + 'px,0,0)';
    });
  }

  // Tiles: the blush fill slides in from the edge the cursor entered and out through the edge it left
  var edgeOf = function (el, e) {
    var r = el.getBoundingClientRect();
    var d = { top: e.clientY - r.top, bottom: r.bottom - e.clientY, left: e.clientX - r.left, right: r.right - e.clientX };
    return Object.keys(d).reduce(function (a, b) { return d[a] < d[b] ? a : b; });
  };
  var OFF = { top: { xPercent: 0, yPercent: -101 }, bottom: { xPercent: 0, yPercent: 101 }, left: { xPercent: -101, yPercent: 0 }, right: { xPercent: 101, yPercent: 0 } };
  $$('[data-tile]').forEach(function (tile) {
    var fill = $('.pr-fill', tile);
    if (!fill) return;
    gsap.set(fill, { xPercent: 0, yPercent: 101 });
    tile.addEventListener('mouseenter', function (e) {
      gsap.fromTo(fill, OFF[edgeOf(tile, e)], { xPercent: 0, yPercent: 0, duration: RM ? 0 : 0.45, ease: 'power3.out', overwrite: true });
    });
    tile.addEventListener('mouseleave', function (e) {
      gsap.to(fill, Object.assign({ duration: RM ? 0 : 0.4, ease: 'power3.in', overwrite: true }, OFF[edgeOf(tile, e)]));
    });
    tile.addEventListener('focus', function () { gsap.to(fill, { xPercent: 0, yPercent: 0, duration: 0.3, overwrite: true }); });
    tile.addEventListener('blur', function () { gsap.to(fill, { xPercent: 0, yPercent: 101, duration: 0.3, overwrite: true }); });
  });

  // Chapters: tiles rise gently into place in reading order, and the count ticks up as the chapter arrives
  if (!RM) {
    $$('.pr-grid').forEach(function (grid) {
      var tiles = $$('.pr-grid > li', grid);
      gsap.set(tiles, { opacity: 0, y: 28 });
      ScrollTrigger.create({ trigger: grid, start: 'top 85%', once: true, onEnter: function () {
        gsap.to(tiles, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: { each: 0.07, from: 'start' }, clearProps: 'transform' });
      } });
    });
    $$('[data-count]').forEach(function (el) {
      var n = +el.dataset.count, o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: function () {
        gsap.to(o, { v: n, duration: Math.min(1.2, 0.4 + n * 0.07), ease: 'power2.out', onUpdate: function () { el.textContent = Math.round(o.v); } });
      } });
    });
  }

  /* Producer detail page ------------------------------------------------------------------------------------- */
  // Opening: the mark draws in from left to right, the bottle rises onto its plate
  var pdMark = $('[data-pdmark]');
  if (pdMark && !RM) {
    gsap.fromTo(pdMark, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'power3.inOut', delay: ENTER ? 0.9 : 0.15 });
  }
  var pdBottle = $('[data-pdbottle]');
  if (pdBottle && !RM) {
    gsap.fromTo(pdBottle, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut', delay: ENTER ? 0.8 : 0.1 });
    gsap.fromTo($('img', pdBottle), { yPercent: 18, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.4, ease: 'power3.out', delay: ENTER ? 1.2 : 0.5 });
  }

  // Wines: filter by type; the underline glides to the choice, cards leave and settle back in
  var pdF = $('.pd-filters');
  if (pdF) {
    var fbtns = $$('[data-pdf]', pdF), fbar = $('.pd-filters__bar', pdF), cardsLi = $$('[data-pdgrid] > li');
    var place = function (b, instant) { gsap.to(fbar, { x: b.offsetLeft, scaleX: b.offsetWidth, duration: instant || RM ? 0 : 0.55, ease: 'power3.inOut', overwrite: true }); };
    place(fbtns[0], true);
    window.addEventListener('resize', function () { place($('.pd-filter.is-on', pdF), true); });
    fbtns.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.classList.contains('is-on')) return;
        fbtns.forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
        place(b);
        var k = b.dataset.pdf;
        var show = cardsLi.filter(function (li) { return k === 'all' || li.dataset.kind === k; });
        var apply = function () {
          cardsLi.forEach(function (li) { li.hidden = show.indexOf(li) < 0; });
          if (!RM) gsap.fromTo(show, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05, clearProps: 'transform' });
          ScrollTrigger.refresh();
        };
        if (RM) return apply();
        gsap.to(cardsLi.filter(function (li) { return !li.hidden; }), { opacity: 0, y: -10, duration: 0.25, ease: 'power2.in', onComplete: apply });
      });
    });
  }

  /* Wine detail page ------------------------------------------------------------------------------------------- */
  // The case under the bottle: one slot per bottle. It fills left to right as the page opens, and empties and
  // refills whenever the number of cases changes, while the bottle count climbs to the new total.
  var wnPlate = $('[data-wnplate]'), slotsEl = $('[data-slots]'), bottlesEl = $('[data-bottles]');
  var buyForm = $('[data-buy]');
  var perCase = slotsEl ? parseInt(slotsEl.dataset.per, 10) : 0, shownBottles = perCase, shownGroups = 1;
  var moreCases = slotsEl ? $('[data-morecases]', slotsEl) : null;
  var caseK = slotsEl ? $('.wn-case__k b') : null;
  function fillCase(cases, first) {
    if (!slotsEl) return;
    var total = perCase * cases, groups = Math.min(cases, 4);
    if (caseK) caseK.textContent = (cases > 1 ? cases + ' cases of ' : 'Case of ') + perCase;
    // one row of slots per case, stacked like crates, up to four; beyond that the extra cases are counted beside them
    if (groups !== shownGroups) {
      var stack = $('[data-stack]', slotsEl);
      $$('.wn-grp', slotsEl).forEach(function (g) { g.remove(); });
      stack.style.setProperty('--n', groups);
      for (var g = 0; g < groups; g++) {
        var grp = document.createElement('span');
        grp.className = 'wn-grp';
        grp.innerHTML = new Array(perCase + 1).join('<i class="wn-slot' + (RM ? ' is-in' : '') + '"></i>');
        stack.appendChild(grp);
      }
      shownGroups = groups;
    }
    moreCases.hidden = cases <= 4;
    moreCases.textContent = cases > 4 ? '+' + (cases - 4) + ' more' : '';
    var slots = $$('.wn-slot', slotsEl);
    // the bottle count is written once at the end, so screen readers are not handed a run of numbers
    if (RM) { bottlesEl.textContent = total; shownBottles = total; return; }
    gsap.killTweensOf(slots);
    var each = Math.min(first ? 0.07 : 0.035, 1.4 / slots.length), tl = gsap.timeline();
    slots.forEach(function (s, i) {
      tl.add(function () { s.classList.remove('is-in'); }, 0);
      tl.fromTo(s, { y: -14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'back.out(2.2)', immediateRender: false }, 0.05 + i * each);
      tl.add(function () { s.classList.add('is-in'); }, 0.05 + i * each);
    });
    var counter = { v: shownBottles };
    bottlesEl.setAttribute('aria-hidden', 'true');
    gsap.to(counter, {
      v: total, duration: 0.05 + slots.length * each + 0.3, ease: 'power2.out',
      onUpdate: function () { bottlesEl.textContent = Math.round(counter.v); },
      onComplete: function () { bottlesEl.textContent = total; bottlesEl.removeAttribute('aria-hidden'); }
    });
    shownBottles = total;
  }
  if (wnPlate) {
    if (!RM) {
      var wnBottle = $('[data-wnbottle]', wnPlate);
      if (slotsEl) { gsap.set($$('.wn-slot', slotsEl), { opacity: 0 }); bottlesEl.textContent = '0'; shownBottles = 0; }
      gsap.fromTo(wnPlate, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power4.inOut', delay: ENTER ? 0.8 : 0.1 });
      if (wnBottle) gsap.fromTo(wnBottle, { yPercent: 14, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.4, ease: 'power3.out', delay: ENTER ? 1.2 : 0.5 });
      gsap.delayedCall(ENTER ? 1.7 : 1.0, function () { fillCase(1, true); });
    }
  }
  if (buyForm) {
    var qty = $('[data-qty]', buyForm), unitPrice = parseFloat(buyForm.dataset.price), nPer = parseInt(buyForm.dataset.n, 10);
    var unit = buyForm.dataset.unit, units = buyForm.dataset.units, casesNow = 1;
    var minus = $('[data-step="-1"]', buyForm), plus = $('[data-step="1"]', buyForm);
    var sumEl = $('[data-sum]', buyForm), sumText = $('[data-sumtext]', buyForm);
    var cad = function (v) {
      var whole = Math.abs(v - Math.round(v)) < 0.005;
      return '$' + v.toLocaleString('en-CA', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 });
    };
    var setQ = function (q, animate) {
      q = Math.max(1, Math.min(99, Math.round(+q) || 1));
      var changed = q !== casesNow;
      casesNow = q; qty.value = q;
      minus.disabled = q <= 1; plus.disabled = q >= 99;
      sumText.textContent = q + ' ' + (q === 1 ? unit : units) + (nPer > 1 ? ' · ' + q * nPer + ' bottles' : '');
      sumEl.textContent = cad(q * unitPrice);
      if (changed && animate) {
        if (!RM) gsap.fromTo(sumEl, { y: q > (+sumEl.dataset.q || 1) ? 8 : -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
        fillCase(q);
      }
      sumEl.dataset.q = q;
    };
    setQ(1, false);
    $$('[data-step]', buyForm).forEach(function (b) {
      b.addEventListener('click', function () { setQ(casesNow + parseInt(b.dataset.step, 10), true); });
    });
    qty.addEventListener('change', function () { setQ(qty.value, true); });
    qty.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); setQ(qty.value, true); } });
    // the form posts straight into the store's own cart, then the store shows it
    buyForm.addEventListener('submit', function () {
      setQ(qty.value, false);
      var l = $('[data-addlabel]', buyForm); if (l) l.textContent = 'Adding to cart…';
      buyForm.setAttribute('aria-busy', 'true');
    });
    // phones: once the main button has scrolled away, a slim bar keeps the price and the button in reach
    var wnBar = $('[data-wnbar]'), addBtn = $('[data-add]', buyForm);
    if (wnBar && addBtn && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var e = es[0], on = !e.isIntersecting && e.boundingClientRect.top < 0;
        wnBar.classList.toggle('is-on', on);
        wnBar.setAttribute('aria-hidden', String(!on));
        $('button', wnBar).tabIndex = on ? 0 : -1;
      }).observe(addBtn);
    }
  }

  /* Footer ----------------------------------------------------------------------------------------------------------- */
  if (!RM) {
    gsap.fromTo('[data-footword] .ch2', { yPercent: 55 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: '[data-foot]', start: 'top 65%', end: 'bottom bottom', scrub: true }
    });
  }

  var form = $('[data-news]');
  if (form) form.addEventListener('submit', function (e) {
    var email = $('#n-email', form), msg = $('.news__msg', form);
    e.preventDefault();
    var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    email.setAttribute('aria-invalid', String(!valid));
    msg.textContent = valid ? 'Thanks. You are on the list.' : 'Enter an email address like name@example.com.';
    if (valid) form.reset(); else email.focus();
  });

  // Warm the image cache: once the page is quiet, fetch and decode the menu's photographs and the large photos
  // further down this page, so opening the menu or reaching them never waits on a decode mid-animation.
  window.addEventListener('load', function () {
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 400); };
    idle(function () {
      var srcs = $$('.menu__link a[data-img]').map(function (a) { return a.dataset.img; });
      srcs.forEach(function (src) { var im = new Image(); im.decoding = 'async'; im.src = src; if (im.decode) im.decode().catch(function () {}); });
      $$('.pc-bg img, .pc-slide, .flow .img img').forEach(function (im) { im.loading = 'eager'; if (im.decode) im.decode().catch(function () {}); });
    }, { timeout: 2500 });
  });

  /* Fit type and split text once fonts settle; redo if the width changes ------------------------------------------------ */
  var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  fit();
  ready.then(function () { fit(); initLines(); });
  var t;
  var lastW = document.documentElement.clientWidth;
  function relayout() {
    clearTimeout(t);
    t = setTimeout(function () {
      var w = document.documentElement.clientWidth;
      if (w === lastW) return;
      lastW = w;
      fit();
      initLines();
    }, 200);
  }
  window.addEventListener('resize', relayout);
  if (window.ResizeObserver) new ResizeObserver(relayout).observe(document.documentElement);
  window.addEventListener('load', function () { fit(); ScrollTrigger.refresh(); });
})();
