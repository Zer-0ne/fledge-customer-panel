/* Fledge PWA shell: installability only (navigation interception removed).
 *
 * ⚠️ DO NOT add event.respondWith() for navigation (mode === 'navigate')
 * requests to this file — not even a plain fetch(request) passthrough.
 *
 * WHY (reproduced 2026-09-04, Firefox 141/ESR, auth-gated pages):
 * Firefox enters an INFINITE RELOAD LOOP when a service worker intercepts a
 * navigation and answers with respondWith(fetch(...)) — even when the server
 * responds 200. Every reload is re-routed through the SW, the SW re-answers,
 * and the document never settles (~1 reload/sec, forever). Chromium follows
 * the exact same code path without looping, which is why Chrome looks fine.
 * Sequence that triggers it: first load registers this SW (fine), any
 * subsequent reload loops. Fixed by NEVER responding to navigations — the
 * fetch listener below exists only to satisfy Chromium's installability
 * check (a registered SW with a fetch handler) and is otherwise a no-op.
 */
const CACHE = 'fledge-shell-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Installability hook for Chromium. Intentionally empty — see header.
// Every request (navigation, asset, API) goes straight to the network.
self.addEventListener('fetch', (event) => {
  /* no-op on purpose */
});