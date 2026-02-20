// Service Worker for Fitness Daily Log PWA
const CACHE_NAME = 'fitness-daily-log-v1';
const RUNTIME_CACHE = 'fitness-runtime-v1';

// Detect if we're in development mode
const isDevelopment = self.location.hostname === 'localhost' || 
                     self.location.hostname === '127.0.0.1' || 
                     self.location.hostname.includes('192.168.');

// Assets to cache immediately on install
// Only cache files that exist in both dev and production
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // Cache each asset individually to avoid failing if one is missing
        return Promise.allSettled(
          PRECACHE_ASSETS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[Service Worker] Failed to cache ${url}:`, err);
              return null; // Don't fail the entire install
            })
          )
        ).then(() => {
          console.log('[Service Worker] App shell cached');
        });
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.error('[Service Worker] Install failed:', err);
        // Don't block app loading if service worker fails
        self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch event - network first for all requests (defensive approach)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // In development, never intercept the main document - let the browser load it directly.
  // This avoids 503 on GET / when the SW's fetch fails (e.g. cert, timing).
  if (isDevelopment && request.mode === 'navigate') {
    return;
  }

  // Critical assets (JS, CSS, HTML) - always network first, never serve stale cache
  const isCriticalAsset = url.pathname.endsWith('.js') || 
                          url.pathname.endsWith('.css') || 
                          url.pathname.endsWith('.html') ||
                          url.pathname === '/' ||
                          url.pathname.startsWith('/src/');

  if (isCriticalAsset) {
    // In development: network first, then cache fallback so mobile dev is resilient to cert/network glitches
    if (isDevelopment) {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone).catch(() => {}));
            }
            return response;
          })
          .catch((err) => {
            console.warn('[Service Worker] Fetch failed (e.g. cert or network on mobile):', url.pathname, err);
            return caches.match(request).then((cached) =>
              cached || new Response('Service Unavailable', { status: 503, statusText: 'Network Error' })
            );
          })
      );
      return;
    }

    // For critical assets in production, always fetch from network, only use cache if network completely fails
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful responses (async, don't block)
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache).catch(err => {
                console.warn('[Service Worker] Failed to cache response:', err);
              });
            });
          }
          return response;
        })
        .catch((err) => {
          console.warn('[Service Worker] Network failed for critical asset, trying cache:', url.pathname);
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.warn('[Service Worker] Serving cached version (network unavailable)');
              return cachedResponse;
            }
            return new Response('Offline', { status: 503, statusText: 'Network Error' });
          });
        })
    );
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch((err) => {
          console.warn('[Service Worker] API fetch failed:', url.pathname, err);
          return caches.match(request).then((cached) =>
            cached || new Response(JSON.stringify({ error: 'Network unavailable' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        })
    );
    return;
  }

  // Other static assets - network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache).catch(err => {
              console.warn('[Service Worker] Failed to cache response:', err);
            });
          });
        }
        return response;
      })
      .catch((err) => {
        console.warn('[Service Worker] Network request failed, trying cache:', err);
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return new Response('Not found', { status: 404 });
        });
      })
  );
});
