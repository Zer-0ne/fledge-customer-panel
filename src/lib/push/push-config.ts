/**
 * Web push Firebase config — SERVER-ONLY module.
 *
 * Reads the Firebase web-app config from server env vars (no NEXT_PUBLIC
 * prefix). The values are public client config, but they are kept out of the
 * client bundle's process.env namespace: a server component reads this module
 * and passes the config to a client component as props. Never import this
 * module from a 'use client' file.
 */
import type { FirebaseWebConfig } from './push-notifications';

const PLACEHOLDER_MARKERS = ['YOUR_', 'PLACEHOLDER', 'changeme', 'xxx'];

export function getFirebaseWebConfig(): FirebaseWebConfig | null {
  const values = {
    apiKey: process.env.FIREBASE_API_KEY,
    projectId: process.env.FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
    vapidKey: process.env.FIREBASE_VAPID_KEY,
  };
  const unset = Object.values(values).some((v) => !v || PLACEHOLDER_MARKERS.some((m) => v.includes(m)));
  if (unset) return null;
  return {
    apiKey: values.apiKey as string,
    projectId: values.projectId as string,
    messagingSenderId: values.messagingSenderId as string,
    appId: values.appId as string,
    vapidKey: values.vapidKey as string,
  };
}
