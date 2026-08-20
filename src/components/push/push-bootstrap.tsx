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
 * Does TWO things:
 * 1. Posts Firebase config to the SW (background pushes via onBackgroundMessage)
 * 2. Registers Firebase onMessage on the PAGE so foreground pushes show BOTH
 *    in-app toast (via webpush:message event) AND OS notification (directly).
 */
export function PushBootstrap({ firebaseConfig }: { firebaseConfig: FirebaseWebConfig | null }) {
  React.useEffect(() => {
    configureWebPush(firebaseConfig);
    void ensureSwConfigured();

    if (!firebaseConfig || !isWebPushActive() || !isWebPushSupported()) return;

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
          // 1. Dispatch event for PushForegroundListener (in-app toast)
          window.dispatchEvent(new CustomEvent('webpush:message', { detail: payload }));

          // 2. Direct OS notification — no dependency on PushForegroundListener
          try {
            if (Notification.permission === 'granted') {
              const title = payload.notification?.title
                ?? (payload.data as Record<string, unknown>)?.title as string
                ?? 'New notification';
              const body = payload.notification?.body
                ?? (payload.data as Record<string, unknown>)?.body as string
                ?? '';
              const data = (payload.data ?? {}) as Record<string, unknown>;
              const tag = (data.notificationId as string) ?? `push-${Date.now()}`;

              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((reg) => {
                  reg.showNotification(title, {
                    body,
                    data,
                    tag,
                    
                  });
                }).catch(() => {
                  new Notification(title, { body });
                });
              } else {
                new Notification(title, { body });
              }
            }
          } catch {
            // Notification API unavailable or permission revoked
          }
        });
      } catch {
        // Firebase messaging init failed
      }
    }).catch(() => {});

    return () => { stopped = true; };
  }, [firebaseConfig]);

  return null;
}
