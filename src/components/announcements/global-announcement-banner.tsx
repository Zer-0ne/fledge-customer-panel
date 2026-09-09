'use client';

/**
 * Global announcement banner — sleek, modern auto-rotating top bar for TOP_BANNER mode.
 * - Displays active announcement with high-contrast typography and polished type badges.
 * - Smooth fade-and-slide transitions between multiple announcements.
 * - Compact inline pagination controls (< 1/3 >) when multiple items are active.
 * - Deep link support, action-required acknowledgement, and dismiss actions.
 * - Pauses rotation on hover or focus. Failure isolation: renders nothing on error/empty.
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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { useAnnouncementsContext } from './announcement-provider';
import type { AnnouncementItem, AnnouncementType } from '@/types';

const AUTO_ROTATE_MS = 5000;

interface TypeConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badgeClass: string;
  glowClass: string;
}

const TYPE_CONFIGS: Record<AnnouncementType, TypeConfig> = {
  PROMOTIONAL: {
    icon: Sparkles,
    label: 'Special Offer',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    glowClass: 'bg-emerald-500/10',
  },
  INFORMATION: {
    icon: Info,
    label: 'Notice',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    glowClass: 'bg-sky-500/10',
  },
  URGENT: {
    icon: AlertTriangle,
    label: 'Urgent',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    glowClass: 'bg-rose-500/10',
  },
  MAINTENANCE: {
    icon: Wrench,
    label: 'Maintenance',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    glowClass: 'bg-amber-500/10',
  },
  POLICY_UPDATE: {
    icon: ShieldAlert,
    label: 'Update',
    badgeClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    glowClass: 'bg-violet-500/10',
  },
  PAYMENT_NOTICE: {
    icon: Info,
    label: 'Payment',
    badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
    glowClass: 'bg-orange-500/10',
  },
  PARTNER_NOTICE: {
    icon: Megaphone,
    label: 'Partner',
    badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    glowClass: 'bg-cyan-500/10',
  },
  SAFETY_ALERT: {
    icon: ShieldAlert,
    label: 'Safety Alert',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    glowClass: 'bg-rose-500/10',
  },
};

export function GlobalAnnouncementBanner() {
  const { items, loaded, dismiss, acknowledge } = useAnnouncementsContext();
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(1); // 1 = forward, -1 = backward
  const [paused, setPaused] = React.useState(false);

  const bannerItems = React.useMemo(() => {
    if (!loaded) return [];
    return items.filter(
      (a) => a.displayModes.includes('TOP_BANNER') || a.displayModes.length === 0,
    );
  }, [items, loaded]);

  const n = bannerItems.length;

  const goTo = React.useCallback(
    (nextIdx: number, dir: number) => {
      setDirection(dir);
      setCurrentIndex(nextIdx);
    },
    [],
  );

  const handleNext = React.useCallback(() => {
    if (n <= 1) return;
    goTo((currentIndex + 1) % n, 1);
  }, [currentIndex, n, goTo]);

  const handlePrev = React.useCallback(() => {
    if (n <= 1) return;
    goTo((currentIndex - 1 + n) % n, -1);
  }, [currentIndex, n, goTo]);

  // Auto-rotate every AUTO_ROTATE_MS (paused when hovering or focused)
  React.useEffect(() => {
    if (!loaded || n <= 1 || paused) return;
    const timer = window.setTimeout(() => {
      goTo((currentIndex + 1) % n, 1);
    }, AUTO_ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [n, paused, currentIndex, loaded, goTo]);

  if (!loaded || n === 0) return null;

  const current = bannerItems[currentIndex % n];
  if (!current) return null;

  const config = TYPE_CONFIGS[current.type] ?? TYPE_CONFIGS.INFORMATION;
  const Icon = config.icon;
  const receipt = current.userState;
  const isRead = Boolean(receipt?.readAt);
  const isAcknowledged = !current.requireAcknowledgement || Boolean(receipt?.acknowledgedAt);
  const link = current.currentVersion.deepLink?.trim();

  const handleDismiss = () => {
    dismiss(current.id);
    if (n > 1) {
      setCurrentIndex((prev) => (prev >= n - 1 ? 0 : prev));
    }
  };

  const handleAcknowledge = () => {
    acknowledge(current.id);
  };

  const handleBannerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    if (link) {
      if (link.startsWith('/')) {
        window.location.assign(link);
      } else {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div
      className="relative z-40 w-full border-b border-white/10 bg-background/80 dark:border-white/5 dark:bg-background/60 shadow-xs"
      style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
      role="banner"
      aria-label="Announcements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mx-auto flex min-h-11 max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-6 lg:px-8">
        {/* Animated Banner Content */}
        <div
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden',
            link && 'cursor-pointer select-none',
          )}
          onClick={handleBannerClick}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: direction > 0 ? 8 : -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: direction > 0 ? -8 : 8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-nowrap"
            >
              {/* Type Badge */}
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide shadow-2xs',
                  config.badgeClass,
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{config.label}</span>
              </span>

              {/* Action Required Badge */}
              {current.requireAcknowledgement && !isAcknowledged && (
                <span className="shrink-0 rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Action required
                </span>
              )}

              {/* Unread indicator */}
              {!isRead && (
                <span
                  className="size-1.5 shrink-0 rounded-full bg-primary ring-2 ring-primary/20"
                  aria-label="Unread announcement"
                />
              )}

              {/* Text: Title + Body */}
              <div className="flex min-w-0 flex-1 items-baseline gap-1.5 overflow-hidden">
                <span className="truncate text-xs font-semibold text-foreground sm:text-sm">
                  {current.currentVersion.title}
                </span>

                {current.currentVersion.body && (
                  <>
                    <span className="hidden text-muted-foreground/40 sm:inline">•</span>
                    <span className="hidden truncate text-xs text-muted-foreground sm:inline sm:text-sm">
                      {current.currentVersion.body}
                    </span>
                  </>
                )}
              </div>

              {/* Learn More Link */}
              {link && (
                <a
                  href={link}
                  target={link.startsWith('/') ? undefined : '_blank'}
                  rel={link.startsWith('/') ? undefined : 'noopener noreferrer'}
                  onClick={(e) => e.stopPropagation()}
                  className="group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 hover:underline"
                >
                  <span>Learn more</span>
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </a>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action Buttons & Navigation Controls */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Acknowledge Button */}
          {current.requireAcknowledgement && !isAcknowledged && (
            <button
              type="button"
              onClick={handleAcknowledge}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              <CheckCircle2 className="size-3.5" />
              <span>Acknowledge</span>
            </button>
          )}

          {/* Carousel Controls (if multiple items) */}
          {n > 1 && (
            <div className="flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5 ring-1 ring-border/50">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous announcement"
                className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                {currentIndex + 1}/{n}
              </span>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next announcement"
                className="flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss announcement"
            className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
