'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
} from '@/lib/api/services/notifications';
import { Notification } from '@/types';
import { formatRelativeTime } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { showToast } from '@/components/ui/toast';
import { Bell, CheckCheck, ChevronRight, Settings, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import BorderGlow from '@/components/BorderGlow'

/** Moderation notification: Instagram-style violation chips + risk level. */
function ModerationChips({ notification }: { notification: Notification }) {
  // Extract from deepLinkData if available (backend sets these).
  const flags = ((notification as unknown) as Record<string, unknown>).deepLinkData as Record<string, unknown> | undefined;
  const violationFlags = flags?.violationFlags as string[] | undefined;
  const riskLevel = flags?.riskLevel as string | undefined;
  const safeReason = flags?.safeReason as string | undefined;

  if (!violationFlags && !riskLevel && !safeReason) return null;

  const flagLabels: Record<string, string> = {
    REPEATED_DESCRIPTION: 'Duplicate content',
    CONTACT_INFORMATION: 'Contact info detected',
    PROMOTIONAL_CONTENT: 'Promotional content',
    SPAM_KEYWORDS: 'Spam detected',
    QR_CODE_DETECTED: 'QR code found',
    SUSPICIOUS_LINKS: 'Suspicious links',
    POLICY_VIOLATION: 'Policy violation',
  };

  return (
    <div className="space-y-2 pt-1">
      {violationFlags && violationFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {violationFlags.slice(0, 3).map((flag) => (
            <span
              key={flag}
              className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400"
            >
              {flagLabels[flag] ?? flag}
            </span>
          ))}
        </div>
      )}
      {riskLevel && (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
            riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
              ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
              : riskLevel === 'MEDIUM'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400'
                : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
          )}
        >
          Risk: {riskLevel}
        </span>
      )}
      {safeReason && (
        <p className="text-xs italic text-muted-foreground bg-muted/50 rounded-md px-2 py-1">
          &ldquo;{safeReason}&rdquo;
        </p>
      )}
    </div>
  );
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = React.useState<Notification[]>([]);
  const [nextBefore, setNextBefore] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [markingIds, setMarkingIds] = React.useState<Set<string>>(new Set());

  const loadInitial = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const page = await fetchNotifications();
      setItems(page.items);
      setNextBefore(page.nextBefore);
      setHasMore(page.hasMore);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load notifications.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitial();
  }, [loadInitial]);

  // Listen for live incoming notifications
  React.useEffect(() => {
    const handleNotificationCreated = (evt: Event) => {
      const customEvt = evt as CustomEvent<{
        id: string;
        kind: string;
        title: string;
        body: string;
        createdAt: string;
      }>;
      const detail = customEvt.detail;
      if (!detail || !detail.id) return;

      const newNotif: Notification = {
        id: detail.id,
        userId: user?.id || '',
        kind: (detail.kind as Notification['kind']) || 'listing_interest',
        title: detail.title,
        body: detail.body,
        isRead: false,
        createdAt: detail.createdAt,
      };

      setItems((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
    };

    window.addEventListener('app:notification_created', handleNotificationCreated);
    return () => {
      window.removeEventListener('app:notification_created', handleNotificationCreated);
    };
  }, []);

  const loadMore = async () => {
    if (!nextBefore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await fetchNotifications({ before: nextBefore });
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        const fresh = page.items.filter((n) => !seen.has(n.id));
        return [...prev, ...fresh];
      });
      setNextBefore(page.nextBefore);
      setHasMore(page.hasMore);
    } catch {
      showToast({
        title: 'Could not load more',
        description: 'Please try again.',
        variant: 'error',
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleMarkRead = async (notification: Notification) => {
    if (notification.isRead || markingIds.has(notification.id)) return;

    setMarkingIds((prev) => new Set(prev).add(notification.id));
    setItems((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
    );

    try {
      await markNotificationRead(notification.id);
      // Header badge is updated via socket `user:unread_counts` after mark-read.
      // Do not call refreshSession() — bootstrap does not return unread counts and
      // would incorrectly zero both message and notification badges.
    } catch {
      setItems((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: false } : n))
      );
      showToast({
        title: 'Update failed',
        description: 'Could not mark notification as read.',
        variant: 'error',
      });
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const handleMarkAllVisible = async () => {
    const unread = items.filter((n) => !n.isRead);
    if (unread.length === 0) return;

    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await markAllNotificationsRead();
      showToast({
        title: 'Marked as read',
        description: `${unread.length} notification(s) updated.`,
        variant: 'success',
      });
    } catch {
      setItems((prev) =>
        prev.map((n) => (unread.some((u) => u.id === n.id) ? { ...n, isRead: false } : n))
      );
      showToast({
        title: 'Update failed',
        description: 'Could not mark all as read.',
        variant: 'error',
      });
    }
  };

  const [archivingIds, setArchivingIds] = React.useState<Set<string>>(new Set());

  const handleArchive = async (notification: Notification) => {
    if (archivingIds.has(notification.id)) return;
    setArchivingIds((prev) => new Set(prev).add(notification.id));
    try {
      await archiveNotification(notification.id);
      setItems((prev) => prev.filter((n) => n.id !== notification.id));
      showToast({ title: 'Archived', description: 'Notification moved to archive.', variant: 'success' });
    } catch {
      showToast({ title: 'Archive failed', description: 'Could not archive this notification.', variant: 'error' });
    } finally {
      setArchivingIds((prev) => {
        const next = new Set(prev);
        next.delete(notification.id);
        return next;
      });
    }
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  if (isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorState title="Notifications unavailable" description={error} onRetry={loadInitial} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleMarkAllVisible}>
              <CheckCheck className="size-4" />
              Mark all read
            </Button>
          )}
          <Link href="/settings/notifications">
            <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
              <Settings className="size-4" />
              Preferences
            </Button>
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Activity about interests, messages, and updates will show up here."
          action={
            <Link href="/dashboard">
              <Button size="sm" variant="outline">
                Back to dashboard
              </Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-2">
          {items.map((notification) => {
            const content = (
              <BorderGlow className='rounded-xl!'>
              <div
                className={cn(
                  'flex items-start gap-3 rounded-xl border border-border/80 bg-card p-4 transition-colors',
                  !notification.isRead && 'border-primary/30 bg-primary/5'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg',
                    notification.isRead
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  <Bell className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold text-foreground leading-snug">
                      {notification.title}
                    </h2>
                    {!notification.isRead && (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        New
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {notification.body || notification.message}
                  </p>
                  {/* Moderation-specific: violation chips + risk level */}
                  {notification.kind === 'moderation' && (
                    <ModerationChips notification={notification} />
                  )}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                    <div className="flex items-center gap-2">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={markingIds.has(notification.id)}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleMarkRead(notification);
                          }}
                        >
                          Mark read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        disabled={archivingIds.has(notification.id)}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleArchive(notification);
                        }}
                      >
                        <Archive className="size-3.5" />
                        Archive
                      </Button>
                      {notification.targetUrl && (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </BorderGlow>
            );

            if (notification.targetUrl) {
              return (
                <li key={notification.id}>
                  <Link
                    href={notification.targetUrl}
                    onClick={() => {
                      if (!notification.isRead) void handleMarkRead(notification);
                    }}
                    className="block"
                  >
                    {content}
                  </Link>
                </li>
              );
            }

            return (
              <li key={notification.id}>
                {/* div role=button, NOT <button>: `content` already contains a
                    "Mark read" <Button> — nesting a button inside a button is
                    invalid HTML and breaks hydration. */}
                <div
                  role="button"
                  tabIndex={0}
                  className="w-full cursor-pointer"
                  onClick={() => void handleMarkRead(notification)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      void handleMarkRead(notification);
                    }
                  }}
                >
                  {content}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && nextBefore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading...' : 'Load older notifications'}
          </Button>
        </div>
      )}
    </main>
  );
}
