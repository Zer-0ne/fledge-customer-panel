'use client';

import * as React from 'react';

export type TrustBadgeKey = 'bronze' | 'silver' | 'gold' | 'diamond';

const BADGE_SRC: Record<TrustBadgeKey, string> = {
  bronze: '/badges/owl-bronze.png',
  silver: '/badges/owl-silver.png',
  gold: '/badges/owl-gold.png',
  diamond: '/badges/owl-diamond.png',
};

const BADGE_LABEL: Record<TrustBadgeKey, string> = {
  bronze: 'Bronze trusted member',
  silver: 'Silver trusted member',
  gold: 'Gold trusted member',
  diamond: 'Diamond trusted member',
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
 * Owl trust badge shown after a user's name. Renders nothing when the user
 * has no tier (or the PNGs are not deployed yet).
 */
export function TrustBadge({
  badge,
  userId,
  size = 16,
}: {
  badge?: TrustBadgeKey | null;
  userId?: string;
  size?: number;
}) {
  const [resolved, setResolved] = React.useState<TrustBadgeKey | null>(badge ?? null);
  const [missing, setMissing] = React.useState(false);

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

  if (!resolved || missing) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BADGE_SRC[resolved]}
      alt={BADGE_LABEL[resolved]}
      title={BADGE_LABEL[resolved]}
      width={size}
      height={size}
      className="inline-block shrink-0 align-[-2px]"
      onError={() => setMissing(true)}
    />
  );
}
