'use client';

import * as React from 'react';

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
 * Hovering shows a viewport-aware preview card (big badge + tier text) that
 * never runs off-screen. Renders nothing without a tier (or missing PNGs).
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
  const [pos, setPos] = React.useState<{ top: number; left: number; below: boolean }>({ top: 0, left: 0, below: false });
  const anchorRef = React.useRef<HTMLSpanElement>(null);

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

  const show = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = 208;
    const h = 170;
    const cx = r.left + r.width / 2;
    const left = Math.min(Math.max(cx - w / 2, 8), window.innerWidth - w - 8);
    const below = r.top < h + 12;
    setPos({ top: below ? r.bottom + 8 : r.top - h - 8, left, below });
    setOpen(true);
  };

  if (!resolved || missing) return null;
  const info = TRUST_TIER_INFO[resolved];
  return (
    <span
      ref={anchorRef}
      className="inline-flex shrink-0 align-[-2px]"
      onMouseEnter={preview ? show : undefined}
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
      {preview && open ? (
        <span
          className="fixed z-[9999] w-52 rounded-xl border border-border bg-popover p-3 text-center shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BADGE_SRC[resolved]}
            alt=""
            width={64}
            height={64}
            className="mx-auto"
            onError={() => setMissing(true)}
          />
          <span className="mt-1.5 block text-sm font-bold text-foreground">{info.label}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{info.description}</span>
        </span>
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
