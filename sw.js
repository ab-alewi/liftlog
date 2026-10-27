/* Lift Log service worker.
   - The app page itself: NETWORK FIRST (always the newest version when online),
     falling back to the saved copy when offline or the network is slow.
   - Other files (icon, manifest): cache first.
   Bump CACHE when files change. */
const CACHE = 'liftlog-v11';
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

function isPage(req){
  if (req.mode === 'navigate') return true;
  const u = new URL(req.url);
  return u.pathname.endsWith('/') || u.pathname.endsWith('/index.html');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  if (isPage(req)) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        // give the network 4 seconds (gym Wi-Fi can be slow), then use the saved copy
        const res = await Promise.race([
          fetch(req, {cache: 'no-store'}),
          new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))
        ]);
        if (res && res.ok) cache.put('./index.html', res.clone());
        return res;
      } catch (err) {
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
