/**
 * Notification preferences — SERVER wrapper.
 *
 * Reads the Firebase web-app config from server env (push-config.ts) and
 * passes it to the client page as a prop. The env vars stay server-side
 * (no NEXT_PUBLIC prefix); only the public config object reaches the browser.
 */
import { getFirebaseWebConfig } from '@/lib/push/push-config';
import NotificationPreferencesClient from './notification-preferences-client';

export default function NotificationPreferencesPage() {
  return <NotificationPreferencesClient firebaseConfig={getFirebaseWebConfig()} />;
}
