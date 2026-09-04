'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchFavorites, toggleListingFavorite } from '@/lib/api/services/favorites';
import { fetchListingInterests } from '@/lib/api/services/interests';
import { Favorite, Listing } from '@/types';
import { ListingCard } from '@/components/listings/listing-card';
import { InterestDialog } from '@/components/listings/interest-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { showToast } from '@/components/ui/toast';
import { Heart, Search, Sparkles, Building2, SlidersHorizontal } from 'lucide-react';

export default function FavoritesPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [favorites, setFavorites] = React.useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedListingForInterest, setSelectedListingForInterest] = React.useState<Listing | null>(null);
  const [isInterestDialogOpen, setIsInterestDialogOpen] = React.useState(false);
  const [expressedInterestListingIds, setExpressedInterestListingIds] = React.useState<Set<string>>(new Set());

  const loadFavorites = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [data, interests] = await Promise.all([
        fetchFavorites(),
        fetchListingInterests().catch(() => ({ incoming: [], outgoing: [] })),
      ]);
      setFavorites(data);
      const ids = new Set(interests.outgoing.map((i) => i.listingId).filter(Boolean));
      setExpressedInterestListingIds(ids);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load saved favorites.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadFavorites();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading, loadFavorites]);

  // Optimistic UI toggle handler with rollback
  const handleFavoriteToggle = async (listingId: string, isFavorited: boolean) => {
    const existingIndex = favorites.findIndex((f) => f.listingId === listingId || f.listing?.id === listingId);
    const removedFavorite = favorites[existingIndex];

    if (!isFavorited && existingIndex !== -1) {
      // Optimistically remove from state
      setFavorites((prev) => prev.filter((_, i) => i !== existingIndex));
    }

    try {
      await toggleListingFavorite(listingId, !isFavorited);
      showToast({
        title: !isFavorited ? 'Removed from Favorites' : 'Saved to Favorites',
        description: !isFavorited
          ? 'Listing has been removed from your saved list.'
          : 'Listing has been saved to your favorites.',
        variant: 'default',
      });
    } catch {
      // Rollback optimistic update on error
      if (!isFavorited && removedFavorite) {
        setFavorites((prev) => {
          const next = [...prev];
          next.splice(existingIndex, 0, removedFavorite);
          return next;
        });
      }
      showToast({
        title: 'Error',
        description: 'Failed to update favorite status. Restoring listing...',
        variant: 'error',
      });
    }
  };

  const handleInterestClick = (listing: Listing) => {
    setSelectedListingForInterest(listing);
    setIsInterestDialogOpen(true);
  };

  // Filter favorites by local query string
  const filteredFavorites = React.useMemo(() => {
    if (!searchQuery.trim()) return favorites;
    const query = searchQuery.toLowerCase();
    return favorites.filter((fav) => {
      const l = fav.listing;
      if (!l) return false;
      return (
        l.title.toLowerCase().includes(query) ||
        l.property?.city?.toLowerCase().includes(query) ||
        l.collegeName?.toLowerCase().includes(query) ||
        l.campusName?.toLowerCase().includes(query)
      );
    });
  }, [favorites, searchQuery]);

  if (isAuthLoading || (isAuthenticated && isLoading)) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-full max-w-md rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Heart className="size-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Sign in to View Favorites</h1>
        <p className="text-sm text-muted-foreground">
          Save your favorite flat listings and access them anytime across all your devices.
        </p>
        <div className="pt-2 flex justify-center">
          <Link href="/login">
            <Button size="lg" className="rounded-xl shadow-xs">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ErrorState
          title="Could Not Load Favorites"
          description={error}
          onRetry={loadFavorites}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-500 mb-1">
            <Heart className="size-5 fill-rose-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Saved Listings</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Your Favorite Flats ({favorites.length})
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bookmarked property listings you can review, compare, or express interest in.
          </p>
        </div>

        <Link href="/search">
          <Button variant="outline" className="gap-2 rounded-xl">
            <Building2 className="size-4" />
            <span>Discover More Flats</span>
          </Button>
        </Link>
      </div>

      {/* Filter / Search Bar */}
      {favorites.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search saved flats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>
          {searchQuery && (
            <span className="text-xs text-muted-foreground">
              Showing {filteredFavorites.length} of {favorites.length}
            </span>
          )}
        </div>
      )}

      {/* Favorites List or Empty State */}
      {filteredFavorites.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFavorites.map((fav) => {
            const listing = fav.listing || ({
              id: fav.listingId,
              propertyId: '',
              title: 'Saved Flat Listing',
              description: '',
              monthlyRentPaise: 0,
              depositPaise: 0,
              bedrooms: 1,
              bathrooms: 1,
              furnishing: 'semi-furnished',
              availableFrom: new Date().toISOString(),
              images: [],
              status: 'published',
              isFavorited: true,
              createdAt: fav.createdAt,
              updatedAt: fav.createdAt,
            } as Listing);

            return (
              <ListingCard
                key={fav.id}
                listing={{ ...listing, isFavorited: true }}
                onInterestClick={handleInterestClick}
                onFavoriteToggle={handleFavoriteToggle}
                hasExpressedInterest={expressedInterestListingIds.has(listing.id)}
              />
            );
          })}
        </div>
      ) : favorites.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
          <SlidersHorizontal className="mx-auto size-8 text-muted-foreground/60" />
          <h3 className="text-lg font-semibold text-foreground">No matching saved flats</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No favorites match your current filter query &quot;{searchQuery}&quot;. Try clearing your search.
          </p>
          <Button variant="outline" size="sm" onClick={() => setSearchQuery('')} className="rounded-xl">
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center space-y-4 max-w-md mx-auto">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <Heart className="size-7" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No Saved Flats Yet</h3>
          <p className="text-sm text-muted-foreground">
            When you find a flat listing you like, click the heart icon to save it here for easy reference.
          </p>
          <Link href="/search" className="inline-block pt-2">
            <Button className="gap-2 rounded-xl shadow-xs">
              <Sparkles className="size-4" />
              <span>Explore Available Flats</span>
            </Button>
          </Link>
        </div>
      )}

      {/* Interest Dialog */}
      <InterestDialog
        listing={selectedListingForInterest}
        open={isInterestDialogOpen}
        onOpenChange={setIsInterestDialogOpen}
        onSuccess={() => {
          if (selectedListingForInterest) {
            setExpressedInterestListingIds((prev) => new Set([...prev, selectedListingForInterest.id]));
          }
          showToast({
            title: 'Interest Sent!',
            description: 'Your inquiry has been submitted successfully.',
            variant: 'success',
          });
        }}
      />
    </div>
  );
}
