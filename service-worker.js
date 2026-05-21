/* ══════════════════════════════════════════════════════
   PickStar — Service Worker
   Version : 2026-05-21 | PickStar v2.1 (Modular)
   Strategy: Cache-first for app shell, Network-first for API
   ══════════════════════════════════════════════════════

   v2.1 변경사항:
   - start_url "/" 에 맞게 APP_SHELL 루트("/") 캐시 추가
   - Firebase CDN 네트워크 우선 전략 추가
   ══════════════════════════════════════════════════════ */

var CACHE_NAME = 'pickstar-2026-05-21';

/* App shell files — cached on install, served offline */
var APP_SHELL = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',

    /* CSS */
    '/css/styles.css',

    /* JS modules */
    '/js/firebase-init.js',
    '/js/time-helpers.js',
    '/js/storage.js',
    '/js/api.js',
    '/js/games.js',
    '/js/render.js',
    '/js/saved.js',
    '/js/quick-gen.js',
    '/js/navigation.js',
    '/js/star-animation.js',
    '/js/main.js'
];

/* ── INSTALL: cache the app shell ── */
self.addEventListener('install', function(e) {
    console.log('[SW] Installing cache:', CACHE_NAME);
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[SW] Caching app shell');
            return cache.addAll(APP_SHELL);
        }).then(function() {
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
                        return key !== CACHE_NAME && key.indexOf('pickstar') === 0;
                    })
                    .map(function(key) {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

/* ── FETCH: serve from cache, fall back to network ── */
self.addEventListener('fetch', function(e) {
    var url = e.request.url;

    /* API 호출 — 항상 네트워크 (data.ny.gov) */
    if (url.indexOf('data.ny.gov') !== -1) {
        e.respondWith(
            fetch(e.request).catch(function() {
                return new Response('[]', {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    /* Firebase Firestore — 항상 네트워크 */
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

    /* Google Fonts — 항상 네트워크 */
    if (url.indexOf('fonts.googleapis.com') !== -1 ||
        url.indexOf('fonts.gstatic.com') !== -1) {
        e.respondWith(fetch(e.request).catch(function() {
            return new Response('', { status: 503 });
        }));
        return;
    }

    /* Firebase SDK CDN — 네트워크 우선, 캐시 fallback */
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

    /* App shell — 캐시 우선 */
    e.respondWith(
        caches.match(e.request).then(function(cached) {
            if (cached) {
                return cached;
            }
            return fetch(e.request).then(function(response) {
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }
                var responseToCache = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(e.request, responseToCache);
                });
                return response;
            }).catch(function() {
                return new Response('Offline — please reload when connected.', {
                    status: 503,
                    headers: { 'Content-Type': 'text/plain' }
                });
            });
        })
    );
});
