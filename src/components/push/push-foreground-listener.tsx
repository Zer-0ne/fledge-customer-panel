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

export function resolvePushRoute(data: PushData): string | null {
  const conversationId = data.conversationId ?? (data.deepLinkData?.conversationId as string | undefined);
  if (conversationId && conversationId.length > 0) return `/messages/${conversationId}`;
  const type = data.entityType ?? data.deepLinkType;
  if (!type) return null;
  if (type.startsWith('/')) return type;
  const id = data.entityId ?? (data.deepLinkData?.entityId as string | undefined);
  switch (type) {
    case 'housing_request': return id ? `/need-now/${id}` : '/need-now';
    case 'housing_response': return '/need-now';
    case 'announcement': return '/notifications';
    case 'listing':
    case 'property': return id ? `/listings/${id}` : '/listings';
    case 'conversation': return id ? `/messages/${id}` : null;
    case 'contact_share_request': return id ? `/contact-share/${id}` : '/messages';
    case 'roommate_post': return id ? `/roommate-interests?tab=incoming&postId=${id}` : '/roommate-interests';
    default: return null;
  }
}

/**
 * Protected-layout push surface.
 * - Listens for NOTIFICATION_CLICK (posted by SW on OS notification tap)
 *   and navigates to the deep-linked route.
 * - Shows in-app toast for foreground pushes (webpush:message from PushBootstrap).
 */
export default function PushForegroundListener() {
  const router = useRouter();

  React.useEffect(() => {
    const onForeground = (event: Event) => {
      const payload = (event as CustomEvent).detail as {
        notification?: { title?: string; body?: string };
        data?: PushData;
      };
      const title = payload?.notification?.title ?? 'New notification';
      const body = payload?.notification?.body ?? '';
      showToast({ title, description: body });
    };

    const onClick = (event: Event) => {
      const data = (event as CustomEvent).detail as PushData | undefined;
      const route = data ? resolvePushRoute(data) : null;
      router.push(route ?? '/notifications');
    };

    window.addEventListener('webpush:message', onForeground);
    window.addEventListener('NOTIFICATION_CLICK', onClick);
    return () => {
      window.removeEventListener('webpush:message', onForeground);
      window.removeEventListener('NOTIFICATION_CLICK', onClick);
    };
  }, [router]);

  return null;
}
