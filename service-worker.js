/* ══════════════════════════════════════════════════════
   PickStar — Service Worker
   Version : 2026-05-20 | PickStar v2.0 (Modular)
   Strategy: Cache-first for app shell, Network-first for API
   ══════════════════════════════════════════════════════

   v2.0 변경사항:
   - 단일 index.html → 모듈 분리 구조에 맞게 APP_SHELL 업데이트
   - css/styles.css + js/*.js 11개 파일 캐시 추가
   ══════════════════════════════════════════════════════ */

var CACHE_NAME = 'pickstar-2026-05-20';

/* App shell files — cached on install, served offline */
var APP_SHELL = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',

    /* CSS */
    './css/styles.css',

    /* JS modules — load order matters for reference only; SW caches all */
    './js/firebase-init.js',
    './js/time-helpers.js',
    './js/storage.js',
    './js/api.js',
    './js/games.js',
    './js/render.js',
    './js/saved.js',
    './js/quick-gen.js',
    './js/navigation.js',
    './js/star-animation.js',
    './js/main.js'
];

/* ── INSTALL: cache the app shell ── */
self.addEventListener('install', function(e) {
    console.log('[SW] Installing cache:', CACHE_NAME);
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[SW] Caching app shell');
            return cache.addAll(APP_SHELL);
        }).then(function() {
            /* Skip waiting so the new SW activates immediately */
            return self.skipWaiting();
        })
    );
});

/* ── ACTIVATE: delete old caches ── */
self.addEventListener('activate', function(e) {
    console.log('[SW] Activating:', CACHE_NAME);
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys
                    .filter(function(key) {
                        /* Delete any pickstar cache that is NOT the current version */
                        return key !== CACHE_NAME && key.indexOf('pickstar') === 0;
                    })
                    .map(function(key) {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(function() {
            /* Take control of all open tabs immediately */
            return self.clients.claim();
        })
    );
});

/* ── FETCH: serve from cache, fall back to network ── */
self.addEventListener('fetch', function(e) {
    var url = e.request.url;

    /* Always go to network for API calls (data.ny.gov) — never cache live data */
    if (url.indexOf('data.ny.gov') !== -1) {
        e.respondWith(
            fetch(e.request).catch(function() {
                /* Offline and no cache for API — return empty JSON array */
                return new Response('[]', {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    /* Always go to network for Firebase (Firestore) */
    if (url.indexOf('firestore.googleapis.com') !== -1 ||
        url.indexOf('firebase.googleapis.com') !== -1) {
        e.respondWith(
            fetch(e.request).catch(function() {
                return new Response('{}', {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    /* Always go to network for Google Fonts (CDN) */
    if (url.indexOf('fonts.googleapis.com') !== -1 ||
        url.indexOf('fonts.gstatic.com') !== -1) {
        e.respondWith(fetch(e.request).catch(function() {
            return new Response('', { status: 503 });
        }));
        return;
    }

    /* Firebase SDK CDN — network first, cache fallback */
    if (url.indexOf('gstatic.com/firebasejs') !== -1) {
        e.respondWith(
            fetch(e.request).then(function(response) {
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(e.request, clone);
                });
                return response;
            }).catch(function() {
                return caches.match(e.request);
            })
        );
        return;
    }

    /* App shell: Cache-first strategy */
    e.respondWith(
        caches.match(e.request).then(function(cached) {
            if (cached) {
                return cached;
            }
            /* Not in cache — fetch from network and cache the response */
            return fetch(e.request).then(function(response) {
                /* Only cache valid same-origin responses */
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                var responseToCache = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(e.request, responseToCache);
                });
                return response;
            }).catch(function() {
                /* Offline and not cached — nothing we can do */
                return new Response('Offline — please reload when connected.', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' }
                });
            });
        })
    );
});
