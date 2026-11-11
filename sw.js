/*
 * Service worker: menyimpan berkas permainan supaya tetap bisa dimainkan tanpa
 * internet setelah dibuka sekali.
 *
 * VERSI dan BERKAS diisi oleh scripts/build.mjs saat rilis; jangan diisi tangan.
 *
 * - Rilis (VERSI berisi nomor versi): semua berkas disimpan saat pemasangan dan
 *   dilayani dari simpanan. Rilis baru mengubah isi berkas ini, sehingga HP
 *   mengunduh semuanya lagi ke simpanan baru lalu membuang yang lama.
 * - Pengembangan (VERSI = 'dev'): jaringan dulu, simpanan hanya cadangan saat
 *   luring, supaya perubahan langsung terlihat.
 */
var VERSI = 'dev';
var BERKAS = [];

var NAMA = 'jelajah-kerinci-' + VERSI;
var RILIS = VERSI !== 'dev';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(NAMA)
      .then(function (c) {
        // 'reload' melewati simpanan HTTP peramban, supaya yang tersimpan pasti berkas rilis ini.
        return c.addAll(BERKAS.map(function (u) { return new Request(u, { cache: 'reload' }); }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (nama) {
        return Promise.all(nama.filter(function (n) { return n !== NAMA; }).map(function (n) { return caches.delete(n); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function simpan(req, res) {
  if (res && res.ok) {
    var salinan = res.clone();
    caches.open(NAMA).then(function (c) { c.put(req, salinan); });
  }
  return res;
}

function dariSimpanan(req) {
  return caches.match(req, { ignoreSearch: true });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (RILIS) {
    e.respondWith(dariSimpanan(req).then(function (ada) {
      return ada || fetch(req).then(function (res) { return simpan(req, res); });
    }));
    return;
  }

  e.respondWith(
    fetch(req)
      .then(function (res) { return simpan(req, res); })
      .catch(function () {
        return dariSimpanan(req).then(function (ada) { return ada || Response.error(); });
      })
  );
});
