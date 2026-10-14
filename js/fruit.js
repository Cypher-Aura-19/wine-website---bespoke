/* ==========================================================================
   Fruit: a hanging grape cluster and the bottle it becomes.
   Both shapes live in one 1000 x 1000 SVG space. Every grape owns two
   resting places (one in the cluster, one inside the bottle silhouette)
   and the scroll timeline moves it between them. Seeded, so it always
   draws the same cluster.
   ========================================================================== */
(function () {
  var NS = 'http://www.w3.org/2000/svg';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rnd = mulberry32(23);

  /* Bottle silhouette (a Bordeaux shape), half-width as a function of y ----- */
  var B = { cx: 500, capTop: 50, neckTop: 140, shoulderY: 380, bodyY: 520, bottomY: 954, endY: 978, neckHW: 37, bodyHW: 138 };

  function bottleHW(y) {
    if (y < B.neckTop || y > B.endY) return -1;
    if (y < B.shoulderY) return B.neckHW + ((y - B.neckTop) / (B.shoulderY - B.neckTop)) * 3;
    if (y < B.bodyY) {
      var t = (y - B.shoulderY) / (B.bodyY - B.shoulderY);
      return 40 + (B.bodyHW - 40) * (0.5 - 0.5 * Math.cos(Math.PI * t));
    }
    if (y < B.bottomY) return B.bodyHW;
    var u = (y - B.bottomY) / (B.endY - B.bottomY);
    return B.bodyHW * Math.sqrt(Math.max(0, 1 - u * u));
  }

  function fitsBottle(x, y, r) {
    var m = Math.min(bottleHW(y), bottleHW(y - r * 0.7), bottleHW(y + r * 0.7));
    return m > 0 && Math.abs(x - B.cx) + r * 0.9 <= m;
  }

  function packBottle() {
    var out = [];
    var passes = [[22, 17, 16000], [17, 13.5, 24000], [13.5, 10.5, 30000], [10.5, 8, 36000]];
    var cap = 185;
    for (var p = 0; p < passes.length; p++) {
      var hi = passes[p][0], lo = passes[p][1], tries = passes[p][2];
      for (var t = 0; t < tries && out.length < cap; t++) {
        var r = lo + (hi - lo) * rnd();
        var x = B.cx - B.bodyHW + rnd() * 2 * B.bodyHW;
        var y = B.neckTop + rnd() * (B.endY - B.neckTop);
        if (!fitsBottle(x, y, r)) continue;
        var ok = true;
        for (var i = 0; i < out.length; i++) {
          var dx = out[i].x - x, dy = out[i].y - y, m = (out[i].r + r) * 0.91;
          if (dx * dx + dy * dy < m * m) { ok = false; break; }
        }
        if (ok) out.push({ x: x, y: y, r: r });
      }
    }
    return out;
  }

  /* Cluster silhouette: a hanging teardrop with a gentle bend --------------- */
  var C = { cx: 500, top: 175, bot: 830, W: 252 };

  function clusterShape(y) {
    var t = (y - C.top) / (C.bot - C.top);
    if (t < 0 || t > 1) return null;
    var shoulder = Math.min(1, 0.46 + 0.54 * Math.sin(Math.min(1, t / 0.2) * Math.PI / 2));
    var base = C.W * Math.pow(1 - t, 0.84) * shoulder;
    var wobble = 1 + 0.05 * Math.sin(t * 13 + 1.3) + 0.035 * Math.sin(t * 29);
    return { hw: base * wobble, off: 16 * Math.sin(t * 3.1) };
  }

  function fitsCluster(x, y, r) {
    var s = clusterShape(y);
    return !!s && Math.abs(x - (C.cx + s.off)) + r * 0.72 <= s.hw;
  }

  function packCluster(count) {
    var k = 1;
    for (var attempt = 0; attempt < 14; attempt++) {
      var out = [];
      var R = 27 * k;
      var passes = [[R, R * 0.8, 7000], [R * 0.8, R * 0.64, 12000], [R * 0.64, 11 * k, 60000]];
      for (var p = 0; p < passes.length && out.length < count; p++) {
        var hi = passes[p][0], lo = passes[p][1], tries = passes[p][2];
        for (var t = 0; t < tries && out.length < count; t++) {
          var r = lo + (hi - lo) * rnd();
          var x = C.cx - C.W + rnd() * 2 * C.W;
          var y = C.top + rnd() * (C.bot - C.top);
          if (!fitsCluster(x, y, r)) continue;
          var ok = true;
          for (var i = 0; i < out.length; i++) {
            var dx = out[i].x - x, dy = out[i].y - y, m = (out[i].r + r) * 0.84;
            if (dx * dx + dy * dy < m * m) { ok = false; break; }
          }
          if (ok) out.push({ x: x, y: y, r: r });
        }
      }
      if (out.length >= count) return out;
      k *= 0.94;
    }
    return out;
  }

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var a in attrs) n.setAttribute(a, attrs[a]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function radial(defs, id, stops) {
    var g = el('radialGradient', { id: id, cx: '0.5', cy: '0.5', r: '0.5', fx: '0.34', fy: '0.28' }, defs);
    stops.forEach(function (s) { el('stop', { offset: s[0], 'stop-color': s[1] }, g); });
  }

  function build(svg, opts) {
    opts = opts || {};
    var bottle = opts.clusterOnly ? [] : packBottle();
    var cluster = packCluster(opts.clusterOnly ? (opts.count || 130) : bottle.length);
    var n = opts.clusterOnly ? cluster.length : Math.min(bottle.length, cluster.length);

    // Pair by height so the top of the cluster becomes the neck, the tip becomes the base
    bottle.sort(function (a, b) { return a.y - b.y; });
    cluster.sort(function (a, b) { return a.y - b.y; });

    var defs = el('defs', {}, svg);
    if (opts.palette === 'green') {
      radial(defs, 'gr0', [[0, '#f1f6c8'], [0.16, '#c3d476'], [0.55, '#889f3c'], [1, '#4a6226']]);
      radial(defs, 'gr1', [[0, '#eef3bd'], [0.16, '#b9cc68'], [0.55, '#7e9835'], [1, '#43591f']]);
      radial(defs, 'gr2', [[0, '#f4f7d3'], [0.16, '#cbdb82'], [0.55, '#94a944'], [1, '#52692b']]);
    } else {
      radial(defs, 'gr0', [[0, '#d0a2b2'], [0.14, '#92405e'], [0.52, '#4d1433'], [1, '#1c0612']]);
      radial(defs, 'gr1', [[0, '#bda4c8'], [0.14, '#70406c'], [0.52, '#391339'], [1, '#150616']]);
      radial(defs, 'gr2', [[0, '#d9a8ae'], [0.14, '#9c3b53'], [0.52, '#571530'], [1, '#210610']]);
    }
    var goldFill = el('linearGradient', { id: 'gold', x1: '0', x2: '1', y1: '0', y2: '0' }, defs);
    [[0, '#8d6f3c'], [0.22, '#e9d3a6'], [0.5, '#c9a76f'], [0.8, '#a98847'], [1, '#6f552b']].forEach(function (s) {
      el('stop', { offset: s[0], 'stop-color': s[1] }, goldFill);
    });

    // Stem hangs from above the viewport
    var stem = el('g', { 'class': 'stem' }, svg);
    el('path', {
      d: 'M500 182 C 506 120, 488 40, 514 -520',
      fill: 'none', stroke: '#3a2813', 'stroke-width': '11', 'stroke-linecap': 'round'
    }, stem);
    el('path', {
      d: 'M500 182 C 506 120, 488 40, 514 -520',
      fill: 'none', stroke: '#6b4c26', 'stroke-width': '3', 'stroke-linecap': 'round', opacity: '0.7', transform: 'translate(-2 0)'
    }, stem);

    var outlinePts = [], y, i;
    for (y = B.neckTop; y <= B.endY; y += 6) outlinePts.push((B.cx - bottleHW(y)).toFixed(1) + ' ' + y);
    for (y = B.endY; y >= B.neckTop; y -= 6) outlinePts.push((B.cx + bottleHW(y)).toFixed(1) + ' ' + y);
    var outline = el('path', {
      d: 'M' + outlinePts.join(' L') + ' Z',
      fill: 'none', stroke: '#d7ba8c', 'stroke-width': '1.4', opacity: '0', 'stroke-linejoin': 'round'
    }, svg);

    var layer = el('g', { 'class': 'grapes' }, svg);
    var grapes = [];
    var palette = ['gr0', 'gr0', 'gr1', 'gr2', 'gr0', 'gr2'];
    // Draw order: lower grapes over higher ones in the cluster
    for (i = 0; i < n; i++) {
      var holder = el('g', {}, layer);
      var c = el('circle', {
        cx: '0', cy: '0', r: '1',
        fill: 'url(#' + palette[Math.floor(rnd() * palette.length)] + ')',
        stroke: 'rgba(255,224,232,0.16)', 'stroke-width': '0.05'
      }, holder);
      grapes.push({
        holder: holder, circle: c,
        cx: cluster[i].x, cy: cluster[i].y, cr: cluster[i].r,
        bx: bottle[i] ? bottle[i].x : 0, by: bottle[i] ? bottle[i].y : 0, br: bottle[i] ? bottle[i].r : 1,
        rank: i / Math.max(1, n - 1)
      });
    }

    // Foil cap sits on top of the neck once the bottle has formed
    var cap = el('g', { 'class': 'cap', opacity: '0' }, svg);
    el('path', {
      d: 'M463 62 Q463 50 476 50 H524 Q537 50 537 62 V126 Q537 136 528 136 H472 Q463 136 463 126 Z',
      fill: 'url(#gold)'
    }, cap);
    el('rect', { x: '461', y: '112', width: '78', height: '9', rx: '2', fill: '#7b5f31', opacity: '0.55' }, cap);
    el('path', { d: 'M470 58 V128', stroke: '#fff4d6', 'stroke-width': '2', opacity: '0.35', 'stroke-linecap': 'round' }, cap);

    return { grapes: grapes, stem: stem, cap: cap, outline: outline, svg: svg };
  }

  window.Fruit = { build: build };
})();
