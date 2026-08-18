'use client';

import * as React from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdCreative, AdPlacement } from '@/types';
import {
  selectAds,
  trackAdClick,
  trackAdViewable,
  queueAdImpressions,
} from '@/lib/api/services/ads';
import { sanitizeRedirectUrl } from '@/lib/ads/safe-redirect';

export type TierFilter = 'all' | 'maximum' | 'premium' | 'boost' | 'standard';

/** Tiers each carousel accepts — sent to the backend so every promotion type
 * gets its OWN carousel (never mixed): MAXIMUM, PREMIUM, BOOST, STANDARD. */
const TIER_GROUPS: Record<TierFilter, string[] | undefined> = {
  all: undefined,
  maximum: ['MAXIMUM'],
  premium: ['PREMIUM'],
  boost: ['BOOST'],
  standard: ['STANDARD'],
};

export interface SponsoredAdProps {
  placement: AdPlacement;
  collegeId?: string;
  campusId?: string;
  /** Visual density for different surfaces (STANDARD tier only) */
  variant?: 'banner' | 'card' | 'sidebar';
  className?: string;
  /** When true, fetches up to 3 ads and autoplays them as a carousel */
  carousel?: boolean;
  /** Restrict which tiers fill the slot: all | maximum | premium | boost | standard */
  tierFilter?: TierFilter;
  /** Base autoplay delay per slide in ms. BOOST/PREMIUM slides hold ~1.4-1.8x longer. */
  intervalMs?: number;
}

/** Slide hold time multiplier for priority tiers — higher tier = longer on screen. */
const TIER_HOLD_MS: Record<string, number> = {
  STANDARD: 1,
  BOOST: 1.4,
  PREMIUM: 1.8,
  MAXIMUM: 2,
};

/** Tier rank for list ordering — premium tiers surface first (most premium at the top). */
const TIER_RANK: Record<string, number> = {
  STANDARD: 0,
  BOOST: 1,
  PREMIUM: 2,
  MAXIMUM: 3,
};

const tierRank = (tier?: string | null) => TIER_RANK[tier ?? 'STANDARD'] ?? 0;

/** Sort ads by premiumness (descending) — stable, so equal tiers keep API order. */
const byPremiumness = (a: AdCreative, b: AdCreative) => tierRank(b.priorityTier) - tierRank(a.priorityTier);

/** Customer-facing badge per tier — no literal tier names (BOOST/PREMIUM text is hidden). */
const TIER_BADGE: Record<string, string> = {
  STANDARD: 'Sponsored',
  BOOST: 'Featured',
  PREMIUM: 'Premium Partner',
  MAXIMUM: 'Exclusive Partner',
};

/** Dark gradient fallback when an ad has no image (media storage disabled). */
const DARK_FALLBACK =
  'radial-gradient(120% 90% at 22% 8%, #33333d 0%, rgba(51,51,61,0) 52%),' +
  'radial-gradient(110% 85% at 88% 18%, #262634 0%, rgba(38,38,52,0) 55%),' +
  'radial-gradient(90% 70% at 12% 88%, #1b1b26 0%, rgba(27,27,38,0) 60%),' +
  'linear-gradient(160deg, #101016 0%, #0a0a0e 55%, #050507 100%)';

/** backdrop-filter must be inline — the CSS pipeline strips it from stylesheets. */
const GLASS_BLUR: React.CSSProperties = {
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
};

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = 'none';
};

function HeroImg({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ad CDN hosts are dynamic
    <img src={src} alt={alt} className={className} onError={hideOnError} loading="lazy" decoding="async" />
  );
}

function GlassBadge({ children, gold = false }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-lg',
        gold
          ? 'border border-[#e9c349]/40 bg-[#e9c349]/15 text-[#e9c349]'
          : 'border border-white/20 bg-white/10 text-white'
      )}
    >
      {children}
    </span>
  );
}

/** STANDARD — compact native glass card */
function StandardCard({ ad }: { ad: AdCreative }) {
  return (
    <div className="ad-glass-surface flex flex-col gap-3 rounded-xl p-4" style={GLASS_BLUR}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded border border-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/60">
            Sponsored
          </span>
          {ad.sponsorName && (
            <span className="font-mono-jb text-[11px] text-white/70">{ad.sponsorName}</span>
          )}
        </div>
        <Sparkles className="size-4 text-white/25" aria-hidden />
      </div>

      <div className="flex gap-4">
        {ad.imageUrl && (
          <div className="size-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#20201f]">
            <HeroImg src={ad.imageUrl} alt="" className="h-full w-full object-cover grayscale-[0.2]" />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <h3 className="text-sm font-semibold leading-tight text-[#e5e2e1]">{ad.title}</h3>
          {ad.description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/50">{ad.description}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono-jb text-[11px] font-bold text-[#d2bbff]">Learn More</span>
            <ChevronRight className="size-4 text-[#d2bbff]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** BOOST — hero image card with offer label + gold CTA (fills the shared slot) */
function BoostCard({ ad }: { ad: AdCreative }) {
  return (
    <div
      className="ad-glass-surface ad-titanium-edge flex flex-col overflow-hidden rounded-xl bg-gradient-to-b from-[#20201f]/50 to-[#131313]"
      style={GLASS_BLUR}
    >
      <div className="ad-boost-image relative min-h-0 overflow-hidden sm:h-56">
        {ad.imageUrl ? (
          <HeroImg src={ad.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div aria-hidden className="absolute inset-0" style={{ background: DARK_FALLBACK }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#131313] via-transparent to-black/30" />
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="rounded-sm bg-[#d2bbff]/90 px-3 py-1 text-[10px] font-bold text-[#3f008e] shadow-xl backdrop-blur-md">
            {TIER_BADGE.BOOST}
          </span>
          <span className="rounded-sm border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-medium text-white/80 backdrop-blur-md">
            Sponsored
          </span>
        </div>
      </div>

      <div className="p-6">
        {ad.sponsorName && (
          <span className="font-mono-jb mb-2 block text-[11px] font-bold uppercase tracking-widest text-[#d2bbff]/80">
            {ad.sponsorName}
          </span>
        )}
        <h3 className="font-display-hanken mb-3 text-2xl font-bold leading-tight text-[#e5e2e1]">
          {ad.title}
        </h3>
        {ad.description && (
          <p className="mb-5 line-clamp-2 text-sm leading-relaxed text-white/55">{ad.description}</p>
        )}
        <span className="flex w-full items-center justify-center gap-2 rounded bg-[#e9c349] py-3.5 text-xs font-bold uppercase tracking-widest text-[#3c2f00] shadow-lg shadow-[#e9c349]/10">
          Learn More <ArrowUpRight className="size-4" />
        </span>
      </div>
    </div>
  );
}

/** PREMIUM / MAXIMUM — full-bleed 4:5 hero card (MAXIMUM adds the travelling light border) */
function HeroCard({ ad, tier }: { ad: AdCreative; tier: string }) {
  const isMax = tier === 'MAXIMUM';

  return (
    <div
      className={cn(
        'relative mx-auto aspect-[4/5] w-full max-w-md',
        isMax
          ? 'overflow-hidden rounded-2xl p-[1.5px] shadow-[0_24px_50px_-15px_rgba(0,0,0,0.7)]'
          : 'rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-transparent to-white/5 p-0.5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.6)]'
      )}
    >
      {/* MAXIMUM — spinning conic light shows through the 1.5px frame gap */}
      {isMax && (
        <div
          aria-hidden
          className="ad-max-spin absolute inset-[-100%]"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(210,187,255,0.85) 45deg, rgba(233,195,73,0.85) 90deg, transparent 135deg, transparent 360deg)',
          }}
        />
      )}

      <div
        className={cn(
          'relative h-full w-full overflow-hidden bg-[#131313]',
          isMax ? 'rounded-[calc(1rem-1.5px)]' : 'rounded-[calc(1rem-2px)]'
        )}
      >
        {ad.imageUrl ? (
          <HeroImg
            src={ad.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full scale-[1.02] object-cover"
          />
        ) : (
          <div aria-hidden className="absolute inset-0" style={{ background: DARK_FALLBACK }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        {/* top row — badge + wordmark */}
        <div className="absolute left-6 right-6 top-6 flex items-center justify-between">
          <GlassBadge gold={isMax}>{TIER_BADGE[tier] ?? 'Sponsored'}</GlassBadge>
          {ad.sponsorName && (
            <span className="font-mono-jb text-[10px] uppercase tracking-widest text-white/40">
              {ad.sponsorName}
            </span>
          )}
        </div>

        {/* bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <h2 className="font-display-hanken mb-5 text-3xl font-bold leading-tight text-white">
            {ad.title}
          </h2>
          {ad.description && (
            <p className={cn('line-clamp-2 text-sm leading-relaxed text-white/60', isMax ? 'mb-6' : 'mb-7')}>
              {ad.description}
            </p>
          )}
          {/* MAXIMUM — partner-selected amenity chips */}
          {isMax && ad.featureChips && ad.featureChips.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-1.5">
              {ad.featureChips.slice(0, 6).map((chip) => (
                <span
                  key={chip}
                  className="rounded-sm border border-white/15 bg-white/[0.08] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-white/85 backdrop-blur-md"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="flex flex-1 items-center justify-center gap-2 rounded bg-white py-4 text-xs font-bold uppercase tracking-widest text-black shadow-2xl transition-all duration-300">
              Learn More <ArrowUpRight className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Pick the card design by tier — STANDARD (flat), BOOST (hero), PREMIUM/MAXIMUM (full-bleed). */
function TierCard({ ad, tier }: { ad: AdCreative; tier: string }) {
  if (tier === 'PREMIUM' || tier === 'MAXIMUM') return <HeroCard ad={ad} tier={tier} />;
  if (tier === 'BOOST') return <BoostCard ad={ad} />;
  return <StandardCard ad={ad} />;
}

/** One carousel group — max 3 slides, with its OWN index, autoplay, dots, arrows and impression tracking. */
function CarouselChunk({
  items,
  placement,
  intervalMs,
  variant,
  clicking,
  onCardClick,
}: {
  items: AdCreative[];
  placement: AdPlacement;
  intervalMs: number;
  variant: SponsoredAdProps['variant'];
  clicking: boolean;
  onCardClick: (item: AdCreative) => void;
}) {
  const [index, setIndex] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isHalfVisible, setIsHalfVisible] = React.useState(false);
  const impressionSentRef = React.useRef<Record<string, boolean>>({});
  const viewableSentRef = React.useRef<Record<string, boolean>>({});
  const rootRef = React.useRef<HTMLElement | null>(null);
  const touchStartXRef = React.useRef(0);

  const stacked = items.length > 1;
  const active = items[index] ?? null;
  const heroList = items.every((a) => tierRank(a.priorityTier) > 0);

  // Autoplay per carousel group — paused while the user hovers/focuses.
  React.useEffect(() => {
    if (!stacked || isHovered) return;
    const hold = TIER_HOLD_MS[active?.priorityTier ?? 'STANDARD'] ?? 1;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % items.length), Math.round(intervalMs * hold));
    return () => window.clearTimeout(timer);
  }, [stacked, items.length, index, active?.priorityTier, intervalMs, isHovered]);

  // Impression tracking for this group's active slide — routed through the
  // debounced bulk queue so all co-visible ads go out in ONE batch request.
  React.useEffect(() => {
    if (!active) return;
    const token = active.token;
    if (impressionSentRef.current[token]) return;
    impressionSentRef.current[token] = true;
    void queueAdImpressions([token]);
  }, [active]);

  // Viewable tracking: >=50% of the ad visible for ~1s (MRC-style), once per
  // token. Only fires when the backend issued a viewableToken for this creative.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setIsHalfVisible(Boolean(entry && entry.isIntersecting && entry.intersectionRatio >= 0.5)),
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!isHalfVisible || !active?.viewableToken) return;
    const token = active.viewableToken;
    const timer = window.setTimeout(() => {
      if (viewableSentRef.current[token]) return;
      viewableSentRef.current[token] = true;
      void trackAdViewable(token);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [isHalfVisible, active?.viewableToken]);

  const next = () => setIndex((i) => (i + 1) % items.length);
  const prev = () => setIndex((i) => (i - 1 + items.length) % items.length);

  const cardBody = (item: AdCreative) =>
    tierRank(item.priorityTier) > 0 ? (
      /* Fixed shared slot — Premium & Boost swap inside it with no size change */
      <div
        className="promotion-card-slot"
        style={{ '--promotion-card-ratio': '4 / 5' } as React.CSSProperties}
      >
        <TierCard ad={item} tier={item.priorityTier ?? 'STANDARD'} />
      </div>
    ) : (
      <TierCard ad={item} tier={item.priorityTier ?? 'STANDARD'} />
    );

  const cardButton = (item: AdCreative, i: number) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onCardClick(item);
      }}
      disabled={clicking}
      tabIndex={stacked && i !== index ? -1 : 0}
      className={cn(
        'block w-full text-left',
        variant === 'banner' && 'min-h-24',
        clicking && 'cursor-wait opacity-70'
      )}
    >
      {cardBody(item)}
    </button>
  );

  return (
    <aside
      ref={rootRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      className="ad-carousel-pause-hover group relative transition-opacity duration-300"
      aria-label="Sponsored advertisement"
      data-ad-placement={placement}
      data-ad-id={active?.id}
      data-ad-tier={active?.priorityTier}
    >
      {stacked ? (
        /* Fixed-dimension viewport — hero groups keep the shared slot size,
           standard groups fill the adaptive masonry tile width. */
        <div
          className={cn('overflow-hidden', heroList && 'promotion-carousel')}
          onTouchStart={(e) => {
            touchStartXRef.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchStartXRef.current;
            if (Math.abs(dx) > 40) {
              if (dx < 0) next();
              else prev();
            }
          }}
        >
          <div
            className="flex h-full transition-transform duration-500"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {items.map((item, i) => (
              <div key={item.id} className="promotion-carousel-slide" aria-hidden={i !== index}>
                {cardButton(item, i)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        cardButton(active, 0)
      )}

      {/* Independent controls — dots + prev/next for this group only */}
      {stacked && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="Previous ad"
            onClick={prev}
            className="flex size-6 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ad ${i + 1}`}
              onClick={() => {
                setIndex(i);
                impressionSentRef.current[item.token] = false;
              }}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-5 bg-[#d2bbff]' : 'w-2 bg-white/15 hover:bg-white/30'
              )}
            />
          ))}
          <button
            type="button"
            aria-label="Next ad"
            onClick={next}
            className="flex size-6 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
}

/**
 * Sponsored ad slot with impression tracking and safe click redirects.
 * The card design switches on priorityTier: STANDARD (compact native),
 * BOOST (hero image + offer), PREMIUM/MAXIMUM (full-bleed hero; MAXIMUM
 * adds the travelling-light border). Each carousel holds at most 3 slides —
 * when a promotion type has more than 3 ads they are chunked into multiple
 * independent carousels (3 per group). Priority tiers hold longer on screen
 * but are NOT labelled for customers. Renders nothing when fill fails.
 */
export function SponsoredAd({
  placement,
  collegeId,
  campusId,
  variant = 'banner',
  className,
  carousel = false,
  tierFilter = 'all',
  intervalMs = 4500,
}: SponsoredAdProps) {
  const [ads, setAds] = React.useState<AdCreative[]>([]);
  const [isClicking, setIsClicking] = React.useState(false);

  // Filter by tier — each carousel instance receives exactly ONE promotion type
  // (maximum = MAXIMUM, premium = PREMIUM, boost = BOOST, standard = STANDARD), never mixed.
  const filterTiers = React.useCallback(
    (list: AdCreative[]) => {
      if (tierFilter === 'maximum') return list.filter((a) => tierRank(a.priorityTier) === 3);
      if (tierFilter === 'premium') return list.filter((a) => tierRank(a.priorityTier) === 2);
      if (tierFilter === 'boost') return list.filter((a) => tierRank(a.priorityTier) === 1);
      if (tierFilter === 'standard') return list.filter((a) => tierRank(a.priorityTier) === 0);
      return list;
    },
    [tierFilter]
  );

  // Tiers this carousel accepts — sent to the backend so each carousel is
  // filled with its OWN promotion type (premium = PREMIUM/MAXIMUM, etc.).
  const tiers = TIER_GROUPS[tierFilter];

  React.useEffect(() => {
    let cancelled = false;

    // Ask for up to 12 so types with more than 3 ads can be chunked 3-per-carousel.
    selectAds({ placement, collegeId, campusId, count: 12, tiers }).then((list) => {
      if (cancelled) return;
      const visible = filterTiers(list).sort(byPremiumness);
      setAds(carousel ? visible : visible.slice(0, 1));
    });

    return () => {
      cancelled = true;
    };
  }, [placement, collegeId, campusId, carousel, filterTiers, tiers]);

  const handleClick = async (item: AdCreative) => {
    if (!item || isClicking) return;
    setIsClicking(true);
    try {
      // Clicks MUST use the dedicated click token — the click endpoint rejects
      // the impression token (signed type mismatch → event never recorded).
      const fromClick = await trackAdClick(item.clickToken || item.token);
      const fallback = sanitizeRedirectUrl(item.destinationUrl);
      const target = fromClick || fallback;

      if (target) {
        if (target.startsWith('/')) {
          window.location.assign(target);
        } else {
          window.open(target, '_blank', 'noopener,noreferrer');
        }
      }
    } finally {
      setIsClicking(false);
    }
  };

  if (ads.length === 0) return null;

  // Chunk into groups of 3 — each group becomes its own independent carousel.
  const chunks: AdCreative[][] = [];
  for (let i = 0; i < ads.length; i += 3) chunks.push(ads.slice(i, i + 3));

  return (
    <div className={className}>
      <div className={cn(chunks.length > 1 && 'space-y-5')}>
        {chunks.map((chunk) => (
          <CarouselChunk
            key={chunk[0].id}
            items={chunk}
            placement={placement}
            intervalMs={intervalMs}
            variant={variant}
            clicking={isClicking}
            onCardClick={handleClick}
          />
        ))}
      </div>
    </div>
  );
}
