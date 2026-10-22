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
  window.addEventListener('resize', onScroll);
  update();
})();
