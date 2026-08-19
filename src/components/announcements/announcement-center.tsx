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

const TYPE_STYLES: Record<AnnouncementType, { icon: React.ReactNode; accent: string }> = {
  INFORMATION: { icon: <Info className="size-4" />, accent: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  MAINTENANCE: { icon: <Wrench className="size-4" />, accent: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  POLICY_UPDATE: { icon: <ShieldAlert className="size-4" />, accent: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  URGENT: { icon: <AlertTriangle className="size-4" />, accent: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' },
  PROMOTIONAL: { icon: <Megaphone className="size-4" />, accent: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  PAYMENT_NOTICE: { icon: <Info className="size-4" />, accent: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  PARTNER_NOTICE: { icon: <Megaphone className="size-4" />, accent: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  SAFETY_ALERT: { icon: <ShieldAlert className="size-4" />, accent: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300' },
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
    return () => { cancelled = true; };
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

function AnnouncementCard({ item, onUpdate }: { item: AnnouncementItem; onUpdate: (id: string, patch: Partial<AnnouncementItem>) => void }) {
  const [expanded, setExpanded] = React.useState(false);
  const receipt = item.userState;
  const isRead = Boolean(receipt?.readAt);
  const isAcknowledged = !item.requireAcknowledgement || Boolean(receipt?.acknowledgedAt);
  const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.INFORMATION;

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !isRead) {
      void markAnnouncementRead(item.id).then(() => onUpdate(item.id, { userState: { ...(receipt ?? { announcementId: item.id, version: item.currentVersion.version, userId: '' }), readAt: new Date().toISOString() } }));
    }
  };

  const handleAcknowledge = () => {
    void acknowledgeAnnouncement(item.id).then(() => onUpdate(item.id, { userState: { ...(receipt ?? { announcementId: item.id, version: item.currentVersion.version, userId: '' }), acknowledgedAt: new Date().toISOString(), readAt: receipt?.readAt ?? new Date().toISOString() } }));
  };

  return (
    <div className={cn('rounded-xl border p-4 shadow-sm', style.accent, !isRead && 'ring-1 ring-current/10')}>
      <button type="button" onClick={toggleExpand} className="flex w-full items-start gap-3 text-left" aria-expanded={expanded}>
        <span className="mt-0.5 shrink-0">{style.icon}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{item.currentVersion.title}</span>
            {item.requireAcknowledgement && !isAcknowledged && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">Action required</span>
            )}
            {!isRead && <span className="size-1.5 rounded-full bg-current opacity-70" aria-label="Unread" />}
          </span>
          <span className="block text-xs opacity-80">{expanded ? item.currentVersion.body : (item.currentVersion.body.length > 140 ? `${item.currentVersion.body.slice(0, 140)}…` : item.currentVersion.body)}</span>
          {item.currentVersion.deepLink && (
            <a href={item.currentVersion.deepLink} target="_blank" rel="noopener noreferrer" className="block text-xs font-medium underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
              Learn more →
            </a>
          )}
        </span>
      </button>
      {expanded && item.requireAcknowledgement && !isAcknowledged && (
        <div className="mt-3 flex justify-end">
          <button type="button" onClick={handleAcknowledge} className="inline-flex items-center gap-1.5 rounded-lg bg-current/10 px-3 py-1.5 text-xs font-semibold hover:bg-current/20">
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
