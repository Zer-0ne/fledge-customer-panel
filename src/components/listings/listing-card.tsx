'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Listing } from '@/types';
import { formatPaiseToINR } from '@/lib/formatting';
import { toggleListingFavorite } from '@/lib/api/services/discovery';
import { showToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Bed, Bath, MapPin, Sparkles, Building, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import BorderGlow from '@/components/BorderGlow'

export interface ListingCardProps {
  listing: Listing;
  onInterestClick?: (listing: Listing) => void;
  onFavoriteToggle?: (listingId: string, isFavorited: boolean) => void;
  hasExpressedInterest?: boolean;
}

export function ListingCard({
  listing,
  onInterestClick,
  onFavoriteToggle,
  hasExpressedInterest = false,
}: ListingCardProps) {
  const [isFavorited, setIsFavorited] = React.useState(!!listing.isFavorited);
  const [isFavLoading, setIsFavLoading] = React.useState(false);

  let isAuthenticated = false;
  try {
    const auth = useAuth();
    isAuthenticated = auth.isAuthenticated;
  } catch {
    // Rendered outside AuthProvider
  }

  const primaryImage =
    listing.images && listing.images.length > 0
      ? listing.images[0]
      : 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80';

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast({
        title: 'Authentication required',
        description: 'Please log in to save listings to your favorites.',
        variant: 'info',
      });
      return;
    }

    setIsFavLoading(true);
    const nextState = !isFavorited;
    setIsFavorited(nextState);

    try {
      await toggleListingFavorite(listing.id, isFavorited);
      showToast({
        title: nextState ? 'Saved to Favorites' : 'Removed from Favorites',
        description: nextState
          ? 'Listing saved to your favorites list.'
          : 'Listing removed from your favorites list.',
        variant: 'default',
      });
      if (onFavoriteToggle) onFavoriteToggle(listing.id, nextState);
    } catch {
      setIsFavorited(isFavorited);
      showToast({
        title: 'Error',
        description: 'Could not update favorite status.',
        variant: 'error',
      });
    } finally {
      setIsFavLoading(false);
    }
  };

  const handleInterest = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast({
        title: 'Authentication required',
        description: 'Please log in to express interest in this listing.',
        variant: 'info',
      });
      return;
    }

    if (onInterestClick) {
      onInterestClick(listing);
    }
  };

  const locationText = [
    listing.campusName,
    listing.collegeName,
    listing.property?.city,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <BorderGlow className='rounded-2xl!'>
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {/* Image Header */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <Link href={`/listings/${listing.id}`} className="relative block h-full w-full">
          <Image
            src={primaryImage}
            alt={listing.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
        </Link>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
          <Badge variant="secondary" className="backdrop-blur-md bg-black/40 text-white border-0 font-medium">
            {listing.bedrooms} BHK
          </Badge>
          {listing.furnishing && (
            <Badge variant="secondary" className="capitalize backdrop-blur-md bg-black/40 text-white border-0">
              {listing.furnishing.replace('-', ' ')}
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          disabled={isFavLoading}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-md text-white transition-all hover:bg-black/60 hover:scale-110 active:scale-95"
        >
          <Heart
            className={`size-4 transition-colors ${
              isFavorited ? 'fill-rose-500 text-rose-500' : 'text-white'
            }`}
          />
        </button>

        {/* Bottom Rent Badge overlay on image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white z-10">
          <div>
            <span className="text-xl font-bold tracking-tight">
              {formatPaiseToINR(listing.monthlyRentPaise)}
            </span>
            <span className="text-xs text-white/80 font-normal"> / month</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-4 gap-3">
        <div className="space-y-1.5">
          <Link href={`/listings/${listing.id}`}>
            <h3 className="line-clamp-1 font-semibold text-foreground text-base group-hover:text-primary transition-colors">
              {listing.title}
            </h3>
          </Link>

          {locationText && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground line-clamp-1">
              <MapPin className="size-3.5 shrink-0 text-primary/70" />
              <span>{locationText}</span>
            </p>
          )}
        </div>

        {/* Amenities / Specs Row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border/40 pt-2.5">
          <div className="flex items-center gap-1">
            <Bed className="size-3.5" />
            <span>{listing.bedrooms} Bed</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath className="size-3.5" />
            <span>{listing.bathrooms} Bath</span>
          </div>
          {listing.property?.type && (
            <div className="flex items-center gap-1 capitalize">
              <Building className="size-3.5" />
              <span>{listing.property.type}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-1">
          {hasExpressedInterest ? (
            <Link href="/interests?tab=outgoing" className="w-full">
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-center gap-1.5 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all font-medium"
              >
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Interest Sent (View)
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-center gap-1.5 rounded-xl border-primary/20 hover:bg-primary hover:text-primary-foreground transition-all"
              onClick={handleInterest}
            >
              <Sparkles className="size-3.5" />
              Express Interest
            </Button>
          )}
        </div>
      </div>
    </div>
    </BorderGlow>
  );
}
