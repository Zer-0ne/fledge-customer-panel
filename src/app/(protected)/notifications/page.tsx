'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { useNotificationStore } from '@/lib/stores/use-notification-store';
import {
  NOTICE_FILTERS,
  groupNotificationsByDay,
  noticeFilterById,
  noticeFilterQuery,
  type NoticeFilterId,
} from '@/lib/notifications/notice-centre';
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
              className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-950/30 dark:text-red-400"
            >
              {flagLabels[flag] ?? flag}
            </span>
          ))}
        </div>
      )}
      {riskLevel && (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold',
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
  const items = useNotificationStore((s) => s.items);
  const nextBefore = useNotificationStore((s) => s.nextBefore);
  const hasMore = useNotificationStore((s) => s.hasMore);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const isLoadingMore = useNotificationStore((s) => s.isLoadingMore);
  const error = useNotificationStore((s) => s.error);
  const markingIds = useNotificationStore((s) => s.markingIds);
  const archivingIds = useNotificationStore((s) => s.archivingIds);
  const loadInitial = useNotificationStore((s) => s.loadInitial);
  const loadMoreItems = useNotificationStore((s) => s.loadMore);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const archive = useNotificationStore((s) => s.archive);
  const prepend = useNotificationStore((s) => s.prepend);
  const unreadCount = useNotificationStore((s) => s.unreadCount());

  const [activeFilter, setActiveFilter] = React.useState<NoticeFilterId>('all');

  React.useEffect(() => {
    void loadInitial(noticeFilterQuery(noticeFilterById(activeFilter)));
  }, [loadInitial, activeFilter]);

  const groups = React.useMemo(() => groupNotificationsByDay(items, new Date()), [items]);

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

      prepend(newNotif);
    };

    window.addEventListener('app:notification_created', handleNotificationCreated);
    return () => {
      window.removeEventListener('app:notification_created', handleNotificationCreated);
    };
  }, [prepend, user?.id]);

  const loadMore = async () => {
    try {
      await loadMoreItems();
    } catch {
      showToast({
        title: 'Could not load more',
        description: 'Please try again.',
        variant: 'error',
      });
    }
  };

  const handleMarkRead = async (notification: Notification) => {
    try {
      await markRead(notification.id);
      // Header badge is updated via socket `user:unread_counts` after mark-read.
    } catch {
      showToast({
        title: 'Update failed',
        description: 'Could not mark notification as read.',
        variant: 'error',
      });
    }
  };

  const handleMarkAllVisible = async () => {
    try {
      const updated = await markAllRead();
      if (updated === 0) return;
      showToast({
        title: 'Marked as read',
        description: `${updated} notification(s) updated.`,
        variant: 'success',
      });
    } catch {
      showToast({
        title: 'Update failed',
        description: 'Could not mark all as read.',
        variant: 'error',
      });
    }
  };

  const handleArchive = async (notification: Notification) => {
    try {
      await archive(notification.id);
      showToast({ title: 'Archived', description: 'Notification moved to archive.', variant: 'success' });
    } catch {
      showToast({ title: 'Archive failed', description: 'Could not archive this notification.', variant: 'error' });
    }
  };

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
        <ErrorState
          title="Notifications unavailable"
          description={error}
          onRetry={() => void loadInitial(noticeFilterQuery(noticeFilterById(activeFilter)))}
        />
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

      <div
        role="tablist"
        aria-label="Filter notifications"
        className="flex items-center gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1"
      >
        {NOTICE_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={activeFilter === filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === filter.id
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={activeFilter === 'all' ? 'No notifications yet' : `No ${noticeFilterById(activeFilter).label.toLowerCase()} notifications`}
          description={
            activeFilter === 'all'
              ? 'Activity about interests, messages, and updates will show up here.'
              : 'Nothing matches this filter right now — try another chip or come back later.'
          }
          action={
            <Link href="/dashboard">
              <Button size="sm" variant="outline">
                Back to dashboard
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </h2>
              <ul className="space-y-2">
                {group.items.map((notification) => {
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
                      <Badge variant="secondary" className="shrink-0 text-[11px]">
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
            </section>
          ))}
        </div>
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
