const CACHE = 'accountability-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Stale-while-revalidate: serve from cache instantly, refresh the cache in the
   background. Covers both the app shell and the CDN assets (Tabler icons,
   Google Fonts) so everything works offline after the first visit. */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const fetched = fetch(e.request).then(resp => {
          if (resp && (resp.status === 200 || resp.type === 'opaque')) {
            cache.put(e.request, resp.clone());
          }
          return resp;
        }).catch(() => cached);
        return cached || fetched;
      })
    )
  );
});
