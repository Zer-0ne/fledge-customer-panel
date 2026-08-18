'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { showToast } from '@/components/ui/toast';

interface PushData {
  notificationId?: string;
  type?: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  deepLinkType?: string;
  deepLinkData?: Record<string, unknown>;
  conversationId?: string;
  url?: string;
}

/**
 * Foreground push surface (fix 2026-08-07):
 * 1. `webpush:message` — dispatched by src/lib/push/push-notifications.ts
 *    onMessage handler. Previously NOTHING listened to it, so foreground
 *    pushes (app open) were invisible. Now renders an in-app toast.
 * 2. `NOTIFICATION_CLICK` — posted by public/firebase-messaging-sw.js when a
 *    background OS notification is tapped. Previously nothing handled it and
 *    the SW's openWindow fallback always opened '/' (no `url` in the payload).
 *    Now resolves the deep link from entityType/entityId/conversationId.
 *
 * Mounted once in the protected layout — active on every authenticated page.
 */
export function resolvePushRoute(data: PushData): string | null {
  const conversationId = data.conversationId ?? (data.deepLinkData?.conversationId as string | undefined);
  if (conversationId && conversationId.length > 0) return `/messages/${conversationId}`;
  const type = data.entityType ?? data.deepLinkType;
  if (!type) return null;
  if (type.startsWith('/')) return type;
  const id = data.entityId ?? (data.deepLinkData?.entityId as string | undefined);
  switch (type) {
    case 'housing_request':
      return id ? `/need-now/${id}` : '/need-now';
    case 'housing_response':
      return '/need-now';
    case 'announcement':
      return '/notifications';
    case 'listing':
    case 'property':
      return id ? `/listings/${id}` : '/listings';
    case 'conversation':
      return id ? `/messages/${id}` : null;
    case 'roommate_post':
      return id ? `/roommate-posts/${id}` : '/roommate-posts';
    default:
      return null;
  }
}

export default function PushForegroundListener() {
  const router = useRouter();

  React.useEffect(() => {
    const onMessage = (event: Event) => {
      const payload = (event as CustomEvent).detail as {
        notification?: { title?: string; body?: string };
        data?: PushData;
      };
      showToast({
        title: payload?.notification?.title ?? 'New notification',
        description: payload?.notification?.body ?? '',
      });
    };

    const onClick = (event: Event) => {
      const data = (event as CustomEvent).detail as PushData | undefined;
      const route = data ? resolvePushRoute(data) : null;
      router.push(route ?? '/notifications');
    };

    window.addEventListener('webpush:message', onMessage);
    window.addEventListener('NOTIFICATION_CLICK', onClick);
    return () => {
      window.removeEventListener('webpush:message', onMessage);
      window.removeEventListener('NOTIFICATION_CLICK', onClick);
    };
  }, [router]);

  return null;
}
