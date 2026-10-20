const CACHE_NAME = 'krishna-decor-manager-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  // Never cache API sync calls; let them go directly to the network
  if (url.pathname.startsWith('/api') || url.pathname.includes('/api/')) {
    return
  }

  // Handle page navigations (opening app while offline)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return networkResponse
      }).catch(async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        const rootCached = await caches.match('./') || await caches.match('/') || await caches.match('index.html')
        if (rootCached) return rootCached
        return new Response('<!DOCTYPE html><html><body><h1>Offline</h1></body></html>', {
          headers: { 'Content-Type': 'text/html' }
        })
      })
    )
    return
  }

  // Cache-first for assets (js, css, fonts, images) with background refresh
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && request.method === 'GET') {
          const clone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return networkResponse
      }).catch(() => {
        // Return null on network failure so cachedResponse wins
        return null
      })

      return cachedResponse || fetchPromise
    })
  )
})
