'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getMediaDownloadUrl } from '@/lib/api/services/media';
import { cn } from '@/lib/utils';

/**
 * Short-lived download URL resolution for roommate post media.
 * Cached module-wide (shared across feed cards) with the backend's
 * expiresAt respected so stale presigned URLs are re-fetched.
 */
interface CachedMediaUrl {
  url: string;
  expiresAt: number;
}

const urlCache = new Map<string, CachedMediaUrl>();
const inflight = new Map<string, Promise<string | null>>();

export function resolveMediaUrl(mediaId: string): Promise<string | null> {
  const hit = urlCache.get(mediaId);
  if (hit && hit.expiresAt > Date.now() + 30_000) return Promise.resolve(hit.url);
  const pending = inflight.get(mediaId);
  if (pending) return pending;
  const promise = getMediaDownloadUrl(mediaId)
    .then((res) => {
      const expiresAt = res.expiresAt
        ? new Date(res.expiresAt).getTime()
        : Date.now() + 60 * 60 * 1000;
      urlCache.set(mediaId, { url: res.url, expiresAt });
      return res.url;
    })
    .catch(() => null)
    .finally(() => inflight.delete(mediaId));
  inflight.set(mediaId, promise);
  return promise;
}

/**
 * Resolves a post's mediaIds to download URLs (best-effort: failed/forbidden
 * media simply stays absent — the card renders without images).
 */
export function useRoommateMediaUrls(
  mediaIds: string[] | undefined
): Record<string, string> {
  const [urls, setUrls] = React.useState<Record<string, string>>({});
  const ids = React.useMemo(() => mediaIds ?? [], [mediaIds]);

  React.useEffect(() => {
    let cancelled = false;
    const resolved: Record<string, string> = {};
    for (const id of ids) {
      const url = urlCache.get(id)?.url;
      if (url) resolved[id] = url;
    }
    void Promise.all(
      ids.map(async (id) => {
        if (resolved[id]) return;
        const url = await resolveMediaUrl(id);
        if (url && !cancelled) resolved[id] = url;
      })
    ).then(() => {
      if (!cancelled) setUrls({ ...resolved });
    });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return urls;
}

interface RoommatePostMediaProps {
  mediaIds: string[];
  alt?: string;
  className?: string;
  /** Edge-to-edge cover (card top, clipped by the card's own rounding) — home-style feature card. */
  fullBleed?: boolean;
  /** Autoplay delay per slide in ms (multi-image posts only). */
  intervalMs?: number;
}

/**
 * Photo strip for a roommate post. Renders ONLY when the post actually has
 * media (user uploaded at least one image); posts without images keep the
 * plain card. Multi-image posts get a swipeable, autoplaying slider with
 * prev/next arrows and dots — autoplay pauses while the user hovers.
 */
export function RoommatePostMedia({
  mediaIds,
  alt = '',
  className,
  fullBleed = false,
  intervalMs = 4000,
}: RoommatePostMediaProps) {
  const urls = useRoommateMediaUrls(mediaIds);
  // Ordered by upload position; failed/forbidden media is skipped.
  const slides = mediaIds.map((id) => urls[id]).filter((url): url is string => Boolean(url));

  const stacked = slides.length > 1;
  const [index, setIndex] = React.useState(0);
  const [hovered, setHovered] = React.useState(false);
  const touchStartXRef = React.useRef(0);

  const next = () => setIndex((i) => (i + 1) % Math.max(1, slides.length));
  const prev = () => setIndex((i) => (i - 1 + Math.max(1, slides.length)) % Math.max(1, slides.length));

  // Autoplay — setTimeout keyed on index (one timer per slide, restarts on
  // manual navigation); paused while the user hovers/focuses the media.
  React.useEffect(() => {
    if (slides.length === 0 || !stacked || hovered) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), intervalMs);
    return () => window.clearTimeout(timer);
  }, [stacked, slides.length, index, hovered, intervalMs]);

  if (slides.length === 0) return null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={cn(
        fullBleed
          ? 'relative aspect-[16/10] w-full overflow-hidden bg-muted'
          : 'relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border/60 bg-muted',
        className
      )}
      role="region"
      aria-label="Post photos"
    >
      <div
        className="flex size-full"
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
          className="flex size-full transition-transform duration-500"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((url, i) => (
            <div key={mediaIds[i]} className="relative w-full shrink-0" aria-hidden={i !== index}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={i === 0 ? alt : ''}
                className="size-full object-cover"
                loading="lazy"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Prev / Next arrows — only when more than one photo */}
      {stacked && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={prev}
            className="absolute left-2 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={next}
            className="absolute right-2 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <ChevronRight className="size-4" />
          </button>

          {/* Dots + counter */}
          <div className="absolute inset-x-0 bottom-2 z-10 flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={mediaIds[i]}
                type="button"
                aria-label={`Show photo ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                )}
              />
            ))}
          </div>
          <span className="absolute right-2 top-2 z-10 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {index + 1}/{slides.length}
          </span>
        </>
      )}
    </div>
  );
}
