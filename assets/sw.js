/**
 * ═══════════════════════════════════════════════════════════════
 *  ARYADMONEY PWA — sw.js  (Service Worker)
 *  Cache strategy: Network-first for API, Cache-first for assets
 * ═══════════════════════════════════════════════════════════════
 */

const CACHE_NAME    = 'aryadmoney-v1.0.0';
const STATIC_CACHE  = 'aryadmoney-static-v1';
const DYNAMIC_CACHE = 'aryadmoney-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/api.js',
  '/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap',
];

/* ─── Install ──────────────────────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ─── Activate ─────────────────────────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ─── Fetch ────────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and chrome-extension
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // API calls — Network first, no cache
  if (url.pathname.startsWith('/v1/')) {
    event.respondWith(networkOnly(request));
    return;
  }

  // Google Fonts — Cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Static assets — Cache first with network fallback
  if (STATIC_ASSETS.includes(url.pathname) || url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Default — Network first with cache fallback
  event.respondWith(networkFirst(request));
});

async function cacheFirst(request, cacheName = STATIC_CACHE) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(DYNAMIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offline = await caches.match('/index.html');
      if (offline) return offline;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ error: 'Pas de connexion internet.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/* ─── Push Notifications ───────────────────────────────────────── */
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const options = {
    body: data.message || 'Nouvelle notification AryadMoney',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' },
    ]
  };
  event.waitUntil(
    self.registration.showNotification(data.titre || 'AryadMoney', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});