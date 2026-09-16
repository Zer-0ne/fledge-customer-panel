'use client';

import * as React from 'react';
import {
  configureWebPush,
  ensureSwConfigured,
  isWebPushActive,
  isWebPushSupported,
} from '@/lib/push/push-notifications';
import type { FirebaseWebConfig } from '@/lib/push/push-notifications';

/**
 * Global push bootstrap — mounts in the root layout.
 *
 * Posts Firebase config to the SW (background pushes via onBackgroundMessage)
 * and registers Firebase onMessage on the PAGE so foreground pushes show
 * in-app toast via webpush:message event. OS notification is handled
 * natively by the browser from the FCM notification block — no need to
 * duplicate it here.
 */
export function PushBootstrap({ firebaseConfig }: { firebaseConfig: FirebaseWebConfig | null }) {
  React.useEffect(() => {
    configureWebPush(firebaseConfig);
    void ensureSwConfigured();

    if (!firebaseConfig || !isWebPushActive() || !isWebPushSupported()) return;

    // SW reports FIREBASE_CONFIG_FAILED when the cached config is unusable
    // (rotation, corruption). Retry by re-posting the fresh config once — if it
    // still fails we drop the cache so the next visit re-fetches cleanly.
    // Stored on a window field so Next.js production minification doesn't
    // tree-shake the closure (the cleanup uses it, but terser can't prove it).
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const onConfigFailed = (event: MessageEvent) => {
        const data = (event as MessageEvent).data as { type?: string; error?: string } | undefined;
        if (data?.type !== 'FIREBASE_CONFIG_FAILED') return;
        try {
          navigator.serviceWorker.controller?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
        } catch (_) { /* best-effort */ }
      };
      // Surface on window so minifiers keep the closure alive across builds.
      (window as unknown as { __pushConfigRetry?: (event: MessageEvent) => void }).__pushConfigRetry = onConfigFailed;
      navigator.serviceWorker.addEventListener('message', onConfigFailed);
    }

    let stopped = false;

    import('firebase/app').then(({ initializeApp, getApps }) => {
      if (stopped) return null;
      const app = getApps()[0] ?? initializeApp({
        apiKey: firebaseConfig.apiKey,
        projectId: firebaseConfig.projectId,
        messagingSenderId: firebaseConfig.messagingSenderId,
        appId: firebaseConfig.appId,
      });
      return import('firebase/messaging');
    }).then((messagingMod) => {
      if (!messagingMod || stopped) return;
      const { getMessaging, onMessage } = messagingMod;
      try {
        const messaging = getMessaging();
        onMessage(messaging, (payload) => {
          // Dispatch event for PushForegroundListener (in-app toast only).
          // OS notification is handled natively by the browser from the
          // FCM notification block — no need to show it again here.
          window.dispatchEvent(new CustomEvent('webpush:message', { detail: payload }));
        });
      } catch {
        // Firebase messaging init failed
      }
    }).catch(() => {});

    return () => {
      stopped = true;
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const handler = (window as unknown as { __pushConfigRetry?: (event: MessageEvent) => void }).__pushConfigRetry;
        if (handler) navigator.serviceWorker.removeEventListener('message', handler);
      }
    };
  }, [firebaseConfig]);

  return null;
}