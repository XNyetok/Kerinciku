/*
 * Dimuat paling awal, sebelum berkas lain. Bila ada berkas yang gagal dimuat
 * (misalnya sinyal lemah), tampilkan ajakan muat ulang supaya layar tidak macet.
 */
(function () {
  'use strict';

  window.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || (t.tagName !== 'SCRIPT' && t.tagName !== 'LINK')) return;
    var k = document.getElementById('gagal');
    if (k) k.hidden = false;
  }, true);

  document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'muat-ulang') location.reload();
  });
})();
