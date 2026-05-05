const CACHE_NAME = 'timescapeeditor-v2';

const STATIC_ASSETS = [
  '/TimeScapeEditor/',
  '/TimeScapeEditor/index.html',
  '/TimeScapeEditor/createEvent.html',
  '/TimeScapeEditor/createReminder.html',
  '/TimeScapeEditor/createTask.html',
  '/TimeScapeEditor/java.js',
  '/TimeScapeEditor/style.css',
  '/TimeScapeEditor/icons/icon.svg',
  '/TimeScapeEditor/icons/icon-180x180.png',
  '/TimeScapeEditor/icons/icon-192x192.png',
  '/TimeScapeEditor/icons/icon-512x512.png',
  '/TimeScapeEditor/manifest.json',
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
