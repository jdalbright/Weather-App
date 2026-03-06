const CACHE_VERSION = 'v1';
const SHELL_CACHE = `weather-vibe-shell-${CACHE_VERSION}`;

// Pre-cache the app shell and offline fallback on install
const PRECACHE_URLS = ['/', '/offline'];

// These patterns must always go to the network — never serve stale weather data
const NETWORK_ONLY_PATTERNS = [
  'api.open-meteo.com',
  'air-quality-api.open-meteo.com',
  'marine-api.open-meteo.com',
  'flood-api.open-meteo.com',
  'archive-api.open-meteo.com',
  'api.weather.gov',
  'nominatim.openstreetmap.org',
  'geocoding-api.open-meteo.com',
  'aviationweather.gov',
  'weatherapi.com',
  'pirateweather.net',
  'ai-gateway.vercel.sh',
  '/api/chat',
  '/api/extended-weather',
  '/api/personality',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('weather-vibe-') && key !== SHELL_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isNetworkOnly(url) {
  return NETWORK_ONLY_PATTERNS.some((pattern) => url.includes(pattern));
}

function isStaticAsset(pathname) {
  return pathname.startsWith('/_next/static/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Network-only: all live weather/AI APIs
  if (isNetworkOnly(request.url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first: Next.js static assets (content-hashed filenames — safe forever)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches
              .open(SHELL_CACHE)
              .then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for HTML navigation: fall back to cached page or /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ??
            caches
              .match('/offline')
              .then(
                (offlinePage) =>
                  offlinePage ??
                  new Response('Offline', { status: 503 })
              )
        )
      )
    );
    return;
  }
});
