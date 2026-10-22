// Shared by every page: flow diagrams built from plain lists.
// The list stays in the page for screen readers and as the no-JS fallback; the SVG is decoration on top.
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  function el(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text) e.textContent = text;
    return e;
  }

  /* ---------- flow diagram ----------
     <figure data-flow><ol class="viz-steps"><li>Step</li>...<li data-branch data-note="why">Side step</li></ol></figure>
     A step with data-branch hangs below the step before it, on a dashed line. */
  function buildFlow(fig) {
    var list = fig.querySelector('.viz-steps');
    if (!list) return;
    var old = fig.querySelector('svg.viz');
    if (old) old.remove();
    var items = $$('li', list).map(function (li) {
      return { label: (li.getAttribute('data-label') || li.textContent).trim(), branch: li.hasAttribute('data-branch'), note: li.getAttribute('data-note') || '', target: li.getAttribute('data-target') };
    });
    var main = items.filter(function (s) { return !s.branch; });
    var side = items.filter(function (s) { return s.branch; })[0];
    var vertical = fig.getAttribute('data-flow') === 'v' || fig.clientWidth < 440;
    var n = main.length, svg, H, W, nodes = [];
    var nw, nh = 44;

    if (!vertical) {
      W = 560; nw = Math.min(100, (W - 24 - (n - 1) * 22) / n);
      var gap = (W - 24 - n * nw) / (n - 1), y = side ? 34 : 46;
      H = side ? 168 : 130;
      main.forEach(function (s, i) { nodes.push({ s: s, x: 12 + i * (nw + gap), y: y, w: nw }); });
    } else {
      W = 300; nw = 170;
      var step = 68;
      main.forEach(function (s, i) { nodes.push({ s: s, x: 20, y: 12 + i * step, w: nw }); });
      H = 12 + n * step - 20;
    }
    var jump = fig.hasAttribute('data-jump');
    svg = el('svg', jump ? { 'class': 'viz', viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': 'Steps' }
                         : { 'class': 'viz', viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', focusable: 'false' });
    svg.style.setProperty('--n', n + (side ? 1 : 0));

    var edges = el('g', {}), flows = el('g', {}), boxes = el('g', {});
    function link(d, dashed) {
      edges.appendChild(el('path', { 'class': 'edge' + (dashed ? ' dashed' : ''), d: d }));
      if (!dashed) flows.appendChild(el('path', { 'class': 'flow', d: d }));
    }
    nodes.forEach(function (nd, i) {
      if (i === 0) return;
      var p = nodes[i - 1];
      if (!vertical) link('M' + (p.x + p.w) + ',' + (p.y + nh / 2) + ' H' + nd.x);
      else link('M' + (p.x + 28) + ',' + (p.y + nh) + ' V' + nd.y);
    });
    function box(nd, kind, idx) {
      var g = el('g', { 'class': 'vn ' + kind, style: '--i:' + idx });
      g.appendChild(el('rect', { x: nd.x, y: nd.y, width: nd.w, height: nh, rx: 9 }));
      g.appendChild(el('text', { x: nd.x + nd.w / 2, y: nd.y + nh / 2 + 5, 'text-anchor': 'middle' }, nd.s.label));
      if (jump && nd.s.target) {
        g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button');
        g.setAttribute('aria-label', 'Read step: ' + nd.s.label);
        var t = nd.s.target;
        var goTo = function () {
          var li = document.getElementById(t); if (!li) return;
          li.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
          li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash');
        };
        g.addEventListener('click', goTo);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(); } });
      }
      boxes.appendChild(g);
    }
    nodes.forEach(function (nd, i) { box(nd, i === 0 ? 'in' : i === n - 1 ? 'out' : 'mid', i); });

    if (side) {
      // the side step hangs off the last main step
      var parent = nodes[n - 1], sy, d;
      if (!vertical) {
        sy = 120;
        d = 'M' + (parent.x + parent.w / 2) + ',' + (parent.y + nh) + ' V' + sy;
        var sn = { s: side, x: parent.x, y: sy, w: parent.w };
        link(d, true);
        box(sn, 'side', n);
        boxes.appendChild(el('text', { 'class': 'note', x: parent.x + parent.w / 2 - 8, y: (parent.y + nh + sy) / 2 + 4, 'text-anchor': 'end' }, side.note));
      } else {
        var last = nodes[n - 1];
        var sn2 = { s: side, x: last.x + 46, y: last.y + 68, w: 150 };
        d = 'M' + (last.x + 28) + ',' + (last.y + nh) + ' V' + (sn2.y + nh / 2) + ' H' + sn2.x;
        link(d, true);
        box(sn2, 'side', n);
        boxes.appendChild(el('text', { 'class': 'note', x: last.x + 36, y: last.y + nh + 16 }, side.note));
        H = sn2.y + nh + 6;
        svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      }
    }
    svg.appendChild(edges); svg.appendChild(flows); svg.appendChild(boxes);
    $$('.flow', flows).forEach(function (f, i) { f.style.animationDelay = (-i * 0.4) + 's'; });
    list.parentNode.insertBefore(svg, list.nextSibling);
    fig.classList.add('built');
    fig.setAttribute('data-layout', vertical ? 'v' : 'h');
  }

  // project pages: draw the "How it works" steps as a diagram in the page header
  $$('ol.flow').forEach(function (ol) {
    var hero = document.querySelector('.proj-hero');
    if (!hero) return;
    var fig = document.createElement('figure');
    fig.className = 'pick-visual proj-visual';
    fig.setAttribute('data-flow', '');
    fig.setAttribute('data-jump', '');
    var cap = document.createElement('figcaption');
    cap.innerHTML = 'How it works <span>select a step to read it</span>';
    var steps = document.createElement('ol');
    steps.className = 'viz-steps';
    $$('li', ol).forEach(function (li, i) {
      var b = li.querySelector('b');
      var s = document.createElement('li');
      s.textContent = (b ? b.textContent : li.textContent).replace(/\.\s*$/, '');
      if (li.hasAttribute('data-branch')) { s.setAttribute('data-branch', ''); s.setAttribute('data-note', li.getAttribute('data-note') || ''); }
      li.id = li.id || 'step-' + (i + 1);
      s.setAttribute('data-target', li.id);
      steps.appendChild(s);
    });
    steps.setAttribute('aria-hidden', 'true'); // the real list is right below in the page
    fig.appendChild(cap); fig.appendChild(steps);
    hero.appendChild(fig);
    hero.classList.add('has-visual');
  });

  var flowFigs = $$('[data-flow]');
  function buildAll(force) {
    flowFigs.forEach(function (f) {
      var want = f.getAttribute('data-flow') === 'v' || f.clientWidth < 440 ? 'v' : 'h';
      if (force || f.getAttribute('data-layout') !== want) buildFlow(f);
    });
  }
  window.Site = { buildFlows: buildAll };
  buildAll(true);
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { buildAll(false); }, 150); });

  // pause looping animations while off screen
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('idle', !e.isIntersecting); });
    });
    flowFigs.forEach(function (f) { io.observe(f); });
  }
})();

/* ---------- command palette (Ctrl/Cmd + K) and mobile menu ---------- */
(function () {
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var inProjects = /\/projects\//.test(location.pathname);
  var base = inProjects ? '../' : '';
  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  var home = base;

  var items = [
    { group: 'Sections', label: 'Home', href: home + '#top', keys: 'top start hero' },
    { group: 'Sections', label: 'Projects', href: base + '#work', keys: 'work building' },
    { group: 'Sections', label: 'About', href: base + '#about', keys: 'experience timeline career' },
    { group: 'Sections', label: 'Skills', href: base + '#skills', keys: 'tools stack' },
    { group: 'Sections', label: 'Contact', href: base + '#contact', keys: 'email hire role' },
    { group: 'Projects', label: 'Operations analytics platform', href: base + 'projects/analytics.html', keys: 'power bi postgresql sql star schema kpi' },
    { group: 'Projects', label: 'Document agent with evaluation', href: base + 'projects/agentic-rag.html', keys: 'rag langgraph pgvector llm' },
    { group: 'Projects', label: 'Taking the agent to production', href: base + 'projects/production.html', keys: 'fastapi docker ci github actions' },
    { group: 'Links', label: 'LinkedIn', href: 'https://www.linkedin.com/in/chris-robleto', keys: 'profile' },
    { group: 'Links', label: 'GitHub', href: 'https://github.com/crobleto97', keys: 'code repositories' },
    { group: 'Links', label: 'Email cgalileorr97@gmail.com', href: 'mailto:cgalileorr97@gmail.com', keys: 'mail contact' },
    { group: 'Links', label: 'CV in English (PDF)', href: base + 'cv/Christian_Robleto_CV_EN.pdf', keys: 'resume cv' },
    { group: 'Links', label: 'CV en español (PDF)', href: base + 'cv/Christian_Robleto_CV_ES.pdf', keys: 'resume cv spanish' },
    { group: 'Actions', label: 'Switch light / dark theme', action: function () { var t = document.querySelector('.theme-toggle'); if (t) t.click(); }, keys: 'theme dark light mode' }
  ];

  var dlg = document.createElement('dialog');
  dlg.className = 'cmdk';
  dlg.setAttribute('aria-label', 'Search and jump');
  dlg.innerHTML =
    '<div class="cmdk-box">' +
    '<div class="cmdk-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>' +
    '<input id="cmdk-input" type="text" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" ' +
    'placeholder="Search sections, projects and links" autocomplete="off" spellcheck="false">' +
    '<kbd>Esc</kbd></div>' +
    '<ul id="cmdk-list" role="listbox" aria-label="Results"></ul>' +
    '<p class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></p>' +
    '</div>';
  document.body.appendChild(dlg);
  var input = dlg.querySelector('input'), list = dlg.querySelector('ul');
  var shown = [], active = 0;

  function render() {
    var q = input.value.trim().toLowerCase();
    shown = items.filter(function (it) { return !q || (it.label + ' ' + it.group + ' ' + it.keys).toLowerCase().indexOf(q) !== -1; });
    list.innerHTML = '';
    if (!shown.length) {
      var e = document.createElement('li'); e.className = 'cmdk-empty'; e.textContent = 'No matches. Try "projects", "cv" or "contact".';
      list.appendChild(e); input.removeAttribute('aria-activedescendant'); return;
    }
    var last = null;
    shown.forEach(function (it, i) {
      if (it.group !== last) {
        var g = document.createElement('li'); g.className = 'cmdk-group'; g.setAttribute('role', 'presentation'); g.textContent = it.group;
        list.appendChild(g); last = it.group;
      }
      var li = document.createElement('li');
      li.id = 'cmdk-opt-' + i; li.setAttribute('role', 'option'); li.className = 'cmdk-opt';
      li.textContent = it.label;
      li.addEventListener('mousemove', function () { if (active !== i) { active = i; mark(); } });
      li.addEventListener('click', function () { go(i); });
      list.appendChild(li);
    });
    active = Math.min(active, shown.length - 1);
    mark();
  }
  function mark() {
    $$('.cmdk-opt', list).forEach(function (li, i) {
      var on = i === active; li.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
    });
  }
  function go(i) {
    var it = shown[i]; if (!it) return;
    close();
    if (it.action) it.action();
    else location.href = it.href;
  }
  function open() {
    if (dlg.open) return;
    input.value = ''; active = 0; render();
    dlg.showModal(); input.focus();
  }
  function close() { if (dlg.open) dlg.close(); }
  input.addEventListener('input', function () { active = 0; render(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % shown.length; mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + shown.length) % shown.length; mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(active); }
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); dlg.open ? close() : open(); }
  });
  $$('.cmdk-btn').forEach(function (b) {
    var k = b.querySelector('kbd'); if (k) k.textContent = isMac ? '⌘K' : 'Ctrl K';
    b.setAttribute('aria-keyshortcuts', isMac ? 'Meta+K' : 'Control+K');
    b.addEventListener('click', open);
  });

  /* mobile menu */
  var btn = document.querySelector('.menu-btn'), menu = document.getElementById('mobile-menu');
  if (btn && menu) {
    function setMenu(on) {
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? 'Close menu' : 'Open menu');
      menu.hidden = !on;
      document.documentElement.classList.toggle('menu-open', on);
      if (on) { var f = menu.querySelector('a,button'); if (f) f.focus(); }
    }
    btn.addEventListener('click', function () { setMenu(menu.hidden); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    var ms = menu.querySelector('[data-open-search]');
    if (ms) ms.addEventListener('click', function () { setMenu(false); open(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) setMenu(false); });
    window.addEventListener('resize', function () { if (!menu.hidden && window.innerWidth > 820) setMenu(false); });
  }
})();
