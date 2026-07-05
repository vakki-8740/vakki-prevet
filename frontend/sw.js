const CACHE_NAME = 'cloudvault-v1';
const STATIC_CACHE = 'cloudvault-static-v1';
const DYNAMIC_CACHE = 'cloudvault-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/config.js',
  '/manifest.json',
  '/styles/main.css',
  '/styles/auth.css',
  '/styles/sidebar.css',
  '/styles/dashboard.css',
  '/styles/files.css',
  '/styles/modals.css',
  '/styles/players.css',
  '/styles/responsive.css',
  '/styles/mobile.css',
  '/scripts/api.js',
  '/scripts/auth.js',
  '/scripts/app.js',
  '/scripts/files.js',
  '/scripts/upload.js',
  '/scripts/viewers.js',
  '/scripts/ui.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.log('Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests - always go to network
  if (url.pathname.startsWith('/api/')) return;

  // Skip uploads - always go to network
  if (url.pathname.startsWith('/uploads/')) return;

  // For navigation requests, try network first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // For static assets, cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response || response.status !== 200) return response;

        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseClone);
        });

        return response;
      }).catch(() => {
        // Return offline placeholder for images
        if (request.destination === 'image') {
          return new Response(
            `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
              <rect fill="#f0f0f0" width="200" height="200"/>
              <text fill="#999" font-family="sans-serif" font-size="14" text-anchor="middle" x="100" y="105">Offline</text>
            </svg>`,
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        }
      });
    })
  );
});

// Handle messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
