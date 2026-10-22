// Light/dark toggle. Loaded in <head> (not deferred) so a saved choice applies before the first paint.
(function () {
  var KEY = 'theme', root = document.documentElement;
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);
  } catch (e) {}

  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function current() { return root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light'); }
  function label() {
    var dark = current() === 'dark';
    Array.prototype.forEach.call(document.querySelectorAll('.theme-toggle'), function (b) {
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      b.title = dark ? 'Light mode' : 'Dark mode';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    label();
    Array.prototype.forEach.call(document.querySelectorAll('.theme-toggle'), function (b) {
      b.addEventListener('click', function () {
        var next = current() === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem(KEY, next); } catch (e) {}
        label();
      });
    });
  });
  if (mq.addEventListener) mq.addEventListener('change', label);
})();
