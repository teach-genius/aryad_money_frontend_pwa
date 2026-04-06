// sw.js — version complète
const STATIC_CACHE  = 'aryadmoney-static-v2'
const DYNAMIC_CACHE = 'aryadmoney-dynamic-v2'

const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/api.js',
    '/app.js',
    '/manifest.json',
    '/icons/manifest-icon-192.maskable.png',
    '/icons/manifest-icon-512.maskable.png',
]

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    )
})

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
                    .map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    )
})

self.addEventListener('fetch', event => {
    const { request } = event
    const url = new URL(request.url)

    if (request.method !== 'GET') return

    // API → réseau uniquement
    if (url.pathname.startsWith('/v1/') || url.origin !== self.location.origin) {
        event.respondWith(networkOnly(request))
        return
    }

    // Assets statiques → cache first
    if (
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js')  ||
        url.pathname.startsWith('/icons/') ||
        url.pathname === '/' ||
        url.pathname === '/index.html'
    ) {
        event.respondWith(cacheFirst(request))
        return
    }

    event.respondWith(networkFirst(request))
})

async function cacheFirst(request) {
    const cached = await caches.match(request)
    if (cached) return cached
    const response = await fetch(request)
    const cache = await caches.open(STATIC_CACHE)
    cache.put(request, response.clone())
    return response
}

async function networkFirst(request) {
    try {
        const response = await fetch(request)
        const cache = await caches.open(DYNAMIC_CACHE)
        cache.put(request, response.clone())
        return response
    } catch {
        const cached = await caches.match(request)
        return cached || new Response('Offline', { status: 503 })
    }
}

async function networkOnly(request) {
    return fetch(request)
}