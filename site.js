// Shared by every page: flow diagrams built from plain lists.
// The list stays in the page for screen readers and as the no-JS fallback; the SVG is decoration on top.

// Language: put Spanish attributes and plain-text elements in place before any script reads them.
if (window.I18N) I18N.apply();
function T(en, es) { return window.I18N ? I18N.t(en, es) : en; }
function onLang(fn) { document.addEventListener('langchange', fn); }

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
      return { label: (li.getAttribute('data-label') || li.textContent).trim(), branch: li.hasAttribute('data-branch'),
        note: T(li.getAttribute('data-note') || '', li.getAttribute('data-note-es') || li.getAttribute('data-note') || ''), target: li.getAttribute('data-target') };
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
    svg = el('svg', jump ? { 'class': 'viz', viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': T('Steps', 'Pasos') }
                         : { 'class': 'viz', viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': 'true', focusable: 'false' });
    svg.style.setProperty('--n', n + (side ? 1 : 0));

    var edges = el('g', {}), flows = el('g', {}), boxes = el('g', {});
    function link(d, dashed) {
      var ea = { 'class': 'edge' + (dashed ? ' dashed' : ''), d: d };
      if (!dashed) ea.pathLength = 1;
      edges.appendChild(el('path', ea));
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
        g.setAttribute('aria-label', T('Read step: ', 'Leer paso: ') + nd.s.label);
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
    cap.innerHTML = '<span lang="en">How it works</span><span lang="es">Cómo funciona</span>' +
      '<span class="sub"><span lang="en">select a step to read it</span><span lang="es">selecciona un paso para leerlo</span></span>';
    var steps = document.createElement('ol');
    steps.className = 'viz-steps';
    $$('li', ol).forEach(function (li, i) {
      var name = function (l) {
        var b = li.querySelector(':scope > [lang="' + l + '"] b') || li.querySelector('b');
        return (b ? b.textContent : li.textContent).replace(/\.\s*$/, '');
      };
      var s = document.createElement('li');
      s.textContent = name(window.I18N ? I18N.lang : 'en');
      s.setAttribute('data-en', name('en'));
      s.setAttribute('data-es', name('es'));
      if (li.hasAttribute('data-branch')) {
        s.setAttribute('data-branch', '');
        s.setAttribute('data-note', li.getAttribute('data-note') || '');
        if (li.hasAttribute('data-note-es')) s.setAttribute('data-note-es', li.getAttribute('data-note-es'));
      }
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
  onLang(function () { buildAll(true); });
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

  var G = { Sections: 'Secciones', Projects: 'Proyectos', Links: 'Enlaces', Actions: 'Acciones' };
  var items = [
    { group: 'Sections', label: 'Home', es: 'Inicio', href: home + '#top', keys: 'top start hero portada' },
    { group: 'Sections', label: 'Projects', es: 'Proyectos', href: base + '#work', keys: 'work building trabajo' },
    { group: 'Sections', label: 'About', es: 'Sobre mí', href: base + '#about', keys: 'experience timeline career experiencia trayectoria' },
    { group: 'Sections', label: 'Skills', es: 'Habilidades', href: base + '#skills', keys: 'tools stack herramientas' },
    { group: 'Sections', label: 'Contact', es: 'Contacto', href: base + '#contact', keys: 'email hire role contactar' },
    { group: 'Projects', label: 'Operations analytics platform', es: 'Plataforma de analítica de operaciones', href: base + 'projects/analytics.html', keys: 'power bi postgresql sql star schema kpi analitica' },
    { group: 'Projects', label: 'Document agent with evaluation', es: 'Agente documental con evaluación', href: base + 'projects/agentic-rag.html', keys: 'rag langgraph pgvector llm agente' },
    { group: 'Projects', label: 'Taking the agent to production', es: 'Llevar el agente a producción', href: base + 'projects/production.html', keys: 'fastapi docker ci github actions produccion' },
    { group: 'Projects', label: 'Castles of Navarre map', es: 'Mapa de los castillos de Navarra', href: base + 'projects/castles-map.html', keys: 'map 3d castillos navarra maplibre wikidata openstreetmap side project mapa' },
    { group: 'Links', label: 'LinkedIn', href: 'https://www.linkedin.com/in/chris-robleto', keys: 'profile perfil' },
    { group: 'Links', label: 'GitHub', href: 'https://github.com/crobleto97', keys: 'code repositories codigo' },
    { group: 'Links', label: 'Email cgalileorr97@gmail.com', es: 'Email cgalileorr97@gmail.com', href: 'mailto:cgalileorr97@gmail.com', keys: 'mail contact correo' },
    { group: 'Links', label: 'CV in English (PDF)', href: base + 'cv/Christian_Robleto_CV_EN.pdf', keys: 'resume cv ingles' },
    { group: 'Links', label: 'CV en español (PDF)', href: base + 'cv/Christian_Robleto_CV_ES.pdf', keys: 'resume cv spanish espanol' },
    { group: 'Actions', label: 'Switch light / dark theme', es: 'Cambiar tema claro / oscuro', action: function () { var t = document.querySelector('.theme-toggle'); if (t) t.click(); }, keys: 'theme dark light mode tema' },
    { group: 'Actions', label: 'Ver en español', es: 'View in English', action: function () { if (window.I18N) I18N.set(I18N.lang === 'es' ? 'en' : 'es'); }, keys: 'language idioma english espanol spanish ingles' },
    { group: 'Actions', label: 'Open terminal', es: 'Abrir terminal', action: function () { openTerminal(); }, keys: 'terminal console shell cli developer consola' }
  ];
  var labelOf = function (it) { return T(it.label, it.es || it.label); };
  var norm = function (x) { return x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };

  var dlg = document.createElement('dialog');
  dlg.className = 'cmdk';
  dlg.innerHTML =
    '<div class="cmdk-box">' +
    '<div class="cmdk-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>' +
    '<input id="cmdk-input" type="text" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" ' +
    'autocomplete="off" spellcheck="false">' +
    '<kbd>Esc</kbd></div>' +
    '<ul id="cmdk-list" role="listbox"></ul>' +
    '<p class="cmdk-foot"></p>' +
    '</div>';
  function paletteLabels() {
    dlg.setAttribute('aria-label', T('Search and jump', 'Buscar en la web'));
    dlg.querySelector('input').setAttribute('placeholder', T('Search sections, projects and links', 'Busca secciones, proyectos y enlaces'));
    dlg.querySelector('ul').setAttribute('aria-label', T('Results', 'Resultados'));
    dlg.querySelector('.cmdk-foot').innerHTML = '<span><kbd>↑</kbd><kbd>↓</kbd> ' + T('move', 'moverse') + '</span><span><kbd>Enter</kbd> ' +
      T('open', 'abrir') + '</span><span><kbd>Esc</kbd> ' + T('close', 'cerrar') + '</span>';
  }
  paletteLabels();
  onLang(paletteLabels);
  document.body.appendChild(dlg);
  var input = dlg.querySelector('input'), list = dlg.querySelector('ul');
  var shown = [], active = 0;

  function render() {
    var q = norm(input.value.trim());
    shown = items.filter(function (it) { return !q || norm(it.label + ' ' + (it.es || '') + ' ' + it.group + ' ' + G[it.group] + ' ' + it.keys).indexOf(q) !== -1; });
    list.innerHTML = '';
    if (!shown.length) {
      var e = document.createElement('li'); e.className = 'cmdk-empty'; e.textContent = T('No matches. Try "projects", "cv" or "contact".', 'Sin resultados. Prueba con "proyectos", "cv" o "contacto".');
      list.appendChild(e); input.removeAttribute('aria-activedescendant'); return;
    }
    var last = null;
    shown.forEach(function (it, i) {
      if (it.group !== last) {
        var g = document.createElement('li'); g.className = 'cmdk-group'; g.setAttribute('role', 'presentation'); g.textContent = T(it.group, G[it.group]);
        list.appendChild(g); last = it.group;
      }
      var li = document.createElement('li');
      li.id = 'cmdk-opt-' + i; li.setAttribute('role', 'option'); li.className = 'cmdk-opt';
      li.textContent = labelOf(it);
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
  $$('.kbd-k').forEach(function (k) { k.textContent = isMac ? '⌘K' : 'Ctrl K'; });
  $$('.cmdk-btn').forEach(function (b) {
    var k = b.querySelector('kbd'); if (k) k.textContent = isMac ? '⌘K' : 'Ctrl K';
    b.setAttribute('aria-keyshortcuts', isMac ? 'Meta+K' : 'Control+K');
    b.addEventListener('click', open);
  });

  /* ---------- terminal (an easter egg opened from the palette) ----------
     Commands read the real page content, from this page or from the home page, so nothing is duplicated. */
  var term = null, termData = null, hist = [], hpos = 0;
  var CMDS = ['help', 'projects', 'open', 'about', 'skills', 'contact', 'cv', 'theme', 'lang', 'clear', 'exit'];
  termData = {};
  function loadData() {
    var L = window.I18N ? I18N.lang : 'en';
    if (termData[L]) return Promise.resolve(termData[L]);
    var fromHome = document.querySelector('#about') ? Promise.resolve(document)
      : fetch(base + 'index.html').then(function (r) { return r.text(); }).then(function (t) { return new DOMParser().parseFromString(t, 'text/html'); });
    return fromHome.then(function (doc) {
      var txt = function (el) { return !el ? '' : window.I18N ? I18N.text(el) : el.textContent.replace(/\s+/g, ' ').trim(); };
      var data = {
        projects: Array.prototype.map.call(doc.querySelectorAll('.pick'), function (p) {
          var a = p.querySelector('h3 a');
          return { title: txt(p.querySelector('h3')), status: txt(p.querySelector('.status')), href: a ? base + a.getAttribute('href') : null };
        }),
        story: Array.prototype.map.call(doc.querySelectorAll('#about .story p'), txt),
        journey: Array.prototype.map.call(doc.querySelectorAll('.timeline li'), function (li) {
          return txt(li.querySelector('.when')) + '  ' + txt(li.querySelector('strong')) + ', ' + txt(li.querySelector('.what'));
        }),
        skills: Array.prototype.map.call(doc.querySelectorAll('.skills > div'), function (d) {
          return { title: txt(d.querySelector('h3')), tags: Array.prototype.map.call(d.querySelectorAll('.tags li'), txt) };
        })
      };
      termData[L] = data;
      return data;
    });
  }
  function buildTerminal() {
    term = document.createElement('dialog');
    term.className = 'term';
    term.setAttribute('aria-label', 'Terminal');
    term.innerHTML =
      '<div class="term-bar"><span class="term-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="term-title">christian@portfolio: ~</span>' +
      '<button type="button" class="term-close" aria-label="' + T('Close terminal', 'Cerrar terminal') + '">' + T('Close', 'Cerrar') + ' <kbd>Esc</kbd></button></div>' +
      '<div class="term-out" role="log" aria-live="polite" tabindex="-1"></div>' +
      '<form class="term-line"><label for="term-in"><span aria-hidden="true">$</span><span class="term-sr">' + T('Command', 'Comando') + '</span></label>' +
      '<input id="term-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="term-help"></form>' +
      '<p id="term-help" class="term-sr">' + T('Type help and press Enter to see the commands. Escape closes the terminal.',
        'Escribe help y pulsa Enter para ver los comandos. Escape cierra la terminal.') + '</p>';
    document.body.appendChild(term);
    var out = term.querySelector('.term-out'), input = term.querySelector('input');
    function line(text, cls) { var d = document.createElement('div'); d.className = 'tl' + (cls ? ' ' + cls : ''); d.textContent = text; out.appendChild(d); return d; }
    function link(label, href, prefix) {
      var d = line(prefix || '', 'link'); var a = document.createElement('a'); a.href = href; a.textContent = label; d.appendChild(a);
    }
    function scroll() { out.scrollTop = out.scrollHeight; }
    var run = {
      help: function () {
        line(T('Commands', 'Comandos'), 'h');
        [['projects', T('list the projects and their status', 'lista los proyectos y su estado')], ['open <n>', T('open project n', 'abre el proyecto n')],
         ['about', T('who I am and where I have worked', 'quién soy y dónde he trabajado')], ['skills', T('tools I use', 'herramientas que uso')],
         ['contact', T('how to reach me', 'cómo contactarme')], ['cv', T('download links for the CV', 'enlaces para descargar el CV')],
         ['theme', T('switch light and dark', 'cambia entre claro y oscuro')], ['lang', T('switch English and Spanish', 'cambia entre inglés y español')],
         ['clear', T('clear the screen', 'limpia la pantalla')], ['exit', T('close the terminal', 'cierra la terminal')]
        ].forEach(function (c) { line('  ' + (c[0] + '            ').slice(0, 12) + c[1]); });
      },
      projects: function (d) {
        d.projects.forEach(function (p, i) { line('  ' + (i + 1) + '  ' + p.title + '  [' + p.status + ']'); });
        line(T('Type open 1 to open the first one.', 'Escribe open 1 para abrir el primero.'), 'dim');
      },
      open: function (d, arg) {
        var n = parseInt(arg, 10), p = d.projects[n - 1];
        if (!arg) return line(T('Usage: open <number>. Type projects to see the numbers.', 'Uso: open <número>. Escribe projects para ver los números.'), 'err');
        if (!p) return line(T('No project ' + arg + '. Type projects to see the list.', 'No hay proyecto ' + arg + '. Escribe projects para ver la lista.'), 'err');
        if (!p.href) return line(T(p.title + ' has no page yet: ', p.title + ' aún no tiene página: ') + p.status.toLowerCase() + '.', 'dim');
        line(T('Opening ', 'Abriendo ') + p.title + '...', 'dim'); setTimeout(function () { location.href = p.href; }, 250);
      },
      about: function (d) { d.story.forEach(function (t) { line(t); line(''); }); line(T('Journey', 'Trayectoria'), 'h'); d.journey.forEach(function (t) { line('  ' + t); }); },
      skills: function (d) { d.skills.forEach(function (g) { line(g.title, 'h'); line('  ' + g.tags.join(', ')); }); },
      contact: function () {
        link('cgalileorr97@gmail.com', 'mailto:cgalileorr97@gmail.com', '  email     ');
        link('linkedin.com/in/chris-robleto', 'https://www.linkedin.com/in/chris-robleto', '  linkedin  ');
        link('github.com/crobleto97', 'https://github.com/crobleto97', '  github    ');
      },
      cv: function () {
        link('English (PDF)', base + 'cv/Christian_Robleto_CV_EN.pdf', '  ');
        link('Español (PDF)', base + 'cv/Christian_Robleto_CV_ES.pdf', '  ');
      },
      theme: function () { var t = document.querySelector('.theme-toggle'); if (t) { t.click(); line(T('Theme switched.', 'Tema cambiado.'), 'dim'); } },
      lang: function (d, arg) {
        if (!window.I18N) return;
        var to = arg === 'en' || arg === 'es' ? arg : (I18N.lang === 'es' ? 'en' : 'es');
        I18N.set(to); line(T('Language: English.', 'Idioma: español.'), 'dim');
      },
      clear: function () { out.innerHTML = ''; },
      exit: function () { term.close(); }
    };
    term.querySelector('form').addEventListener('submit', function (e) {
      e.preventDefault();
      var raw = input.value.trim(); input.value = '';
      if (!raw) return;
      hist.push(raw); hpos = hist.length;
      line('$ ' + raw, 'cmd');
      var parts = raw.split(/\s+/), cmd = parts[0].toLowerCase(), arg = parts[1];
      if (!run[cmd]) { line(T('command not found: ' + cmd + '. Type help.', 'comando no encontrado: ' + cmd + '. Escribe help.'), 'err'); scroll(); return; }
      loadData().then(function (d) { run[cmd](d, arg); scroll(); }, function () {
        line(T('Could not read the page content. Try again on the home page.', 'No se pudo leer el contenido. Prueba desde la portada.'), 'err'); scroll();
      });
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); hpos = Math.max(0, hpos - 1); input.value = hist[hpos]; }
      else if (e.key === 'ArrowDown' && hist.length) { e.preventDefault(); hpos = Math.min(hist.length, hpos + 1); input.value = hist[hpos] || ''; }
      else if (e.key === 'Tab' && input.value) {
        var m = CMDS.filter(function (c) { return c.indexOf(input.value.toLowerCase()) === 0; });
        if (m.length === 1) { e.preventDefault(); input.value = m[0] + (m[0] === 'open' ? ' ' : ''); }
      }
      else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); out.innerHTML = ''; }
    });
    term.querySelector('.term-close').addEventListener('click', function () { term.close(); });
    term.addEventListener('click', function (e) { if (e.target === term) term.close(); });
    line(T('Portfolio terminal. Type help to see what you can do, exit to leave.', 'Terminal del portafolio. Escribe help para ver qué puedes hacer y exit para salir.'), 'dim');
  }
  // a closed terminal is rebuilt in the new language next time it opens
  onLang(function () { if (term && !term.open) { term.remove(); term = null; } });
  function openTerminal() {
    if (!term) buildTerminal();
    if (!term.open) term.showModal();
    term.querySelector('input').focus();
  }

  /* mobile menu */
  var btn = document.querySelector('.menu-btn'), menu = document.getElementById('mobile-menu');
  if (btn && menu) {
    function setMenu(on) {
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
      btn.setAttribute('aria-label', on ? T('Close menu', 'Cerrar menú') : T('Open menu', 'Abrir menú'));
      menu.hidden = !on;
      document.documentElement.classList.toggle('menu-open', on);
      if (on) { var f = menu.querySelector('a,button'); if (f) f.focus(); }
    }
    btn.addEventListener('click', function () { setMenu(menu.hidden); });
    onLang(function () { btn.setAttribute('aria-label', menu.hidden ? T('Open menu', 'Abrir menú') : T('Close menu', 'Cerrar menú')); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    var ms = menu.querySelector('[data-open-search]');
    if (ms) ms.addEventListener('click', function () { setMenu(false); open(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) setMenu(false); });
    window.addEventListener('resize', function () { if (!menu.hidden && window.innerWidth > 820) setMenu(false); });
  }
})();

/* ---------- explorable diagram ----------
   <figure data-explorer><script type="application/json">{ "w":360, "h":400, "start":"id",
     "nodes":[{"id","label","x","y","w","kind":"in|mid|out|data|side","info"}],
     "edges":[{"from","to","label","dashed","d"}], "groups":[{"x","y","w","h","label"}] }</script>
     <ul class="explorer-list"> plain-text fallback </ul></figure>
   Nodes are real buttons; selecting one highlights its connections and shows its description. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function el(n, a, t) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); if (t) e.textContent = t; return e; }
  var KIND = { 'in': 'Input', mid: 'Step', out: 'Output', data: 'Data store', side: 'Service', gate: 'Check' };
  var KIND_ES = { 'in': 'Entrada', mid: 'Paso', out: 'Salida', data: 'Almacén de datos', side: 'Servicio', gate: 'Comprobación' };
  var kindOf = function (k) { return T(KIND[k] || 'Step', KIND_ES[k] || 'Paso'); };
  // a field in the current language: "label" or "label_es"
  var L = function (o, k) { return (window.I18N && I18N.lang === 'es' && o[k + '_es']) || o[k] || ''; };

  Array.prototype.forEach.call(document.querySelectorAll('[data-explorer]'), function (fig) {
    var spec;
    try { spec = JSON.parse(fig.querySelector('script[type="application/json"]').textContent); } catch (e) { return; }
    var H = 34, byId = {};
    spec.nodes.forEach(function (n) { byId[n.id] = n; });
    var svg = el('svg', { 'class': 'xp', viewBox: '0 0 ' + spec.w + ' ' + spec.h, role: 'group' });
    var groupLabels = [];
    var gG = el('g', { 'aria-hidden': 'true' }), eG = el('g', { 'aria-hidden': 'true' }), lG = el('g', { 'aria-hidden': 'true' }), nG = el('g', {});

    (spec.groups || []).forEach(function (g) {
      gG.appendChild(el('rect', { 'class': 'xp-group', x: g.x, y: g.y, width: g.w, height: g.h, rx: 14 }));
      var gl = el('text', { 'class': 'xp-group-label', x: g.x + 12, y: g.y + 16 });
      groupLabels.push({ el: gl, g: g });
      gG.appendChild(gl);
    });

    var edges = spec.edges.map(function (e) {
      var a = byId[e.from], b = byId[e.to], d = e.d;
      if (!d) {
        var ay = a.y + H / 2, by = b.y + H / 2;
        if (Math.abs(a.y - b.y) < 4) {           // same row: side by side
          var left = a.x < b.x ? a : b, right = a.x < b.x ? b : a;
          d = 'M' + (left.x + left.w) + ',' + (left.y + H / 2) + ' H' + right.x;
        } else if (Math.abs((a.x + a.w / 2) - (b.x + b.w / 2)) < 4) {  // same column
          d = 'M' + (a.x + a.w / 2) + ',' + (a.y + H) + ' V' + b.y;
        } else {                                  // diagonal: leave from the bottom, arrive from the top
          var x1 = a.x + a.w / 2, y1 = a.y + H, x2 = b.x + b.w / 2, y2 = b.y, m = (y1 + y2) / 2;
          d = 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + m + ' ' + x2 + ',' + m + ' ' + x2 + ',' + y2;
        }
      }
      var pa = { 'class': 'xp-edge' + (e.dashed ? ' dashed' : ''), d: d };
      if (!e.dashed) pa.pathLength = 1;
      var p = el('path', pa);
      eG.appendChild(p);
      var lab = null;
      if (e.label) {
        lab = el('text', { 'class': 'xp-label', x: e.lx, y: e.ly, 'text-anchor': e.anchor || 'start' });
        if (e.rotate) lab.setAttribute('transform', 'rotate(' + e.rotate + ' ' + e.lx + ' ' + e.ly + ')');
        lG.appendChild(lab);
      }
      return { from: e.from, to: e.to, path: p, label: lab, spec: e };
    });

    var buttons = spec.nodes.map(function (n) {
      var g = el('g', { 'class': 'xp-node k-' + n.kind, style: '--i:' + spec.nodes.indexOf(n), tabindex: '0', role: 'button', 'aria-pressed': 'false' });
      g.appendChild(el('rect', { 'class': 'xp-ring', x: n.x - 4, y: n.y - 4, width: n.w + 8, height: H + 8, rx: 11 }));
      g.appendChild(el('rect', { 'class': 'xp-box', x: n.x, y: n.y, width: n.w, height: H, rx: n.kind === 'data' ? 16 : 8 }));
      g.appendChild(el('text', { x: n.x + n.w / 2, y: n.y + H / 2 + 4.5, 'text-anchor': 'middle' }));
      g._node = n;
      nG.appendChild(g);
      return g;
    });

    svg.appendChild(gG); svg.appendChild(eG); svg.appendChild(lG); svg.appendChild(nG);
    var panel = document.createElement('div');
    panel.className = 'xp-info';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML = '<span class="xp-kind"></span><strong class="xp-title"></strong><span class="xp-text"></span>';
    var list = fig.querySelector('.explorer-list');
    if (list) list.hidden = true;
    fig.appendChild(svg); fig.appendChild(panel);
    fig.classList.add('built');

    var selected = null;
    function show(g) {
      var n = g._node;
      buttons.forEach(function (b) { b.classList.remove('hl'); });
      edges.forEach(function (e) {
        var on = e.from === n.id || e.to === n.id;
        e.path.classList.toggle('hl', on);
        if (e.label) e.label.classList.toggle('hl', on);
        if (on) buttons.forEach(function (b) { if (b._node.id === e.from || b._node.id === e.to) b.classList.add('hl'); });
      });
      svg.classList.add('focus');
      panel.querySelector('.xp-kind').textContent = kindOf(n.kind);
      panel.querySelector('.xp-title').textContent = L(n, 'label');
      panel.querySelector('.xp-text').textContent = L(n, 'info');
      panel.setAttribute('data-kind', n.kind);
      if (!reduce) { panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap'); }
    }
    function choose(g) {
      if (selected) { selected.classList.remove('sel'); selected.setAttribute('aria-pressed', 'false'); }
      selected = g; g.classList.add('sel'); g.setAttribute('aria-pressed', 'true');
      show(g);
    }
    buttons.forEach(function (g, i) {
      g.addEventListener('click', function () { choose(g); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(g); }
        if (/^Arrow/.test(e.key)) {
          e.preventDefault();
          var d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1;
          buttons[(i + d + buttons.length) % buttons.length].focus();
        }
      });
      g.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') show(g); });
      g.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && selected) show(selected); });
    });
    // all the diagram's words, in the current language
    function relabel() {
      svg.setAttribute('aria-label', T(fig.getAttribute('data-label') || 'Diagram', fig.getAttribute('data-label-es') || fig.getAttribute('data-label') || 'Diagrama'));
      buttons.forEach(function (g) {
        var n = g._node;
        g.querySelector('text').textContent = L(n, 'label');
        g.setAttribute('aria-label', L(n, 'label') + ', ' + kindOf(n.kind).toLowerCase());
      });
      groupLabels.forEach(function (x) { x.el.textContent = L(x.g, 'label'); });
      edges.forEach(function (e) { if (e.label) e.label.textContent = L(e.spec, 'label'); });
      if (selected) show(selected);
    }
    relabel();
    onLang(relabel);
    var start = buttons.filter(function (b) { return b._node.id === spec.start; })[0] || buttons[0];
    choose(start);
  });
})();

/* ---------- analytics mini dashboard ----------
   <div class="dash" data-dash> with tabs (role=tab, aria-controls) and one panel per view.
   Bars and rings read their values from data attributes; nothing is generated. */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('[data-dash]'), function (dash) {
    var tabs = Array.prototype.slice.call(dash.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
    function select(i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
        if (on) { panels[k].classList.remove('enter'); void panels[k].offsetWidth; panels[k].classList.add('enter'); }
      });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault(); select((i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length, true);
        }
      });
    });
    // tooltips for bars: shown on hover and on keyboard focus
    var tip = document.createElement('div');
    tip.className = 'dash-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
    dash.appendChild(tip);
    Array.prototype.forEach.call(dash.querySelectorAll('[data-tip]'), function (b) {
      function on() {
        tip.textContent = T(b.getAttribute('data-tip'), b.getAttribute('data-tip-es') || b.getAttribute('data-tip')); tip.hidden = false;
        var r = b.getBoundingClientRect(), d = dash.getBoundingClientRect();
        tip.style.left = Math.min(d.width - 12, Math.max(12, r.left - d.left + r.width / 2)) + 'px';
        tip.style.top = (r.top - d.top) + 'px';
      }
      function off() { tip.hidden = true; }
      b.addEventListener('pointerenter', on); b.addEventListener('pointerleave', off);
      b.addEventListener('focus', on); b.addEventListener('blur', off);
    });
    select(0);
  });
})();

/* ---------- diagrams build in the first time they come into view ---------- */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('enter'); io.unobserve(e.target); } });
  }, { threshold: 0.25 });
  // picker cards replay their own entrance when selected (main.js); the rest build once
  Array.prototype.forEach.call(document.querySelectorAll('svg.viz, svg.xp'), function (s) {
    if (!s.closest('.pick')) io.observe(s);
  });
})();

/* ---------- page transition: the clicked project card's title becomes the project page title ---------- */
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('.pick a[href]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  var h = a.closest('.pick').querySelector('h3');
  // only one element may carry the name, so clear it from any other card first
  Array.prototype.forEach.call(document.querySelectorAll('.pick h3'), function (x) { x.style.viewTransitionName = ''; });
  if (h) h.style.viewTransitionName = 'proj-title';
});
// coming back with the browser's back button: don't keep the name on the old card
window.addEventListener('pageshow', function () {
  Array.prototype.forEach.call(document.querySelectorAll('.pick h3'), function (x) { x.style.viewTransitionName = ''; });
});

/* ---------- spotlight: circuit traces light up around the pointer (desktop only) ----------
   The body paints the circuit as a 240px tile anchored to the top of the page. The spot is a small fixed
   disc with a brighter copy of the same tile; its background is offset so both line up while it moves.
   It hides over the text column (where the background is faded) and over the dark panels (different tile). */
(function () {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var root = document.documentElement, spot = document.createElement('div'), R = 150, TILE = 240;
  spot.className = 'spot'; spot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(spot);
  var hotFor = '';
  function paint() {
    var key = getComputedStyle(root).getPropertyValue('--accent').trim();
    if (key === hotFor) return;
    hotFor = key;
    var c = getComputedStyle(root).getPropertyValue('--circuit').trim();
    // same drawing, stroked in the accent colour at a stronger opacity
    var hex = key.replace('#', '%23');
    spot.style.backgroundImage = c.replace(/stroke='[^']*'/, "stroke='" + hex + "'").replace(/stroke-width='[\d.]+'/, "stroke-width='1.6'");
  }
  var x = -999, y = -999, inside = false, queued = false;
  function frame() {
    queued = false;
    paint();
    var px = x + scrollX, py = y + scrollY;
    spot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    spot.style.backgroundPosition = (-((px - R) % TILE)) + 'px ' + (-((py - R) % TILE)) + 'px';
    // fade out towards the middle column, where the page background is already faded behind the text
    var off = Math.abs(x - innerWidth / 2), rem = parseFloat(getComputedStyle(root).fontSize) || 16;
    var k = Math.max(0, Math.min(1, (off - 22 * rem) / (10 * rem)));
    spot.style.opacity = inside ? String(k) : '0';
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    inside = !(e.target.closest && e.target.closest('.stage, dialog'));
    queue();
  }, { passive: true });
  document.addEventListener('pointerleave', function () { inside = false; queue(); });
  window.addEventListener('scroll', function () { if (inside) queue(); }, { passive: true });
  new MutationObserver(queue).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
})();

