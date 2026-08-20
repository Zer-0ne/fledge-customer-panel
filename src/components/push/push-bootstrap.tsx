'use client';

import * as React from 'react';
import {
  configureWebPush,
  ensureSwConfigured,
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
 */
export function PushBootstrap({ firebaseConfig }: { firebaseConfig: FirebaseWebConfig | null }) {
  React.useEffect(() => {
    configureWebPush(firebaseConfig);
    void ensureSwConfigured();
  }, [firebaseConfig]);

  return null;
}
