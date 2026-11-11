/*
 * Service worker: keeps the game's files on the device, so it still plays
 * without a connection after one visit.
 *
 * VERSION and FILES are filled in by scripts/build.mjs for a release; do not
 * fill them in by hand.
 *
 * - Release (VERSION holds a version number): every file is stored on install
 *   and served from the cache. A new release changes this file, so the phone
 *   downloads everything again into a new cache and drops the old one.
 * - Development (VERSION = 'dev'): network first, the cache only as a fallback
 *   when offline, so a change shows up immediately.
 */
var VERSION = 'dev';
var FILES = [];

var CACHE = 'jelajah-kerinci-' + VERSION;
var RELEASE = VERSION !== 'dev';

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        // 'reload' skips the browser's HTTP cache, so what is stored is certainly this release.
        return c.addAll(FILES.map(function (u) { return new Request(u, { cache: 'reload' }); }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names.filter(function (n) { return n !== CACHE; }).map(function (n) { return caches.delete(n); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function store(req, res) {
  if (res && res.ok) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
  }
  return res;
}

function fromCache(req) {
  return caches.match(req, { ignoreSearch: true });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (RELEASE) {
    e.respondWith(fromCache(req).then(function (hit) {
      return hit || fetch(req).then(function (res) { return store(req, res); });
    }));
    return;
  }

  e.respondWith(
    fetch(req)
      .then(function (res) { return store(req, res); })
      .catch(function () {
        return fromCache(req).then(function (hit) { return hit || Response.error(); });
      })
  );
});
