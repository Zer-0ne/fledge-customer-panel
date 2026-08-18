/**
 * Web push client (customer panel).
 *
 * Server-side-only push boundary: this module NEVER sends pushes — it only
 * obtains a browser push token (Firebase Messaging) and registers it with the
 * backend via POST /api/v1/notifications/devices (platform WEB). The backend
 * worker sends pushes through Firebase Admin SDK. Background notifications are
 * rendered by /public/firebase-messaging-sw.js.
 *
 * Placeholder env values (NEXT_PUBLIC_FIREBASE_* = YOUR_...) disable the whole
 * module — no permission prompts, no token, no errors — until real Firebase
 * web config is configured.
 */
import { apiFetch } from '@/lib/api/client';

export interface FirebaseWebConfig {
  apiKey: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

/** Module-level config injected by the client page (server-provided props). */
let activeConfig: FirebaseWebConfig | null = null;

/** Called once by the settings page with the server-rendered config. */
export function configureWebPush(config: FirebaseWebConfig | null): void {
  activeConfig = config;
}

function config(): FirebaseWebConfig | null {
  return activeConfig;
}

export function isWebPushConfigured(): boolean {
  return config() !== null;
}

export function isWebPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

const INSTALLATION_KEY = 'web_push_installation_id';
const SUBSCRIBED_KEY = 'web_push_subscribed';

const PUSH_TOKEN_TIMEOUT_MS = 15_000;

/** Rejects when the underlying promise does not settle in time — getToken can
 * hang forever when the browser push service never answers, which would leave
 * the toggle stuck in a busy state with no error surfaced. */
function withTimeout<T>(promise: Promise<T>, message: string, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function installationId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(INSTALLATION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(INSTALLATION_KEY, id);
  }
  return id;
}

/**
 * Resolves once the given registration has an ACTIVE worker.
 *
 * `navigator.serviceWorker.ready` is deliberately NOT used: it only resolves
 * when the page is CONTROLLED by a service worker, and the FCM scope
 * (/firebase-cloud-messaging-push-scope) never covers the settings page URL —
 * `ready` hangs forever there (hit for real: "Push setup timed out" after
 * 15s while the registration was already active). The SW calls skipWaiting()
 * on install, so activation is near-immediate.
 */
function waitForActiveWorker(registration: ServiceWorkerRegistration): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (registration.active) {
        resolve();
        return;
      }
      const worker = registration.installing ?? registration.waiting;
      if (worker) {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated' || registration.active) resolve();
        });
      } else {
        registration.addEventListener('updatefound', check, { once: true });
      }
    };
    check();
  });
}

export async function registerWebPushToken(token: string): Promise<void> {
  await apiFetch<unknown>({
    path: '/api/v1/notifications/devices',
    method: 'POST',
    body: {
      token,
      platform: 'WEB',
      installationId: installationId(),
      appVersion: 'web',
    },
  });
}

export async function deactivateWebPushInstallation(): Promise<void> {
  if (typeof window === 'undefined') return;
  const id = window.localStorage.getItem(INSTALLATION_KEY);
  if (!id) return;
  try {
    await apiFetch<unknown>({
      path: `/api/v1/notifications/devices/${id}`,
      method: 'DELETE',
    });
  } catch {
    // Best-effort on logout — the stale-token sweep cleans up leftovers.
  }
  window.localStorage.removeItem(SUBSCRIBED_KEY);
}

/** User-gesture path: permission prompt → token → backend registration. */
export async function enableWebPush(): Promise<{ ok: boolean; message?: string }> {
  const cfg = config();
  if (!cfg) return { ok: false, message: 'Web push is not configured yet.' };
  if (!isWebPushSupported()) return { ok: false, message: 'This browser does not support push notifications.' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      ok: false,
      message:
        permission === 'denied'
          ? 'Notifications are blocked in your browser. Allow them from the site settings (address-bar icon → Notifications), then try again.'
          : 'Permission was not granted.',
    };
  }

  try {
    // Register at the standard Firebase Messaging scope so the SDK's default
    // registration and ours converge on ONE service worker (two registrations
    // = pushes routed to a SW that never received the config).
    const registration = await withTimeout(
      navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/firebase-cloud-messaging-push-scope' }),
      'Push setup timed out — check your connection and try again.',
      PUSH_TOKEN_TIMEOUT_MS,
    );
    // `serviceWorker.ready` hangs for out-of-scope registrations (the FCM
    // scope never controls the page) — wait on the registration's own active
    // worker instead. The SW calls skipWaiting(), so this resolves fast.
    await withTimeout(waitForActiveWorker(registration), 'Push setup timed out — check your connection and try again.', PUSH_TOKEN_TIMEOUT_MS);
    const { initializeApp } = await withTimeout(import('firebase/app'), 'Push setup timed out — loading Firebase took too long.', PUSH_TOKEN_TIMEOUT_MS);
    const { getMessaging, getToken, onMessage } = await withTimeout(import('firebase/messaging'), 'Push setup timed out — loading Firebase took too long.', PUSH_TOKEN_TIMEOUT_MS);
    const app = initializeApp({
      apiKey: cfg.apiKey,
      projectId: cfg.projectId,
      messagingSenderId: cfg.messagingSenderId,
      appId: cfg.appId,
    });
    const messaging = getMessaging(app);

    registration.active?.postMessage({ type: 'FIREBASE_CONFIG', config: cfg });
    const token = await withTimeout(
      getToken(messaging, { vapidKey: cfg.vapidKey, serviceWorkerRegistration: registration }),
      'Push token request timed out — check your connection and try again.',
      PUSH_TOKEN_TIMEOUT_MS,
    );
    if (!token) return { ok: false, message: 'Could not obtain a push token.' };

    await registerWebPushToken(token);
    window.localStorage.setItem(SUBSCRIBED_KEY, '1');

    onMessage(messaging, (payload) => {
      window.dispatchEvent(new CustomEvent('webpush:message', { detail: payload }));
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Push setup failed.' };
  }
}

/** Disables push: deletes the FCM token and deactivates the installation. */
export async function disableWebPush(): Promise<{ ok: boolean; message?: string }> {
  const cfg = config();
  try {
    if (cfg) {
      const { initializeApp, deleteApp, getApps } = await import('firebase/app');
      const { getMessaging, deleteToken } = await import('firebase/messaging');
      const app = getApps()[0] ?? initializeApp({
        apiKey: cfg.apiKey,
        projectId: cfg.projectId,
        messagingSenderId: cfg.messagingSenderId,
        appId: cfg.appId,
      });
      const messaging = getMessaging(app);
      await deleteToken(messaging);
      await deleteApp(app);
    }
  } catch {
    // Token may not exist — deactivation below is the authoritative cleanup.
  }
  // Tell every SW registration to drop the cached config + reset init state so
  // a restarted browser cannot keep displaying background pushes after opt-out.
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      registration?.active?.postMessage({ type: 'FIREBASE_CONFIG_CLEAR' });
    }
  } catch {
    // Best-effort — cached config re-inits only if a page later re-posts it.
  }
  await deactivateWebPushInstallation();
  window.localStorage.removeItem(SUBSCRIBED_KEY);
  return { ok: true };
}

/** True when this browser already subscribed (permission granted + flag). */
export function isWebPushActive(): boolean {
  if (typeof window === 'undefined') return false;
  return isWebPushConfigured() && window.localStorage.getItem(SUBSCRIBED_KEY) === '1' && Notification.permission === 'granted';
}

/**
 * Re-posts the Firebase config to EVERY registered service worker on each
 * authenticated settings-page load. The SW's onBackgroundMessage handler
 * (which shows OS notifications) only exists after it receives the config.
 * Targeting all registrations covers the Firebase SDK's default scope
 * (/firebase-cloud-messaging-push-scope) as well as any legacy `/`-scope
 * registration — a push can arrive at either depending on which SW minted
 * the token.
 */
export async function ensureSwConfigured(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const cfg = config();
  if (!cfg) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      registration?.active?.postMessage({ type: 'FIREBASE_CONFIG', config: cfg });
    }
  } catch {
    // Best-effort — push remains disabled until the next enable cycle.
  }
}
