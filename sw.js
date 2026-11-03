// Pages from the network (fresh exhibitions), images and built assets from the cache.
const CACHE = 'taarucha-v1'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
))
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/').then((r) => r || Response.error())))
    return
  }
  const cacheable = req.destination === 'image' || req.destination === 'font' || (url.origin === location.origin && url.pathname.startsWith('/assets/'))
  if (!cacheable || url.pathname.includes('/rest/') || url.pathname.includes('/auth/')) return
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req)
    if (hit) return hit
    const res = await fetch(req)
    if (res.ok || res.type === 'opaque') c.put(req, res.clone())
    return res
  }))
})
