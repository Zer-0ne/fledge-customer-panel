'use client';

import * as React from 'react';
import { Listing } from '@/types';
import { ListingCard } from './listing-card';
import { MasonryGrid } from '@/components/common/masonry-grid';
import { SponsoredAd, TierFilter } from '@/components/ads/sponsored-ad';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Building2, ChevronDown, Loader2 } from 'lucide-react';

export interface ListingGridProps {
  listings: Listing[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  nextCursor?: string | null;
  onLoadMore?: () => void;
  onInterestClick?: (listing: Listing) => void;
  onResetFilters?: () => void;
  expressedInterestListingIds?: Set<string>;
  /** Ad targeting — same placement logic as the search banner (placement='search'). */
  collegeId?: string;
  campusId?: string;
}

/** One carousel per promotion type, cycled in premiumness order (same as home feed). */
const AD_TIER_CYCLE: TierFilter[] = ['maximum', 'premium', 'boost', 'standard'];
/** An ad carousel is inserted after every N listings (spread, never clustered at top). */
const AD_EVERY_N_LISTINGS = 3;

export function ListingGrid({
  listings,
  isLoading = false,
  isLoadingMore = false,
  nextCursor,
  onLoadMore,
  onInterestClick,
  onResetFilters,
  expressedInterestListingIds,
  collegeId,
  campusId,
}: ListingGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border/60 p-3">
            <Skeleton className="aspect-[16/10] w-full rounded-xl" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 flex-1" />
              <Skeleton className="h-8 flex-1" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No flats match your filters"
        description="Try adjusting your price range, college selection, or BHK requirement to discover available rentals."
        action={
          onResetFilters && (
            <Button variant="outline" onClick={onResetFilters}>
              Reset Filters
            </Button>
          )
        }
      />
    );
  }

  // Home-style masonry feed: listings + one ad carousel after every 3rd listing,
  // cycling maximum → premium → boost → standard (premiumness order, spread
  // through the feed). Placement stays 'search' — backend selection logic unchanged.
  const feed: React.ReactNode[] = [];
  listings.forEach((listing, i) => {
    feed.push(
      <ListingCard
        key={listing.id}
        listing={listing}
        onInterestClick={onInterestClick}
        hasExpressedInterest={expressedInterestListingIds?.has(listing.id)}
      />
    );
    if ((i + 1) % AD_EVERY_N_LISTINGS === 0) {
      const n = Math.floor(i / AD_EVERY_N_LISTINGS);
      const tier = AD_TIER_CYCLE[n % AD_TIER_CYCLE.length];
      feed.push(
        <SponsoredAd
          key={`ad-${tier}-${n}`}
          placement="search"
          collegeId={collegeId}
          campusId={campusId}
          variant="banner"
          carousel
          intervalMs={4500}
          tierFilter={tier}
          className={tier === 'standard' ? 'standard-promotion' : undefined}
        />
      );
    }
  });

  // Standard carousels may span 2 columns when a clean pair position exists.
  const adaptiveSpanKeys = feed
    .map((node) => (React.isValidElement(node) ? String(node.key) : ''))
    .filter((key) => key.startsWith('ad-standard'));

  return (
    <div className="space-y-8">
      <MasonryGrid adaptiveSpanKeys={adaptiveSpanKeys}>{feed}</MasonryGrid>

      {/* Pagination Load More Button */}
      {nextCursor && onLoadMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="gap-2 rounded-full px-8 shadow-xs"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Loading more flats...
              </>
            ) : (
              <>
                <ChevronDown className="size-4" />
                Load More Listings
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
