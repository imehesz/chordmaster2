/* ChordMaster 2 - service worker
 *
 * The whole app is a handful of small static files, so it is cached up front
 * and served cache-first. Practice works with no signal at all.
 *
 * Bump CACHE whenever you ship a change, or the old files keep being served.
 */
var CACHE = 'chordmaster2-v4';

var SHELL = [
  './',
  'index.html',
  'css/app.css',
  'js/chords.js',
  'js/progressions.js',
  'js/exercises.js',
  'js/lessons.js',
  'js/diagram.js',
  'js/fretboard.js',
  'js/audio.js',
  'js/trainer.js',
  'js/storage.js',
  'js/app.js',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        // Keep same-origin responses for next time; ignore anything else.
        if (res && res.ok && new URL(e.request.url).origin === location.origin) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match('index.html');
      });
    })
  );
});
