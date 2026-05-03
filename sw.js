const CACHE_NAME = 'timescapeeditor-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/createEvent.html',
  '/createReminder.html',
  '/createTask.html',
  '/java.js',
  '/style.css',
  '/icons/icon.svg',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
];

// Install: pre-cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin assets, network-first for everything else
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // Cache-first strategy for local static assets
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          return response;
        });
      })
    );
  } else {
    // Network-first strategy for cross-origin resources (e.g. CDN)
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
