'use client';

/**
 * Global announcement banner — sticky top bar for TOP_BANNER mode.
 * Renders on ALL pages (placed in root layout).
 */
import * as React from 'react';
import { Megaphone, X, CheckCircle2, AlertTriangle, Info, Wrench, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnnouncementsContext } from './announcement-provider';
import type { AnnouncementItem, AnnouncementType } from '@/types';

const TYPE_STYLES: Record<AnnouncementType, { icon: React.ReactNode; accent: string }> = {
  INFORMATION: { icon: <Info className="size-4" />, accent: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  MAINTENANCE: { icon: <Wrench className="size-4" />, accent: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  POLICY_UPDATE: { icon: <ShieldAlert className="size-4" />, accent: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30' },
  URGENT: { icon: <AlertTriangle className="size-4" />, accent: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30' },
  PROMOTIONAL: { icon: <Megaphone className="size-4" />, accent: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  PAYMENT_NOTICE: { icon: <Info className="size-4" />, accent: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  PARTNER_NOTICE: { icon: <Megaphone className="size-4" />, accent: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30' },
  SAFETY_ALERT: { icon: <ShieldAlert className="size-4" />, accent: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30' },
};

function BannerItem({
  item,
  onDismiss,
}: {
  item: AnnouncementItem;
  onDismiss: (id: string) => void;
}) {
  const { acknowledge, markRead } = useAnnouncementsContext();
  const [expanded, setExpanded] = React.useState(false);
  const receipt = item.userState;
  const isRead = Boolean(receipt?.readAt);
  const isAcknowledged = !item.requireAcknowledgement || Boolean(receipt?.acknowledgedAt);
  const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.INFORMATION;

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !isRead) markRead(item.id);
  };

  return (
    <div className={cn(
      'flex items-start gap-3 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-center',
      style.accent,
    )}>
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{item.currentVersion.title}</span>
          {item.requireAcknowledgement && !isAcknowledged && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
              Action required
            </span>
          )}
          {!isRead && <span className="size-1.5 rounded-full bg-current opacity-70" aria-label="Unread" />}
        </div>
        <span className="block text-xs opacity-80">
          {expanded
            ? item.currentVersion.body
            : (item.currentVersion.body.length > 100 ? `${item.currentVersion.body.slice(0, 100)}…` : item.currentVersion.body)}
        </span>
        {item.currentVersion.deepLink && (
          <a
            href={item.currentVersion.deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs font-medium underline underline-offset-2"
            onClick={(e) => e.stopPropagation()}
          >
            Learn more →
          </a>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {item.requireAcknowledgement && !isAcknowledged && (
          <button
            type="button"
            onClick={() => acknowledge(item.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-current/10 px-2.5 py-1 text-xs font-semibold hover:bg-current/20"
          >
            <CheckCircle2 className="size-3" /> Ack
          </button>
        )}
        <button
          type="button"
          onClick={toggleExpand}
          className="rounded p-1 opacity-60 hover:opacity-100 text-xs"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? 'Less' : 'More'}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="rounded-full p-1 opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function GlobalAnnouncementBanner() {
  const { items, loaded } = useAnnouncementsContext();
  const [dismissed, setDismissed] = React.useState<Set<string>>(new Set());
  const { dismiss } = useAnnouncementsContext();

  if (!loaded) return null;

  const bannerItems = items.filter(
    (a) => !dismissed.has(a.id) && (
      a.displayModes.includes('TOP_BANNER') ||
      a.displayModes.length === 0
    )
  );

  if (bannerItems.length === 0) return null;

  const handleDismiss = (id: string) => {
    setDismissed((s) => new Set(s).add(id));
    dismiss(id);
  };

  return (
    <div
      className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md"
      role="banner"
      aria-label="Announcements"
    >
      <div className="mx-auto max-w-5xl divide-y divide-border/30">
        {bannerItems.map((item) => (
          <div key={item.id} className="relative">
            <BannerItem item={item} onDismiss={handleDismiss} />
          </div>
        ))}
      </div>
    </div>
  );
}
