'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export type TrustBadgeKey = 'bronze' | 'silver' | 'gold' | 'diamond';

const BADGE_SRC: Record<TrustBadgeKey, string> = {
  bronze: '/badges/owl-bronze.png',
  silver: '/badges/owl-silver.png',
  gold: '/badges/owl-gold.png',
  diamond: '/badges/owl-diamond.png',
};

export const TRUST_TIER_GLOW: Record<TrustBadgeKey, string> = {
  bronze: 'drop-shadow-[0_0_28px_rgba(205,127,50,0.65)]',
  silver: 'drop-shadow-[0_0_28px_rgba(192,192,192,0.65)]',
  gold: 'drop-shadow-[0_0_28px_rgba(255,215,0,0.6)]',
  diamond: 'drop-shadow-[0_0_28px_rgba(103,232,249,0.65)]',
};

export const TRUST_TIER_INFO: Record<TrustBadgeKey, { label: string; description: string }> = {
  bronze: {
    label: 'Bronze Member',
    description: 'Verified identity. New to the community — keep a clean record to climb higher.',
  },
  silver: {
    label: 'Silver Member',
    description: 'Genuine history with approved posts. A name other members can rely on.',
  },
  gold: {
    label: 'Gold Member',
    description: 'Long verified history. One of the most trusted members on Fledge.',
  },
  diamond: {
    label: 'Diamond Member',
    description: 'Spotless record across 10+ posts. The highest trust on Fledge.',
  },
};

// async function fetchBadgeForUser(userId: string): Promise<TrustBadgeKey | null> {
//   try {
//     const res = await fetch(`/api/proxy/api/v1/users/${userId}/public`, { cache: 'no-store' });
//     if (!res.ok) return null;
//     const data = (await res.json()) as { trustBadge?: TrustBadgeKey | null };
//     const badge = data?.trustBadge;
//     return badge === 'bronze' || badge === 'silver' || badge === 'gold' || badge === 'diamond' ? badge : null;
//   } catch {
//     return null;
//   }
// }

/**
 * Owl trust badge shown after a user's name, sized to the surrounding text.
 * Hovering shows an Aceternity-style animated preview (spring pop, follows
 * the mouse, clamped to the viewport). Renders nothing without a tier.
 */
export function TrustBadge({
  badge,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userId: _userId,
  size = 16,
  preview = true,
}: {
  badge?: TrustBadgeKey | null;
  userId?: string;
  size?: number;
  preview?: boolean;
}) {
  const [fetched] = React.useState<TrustBadgeKey | null>(null);
  const resolved = badge !== undefined ? badge : fetched;
  const [missing, setMissing] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNow = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  };

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotate = useSpring(useTransform(mouseX, [-80, 80], [-10, 10]), { stiffness: 180, damping: 16 });
  const translateX = useSpring(useTransform(mouseX, [-80, 80], [-36, 36]), { stiffness: 180, damping: 16 });
  const translateY = useSpring(useTransform(mouseY, [-60, 60], [-14, 14]), { stiffness: 180, damping: 16 });

  // Disabled badge fetching API call for now
  // React.useEffect(() => {
  //   if (badge !== undefined || !_userId) return;
  //   let live = true;
  //   fetchBadgeForUser(_userId).then((b) => {
  //     if (live) setFetched(b);
  //   });
  //   return () => {
  //     live = false;
  //   };
  // }, [badge, _userId]);

  const place = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = 320;
    const h = 310;
    const cx = r.left + r.width / 2;
    const left = Math.min(Math.max(cx - w / 2, 8), window.innerWidth - w - 8);
    const below = r.top < h + 12;
    setPos({ top: below ? r.bottom + 8 : r.top - h - 8, left });
  };

  if (!resolved || missing) return null;
  const info = TRUST_TIER_INFO[resolved];
  return (
    <span
      ref={anchorRef}
      className="inline-flex shrink-0 align-[-2px]"
      onMouseEnter={preview ? () => { place(); openNow(); } : undefined}
      onMouseMove={preview ? (e) => {
        const r = anchorRef.current?.getBoundingClientRect();
        if (!r) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        mouseX.set(e.clientX - cx);
        mouseY.set(e.clientY - cy);
      } : undefined}
      onMouseLeave={preview ? closeSoon : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BADGE_SRC[resolved]}
        alt={info.label}
        width={size}
        height={size}
        className="inline-block"
        onError={() => setMissing(true)}
      />
      {preview && open ? createPortal(
          <motion.span
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            style={{ top: pos.top, left: pos.left, rotate, x: translateX, y: translateY }}
            className="fixed z-[9999] w-80 rounded-2xl border border-border bg-popover p-5 text-center shadow-2xl"
            onMouseEnter={openNow}
            onMouseLeave={closeSoon}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BADGE_SRC[resolved]}
              alt=""
              width={160}
              height={160}
              className={`mx-auto ${TRUST_TIER_GLOW[resolved]}`}
              onError={() => setMissing(true)}
            />
            <span className="mt-1.5 block text-sm font-bold text-foreground">{info.label}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{info.description}</span>
          </motion.span>,
          document.body,
        ) : null}
    </span>
  );
}

/**
 * Big trust-level section for profile pages (large badge + tier text).
 * Renders nothing without a tier.
 */
export function TrustLevelSection({ badge }: { badge?: TrustBadgeKey | null }) {
  if (!badge) return null;
  const info = TRUST_TIER_INFO[badge];
  return (
    <div className="pt-3 border-t border-border/60 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trust level</p>
      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BADGE_SRC[badge]} alt={info.label} width={72} height={72} className="shrink-0" />
        <div>
          <p className="text-base font-bold text-foreground">{info.label}</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{info.description}</p>
        </div>
      </div>
    </div>
  );
}
