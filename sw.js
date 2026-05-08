const CACHE_NAME = 'timescapeeditor-v13';

const STATIC_ASSETS = [
  '/TimeScapeEditor/',
  '/TimeScapeEditor/index.html',
  '/TimeScapeEditor/createEvent.html',
  '/TimeScapeEditor/createReminder.html',
  '/TimeScapeEditor/createBucket.html',
  '/TimeScapeEditor/createTask.html',
  '/TimeScapeEditor/manageEvents.html',
  '/TimeScapeEditor/manageReminders.html',
  '/TimeScapeEditor/manageTasks.html',
  '/TimeScapeEditor/manageHousehold.html',
  '/TimeScapeEditor/manageJobs.html',
  '/TimeScapeEditor/managePersonal.html',
  '/TimeScapeEditor/additionalServices/dietaryServices.html',
  '/TimeScapeEditor/additionalServices/financialServices.html',
  '/TimeScapeEditor/additionalServices/habitsRoutines.html',
  '/TimeScapeEditor/additionalServices/healthFitness.html',
  '/TimeScapeEditor/additionalServices/professionalManagement.html',
  '/TimeScapeEditor/additionalServices/weatherServices.html',
  '/TimeScapeEditor/java.js',
  '/TimeScapeEditor/style.css',
  '/TimeScapeEditor/icons/icon.svg',
  '/TimeScapeEditor/icons/icon-180x180.png',
  '/TimeScapeEditor/icons/icon-192x192.png',
  '/TimeScapeEditor/icons/icon-512x512.png',
  '/TimeScapeEditor/manifest.json',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
];

function getCacheableAssets() {
  return STATIC_ASSETS.filter((asset) => {
    try {
      const resolved = new URL(asset, self.location.href);
      return resolved.protocol === 'http:' || resolved.protocol === 'https:';
    } catch {
      return false;
    }
  });
}

// Install: pre-cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(getCacheableAssets().map((asset) => cache.add(asset)))
    )
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

// File extensions that update frequently — always try network first
const NETWORK_FIRST_EXTENSIONS = ['.html', '.css', '.js'];

// Fetch: network-first for HTML/CSS/JS, cache-first for everything else
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  const isSameOrigin = url.origin === self.location.origin;
  const isNetworkFirst =
    isSameOrigin &&
    (url.pathname === '/TimeScapeEditor/' ||
      NETWORK_FIRST_EXTENSIONS.some((ext) => url.pathname.endsWith(ext)));

  if (isNetworkFirst) {
    // Network-first for HTML/CSS/JS: always reflect latest changes, fall back to cache offline
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          return response;
        })
        .catch(() => {
          // For HTML navigation with query strings (e.g. createEvent.html?editId=...),
          // the exact URL won't be cached — fall back to the path-only cached version.
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            const pathOnly = new URL(request.url);
            pathOnly.search = '';
            return caches.match(pathOnly.toString());
          });
        })
    );
  } else if (isSameOrigin) {
    // Cache-first for icons and other static assets that rarely change
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
    // Network-first for cross-origin resources (e.g. CDN)
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
