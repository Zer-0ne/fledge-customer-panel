'use client';

import * as React from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';

export type TrustBadgeKey = 'bronze' | 'silver' | 'gold' | 'diamond';

const BADGE_SRC: Record<TrustBadgeKey, string> = {
  bronze: '/badges/owl-bronze.png',
  silver: '/badges/owl-silver.png',
  gold: '/badges/owl-gold.png',
  diamond: '/badges/owl-diamond.png',
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
    description: 'Long verified history. One of the most trusted members on Owl Sight.',
  },
  diamond: {
    label: 'Diamond Member',
    description: 'Spotless record across 10+ posts. The highest trust on Owl Sight.',
  },
};

async function fetchBadgeForUser(userId: string): Promise<TrustBadgeKey | null> {
  try {
    const res = await fetch(`/api/proxy/api/v1/users/${userId}/public`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { trustBadge?: TrustBadgeKey | null };
    const badge = data?.trustBadge;
    return badge === 'bronze' || badge === 'silver' || badge === 'gold' || badge === 'diamond' ? badge : null;
  } catch {
    return null;
  }
}

/**
 * Owl trust badge shown after a user's name, sized to the surrounding text.
 * Hovering shows an Aceternity-style animated preview (spring pop, follows
 * the mouse, clamped to the viewport). Renders nothing without a tier.
 */
export function TrustBadge({
  badge,
  userId,
  size = 16,
  preview = true,
}: {
  badge?: TrustBadgeKey | null;
  userId?: string;
  size?: number;
  preview?: boolean;
}) {
  const [resolved, setResolved] = React.useState<TrustBadgeKey | null>(badge ?? null);
  const [missing, setMissing] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const anchorRef = React.useRef<HTMLSpanElement>(null);

  const mouseX = useMotionValue(0);
  const rotate = useSpring(useTransform(mouseX, [-100, 100], [-12, 12]), { stiffness: 200, damping: 18 });
  const translateX = useSpring(useTransform(mouseX, [-100, 100], [-8, 8]), { stiffness: 200, damping: 18 });

  React.useEffect(() => {
    if (badge !== undefined) {
      setResolved(badge);
      return;
    }
    if (!userId) return;
    let live = true;
    fetchBadgeForUser(userId).then((b) => {
      if (live) setResolved(b);
    });
    return () => {
      live = false;
    };
  }, [badge, userId]);

  const place = (clientX?: number) => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = 224;
    const h = 190;
    const cx = clientX ?? r.left + r.width / 2;
    const left = Math.min(Math.max(cx - w / 2, 8), window.innerWidth - w - 8);
    const below = r.top < h + 12;
    setPos({ top: below ? r.bottom + 8 : r.top - h - 8, left });
    if (clientX !== undefined) mouseX.set(clientX - (r.left + r.width / 2));
  };

  if (!resolved || missing) return null;
  const info = TRUST_TIER_INFO[resolved];
  return (
    <span
      ref={anchorRef}
      className="inline-flex shrink-0 align-[-2px]"
      onMouseEnter={preview ? () => { place(); setOpen(true); } : undefined}
      onMouseMove={preview ? (e) => place(e.clientX) : undefined}
      onMouseLeave={preview ? () => setOpen(false) : undefined}
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
      <AnimatePresence>
        {preview && open ? (
          <motion.span
            initial={{ opacity: 0, y: 12, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22 }}
            style={{ top: pos.top, left: pos.left, rotate, x: translateX }}
            className="fixed z-[9999] w-56 rounded-2xl border border-border bg-popover p-3 text-center shadow-2xl"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BADGE_SRC[resolved]}
              alt=""
              width={72}
              height={72}
              className="mx-auto drop-shadow-lg"
              onError={() => setMissing(true)}
            />
            <span className="mt-1.5 block text-sm font-bold text-foreground">{info.label}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{info.description}</span>
          </motion.span>
        ) : null}
      </AnimatePresence>
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
