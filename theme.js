// Theme (light/dark) and language (English/Spanish).
// Loaded in <head> (not deferred) so a saved choice applies before the first paint.
//
// How the two languages work:
// - Visible text is written twice, side by side: <span lang="en">…</span><span lang="es">…</span>.
//   CSS shows only the current language, so there is no flash on load.
// - Plain-text elements that can't hold spans (SVG text, list items read by scripts) use data-es="…".
// - Attributes use data-es-<name>, e.g. aria-label="Projects" data-es-aria-label="Proyectos".
// - Scripts call I18N.t(english, spanish) and listen for the "langchange" event to redraw.
// - ?lang=es in a link opens the page in Spanish and remembers it.
(function () {
  var root = document.documentElement;

  /* ---------- theme ---------- */
  var KEY = 'theme';
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  } catch (e) {}

  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function current() { return root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light'); }
  function label() {
    var dark = current() === 'dark';
    Array.prototype.forEach.call(document.querySelectorAll('.theme-toggle'), function (b) {
      b.setAttribute('aria-label', dark ? t('Switch to light mode', 'Cambiar a modo claro') : t('Switch to dark mode', 'Cambiar a modo oscuro'));
      b.title = dark ? t('Light mode', 'Modo claro') : t('Dark mode', 'Modo oscuro');
    });
  }

  /* ---------- language ---------- */
  var LKEY = 'lang', LANGS = ['en', 'es'];
  var lang = 'en';
  try { var sl = localStorage.getItem(LKEY); if (LANGS.indexOf(sl) !== -1) lang = sl; } catch (e) {}
  var q = null;
  try { q = new URLSearchParams(location.search).get('lang'); } catch (e) {}
  if (LANGS.indexOf(q) !== -1) { lang = q; try { localStorage.setItem(LKEY, lang); } catch (e) {} }
  root.setAttribute('data-lang', lang);
  root.lang = lang;

  function t(en, es) { return root.getAttribute('data-lang') === 'es' ? es : en; }
  var ATTRS = ['aria-label', 'title', 'placeholder', 'alt', 'content'];

  // Swap attributes and plain-text elements to the current language. The English value is kept in data-en(-name).
  function apply(scope) {
    var es = root.getAttribute('data-lang') === 'es';
    ATTRS.forEach(function (a) {
      Array.prototype.forEach.call((scope || document).querySelectorAll('[data-es-' + a + ']'), function (el) {
        if (!el.hasAttribute('data-en-' + a)) el.setAttribute('data-en-' + a, el.getAttribute(a) || '');
        el.setAttribute(a, el.getAttribute(es ? 'data-es-' + a : 'data-en-' + a));
      });
    });
    Array.prototype.forEach.call((scope || document).querySelectorAll('[data-es]'), function (el) {
      if (!el.hasAttribute('data-en')) el.setAttribute('data-en', el.textContent);
      el.textContent = el.getAttribute(es ? 'data-es' : 'data-en');
    });
    var title = document.querySelector('title[data-es]');
    if (title) document.title = title.textContent;
    Array.prototype.forEach.call(document.querySelectorAll('[data-set-lang]'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-set-lang') === root.getAttribute('data-lang') ? 'true' : 'false');
    });
  }

  function setLang(next) {
    if (LANGS.indexOf(next) === -1 || next === root.getAttribute('data-lang')) return;
    root.setAttribute('data-lang', next);
    root.lang = next;
    try { localStorage.setItem(LKEY, next); } catch (e) {}
    // keep the address shareable: ?lang=es in Spanish, nothing in English
    try {
      var u = new URL(location.href);
      if (next === 'es') u.searchParams.set('lang', 'es'); else u.searchParams.delete('lang');
      history.replaceState(history.state, '', u.pathname + u.search + u.hash);
    } catch (e) {}
    apply();
    label();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: next } }));
  }

  window.I18N = {
    get lang() { return root.getAttribute('data-lang'); },
    t: t,
    set: setLang,
    apply: apply,
    // text of an element in the current language, ignoring the hidden translation
    text: function (el) {
      if (!el) return '';
      var c = el.cloneNode(true), other = root.getAttribute('data-lang') === 'es' ? 'en' : 'es';
      Array.prototype.forEach.call(c.querySelectorAll('[lang="' + other + '"]'), function (x) { x.remove(); });
      return c.textContent.replace(/\s+/g, ' ').trim();
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    apply();
    label();
    Array.prototype.forEach.call(document.querySelectorAll('.theme-toggle'), function (b) {
      b.addEventListener('click', function () {
        var next = current() === 'dark' ? 'light' : 'dark';
        function swap() {
          root.setAttribute('data-theme', next);
          try { localStorage.setItem(KEY, next); } catch (e) {}
          label();
        }
        // The new theme grows as a circle from the button. Browsers without View Transitions,
        // or people who asked for less motion, get the instant swap.
        var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!document.startViewTransition || still) { swap(); return; }
        var r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        root.classList.add('vt-theme');
        var vt = document.startViewTransition(swap);
        vt.ready.then(function () {
          root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
            { duration: 550, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' });
        }).catch(function () {});
        vt.finished.finally(function () { root.classList.remove('vt-theme'); });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-set-lang]'), function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-set-lang')); });
    });
  });
  if (mq.addEventListener) mq.addEventListener('change', label);
})();
