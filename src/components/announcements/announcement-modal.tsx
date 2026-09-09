'use client';

/**
 * Announcement modal — shows MODAL-mode announcements as overlay dialogs.
 * Renders ONE modal at a time; dismissing shows the next in queue.
 */
import * as React from 'react';
import { Megaphone, X, CheckCircle2, AlertTriangle, Info, Wrench, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnnouncementsContext } from './announcement-provider';
import type { AnnouncementItem, AnnouncementType } from '@/types';

const TYPE_STYLES: Record<AnnouncementType, { icon: React.ReactNode; accent: string; bg: string }> = {
  INFORMATION: { icon: <Info className="size-5" />, accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  MAINTENANCE: { icon: <Wrench className="size-5" />, accent: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  POLICY_UPDATE: { icon: <ShieldAlert className="size-5" />, accent: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  URGENT: { icon: <AlertTriangle className="size-5" />, accent: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
  PROMOTIONAL: { icon: <Megaphone className="size-5" />, accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  PAYMENT_NOTICE: { icon: <Info className="size-5" />, accent: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
  PARTNER_NOTICE: { icon: <Megaphone className="size-5" />, accent: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10' },
  SAFETY_ALERT: { icon: <ShieldAlert className="size-5" />, accent: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
};

export function AnnouncementModal() {
  const { items, loaded, dismiss, acknowledge, markRead } = useAnnouncementsContext();
  const [showing, setShowing] = React.useState(false);
  const [current, setCurrent] = React.useState<AnnouncementItem | null>(null);

  React.useEffect(() => {
    if (!loaded || showing) return;
    const pending = items.filter(
      (a) => a.displayModes.includes('MODAL') && !a.userState?.readAt
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pending.length > 0) setCurrent(pending[0]);
  }, [items, loaded, showing]);

  const handleClose = () => {
    if (current) {
      dismiss(current.id);
    }
    setShowing(true);
    setCurrent(null);
    // Show next after brief delay
    setTimeout(() => setShowing(false), 500);
  };

  const handleAcknowledge = () => {
    if (current) {
      acknowledge(current.id);
      markRead(current.id);
    }
    handleClose();
  };

  if (!current) return null;

  const style = TYPE_STYLES[current.type] ?? TYPE_STYLES.INFORMATION;
  const isAcknowledged = !current.requireAcknowledgement || Boolean(current.userState?.acknowledgedAt);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-border/50 bg-background shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        <div className="p-6">
          {/* Icon + Title */}
          <div className={cn('mb-4 flex items-center gap-3 rounded-xl p-3', style.bg)}>
            <span className={style.accent}>{style.icon}</span>
            <h2 id="announcement-modal-title" className="text-base font-semibold">
              {current.currentVersion.title}
            </h2>
          </div>

          {/* Body */}
          <div className="mb-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {current.currentVersion.body}
          </div>

          {/* Deep link */}
          {current.currentVersion.deepLink && (
            <a
              href={current.currentVersion.deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-4 block text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Learn more →
            </a>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {current.requireAcknowledgement && !isAcknowledged && (
              <button
                type="button"
                onClick={handleAcknowledge}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <CheckCircle2 className="size-4" />
                Acknowledge
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-border/50 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              {current.requireAcknowledgement && !isAcknowledged ? 'Dismiss' : 'Got it'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
