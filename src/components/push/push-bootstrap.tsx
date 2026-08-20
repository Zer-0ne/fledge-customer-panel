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

    return () => { stopped = true; };
  }, [firebaseConfig]);

  return null;
}