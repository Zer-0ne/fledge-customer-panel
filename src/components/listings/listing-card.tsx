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
import { Heart, Bed, Bath, MapPin, Sparkles, Building, CheckCircle2, Navigation } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';

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
  const [hovered, setHovered] = React.useState(false);

  const images = React.useMemo(() => {
    const urls = (listing.images ?? []).filter(Boolean);
    return urls.length > 0
      ? urls
      : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80'];
  }, [listing.images]);

  // Auto-playing image carousel — same cadence as the Flutter app (4s).
  // Pauses while the user hovers/interacts so it never fights the cursor.
  const multiImage = images.length > 1;
  // Index is stored with the listing it belongs to, so a different listing
  // starts at slide 0 without a setState-in-effect reset.
  const [carousel, setCarousel] = React.useState({ listingId: listing.id, index: 0 });
  const imageIndex = carousel.listingId === listing.id ? carousel.index : 0;
  const setImageIndex = React.useCallback(
    (index: number) => setCarousel({ listingId: listing.id, index }),
    [listing.id]
  );

  React.useEffect(() => {
    if (!multiImage || hovered) return;
    const timer = window.setInterval(() => {
      setImageIndex((imageIndex + 1) % images.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [multiImage, hovered, images.length, imageIndex, setImageIndex]);

  let isAuthenticated = false;
  try {
    const auth = useAuth();
    isAuthenticated = auth.isAuthenticated;
  } catch {
    // Rendered outside AuthProvider
  }
  const router = useRouter();

  /**
   * Guests can browse; saving/interests need a session. Previously these taps
   * only produced an "Authentication required" toast — a dead end. Send them to
   * sign-in and return them to the exact listing they tapped.
   */
  const requireSignIn = (reason: string) => {
    showToast({ title: 'Sign in to continue', description: reason, variant: 'info' });
    router.push(`/login?returnUrl=${encodeURIComponent(`/listings/${listing.id}`)}`);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      requireSignIn('Create a free account to save flats and get alerts.');
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
      requireSignIn('Sign in to send an enquiry — hosts reply in the app.');
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
    <div
      className="fl-lift group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image Header — auto-playing carousel (multi-image) */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <Link href={`/listings/${listing.id}`} className="relative block h-full w-full">
          {images.map((src, i) => (
            <Image
              key={`${listing.id}-${i}-${src}`}
              src={src}
              alt={i === imageIndex ? listing.title : ''}
              fill
              className="object-cover transition-all duration-700 ease-out group-hover:scale-105"
              style={{
                opacity: i === imageIndex ? 1 : 0,
                transform: `translateX(${(i - imageIndex) * 6}%)`,
              }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
        </Link>

        {/* Carousel dots — 24px hit area around a 6px visual dot (WCAG 2.5.8) */}
        {multiImage && (
          <div className="absolute right-3 bottom-3 z-10 flex items-center gap-0.5">
            {images.map((_, i) => (
              <button
                key={`dot-${listing.id}-${i}`}
                type="button"
                aria-label={`Go to image ${i + 1}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setImageIndex(i);
                }}
                className="group/dot flex size-6 items-center justify-center"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    i === imageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50 group-hover/dot:bg-white/80'
                  }`}
                />
              </button>
            ))}
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5">
          {listing.bedrooms ? (
            <Badge variant="secondary" className="border-0 bg-black/45 font-medium text-white backdrop-blur-md">
              {listing.bedrooms} BHK
            </Badge>
          ) : null}
          {listing.furnishing && (
            <Badge variant="secondary" className="border-0 bg-black/45 capitalize text-white backdrop-blur-md">
              {listing.furnishing.replace('-', ' ')}
            </Badge>
          )}
          {listing.petFriendly && (
            <Badge variant="secondary" className="border-0 bg-emerald-600/80 font-medium text-white backdrop-blur-md">
              Pets OK
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
        <div className="absolute right-3 bottom-3 left-3 z-10 flex items-end justify-between text-white">
          <div className="flex items-baseline gap-1">
            <span className="fl-num text-xl font-bold tracking-tight drop-shadow-sm">
              {formatPaiseToINR(listing.monthlyRentPaise)}
            </span>
            <span className="text-xs font-normal text-white/80">/ month</span>
          </div>
          {listing.distanceMeters != null && (
            <span className="fl-num inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium backdrop-blur-md">
              <Navigation className="size-3" />
              {listing.distanceMeters < 1000
                ? `${Math.round(listing.distanceMeters)} m`
                : `${(listing.distanceMeters / 1000).toFixed(1)} km`}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-4 gap-3">
        <div className="space-y-1.5">
          <Link href={`/listings/${listing.id}`} className="inline-flex min-h-7 items-center">
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
        <div className="flex items-center gap-3 border-t border-border/40 pt-2.5 text-xs text-muted-foreground">
          {listing.bedrooms ? (
            <div className="flex items-center gap-1">
              <Bed className="size-3.5" />
              <span>{listing.bedrooms} Bed</span>
            </div>
          ) : null}
          {listing.bathrooms ? (
            <div className="flex items-center gap-1">
              <Bath className="size-3.5" />
              <span>{listing.bathrooms} Bath</span>
            </div>
          ) : null}
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
                variant="outline"
                className="h-11 w-full justify-center gap-1.5 rounded-xl border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-600 transition-all hover:bg-emerald-500/20 dark:text-emerald-400 sm:h-9"
              >
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Enquiry sent — view
              </Button>
            </Link>
          ) : (
            <Button
              type="button"
              className="h-11 w-full gap-1.5 rounded-xl text-sm font-medium sm:h-9"
              onClick={handleInterest}
            >
              <Sparkles className="size-3.5" />
              {isAuthenticated ? 'Send enquiry' : 'Sign in to enquire'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
