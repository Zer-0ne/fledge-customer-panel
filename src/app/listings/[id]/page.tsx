'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Listing } from '@/types';
import { fetchListingDetail, fetchPropertyDetail, toggleListingFavorite } from '@/lib/api/services/discovery';
import { fetchListingInterests } from '@/lib/api/services/interests';
import { formatPaiseToINR, formatDate } from '@/lib/formatting';
import { InterestDialog } from '@/components/listings/interest-dialog';
import { LocationMap } from '@/components/map/location-map';
import { SponsoredAd } from '@/components/ads/sponsored-ad';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/components/providers/auth-provider';
import {
  Bed,
  Bath,
  MapPin,
  Calendar,
  Building,
  Heart,
  Sparkles,
  ArrowLeft,
  Share2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [listing, setListing] = React.useState<Listing | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isFavorited, setIsFavorited] = React.useState(false);
  const [isFavLoading, setIsFavLoading] = React.useState(false);
  const [isInterestOpen, setIsInterestOpen] = React.useState(false);
  const [hasExpressedInterest, setHasExpressedInterest] = React.useState(false);
  // Fallback coordinates if listing doesn't embed property.approximateLocation
  const [fallbackCoords, setFallbackCoords] = React.useState<{ lat: number; lng: number } | null>(null);

  let isAuthenticated = false;
  try {
    const auth = useAuth();
    isAuthenticated = auth.isAuthenticated;
  } catch {
    // Rendered outside AuthProvider
  }

  React.useEffect(() => {
    if (!id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Invalid listing ID.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    if (isAuthenticated) {
      fetchListingInterests()
        .then((res) => {
          const isSent = res.outgoing.some((item) => item.listingId === id);
          if (isSent) setHasExpressedInterest(true);
        })
        .catch(() => {});
    }

    fetchListingDetail(id)
      .then((data) => {
        if (!data) {
          setError('Listing not found or has been removed.');
        } else {
          setListing(data);
          setIsFavorited(!!data.isFavorited);

          // If the listing response doesn't embed coordinates, fetch property separately
          const embeddedLat = data.property?.approximateLocation?.latitude ?? data.property?.address?.latitude;
          const embeddedLng = data.property?.approximateLocation?.longitude ?? data.property?.address?.longitude;
          const hasCoords = typeof embeddedLat === 'number' && !isNaN(embeddedLat)
            && typeof embeddedLng === 'number' && !isNaN(embeddedLng);

          if (!hasCoords && data.propertyId) {
            fetchPropertyDetail(data.propertyId).then((prop) => {
              const lat = prop?.approximateLocation?.latitude ?? prop?.address?.latitude;
              const lng = prop?.approximateLocation?.longitude ?? prop?.address?.longitude;
              if (typeof lat === 'number' && !isNaN(lat) && typeof lng === 'number' && !isNaN(lng)) {
                setFallbackCoords({ lat, lng });
              }
            }).catch(() => { /* ignore, map will use default */ });
          }
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to fetch listing details.';
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  }, [id, isAuthenticated]);

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      showToast({
        title: 'Authentication required',
        description: 'Please log in to add listings to your favorites.',
        variant: 'info',
      });
      return;
    }

    if (!listing) return;

    setIsFavLoading(true);
    const nextFavState = !isFavorited;
    setIsFavorited(nextFavState);

    try {
      await toggleListingFavorite(listing.id, isFavorited);
      showToast({
        title: nextFavState ? 'Added to Favorites' : 'Removed from Favorites',
        description: nextFavState
          ? 'Saved to your favorite listings.'
          : 'Removed from your favorite listings.',
        variant: 'default',
      });
    } catch {
      setIsFavorited(isFavorited);
      showToast({
        title: 'Error',
        description: 'Failed to update favorite state.',
        variant: 'error',
      });
    } finally {
      setIsFavLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: listing?.title || 'Flat Listing',
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast({
        title: 'Link Copied',
        description: 'Listing URL copied to clipboard.',
        variant: 'info',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-[21/9] w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <ErrorState
          title="Listing Not Found"
          description={error || 'The requested flat listing could not be found or has expired.'}
          onRetry={() => router.push('/search')}
        />
      </div>
    );
  }

  const images =
    listing.images && listing.images.length > 0
      ? listing.images
      : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&auto=format&fit=crop&q=80'];

  const locationText = [
    listing.campusName,
    listing.collegeName,
    listing.property?.city,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Listings
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-1.5 rounded-full"
          >
            <Share2 className="size-4" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFavoriteToggle}
            disabled={isFavLoading}
            className="gap-1.5 rounded-full"
          >
            <Heart
              className={`size-4 ${
                isFavorited ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'
              }`}
            />
            {isFavorited ? 'Saved' : 'Favorite'}
          </Button>
        </div>
      </div>

      {/* Image Gallery Grid */}
      <div className="grid grid-cols-1 gap-4 overflow-hidden rounded-3xl md:grid-cols-3 max-h-[460px]">
        <div className="relative md:col-span-2 aspect-[16/10] md:aspect-auto h-full min-h-[300px] w-full bg-muted">
          <Image
            src={images[0]}
            alt={listing.title}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 66vw"
          />
        </div>
        {images.length > 1 ? (
          <div className="hidden md:grid grid-rows-2 gap-4 h-full">
            {images.slice(1, 3).map((img, index) => (
              <div key={index} className="relative h-full w-full bg-muted overflow-hidden">
                <Image
                  src={img}
                  alt={`${listing.title} image ${index + 2}`}
                  fill
                  className="object-cover"
                  sizes="33vw"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center bg-muted/40 rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
            <Building className="size-10 mb-2 opacity-50" />
            <span className="text-xs">No additional photos</span>
          </div>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (Details & Info) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header info */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {listing.bedrooms} BHK Apartment
              </Badge>
              {listing.furnishing && (
                <Badge variant="secondary" className="capitalize">
                  {listing.furnishing.replace('-', ' ')}
                </Badge>
              )}
              {listing.status && (
                <Badge variant={listing.status === 'published' ? 'success' : 'secondary'}>
                  {listing.status}
                </Badge>
              )}
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {listing.title}
            </h1>

            {locationText && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <MapPin className="size-4 text-primary shrink-0" />
                <span>{locationText}</span>
              </p>
            )}
          </div>

          {/* Key Specs Card */}
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border/60 bg-card p-4 sm:grid-cols-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Bedrooms</span>
              <p className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                <Bed className="size-4 text-primary" />
                {listing.bedrooms} BHK
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Bathrooms</span>
              <p className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                <Bath className="size-4 text-primary" />
                {listing.bathrooms} Bath
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Available From</span>
              <p className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
                <Calendar className="size-4 text-primary" />
                {formatDate(listing.availableFrom)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Gender Pref.</span>
              <p className="flex items-center gap-1.5 font-semibold text-foreground text-sm capitalize">
                <ShieldCheck className="size-4 text-primary" />
                {listing.genderPreference || 'Any'}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">About This Rental</h2>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {listing.description || 'No detailed description provided.'}
            </p>
          </div>

          {/* Location Map */}
          <div className="space-y-3 pt-2">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <MapPin className="size-5 text-primary" />
              Approximate Location & Neighborhood
            </h2>
            <LocationMap
              listings={[listing]}
              centerLat={
                Number(
                  listing.property?.approximateLocation?.latitude ??
                  listing.property?.address?.latitude ??
                  fallbackCoords?.lat ??
                  28.689
                )
              }
              centerLng={
                Number(
                  listing.property?.approximateLocation?.longitude ??
                  listing.property?.address?.longitude ??
                  fallbackCoords?.lng ??
                  77.2105
                )
              }
              selectedListingId={listing.id}
              heightClass="h-[350px]"
              title={`Approximate location: ${locationText || 'Rental Location'}`}
            />
          </div>

          {/* Associated Property Link */}
          {listing.propertyId && (
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-base">Building & Amenities</h3>
                  <p className="text-xs text-muted-foreground">
                    View property details, campus distance, and verified exact address.
                  </p>
                </div>
                <Link href={`/properties/${listing.propertyId}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                    <Building className="size-4" />
                    View Property
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Pricing & Action Card) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-md space-y-6">
              {/* Rent Pricing */}
              <div className="space-y-1 border-b border-border/50 pb-5">
                <span className="text-xs font-medium text-muted-foreground">Monthly Rent</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">
                    {formatPaiseToINR(listing.monthlyRentPaise)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ month</span>
                </div>

                {listing.depositPaise !== undefined && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Security Deposit:{' '}
                    <span className="font-semibold text-foreground">
                      {formatPaiseToINR(listing.depositPaise)}
                    </span>
                  </p>
                )}
              </div>

              {/* Quick Guarantees */}
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>Verified listing near campus</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span>Direct contact with owner/manager</span>
                </div>
              </div>

              {/* Main Action Buttons */}
              <div className="space-y-3">
                {hasExpressedInterest ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full gap-2 rounded-xl text-base font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                    onClick={() => router.push('/interests?tab=outgoing')}
                  >
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    Interest Sent (View Status)
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="w-full gap-2 rounded-xl text-base shadow-sm"
                    onClick={() => {
                      if (!isAuthenticated) {
                        showToast({
                          title: 'Authentication required',
                          description: 'Please log in to express interest in this flat.',
                          variant: 'info',
                        });
                        router.push('/login');
                        return;
                      }
                      setIsInterestOpen(true);
                    }}
                  >
                    <Sparkles className="size-4" />
                    Express Interest
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full gap-2 rounded-xl"
                  onClick={handleFavoriteToggle}
                  disabled={isFavLoading}
                >
                  <Heart
                    className={`size-4 ${
                      isFavorited ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'
                    }`}
                  />
                  {isFavorited ? 'Saved in Favorites' : 'Save to Favorites'}
                </Button>
              </div>
            </div>

            {/* Sponsored placement — listing */}
            <SponsoredAd
              placement="listing"
              collegeId={listing.property?.collegeId}
              campusId={listing.property?.campusId}
              variant="sidebar"
            />
          </div>
        </div>
      </div>

      {/* Interest Dialog */}
      <InterestDialog
        listing={listing}
        open={isInterestOpen}
        onOpenChange={setIsInterestOpen}
        onSuccess={() => setHasExpressedInterest(true)}
      />
    </div>
  );
}
