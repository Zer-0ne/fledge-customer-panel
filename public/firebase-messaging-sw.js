/**
 * Firebase messaging service worker (web push).
 * Loaded by the browser as the active service worker registered from
 * src/lib/push/push-notifications.ts. Uses the Firebase compat CDN build —
 * this file is served verbatim from /public and cannot use the bundler.
 *
 * The Firebase config is delivered by the PAGE via postMessage:
 *  - enableWebPush() posts it when the user enables push
 *  - ensureSwConfigured() re-posts it on every settings-page visit
 * The config is public client config, but it is intentionally NOT served from
 * a standalone endpoint — keep it out of the network-visible surface.
 *
 * PERSISTENCE (fix 2026-08-07): the config is ALSO cached in this SW's
 * IndexedDB so a fresh SW start (browser restart / SW update) can re-initialize
 * Firebase WITHOUT an open page. Previously background pushes were silently
 * dropped after a browser restart until the user revisited the settings page
 * (the SW woke with no config → onBackgroundMessage never registered).
 */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

let pushInitialized = false;

// ── Config persistence (IndexedDB) ──────────────────────────────────────────
const DB_NAME = 'firebase-push-config';
const DB_VERSION = 1;
const STORE = 'config';
const KEY = 'firebaseConfig';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function saveConfig(config) {
  return openDb()
    .then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(config, KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    }))
    .catch(() => { /* best-effort: cache is an optimization, not a requirement */ });
}

function loadConfig() {
  return openDb()
    .then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const get = tx.objectStore(STORE).get(KEY);
      get.onsuccess = () => { db.close(); resolve(get.result ?? null); };
      get.onerror = () => { db.close(); reject(get.error); };
    }))
    .catch(() => null);
}

function clearConfig() {
  return openDb()
    .then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    }))
    .catch(() => { /* best-effort */ });
}

// ── Firebase init ───────────────────────────────────────────────────────────
function applyConfig(config) {
  // Reset the flag every attempt so a failed init doesn't permanently brick
  // this SW (next postMessage would otherwise be a silent no-op).
  if (!self.firebase || !config || !config.apiKey) return;
  if (pushInitialized) return;
  try {
    self.firebase.initializeApp(config);
    self.messaging = self.firebase.messaging();
    self.messaging.onBackgroundMessage((payload) => {
      const rawTitle = payload.notification?.title ?? payload.data?.title;
      const rawBody = payload.notification?.body ?? payload.data?.body;
      // Never show a generic "New notification" — if both are missing, skip instead of spamming.
      const title = (rawTitle && String(rawTitle).trim()) || 'Flat Finder';
      const body = (rawBody && String(rawBody).trim()) || '';
      const data = payload.data ?? {};
      // OS notification — requireInteraction keeps it in the system tray until dismissed.
      self.registration.showNotification(title, {
        body,
        data,
        tag: data.notificationId ?? `push-${Date.now()}`,
        requireInteraction: false,
        renotify: true,
      });
    });
    pushInitialized = true;
  } catch (err) {
    // Without this, a one-time init failure leaves the SW permanently silent.
    pushInitialized = false;
    // Surface to the page so the next postMessage can retry with fresh config.
    try {
      self.registration && self.registration.active && self.registration.active.postMessage({
        type: 'FIREBASE_CONFIG_FAILED',
        error: err && err.message ? String(err.message) : 'unknown',
      });
    } catch (_) { /* best-effort */ }
  }
}

self.addEventListener('install', () => {
  // Try cached config at install time so the very first SW activation already
  // has Firebase wired up. Without this, browsers that fire `install` before
  // any postMessage reaches us (notably Chrome's first-run on the installed
  // PWA path) silently drop the first background push.
  self.skipWaiting();
  // Defer the IndexedDB read past skipWaiting — IndexedDB.open inside install
  // can race with activate and lose the cached config.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Fresh SW start (browser restart / update): re-init Firebase from the
      // cached config so background pushes keep displaying without a page.
      loadConfig().then((cached) => {
        if (cached) applyConfig(cached);
      }),
    ])
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'FIREBASE_CONFIG') {
    applyConfig(event.data.config);
    // Persist for future SW starts — idempotent after the first save.
    if (event.data.config && event.data.config.apiKey) {
      saveConfig(event.data.config);
    }
  } else if (event.data.type === 'FIREBASE_CONFIG_CLEAR') {
    // Push disabled from the page: stop displaying background notifications.
    pushInitialized = false;
    clearConfig();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  // Prefer explicit URL from FCM data; else resolve from entityType/entityId like the foreground listener does.
  let url = data.url;
  if (!url) {
    const type = data.entityType ?? data.deepLinkType;
    const id = data.entityId ?? data.conversationId;
    if (data.conversationId) url = `/messages/${data.conversationId}`;
    else if (type === 'housing_request' && id) url = `/need-now/${id}`;
    else if (type === 'listing' && id) url = `/listings/${id}`;
    else if (type === 'conversation' && id) url = `/messages/${id}`;
    else url = '/notifications';
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
