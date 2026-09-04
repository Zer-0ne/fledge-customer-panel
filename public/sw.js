/* Owl Sight PWA shell: installability + offline fallback (network-first). */
const CACHE = 'owlsight-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/offline'])).then(() => self.skipWaiting()).catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Only handle same-origin navigations; leave API/proxy + assets to network.
  if (url.origin !== self.location.origin) return;
  if (request.mode !== 'navigate') return;
  event.respondWith(
    fetch(request).catch(() => caches.match('/offline').then((res) => res || Response.error())),
  );
});
