/* Lift Log service worker — caches the app so it works fully offline.
   When you update index.html, bump the CACHE version below so phones fetch the new file. */
const CACHE = 'liftlog-v6';
const FILES = ['./', './index.html', './icon-180.png', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Cache-first: serve from cache, fall back to network (and refresh cache in background). */
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res && res.ok && e.request.method === 'GET') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
