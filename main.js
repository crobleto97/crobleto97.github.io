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

  /* ---------- circuit background: slow parallax ---------- */
  var circuit = document.querySelector('.circuit');

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
    var wide = el('path', { 'class': 'glow wide', d: d });
    var core = el('path', { 'class': 'glow core', d: d });
    svg.appendChild(bus);
    spurs.forEach(function (s) { svg.appendChild(s); });
    svg.appendChild(wide); svg.appendChild(core);
    nodes.forEach(function (n) { svg.appendChild(n.el); });
    var packet = document.createElement('div');
    packet.className = 'packet';
    box.appendChild(svg); box.appendChild(packet);
    document.body.appendChild(box);

    var len = bus.getTotalLength(), samples = [];
    for (var l = 0; l <= len; l += 6) samples.push([l, bus.getPointAtLength(l).y]);
    samples.push([len, bus.getPointAtLength(len).y]);
    trail = { box: box, path: bus, wide: wide, core: core, packet: packet, nodes: nodes, samples: samples, len: len, cur: -1, v: 0 };
  }

  function lengthAtY(y) {
    var s = trail.samples, lo = 0, hi = s.length - 1;
    if (y <= s[0][1]) return 0;
    if (y >= s[hi][1]) return trail.len;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (s[mid][1] < y) lo = mid; else hi = mid; }
    return s[hi][0];
  }

  var trailRunning = false;
  function trailTarget() {
    var bottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    return bottom ? trail.len : lengthAtY(window.scrollY + window.innerHeight * 0.42);
  }
  function drawTrail() {
    var t = trail, target = trailTarget();
    if (t.cur < 0 || reduce) { t.v = 0; t.cur = target; }
    else { var prev = t.cur; t.cur += (target - t.cur) * 0.09; t.v = t.cur - prev; }
    var p = t.path.getPointAtLength(t.cur);
    t.packet.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0)';
    // the tail grows with speed, so a fast scroll leaves a longer streak
    var tail = Math.min(t.cur, 24 + Math.min(150, Math.abs(t.v) * 9));
    var start = t.v >= 0 ? t.cur - tail : t.cur;
    t.wide.setAttribute('stroke-dasharray', '0 ' + Math.max(0, start) + ' ' + tail + ' ' + t.len);
    t.core.setAttribute('stroke-dasharray', '0 ' + Math.max(0, start + tail * 0.45) + ' ' + tail * 0.55 + ' ' + t.len);
    t.nodes.forEach(function (n) {
      var on = n.y <= p.y + 1;
      n.el.classList.toggle('on', on); n.sp.classList.toggle('on', on);
    });
    if (Math.abs(target - t.cur) > 0.3) requestAnimationFrame(drawTrail);
    else trailRunning = false;
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
    if (circuit) circuit.style.setProperty('--py', (-((y * 0.25) % 240)).toFixed(1) + 'px');
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
