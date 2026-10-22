// Small, dependency-free interactions. Without JS (or with reduced motion) everything shows in its final state.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  if (!reduce) document.documentElement.classList.add('js');

  /* ---------- hero diagram: moving data + highlight a node's connections ---------- */
  var dag = document.querySelector('.dag');
  if (dag) {
    $$('.edge', dag).forEach(function (edge, i) {
      var flow = edge.cloneNode(false);
      flow.setAttribute('class', 'flow');
      flow.style.animationDelay = (-i * 0.37) + 's';
      edge.parentNode.appendChild(flow);
    });
    var paths = $$('[data-link]', dag), nodes = $$('.n', dag);
    var clear = function () {
      dag.classList.remove('focus');
      paths.concat(nodes).forEach(function (el) { el.classList.remove('hl'); });
    };
    nodes.forEach(function (node) {
      var id = node.getAttribute('data-node');
      node.addEventListener('pointerenter', function () {
        clear(); dag.classList.add('focus'); node.classList.add('hl');
        paths.forEach(function (p) {
          var ends = p.getAttribute('data-link').split(' ');
          if (ends.indexOf(id) === -1) return;
          p.classList.add('hl');
          nodes.forEach(function (n) { if (ends.indexOf(n.getAttribute('data-node')) !== -1) n.classList.add('hl'); });
        });
      });
      node.addEventListener('pointerleave', clear);
    });
  }

  /* ---------- header: compact on scroll, reading progress, current section ---------- */
  var head = document.querySelector('.site-head');
  var navlinks = $$('.navlink');
  var sections = navlinks.map(function (a) { return document.querySelector(a.getAttribute('href')); });

  /* ---------- statement: split into words so they can light up ---------- */
  var statement = document.querySelector('.statement p');
  var words = [];
  if (statement && !reduce) {
    statement.innerHTML = statement.textContent.trim().split(/\s+/).map(function (w) {
      return '<span class="w">' + w + '</span>';
    }).join(' ');
    words = $$('.w', statement);
  }

  /* ---------- counters ---------- */
  var counted = false;
  if (!reduce) $$('.num[data-count]').forEach(function (el) {
    el.textContent = '0' + (el.getAttribute('data-suffix') || '');
  });
  function runCounters() {
    counted = true;
    $$('.num[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count'));
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var suf = el.getAttribute('data-suffix') || '';
      var t0 = null, dur = 1400;
      function step(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = (end * e).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  // progress of an element: 0 when its top enters at the bottom of the screen, 1 when its top reaches 25% from the top
  function progress(el) {
    var vh = window.innerHeight, top = el.getBoundingClientRect().top;
    return Math.max(0, Math.min(1, (vh - top) / (vh * 0.75)));
  }

  /* ---------- companion: a packet on a trace in the left margin ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var trail = null; // {box, path, glows, packet, nodes, spurs, samples, len, cur, v}
  var trailAnchors = ['.hero h1', '#work .sec-head h2', '.statement p', '#about .sec-head h2', '#skills h3', '#contact h2'];

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function buildTrail() {
    if (trail) { trail.box.remove(); trail = null; }
    var wrap = document.querySelector('.wrap');
    var wl = wrap ? wrap.getBoundingClientRect().left : 0;
    var root = document.documentElement;
    if (wl < 56) { root.classList.remove('has-trail'); return; }
    root.classList.add('has-trail');

    var sy = window.scrollY;
    var ys = trailAnchors.map(function (sel) {
      var a = document.querySelector(sel);
      if (!a) return null;
      var r = a.getBoundingClientRect();
      return Math.round(r.top + sy + Math.min(r.height / 2, 24));
    }).filter(function (y) { return y !== null; });
    if (ys.length < 2) return;

    var gx = Math.round(wl * 0.45), jog = 14, endX = Math.round(wl - 14);
    var x = gx, d = 'M' + x + ',' + ys[0];
    var docH = document.documentElement.scrollHeight;
    var box = document.createElement('div');
    box.className = 'trail';
    box.setAttribute('aria-hidden', 'true');
    box.style.width = wl + 'px';
    box.style.height = docH + 'px';
    var svg = el('svg', { width: wl, height: docH });
    var spurs = [], nodes = [];

    ys.forEach(function (y, i) {
      if (i > 0) {
        var nx = i % 2 ? gx + jog : gx;
        d += ' V' + (y - 44) + ' L' + nx + ',' + (y - 44 + Math.abs(nx - x)) + ' V' + y;
        x = nx;
      }
      var sp = el('path', { 'class': 'spur', d: 'M' + x + ',' + y + ' H' + (endX - 5) });
      var nd = el('circle', { 'class': 'node', cx: endX, cy: y, r: 4.5 });
      spurs.push(sp); nodes.push({ el: nd, sp: sp, y: y });
    });

    var bus = el('path', { 'class': 'bus', d: d });
    svg.appendChild(bus);
    spurs.forEach(function (s) { svg.appendChild(s); });
    nodes.forEach(function (n) { svg.appendChild(n.el); });
    // the packet and its streak are plain elements moved with transform only (no SVG repaints while scrolling)
    var packet = document.createElement('div');
    packet.className = 'packet';
    var tail = document.createElement('span');
    tail.className = 'tail';
    packet.appendChild(tail);
    box.appendChild(svg); box.appendChild(packet);
    document.body.appendChild(box);

    // sample the path once: [length, x, y] every 2px
    var len = bus.getTotalLength(), pts = [];
    for (var l = 0; l < len; l += 2) { var q = bus.getPointAtLength(l); pts.push([l, q.x, q.y]); }
    var qe = bus.getPointAtLength(len); pts.push([len, qe.x, qe.y]);
    trail = { box: box, packet: packet, tail: tail, nodes: nodes, pts: pts, len: len, cur: -1, v: 0, t: 0, lit: -1 };
  }

  function lengthAtY(y) {
    var s = trail.pts, lo = 0, hi = s.length - 1;
    if (y <= s[0][2]) return 0;
    if (y >= s[hi][2]) return trail.len;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (s[mid][2] < y) lo = mid; else hi = mid; }
    return s[hi][0];
  }
  function pointAt(l) {
    var s = trail.pts, i = Math.min(s.length - 2, Math.max(0, Math.floor(l / 2)));
    var a = s[i], b = s[i + 1], k = b[0] > a[0] ? (l - a[0]) / (b[0] - a[0]) : 0;
    return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }

  var trailRunning = false;
  function trailTarget() {
    var bottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    return bottom ? trail.len : lengthAtY(window.scrollY + window.innerHeight * 0.42);
  }
  function drawTrail(now) {
    var t = trail, target = trailTarget();
    var dt = t.t ? Math.min(64, now - t.t) : 16;
    t.t = now;
    if (t.cur < 0 || reduce) { t.v = 0; t.cur = target; }
    else {
      // frame-rate independent smoothing: closes ~63% of the gap every 70ms
      var prev = t.cur;
      t.cur += (target - t.cur) * (1 - Math.exp(-dt / 70));
      t.v = (t.cur - prev) / dt; // px per ms
    }
    var p = pointAt(t.cur);
    t.packet.style.transform = 'translate3d(' + p[0].toFixed(1) + 'px,' + p[1].toFixed(1) + 'px,0)';
    // streak behind the packet, longer when it moves faster
    var stretch = Math.min(1, Math.abs(t.v) / 2.5);
    t.tail.style.transform = 'rotate(' + (t.v < 0 ? 180 : 0) + 'deg) scaleY(' + stretch.toFixed(3) + ')';
    var lit = 0;
    t.nodes.forEach(function (n) { if (n.y <= p[1] + 1) lit++; });
    if (lit !== t.lit) {
      t.lit = lit;
      t.nodes.forEach(function (n, i) { var on = i < lit; n.el.classList.toggle('on', on); n.sp.classList.toggle('on', on); });
    }
    if (Math.abs(target - t.cur) > 0.3) requestAnimationFrame(drawTrail);
    else { trailRunning = false; t.t = 0; t.tail.style.transform = 'scaleY(0)'; }
  }
  function kickTrail() {
    if (!trail || trailRunning) return;
    trailRunning = true;
    requestAnimationFrame(drawTrail);
  }
  var rebuildTimer;
  function rebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(function () { buildTrail(); kickTrail(); }, 150);
  }

  var stages = $$('.stage[data-scroll]');
  var line = document.querySelector('.line[data-scroll]');
  var stations = line ? $$('.station', line) : [];
  var ticking = false;

  function update() {
    ticking = false;
    var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
    if (head) {
      head.classList.toggle('scrolled', y > 8);
      head.style.setProperty('--read', max > 0 ? (y / max).toFixed(4) : 0);
    }
    // current section in the nav
    var current = -1;
    sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < window.innerHeight * 0.4) current = i; });
    navlinks.forEach(function (a, i) { if (i === current) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });

    kickTrail();
    if (reduce) return;
    stages.forEach(function (s) {
      var p = progress(s);
      s.style.setProperty('--p', p.toFixed(3));
      if (!counted && s.querySelector('.num') && p > 0.35) runCounters();
    });
    if (line) {
      var lp = progress(line);
      stations.forEach(function (st, i) { st.classList.toggle('on', lp > 0.15 + i * 0.2); });
    }
    if (words.length) {
      var sp = progress(statement) * 1.25;
      var lit = Math.round(sp * words.length);
      words.forEach(function (w, i) { w.classList.toggle('on', i < lit); });
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { onScroll(); rebuild(); });
  // the page can grow after fonts load, so (re)build the trace once layout has settled
  buildTrail();
  update();
  window.addEventListener('load', rebuild);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
})();
