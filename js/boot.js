/*
 * Loaded first, before every other file. When a file fails to load (a weak
 * signal, for example), offer a reload instead of leaving a frozen screen.
 */
(function () {
  'use strict';

  window.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || (t.tagName !== 'SCRIPT' && t.tagName !== 'LINK')) return;
    var box = document.getElementById('load-failed');
    if (box) box.hidden = false;
  }, true);

  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'reload') location.reload();
  });
})();
