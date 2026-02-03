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

  // Critical assets (JS, CSS, HTML) - always network first, never serve stale cache
  const isCriticalAsset = url.pathname.endsWith('.js') || 
                          url.pathname.endsWith('.css') || 
                          url.pathname.endsWith('.html') ||
                          url.pathname === '/' ||
                          url.pathname.startsWith('/src/');

  if (isCriticalAsset) {
    // In development, don't cache critical assets at all - always fetch fresh
    if (isDevelopment) {
      event.respondWith(fetch(request));
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
          // Only use cache if network completely fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.warn('[Service Worker] Serving cached version (network unavailable)');
              return cachedResponse;
            }
            // Re-throw the original error so the browser can handle it
            throw err;
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
          // Clone the response for caching
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request);
        })
    );
    return;
  }

  // Other static assets - network first, cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful responses
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
          if (cachedResponse) {
            return cachedResponse;
          }
          // Re-throw to let browser handle the error
          throw err;
        });
      })
  );
});
