// Small, dependency-free interactions. Without JS (or with reduced motion) everything shows in its final state.
// Performance rules: no layout reads after writes in the same frame, decorative animations pause off screen,
// and nothing chases the scroll position from JavaScript.
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  root.classList.add('js');
  if (reduce) root.classList.add('reduce');
  var hasIO = 'IntersectionObserver' in window;
  var T = function (en, es) { return window.I18N ? I18N.t(en, es) : en; };
  var onLang = function (fn) { document.addEventListener('langchange', fn); };

  // Pause CSS animations inside an element while it is off screen.
  function pauseOffscreen(el) {
    if (!el || !hasIO) return;
    new IntersectionObserver(function (es) { el.classList.toggle('idle', !es[0].isIntersecting); }).observe(el);
  }

  /* ---------- hero: living data network ----------
     Static edges, small data packets travelling along them (SVG animateMotion, paused off screen),
     a pulse when a packet reaches a node, and a selectable step with a description panel. */
  var dag = document.querySelector('.dag');
  if (dag) {
    var SVGNS = 'http://www.w3.org/2000/svg';
    var mk = function (n, a) { var e = document.createElementNS(SVGNS, n); for (var k in a) e.setAttribute(k, a[k]); return e; };
    var paths = $$('[data-link]', dag), dnodes = $$('.n', dag);
    var byId = {};
    dnodes.forEach(function (n) {
      byId[n.getAttribute('data-node')] = n;
      n.classList.add('k-' + (n.getAttribute('data-kind') || '').toLowerCase());
      var r = n.querySelector('.box');
      var x = +r.getAttribute('x'), y = +r.getAttribute('y'), w = +r.getAttribute('width'), h = +r.getAttribute('height');
      // a pulse plate that flashes when a packet arrives (shadow and focus ring are in the markup)
      n.insertBefore(mk('rect', { 'class': 'pulse', x: x, y: y, width: w, height: h, rx: 8 }), r);
    });
    var packets = mk('g', { 'class': 'packets' });
    if (!reduce) dag.classList.add('enter'); // one-time draw-in of edges and nodes
    if (!reduce) {
      paths.forEach(function (p, i) {
        var ends = p.getAttribute('data-link').split(' ');
        p.id = 'edge-' + ends.join('-');
        var dur = 2.8 + (i % 3) * 0.35;
        var c = mk('circle', { 'class': 'pk', r: 2.6, 'data-link': p.getAttribute('data-link') });
        var am = mk('animateMotion', { dur: dur + 's', repeatCount: 'indefinite', begin: (-i * 0.53).toFixed(2) + 's', calcMode: 'spline', keyTimes: '0;1', keySplines: '.45 0 .55 1' });
        am.appendChild(mk('mpath', { href: '#' + p.id }));
        c.appendChild(am);
        packets.appendChild(c);
        // pulse the node the packet arrives at
        var target = byId[ends[1]];
        am.addEventListener('repeatEvent', function () {
          if (!target || dag.classList.contains('idle')) return;
          target.classList.remove('ping'); void target.getBoundingClientRect(); target.classList.add('ping');
        });
      });
      // packets travel under the nodes, over the edges
      dag.querySelector('.particles').appendChild(packets);
    }
    if (hasIO) new IntersectionObserver(function (es) {
      var on = es[0].isIntersecting;
      dag.classList.toggle('idle', !on);
      if (dag.pauseAnimations) { if (on) dag.unpauseAnimations(); else dag.pauseAnimations(); }
    }).observe(dag);

    var wrap = dag.closest('.dag-wrap');
    var info = wrap && wrap.querySelector('.dag-info');
    var selected = null, shownId = null;
    var KIND_ES = { Source: 'Fuente', Processing: 'Procesamiento', Output: 'Salida' };
    var kindOf = function (n) { var k = n.getAttribute('data-kind'); return T(k, KIND_ES[k] || k); };
    var infoOf = function (n) { return T(n.getAttribute('data-info'), n.getAttribute('data-info-es') || n.getAttribute('data-info')); };
    function highlight(node) {
      var id = node.getAttribute('data-node');
      dag.classList.add('focus');
      dnodes.forEach(function (n) { n.classList.toggle('hl', n === node); });
      paths.concat($$('.pk', dag)).forEach(function (p) {
        var ends = p.getAttribute('data-link').split(' ');
        var on = ends.indexOf(id) !== -1;
        p.classList.toggle('hl', on);
        if (on) ends.forEach(function (e) { if (byId[e]) byId[e].classList.add('hl'); });
      });
      if (info && shownId !== id) {
        shownId = id;
        info.querySelector('.dag-kind > span').textContent = kindOf(node);
        info.querySelector('.dag-title').textContent = node.querySelector('text').textContent;
        info.querySelector('.dag-text').textContent = infoOf(node);
        info.setAttribute('data-kind', node.getAttribute('data-kind'));
        if (!reduce) { info.classList.remove('swap'); void info.offsetWidth; info.classList.add('swap'); }
      }
    }
    function choose(node) {
      if (selected) { selected.classList.remove('sel'); selected.setAttribute('aria-pressed', 'false'); }
      selected = node;
      node.classList.add('sel'); node.setAttribute('aria-pressed', 'true');
      highlight(node);
    }
    var order = dnodes.slice();
    dnodes.forEach(function (node, i) {
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.setAttribute('aria-pressed', 'false');
      node.addEventListener('click', function () { choose(node); });
      node.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(node); }
        // arrow keys move between steps
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
          order[(i + d + order.length) % order.length].focus();
        }
      });
      node.addEventListener('focus', function () { highlight(node); });
      node.addEventListener('blur', function () { if (selected) highlight(selected); });
      // hover previews a step; leaving goes back to the selected one
      node.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') highlight(node); });
      node.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && selected) highlight(selected); });
    });
    dag.setAttribute('role', 'group');
    function nodeLabels() {
      dnodes.forEach(function (node) {
        var label = node.querySelector('text').textContent;
        node.setAttribute('aria-label', T(label + ', ' + kindOf(node).toLowerCase() + ' step', label + ', paso de ' + kindOf(node).toLowerCase()));
      });
    }
    nodeLabels();
    var start = byId.val;
    if (start) choose(start);
    onLang(function () { nodeLabels(); shownId = null; if (selected) highlight(selected); });
  }

  /* ---------- project picker ("select your character") ---------- */
  var picker = document.querySelector('.picker');
  if (picker) {
    var picks = $$('.pick', picker);
    var stage = picker.querySelector('.pick-stage');
    // numbered projects: not locked and not marked as a side project
    var numbered = picks.filter(function (p) { return !p.classList.contains('locked') && !p.hasAttribute('data-side'); });
    var real = numbered.length;
    var shortOf = function (p) { return T(p.getAttribute('data-short'), p.getAttribute('data-short-es') || p.getAttribute('data-short')); };
    var ICON_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
    var ICON_SIDE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>';
    var nextBtns = [];
    var current = 0;
    picker.classList.add('on');
    pauseOffscreen(picker);

    var roster = document.createElement('div');
    roster.className = 'roster';
    roster.setAttribute('role', 'tablist');
    var prev = document.createElement('button');
    prev.type = 'button'; prev.className = 'pick-arrow';
    prev.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
    var next = prev.cloneNode(true);
    next.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

    var tabs = picks.map(function (p, i) {
      var t = document.createElement('button');
      t.type = 'button';
      t.className = 'tile';
      t.id = 'tab-' + p.id;
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-controls', p.id);
      t.setAttribute('data-status', p.getAttribute('data-status'));
      var locked = p.classList.contains('locked');
      var side = p.hasAttribute('data-side');
      t.innerHTML = '<span class="tile-num">' + (locked ? ICON_LOCK : side ? ICON_SIDE : (numbered.indexOf(p) + 1)) +
        '</span><span class="tile-name"></span><span class="tile-dot" aria-hidden="true"></span>' +
        '<span class="tile-bar" aria-hidden="true" style="--v:' + ((p.querySelector('.meter') || { style: { getPropertyValue: function () { return ''; } } }).style.getPropertyValue('--v') || (locked ? '0' : '0')) + '"></span>';
      t.addEventListener('click', function () { select(i, true); });
      p.setAttribute('role', 'tabpanel');
      p.setAttribute('aria-labelledby', t.id);
      // "next" button inside each card
      var actions = p.querySelector('.pick-actions') || (function () {
        var d = document.createElement('div'); d.className = 'pick-actions'; p.querySelector('.pick-main').appendChild(d); return d;
      })();
      var nb = document.createElement('button');
      nb.type = 'button'; nb.className = 'btn';
      var ni = (i + 1) % picks.length;
      nextBtns.push({ el: nb, to: ni });
      nb.addEventListener('click', function () { select(ni, false, 1); tabs[ni].focus({ preventScroll: true }); });
      actions.appendChild(nb);
      roster.appendChild(t);
      return t;
    });

    // every text the picker writes, in the current language
    function pickerLabels() {
      roster.setAttribute('aria-label', T('Projects', 'Proyectos'));
      prev.setAttribute('aria-label', T('Previous project', 'Proyecto anterior'));
      next.setAttribute('aria-label', T('Next project', 'Proyecto siguiente'));
      picks.forEach(function (p, k) {
        tabs[k].querySelector('.tile-name').textContent = shortOf(p);
        var n = numbered.indexOf(p), num = p.querySelector('.pick-num');
        if (num && n !== -1) num.textContent = T('Project ' + (n + 1) + ' of ' + real, 'Proyecto ' + (n + 1) + ' de ' + real);
      });
      nextBtns.forEach(function (b) {
        b.el.innerHTML = (b.to === 0 ? T('Back to the first', 'Volver al primero') : T('Next: ', 'Siguiente: ') + shortOf(picks[b.to])) +
          ' <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
      });
    }
    pickerLabels();
    onLang(pickerLabels);

    var bar = document.createElement('div');
    bar.className = 'roster-bar';
    bar.appendChild(prev); bar.appendChild(roster); bar.appendChild(next);
    picker.appendChild(bar);

    function select(i, focusTab, dir) {
      i = (i + picks.length) % picks.length;
      if (dir === undefined) dir = i > current ? 1 : (i < current ? -1 : 0);
      picks.forEach(function (p, k) {
        var on = k === i;
        p.classList.toggle('active', on);
        p.classList.remove('from-left', 'from-right');
        if (on && dir && !reduce) { void p.offsetWidth; p.classList.add(dir > 0 ? 'from-right' : 'from-left'); }
        // replay the card's diagram entrance
        if (on && !reduce) $$('svg.xp, svg.viz', p).forEach(function (s) { s.classList.remove('enter'); void s.getBoundingClientRect(); s.classList.add('enter'); });
        if (on) p.removeAttribute('inert'); else p.setAttribute('inert', '');
        p.setAttribute('aria-hidden', on ? 'false' : 'true');
        tabs[k].setAttribute('aria-selected', on ? 'true' : 'false');
        tabs[k].tabIndex = on ? 0 : -1;
      });
      current = i;
      if (focusTab) tabs[i].focus({ preventScroll: true });
      // keep the active tile visible when the roster scrolls sideways (phones)
      if (roster.scrollWidth > roster.clientWidth) {
        var t = tabs[i];
        roster.scrollTo({ left: t.offsetLeft - (roster.clientWidth - t.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
      }
    }
    prev.addEventListener('click', function () { select(current - 1, false, -1); });
    next.addEventListener('click', function () { select(current + 1, false, 1); });
    roster.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowLeft' || k === 'Home' || k === 'End') {
        e.preventDefault();
        select(k === 'Home' ? 0 : k === 'End' ? picks.length - 1 : current + (k === 'ArrowRight' ? 1 : -1), true,
          k === 'ArrowLeft' || k === 'Home' ? -1 : 1);
      }
    });
    // swipe on touch screens
    var sx = null, sy = null;
    stage.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    stage.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) select(current + (dx < 0 ? 1 : -1), false, dx < 0 ? 1 : -1);
    });
    select(0, false, 0);
  }

  /* ---------- scroll storytelling: headings and blocks rise once as they enter ---------- */
  if (!reduce && hasIO) {
    var vh0 = window.innerHeight;
    var risers = $$('.sec-head, .statement p, .about .story, .timeline, .skills > div, .contact .stage-inner > *, .picker');
    var ro = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('pre'); ro.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    risers.forEach(function (el, i) {
      if (el.getBoundingClientRect().top > vh0) {
        el.classList.add('pre', 'rise');
        // siblings inside the closing screen arrive one after another
        if (el.parentNode.classList.contains('stage-inner')) el.style.transitionDelay = (Array.prototype.indexOf.call(el.parentNode.children, el) * 70) + 'ms';
        ro.observe(el);
      }
    });
  }

  /* ---------- copy email ---------- */
  $$('[data-copy]').forEach(function (b) {
    var status = b.parentNode.querySelector('.copy-status');
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy');
      function done(ok) {
        if (status) status.textContent = ok ? T('Email address copied', 'Email copiado') : T('Select and copy: ', 'Selecciona y copia: ') + text;
        if (!ok) return;
        b.classList.add('done');
        clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('done'); }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
      else fallback();
      function fallback() {
        var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
        t.remove(); done(ok);
      }
    });
  });

  /* ---------- timeline: emphasise the stop in the middle of the screen ---------- */
  var stops = $$('.timeline li');
  if (stops.length && hasIO) {
    var tio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('cur', e.isIntersecting); });
    }, { rootMargin: '-48% 0px -48% 0px' });
    stops.forEach(function (s) { tio.observe(s); });
  }

  /* ---------- statement: split into words so they can light up ---------- */
  var statement = document.querySelector('.statement p');
  var words = [], litWords = -1, statementNear = false;
  if (statement && !reduce) {
    var parts = $$('[lang]', statement);
    (parts.length ? parts : [statement]).forEach(function (part) {
      part.innerHTML = part.textContent.trim().split(/\s+/).map(function (w) {
        return '<span class="w">' + w + '</span>';
      }).join(' ');
    });
    var pickWords = function () {
      var vis = statement.querySelector('[lang="' + (window.I18N ? I18N.lang : 'en') + '"]') || statement;
      words = $$('.w', vis); litWords = -1;
    };
    pickWords();
    onLang(function () { pickWords(); onScroll(); });
    if (hasIO) new IntersectionObserver(function (es) { statementNear = es[0].isIntersecting; onScroll(); },
      { rootMargin: '20% 0px' }).observe(statement);
    else statementNear = true;
  }

  /* ---------- counters: start when the numbers panel comes into view ---------- */
  var nums = $$('.num[data-count]');
  var fmt = function (v, dec) { return v.toLocaleString(T('en-US', 'es-ES'), { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: 'always' }); };
  var countersRan = false;
  function runCounters() {
    countersRan = true;
    nums.forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count'));
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var suf = el.getAttribute('data-suffix') || '';
      var t0 = null, dur = 1400;
      function step(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(end * e, dec) + suf;
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }
  if (nums.length && !reduce && hasIO) {
    nums.forEach(function (el) { el.textContent = '0' + (el.getAttribute('data-suffix') || ''); });
    var co = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { co.disconnect(); runCounters(); }
    }, { threshold: 0.4 });
    co.observe(nums[0].closest('.stage') || nums[0]);
    onLang(function () {
      if (!countersRan) return;
      nums.forEach(function (el) {
        el.textContent = fmt(parseFloat(el.getAttribute('data-count')), parseInt(el.getAttribute('data-decimals') || '0', 10)) + (el.getAttribute('data-suffix') || '');
      });
    });
  }

  /* ---------- header: current section via IntersectionObserver ---------- */
  var head = document.querySelector('.site-head');
  var progressBar = head && head.querySelector('.progress');
  var navlinks = $$('.navlink');
  if (hasIO && navlinks.length) {
    var secs = navlinks.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    var visible = {};
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var cur = -1;
      secs.forEach(function (s, i) { if (s && visible[s.id]) cur = i; });
      navlinks.forEach(function (a, i) { if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach(function (s) { if (s) so.observe(s); });
  }

  /* ---------- companion: a packet fixed on screen, riding a trace that scrolls past underneath ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var trail = null;
  var trailAnchors = ['.hero h1', '#work .sec-head h2', '.statement p', '#about .sec-head h2', '#skills h3', '#contact h2'];
  var PACKET_AT = 0.42; // fraction of the viewport height where the packet sits

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function buildTrail() {
    if (trail) { trail.box.remove(); trail.packet.remove(); trail = null; }
    var wrap = document.querySelector('.wrap');
    var wl = wrap ? wrap.getBoundingClientRect().left : 0;
    if (wl < 56) { root.classList.remove('has-trail'); return; }

    var sy = window.scrollY;
    var ys = trailAnchors.map(function (sel) {
      var a = document.querySelector(sel);
      if (!a) return null;
      var r = a.getBoundingClientRect();
      return Math.round(r.top + sy + Math.min(r.height / 2, 24));
    }).filter(function (y) { return y !== null; });
    if (ys.length < 2) return;
    root.classList.add('has-trail');

    var gx = Math.round(wl * 0.45), jog = 14, endX = Math.round(wl - 14);
    var x = gx, d = 'M' + x + ',' + ys[0];
    var docH = root.scrollHeight;
    var box = document.createElement('div');
    box.className = 'trail';
    box.setAttribute('aria-hidden', 'true');
    box.style.width = wl + 'px';
    box.style.height = docH + 'px';
    var svg = el('svg', { width: wl, height: docH });
    var nodes = [], segs = [];
    ys.forEach(function (y, i) {
      if (i > 0) {
        var nx = i % 2 ? gx + jog : gx, y0 = y - 44;
        d += ' V' + y0 + ' L' + nx + ',' + (y0 + Math.abs(nx - x)) + ' V' + y;
        segs.push([y0, y0 + Math.abs(nx - x), x, nx]); // diagonal jog: from y0 to y1, x goes from x to nx
        x = nx;
      }
      var sp = el('path', { 'class': 'spur', d: 'M' + x + ',' + y + ' H' + (endX - 5) });
      var nd = el('circle', { 'class': 'node', cx: endX, cy: y, r: 4.5 });
      svg.appendChild(sp);
      nodes.push({ el: nd, sp: sp, y: y });
    });
    svg.insertBefore(el('path', { 'class': 'bus', d: d }), svg.firstChild);
    nodes.forEach(function (n) { svg.appendChild(n.el); });
    box.appendChild(svg);
    document.body.appendChild(box);

    var packet = document.createElement('div');
    packet.className = 'packet';
    packet.setAttribute('aria-hidden', 'true');
    var tail = document.createElement('span');
    tail.className = 'tail';
    packet.appendChild(tail);
    document.body.appendChild(packet);
    trail = { box: box, packet: packet, tail: tail, nodes: nodes, segs: segs, gx: gx,
      y0: ys[0], y1: ys[ys.length - 1], lit: -1, lastX: null, lastDy: null };
  }

  function busX(y) {
    var x = trail.gx;
    for (var i = 0; i < trail.segs.length; i++) {
      var s = trail.segs[i];
      if (y < s[0]) return x;
      if (y < s[1]) return s[2] + (s[3] - s[2]) * (y - s[0]) / (s[1] - s[0]);
      x = s[3];
    }
    return x;
  }

  var lastY = window.scrollY, lastT = 0, settle = null;
  function updateTrail(y, vh) {
    var t = trail;
    var docY = y + vh * PACKET_AT;
    // outside the trace, the packet parks at its first or last node and scrolls with the page
    var clampY = Math.max(t.y0, Math.min(t.y1, docY));
    var dy = Math.round(clampY - docY);
    var px = Math.round(busX(clampY) * 2) / 2;
    if (px !== t.lastX || dy !== t.lastDy) {
      t.packet.style.transform = 'translate3d(' + px + 'px,' + dy + 'px,0)';
      t.lastX = px; t.lastDy = dy;
    }
    var lit = 0;
    for (var i = 0; i < t.nodes.length; i++) if (t.nodes[i].y <= clampY + 1) lit++;
    if (lit !== t.lit) {
      t.lit = lit;
      t.nodes.forEach(function (n, k) { var on = k < lit; n.el.classList.toggle('on', on); n.sp.classList.toggle('on', on); });
    }
    if (!reduce) {
      // streak length follows scroll speed, then relaxes (CSS transition)
      var now = performance.now(), dt = now - lastT;
      if (dt > 0 && dt < 200) {
        var v = (y - lastY) / dt;
        var s = Math.min(1, Math.abs(v) / 2.2);
        t.tail.style.transform = 'rotate(' + (v < 0 ? 180 : 0) + 'deg) scaleY(' + s.toFixed(2) + ')';
      }
      lastT = now;
      clearTimeout(settle);
      settle = setTimeout(function () { if (trail) trail.tail.style.transform = 'scaleY(0)'; }, 90);
    }
  }

  var rebuildTimer;
  function rebuild() {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(function () { buildTrail(); onScroll(); }, 150);
  }

  /* ---------- one scroll handler: read everything first, then write ---------- */
  var ticking = false, scrolled = null;
  function update() {
    ticking = false;
    // reads
    var y = window.scrollY, vh = window.innerHeight, max = root.scrollHeight - vh;
    var stTop = statementNear && words.length ? statement.getBoundingClientRect().top : null;
    // writes
    var isScrolled = y > 8;
    if (head && isScrolled !== scrolled) { head.classList.toggle('scrolled', isScrolled); scrolled = isScrolled; }
    if (progressBar) progressBar.style.transform = 'scaleX(' + (max > 0 ? (y / max).toFixed(4) : 0) + ')';
    if (stTop !== null) {
      var p = Math.max(0, Math.min(1, (vh - stTop) / (vh * 0.75))) * 1.25;
      var lit = Math.round(p * words.length);
      if (lit !== litWords) {
        litWords = lit;
        words.forEach(function (w, i) { w.classList.toggle('on', i < lit); });
      }
    }
    if (trail) updateTrail(y, vh);
    lastY = y;
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { onScroll(); rebuild(); });
  buildTrail();
  update();
  window.addEventListener('load', rebuild);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);
})();
