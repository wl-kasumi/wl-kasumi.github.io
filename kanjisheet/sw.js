const CACHE = 'kanjisheet-v2';
const KURO_CACHE = 'kanjisheet-kuro-v1';

// kuromoji's script + dictionary files are large (~17MB) and immutable per
// version, so serve them cache-first: repeat visits load instantly and the
// dictionary keeps working offline once it has been fetched once.
function isKuromojiAsset(url) {
  return (url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'unpkg.com') &&
    url.pathname.indexOf('/kuromoji@0.1.2/') !== -1;
}

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== KURO_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (isKuromojiAsset(url)) {
    e.respondWith(
      caches.open(KURO_CACHE).then((cache) =>
        cache.match(req).then((hit) => {
          if (hit) return hit;
          return fetch(req).then((res) => {
            if (res && (res.status === 200 || res.type === 'opaque')) {
              cache.put(req, res.clone());
            }
            return res;
          });
        })
      )
    );
    return;
  }
  e.respondWith(
    fetch(req).then((res) => {
      if (url.origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
