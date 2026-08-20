'use client';

import * as React from 'react';
import {
  configureWebPush,
  ensureSwConfigured,
  isWebPushActive,
} from '@/lib/push/push-notifications';
import type { FirebaseWebConfig } from '@/lib/push/push-notifications';

/**
 * Global push bootstrap — mounts once in the root layout.
 *
 * Previously the Firebase config was only injected from
 * settings/notifications page, so a user who never visited Settings
 * had activeConfig === null and the SW never received FIREBASE_CONFIG —
 * background pushes were silently dropped after a restart/reload.
 *
 * This provider receives the server-rendered config (or null) and on
 * every authenticated mount (and on config change) re-posts it to all
 * registered SWs so firebase-messaging-sw.js can initialise
 * onBackgroundMessage regardless of which page the user is on.
 *
 * Additionally: registers Firebase onMessage handler on every mount so
 * foreground pushes (page visible) trigger both in-app toast AND
 * OS-level notification. Previously onMessage was only registered inside
 * enableWebPush() (Settings page) — navigating away lost the handler.
 */
export function PushBootstrap({ firebaseConfig }: { firebaseConfig: FirebaseWebConfig | null }) {
  React.useEffect(() => {
    configureWebPush(firebaseConfig);
    void ensureSwConfigured();

    // Register foreground onMessage handler if push was previously enabled.
    // This ensures OS notifications show even when tab is focused.
    if (firebaseConfig && isWebPushActive()) {
      import('firebase/app').then(({ initializeApp, getApps }) => {
        const app = getApps()[0] ?? initializeApp({
          apiKey: firebaseConfig.apiKey,
          projectId: firebaseConfig.projectId,
          messagingSenderId: firebaseConfig.messagingSenderId,
          appId: firebaseConfig.appId,
        });
        return import('firebase/messaging');
      }).then(({ getMessaging, onMessage }) => {
        try {
          const messaging = getMessaging();
          onMessage(messaging, (payload) => {
            window.dispatchEvent(new CustomEvent('webpush:message', { detail: payload }));
          });
        } catch {
          // Firebase already initialized or messaging unavailable — safe to ignore
        }
      }).catch(() => {
        // Firebase SDK load failed — foreground push disabled, background still works via SW
      });
    }
  }, [firebaseConfig]);

  return null;
}
