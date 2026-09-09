'use client';

/**
 * Announcement center — `src/components/announcements/announcement-center.tsx`
 *
 * Renders published, audience-matched announcements for the current user:
 * - TOP_BANNER / DASHBOARD_CARD modes render inline on the dashboard
 * - MODAL mode renders as an auto-dismissing dialog (once per version)
 * - Receipts: seen on render, read on expand, acknowledge when required
 * Failure isolation: renders nothing on any error.
 */
import * as React from 'react';
import { Megaphone, X, CheckCircle2, AlertTriangle, Info, Wrench, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  acknowledgeAnnouncement,
  dismissAnnouncement,
  fetchAnnouncements,
  markAnnouncementRead,
  markAnnouncementSeen,
  persistDismissedAnnouncement,
  readDismissedAnnouncements,
} from '@/lib/api/services/announcements';
import type { AnnouncementItem, AnnouncementType } from '@/types';

const TYPE_STYLES: Record<
  AnnouncementType,
  { icon: React.ReactNode; label: string; badge: string; border: string; bg: string }
> = {
  INFORMATION: {
    icon: <Info className="size-4 text-sky-500" />,
    label: 'Notice',
    badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    border: 'border-sky-500/20',
    bg: 'bg-sky-500/5',
  },
  MAINTENANCE: {
    icon: <Wrench className="size-4 text-amber-500" />,
    label: 'Maintenance',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
  },
  POLICY_UPDATE: {
    icon: <ShieldAlert className="size-4 text-violet-500" />,
    label: 'Update',
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    border: 'border-violet-500/20',
    bg: 'bg-violet-500/5',
  },
  URGENT: {
    icon: <AlertTriangle className="size-4 text-rose-500" />,
    label: 'Urgent',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    border: 'border-rose-500/20',
    bg: 'bg-rose-500/5',
  },
  PROMOTIONAL: {
    icon: <Megaphone className="size-4 text-emerald-500" />,
    label: 'Offer',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    border: 'border-emerald-500/20',
    bg: 'bg-emerald-500/5',
  },
  PAYMENT_NOTICE: {
    icon: <Info className="size-4 text-orange-500" />,
    label: 'Payment',
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    border: 'border-orange-500/20',
    bg: 'bg-orange-500/5',
  },
  PARTNER_NOTICE: {
    icon: <Megaphone className="size-4 text-cyan-500" />,
    label: 'Partner',
    badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    border: 'border-cyan-500/20',
    bg: 'bg-cyan-500/5',
  },
  SAFETY_ALERT: {
    icon: <ShieldAlert className="size-4 text-rose-500" />,
    label: 'Safety',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    border: 'border-rose-500/20',
    bg: 'bg-rose-500/5',
  },
};

function useAnnouncements() {
  const [items, setItems] = React.useState<AnnouncementItem[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchAnnouncements().then((list) => {
      if (cancelled) return;
      const locallyDismissed = readDismissedAnnouncements();
      const visible = list.filter((a) => !locallyDismissed.has(a.id));
      setItems(visible);
      setLoaded(true);
      for (const item of visible) {
        void markAnnouncementSeen(item.id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = (id: string) => {
    setItems((prev) => prev.filter((a) => a.id !== id));
    persistDismissedAnnouncement(id);
    void dismissAnnouncement(id);
  };

  const update = (id: string, patch: Partial<AnnouncementItem>) => {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  return { items, loaded, update, dismiss };
}

function AnnouncementCard({
  item,
  onUpdate,
}: {
  item: AnnouncementItem;
  onUpdate: (id: string, patch: Partial<AnnouncementItem>) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const receipt = item.userState;
  const isRead = Boolean(receipt?.readAt);
  const isAcknowledged = !item.requireAcknowledgement || Boolean(receipt?.acknowledgedAt);
  const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.INFORMATION;

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !isRead) {
      void markAnnouncementRead(item.id).then(() =>
        onUpdate(item.id, {
          userState: {
            ...(receipt ?? {
              announcementId: item.id,
              version: item.currentVersion.version,
              userId: '',
            }),
            readAt: new Date().toISOString(),
          },
        }),
      );
    }
  };

  const handleAcknowledge = () => {
    void acknowledgeAnnouncement(item.id).then(() =>
      onUpdate(item.id, {
        userState: {
          ...(receipt ?? {
            announcementId: item.id,
            version: item.currentVersion.version,
            userId: '',
          }),
          acknowledgedAt: new Date().toISOString(),
          readAt: receipt?.readAt ?? new Date().toISOString(),
        },
      }),
    );
  };

  return (
    <div
      className={cn(
        'rounded-2xl border p-4 shadow-sm backdrop-blur-md transition-all',
        style.border,
        style.bg,
        !isRead && 'ring-1 ring-primary/20',
      )}
    >
      <button
        type="button"
        onClick={toggleExpand}
        className="flex w-full items-start gap-3 text-left"
        aria-expanded={expanded}
      >
        <span className="mt-0.5 shrink-0">{style.icon}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {item.currentVersion.title}
            </span>
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                style.badge,
              )}
            >
              {style.label}
            </span>
            {item.requireAcknowledgement && !isAcknowledged && (
              <span className="rounded-full bg-destructive/10 border border-destructive/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
                Action required
              </span>
            )}
            {!isRead && (
              <span
                className="size-1.5 rounded-full bg-primary"
                aria-label="Unread"
              />
            )}
          </span>
          <span className="block text-xs leading-relaxed text-muted-foreground">
            {expanded
              ? item.currentVersion.body
              : item.currentVersion.body.length > 140
                ? `${item.currentVersion.body.slice(0, 140)}…`
                : item.currentVersion.body}
          </span>
          {item.currentVersion.deepLink && (
            <a
              href={item.currentVersion.deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Learn more →
            </a>
          )}
        </span>
      </button>
      {expanded && item.requireAcknowledgement && !isAcknowledged && (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleAcknowledge}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <CheckCircle2 className="size-3.5" /> Acknowledge
          </button>
        </div>
      )}
    </div>
  );
}

export function AnnouncementCenter({ variant = 'dashboard' }: { variant?: 'dashboard' | 'modal' }) {
  const { items, loaded, update, dismiss } = useAnnouncements();
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());

  if (!loaded || items.length === 0) return null;

  const visible = items.filter((a) => !dismissed.has(a.id));
  const dashboardItems = variant === 'dashboard'
    ? visible.filter((a) => a.displayModes.includes('TOP_BANNER') || a.displayModes.includes('DASHBOARD_CARD') || a.displayModes.length === 0)
    : [];
  if (variant === 'dashboard' && dashboardItems.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissed((s) => new Set(s).add(id));
    dismiss(id);
  };

  return (
    <div className="flex flex-col gap-3">
      {dashboardItems.map((item) => (
        <div key={item.id} className="relative">
          <button type="button" onClick={() => handleDismiss(item.id)} className="absolute right-2 top-2 z-10 rounded-full p-1 opacity-60 hover:opacity-100" aria-label="Dismiss announcement">
            <X className="size-3.5" />
          </button>
          <AnnouncementCard item={item} onUpdate={update} />
        </div>
      ))}
    </div>
  );
}
