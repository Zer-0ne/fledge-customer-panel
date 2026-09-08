'use client';

/**
 * Global announcement banner — stacked auto-rotating deck for TOP_BANNER mode.
 * Flutter `AnnouncementBanner` parity (Samsung Now Bar style):
 * - ONE compact card up front; up to 2 more peek as thin edges below.
 * - Auto-rotates every [AUTO_ROTATE_MS] with a vertical flip.
 * - Dismiss removes ONLY the front card; next settles in with an overshoot.
 * - Tap front card → deep-link / announcements centre.
 * Renders on ALL pages (placed in root layout). Failure isolation: nothing on error.
 */
import * as React from 'react';
import {
  Megaphone,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Wrench,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnnouncementsContext } from './announcement-provider';
import type { AnnouncementItem, AnnouncementType } from '@/types';

const AUTO_ROTATE_MS = 4500;

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

/** Compact glass card used for both the front and the peeking edges. */
function DeckCard({
  item,
  onDismiss,
  onAcknowledge,
  className,
}: {
  item: AnnouncementItem;
  onDismiss?: () => void;
  onAcknowledge?: () => void;
  className?: string;
}) {
  const receipt = item.userState;
  const isRead = Boolean(receipt?.readAt);
  const isAcknowledged = !item.requireAcknowledgement || Boolean(receipt?.acknowledgedAt);
  const style = TYPE_STYLES[item.type] ?? TYPE_STYLES.INFORMATION;
  const link = item.currentVersion.deepLink?.trim();

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-md',
        style.accent,
        className,
      )}
    >
      <span className="mt-0.5 shrink-0">{style.icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold leading-tight">{item.currentVersion.title}</span>
          {item.requireAcknowledgement && !isAcknowledged && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
              Action required
            </span>
          )}
          {!isRead && <span className="size-1.5 rounded-full bg-current opacity-70" aria-label="Unread" />}
        </div>
        <span className="block text-xs opacity-80 line-clamp-2">
          {item.currentVersion.body.length > 100
            ? `${item.currentVersion.body.slice(0, 100)}…`
            : item.currentVersion.body}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 self-center">
        {item.requireAcknowledgement && !isAcknowledged && onAcknowledge && (
          <button
            type="button"
            onClick={onAcknowledge}
            className="inline-flex items-center gap-1 rounded-lg bg-current/10 px-2.5 py-1 text-xs font-semibold hover:bg-current/20"
          >
            <CheckCircle2 className="size-3" /> Ack
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full p-1 opacity-60 hover:opacity-100"
            aria-label="Dismiss announcement"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {link && (
        <a
          href={link}
          onClick={(e) => e.stopPropagation()}
          target={link.startsWith('/') ? undefined : '_blank'}
          rel={link.startsWith('/') ? undefined : 'noopener noreferrer'}
          className="absolute right-3 bottom-2 text-[10px] font-semibold underline underline-offset-2 opacity-70 hover:opacity-100"
        >
          Learn more →
        </a>
      )}
    </div>
  );
}

export function GlobalAnnouncementBanner() {
  const { items, loaded, dismiss, acknowledge } = useAnnouncementsContext();
  const [index, setIndex] = React.useState(0);
  const [flip, setFlip] = React.useState(0); // 0→1 during rotation
  const [direction, setDirection] = React.useState(1); // 1 = next (slide up)
  const [paused, setPaused] = React.useState(false);
  const advanceTimerRef = React.useRef<number | null>(null);

  // Flip helper — runs the CSS transition then advances the index at midpoint.
  const rotateTo = (nextIndex: number, dir: number) => {
    setDirection(dir);
    setFlip(0);
    requestAnimationFrame(() => setFlip(1));
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = window.setTimeout(() => {
      setIndex(nextIndex);
      setFlip(0);
    }, 260);
  };

  const bannerItems = loaded
    ? items.filter(
        (a) => a.displayModes.includes('TOP_BANNER') || a.displayModes.length === 0,
      )
    : [];
  const n = bannerItems.length;

  // Auto-rotate every AUTO_ROTATE_MS with a vertical flip (paused on hover/focus).
  React.useEffect(() => {
    if (!loaded || n <= 1 || paused) return;
    const timer = window.setTimeout(() => {
      rotateTo((index + 1) % n, 1);
    }, AUTO_ROTATE_MS);
    return () => {
      window.clearTimeout(timer);
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    };
  }, [n, paused, index, loaded]);

  React.useEffect(() => {
    return () => {
      if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current);
    };
  }, []);

  if (!loaded || n === 0) return null;

  const current = bannerItems[index % n];
  const peekCount = Math.min(n - 1, 2);
  const peekExtra = peekCount * 8;

  const handleDismiss = () => {
    dismiss(current.id);
    setIndex((i) => (i + 1) % Math.max(n - 1, 1));
  };

  const handleAcknowledge = () => {
    acknowledge(current.id);
  };

  // Cards behind the front — static offset stack (peek edges).
  const peeks = Array.from({ length: peekCount }).map((_, i) => {
    const item = bannerItems[(index + 1 + i) % n];
    return { item, i };
  });

  return (
    <div
      className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md"
      role="banner"
      aria-label="Announcements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mx-auto max-w-3xl px-4 py-2 sm:px-6">
        <div className="relative" style={{ height: 92 + peekExtra }}>
          {/* Peeking edges behind the front card */}
          {peeks.map(({ item, i }) => (
            <div
              key={item.id}
              className="pointer-events-none absolute inset-x-0"
              style={{
                top: 8 * (i + 1),
                transform: `scale(${1 - 0.05 * (i + 1)})`,
                opacity: 0.55 - 0.15 * i,
                zIndex: 1 - i,
              }}
            >
              <DeckCard item={item} className="opacity-70" />
            </div>
          ))}

          {/* Front card — flips vertically on rotate */}
          <div
            className="absolute inset-x-0 transition-transform duration-300 ease-in-out"
            style={{
              transform: `translateY(${-28 * flip * direction}px) scale(${1 - 0.06 * flip})`,
              opacity: 1 - flip,
              zIndex: peekCount + 1,
            }}
          >
            <div
              role="link"
              tabIndex={0}
              onClick={(e) => {
                // Only navigate when clicking the card body, not controls.
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('a')) return;
                const link = current.currentVersion.deepLink?.trim();
                if (link?.startsWith('/')) window.location.assign(link);
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                const link = current.currentVersion.deepLink?.trim();
                if (link?.startsWith('/')) window.location.assign(link);
              }}
              className="block w-full text-left cursor-pointer"
            >
              <DeckCard
                item={current}
                onDismiss={handleDismiss}
                onAcknowledge={handleAcknowledge}
              />
            </div>
          </div>
        </div>

        {/* Controls — prev/next + dots (only when multiple announcements) */}
        {n > 1 && (
          <div className="mt-1 flex items-center justify-center gap-2">
            <button
              type="button"
              aria-label="Previous announcement"
              onClick={() => rotateTo((index - 1 + n) % n, -1)}
              className="flex size-6 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronUp className="size-3.5" />
            </button>
            {bannerItems.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show announcement ${i + 1}`}
                onClick={() => rotateTo(i, i >= index % n ? 1 : -1)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index % n ? 'w-5 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60',
                )}
              />
            ))}
            <button
              type="button"
              aria-label="Next announcement"
              onClick={() => rotateTo((index + 1) % n, 1)}
              className="flex size-6 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
