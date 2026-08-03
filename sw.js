const CACHE = 'accountability-v3';
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

/* Same-origin app files (index.html, manifest, icons): network-first, so a
   new deploy shows up on the very next load instead of waiting on a
   background revalidation that may never fire. Cache is only a fallback
   for offline use.
   Cross-origin CDN assets (Tabler icons, Google Fonts): stale-while-
   revalidate, since those rarely change and instant paint matters more. */
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const sameOrigin = url.origin === self.location.origin;

  /* Never cache calls to the Google Apps Script sync endpoint — it's a live
     data API, not a static asset. Caching it made Pull sometimes serve an
     old response instead of hitting Google fresh. */
  if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') {
    return;
  }

  if (sameOrigin) {
    e.respondWith(
      fetch(e.request).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
        }
        return resp;
      }).catch(() => caches.open(CACHE).then(cache => cache.match(e.request)))
    );
    return;
  }

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
