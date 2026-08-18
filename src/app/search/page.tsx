'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { College, Campus, Listing, ListingFilterParams } from '@/types';
import { fetchColleges, fetchCampuses, fetchListings } from '@/lib/api/services/discovery';
import {
  parseListingFilterParams,
  serializeListingFilterParams,
} from '@/lib/listings/filters';
import { ListingFilters } from '@/components/listings/listing-filters';
import { ListingGrid } from '@/components/listings/listing-grid';
import { InterestDialog } from '@/components/listings/interest-dialog';
import { fetchListingInterests } from '@/lib/api/services/interests';
import { useAuth } from '@/components/providers/auth-provider';
import { LocationMap } from '@/components/map/location-map';
import { Building2, LayoutGrid, Map as MapIcon, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [colleges, setColleges] = React.useState<College[]>([]);
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);

  // View Mode: 'grid' | 'map' | 'split'
  const [viewMode, setViewMode] = React.useState<'grid' | 'map' | 'split'>('split');
  const [selectedListingId, setSelectedListingId] = React.useState<string | null>(null);

  // Interest Modal state
  const [selectedListingForInterest, setSelectedListingForInterest] = React.useState<Listing | null>(null);
  const [isInterestOpen, setIsInterestOpen] = React.useState(false);
  const [expressedInterestListingIds, setExpressedInterestListingIds] = React.useState<Set<string>>(new Set());

  let isAuthenticated = false;
  try {
    const auth = useAuth();
    isAuthenticated = auth.isAuthenticated;
  } catch {
    // Rendered outside AuthProvider
  }

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchListingInterests()
        .then((res) => {
          const ids = new Set(res.outgoing.map((i) => i.listingId).filter(Boolean));
          setExpressedInterestListingIds(ids);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  // Campus coordinates — used as map center when no manual pin is set
  const [campusCenter, setCampusCenter] = React.useState<{ lat: number; lng: number } | null>(null);
  const lastCampusIdRef = React.useRef<string | undefined>(undefined);

  const searchParamsString = searchParams.toString();

  const filters = React.useMemo(() => {
    const paramsObject: Record<string, string> = {};
    const parsedParams = new URLSearchParams(searchParamsString);
    parsedParams.forEach((value, key) => {
      paramsObject[key] = value;
    });
    return parseListingFilterParams(paramsObject);
  }, [searchParamsString]);

  // Load Colleges
  React.useEffect(() => {
    fetchColleges().then((res) => setColleges(res));
  }, []);

  // When campusId changes, fetch its coordinates for map centering
  React.useEffect(() => {
    const campusId = filters.campusId;
    const collegeId = filters.collegeId;
    if (!campusId || !collegeId || campusId === lastCampusIdRef.current) return;
    lastCampusIdRef.current = campusId;

    fetchCampuses(collegeId).then((campuses: Campus[]) => {
      const campus = campuses.find((c: Campus) => c.id === campusId);
      if (campus?.latitude && campus?.longitude) {
        setCampusCenter({ lat: campus.latitude, lng: campus.longitude });
      }
    }).catch(() => { /* ignore */ });
  }, [filters.campusId, filters.collegeId]);

  // Reset campus center when campus is cleared
  React.useEffect(() => {
    if (!filters.campusId) {
      lastCampusIdRef.current = undefined;
      const timer = window.setTimeout(() => setCampusCenter(null), 0);
      return () => window.clearTimeout(timer);
    }
  }, [filters.campusId]);

  // Fetch Listings on filter change
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    fetchListings(filters)
      .then((res) => {
        setListings(res.items);
        setNextCursor(res.nextCursor || null);
      })
      .finally(() => setIsLoading(false));
  }, [filters]);

  const handleFilterChange = (updatedPartial: Partial<ListingFilterParams>) => {
    const nextFilters = { ...filters, ...updatedPartial, cursor: undefined };
    const serialized = serializeListingFilterParams(nextFilters);
    const newQuery = new URLSearchParams(serialized).toString();
    router.push(`/search${newQuery ? `?${newQuery}` : ''}`);
  };

  const handleResetFilters = () => {
    router.push('/search');
  };

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetchListings({ ...filters, cursor: nextCursor });
      setListings((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor || null);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl flex items-center gap-3">
            <Building2 className="size-8 text-primary" />
            Browse Flat Listings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explore student flats, apartments, and PG rentals around your college campus.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-xl border border-border bg-card p-1 shadow-xs self-start sm:self-auto">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-8 gap-1 text-xs"
          >
            <LayoutGrid className="size-3.5" />
            Grid View
          </Button>
          <Button
            variant={viewMode === 'split' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('split')}
            className="h-8 gap-1 text-xs hidden md:flex"
          >
            <Columns className="size-3.5" />
            Split View
          </Button>
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('map')}
            className="h-8 gap-1 text-xs"
          >
            <MapIcon className="size-3.5" />
            Map View
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <ListingFilters
        colleges={colleges}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      {/* Main Content Area based on View Mode */}
      {viewMode === 'map' && (
        <LocationMap
          listings={listings}
          centerLat={filters.latitude ?? campusCenter?.lat ?? 28.689}
          centerLng={filters.longitude ?? campusCenter?.lng ?? 77.2105}
          radiusMeters={filters.radiusMeters}
          selectedListingId={selectedListingId || undefined}
          onSelectListing={setSelectedListingId}
          onLocationSelect={(lat, lng) => handleFilterChange({ latitude: lat, longitude: lng })}
          heightClass="h-[600px]"
          title="Map Search & Radius Discovery"
        />
      )}

      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <ListingGrid
              listings={listings}
              isLoading={isLoading}
              isLoadingMore={isLoadingMore}
              nextCursor={nextCursor}
              onLoadMore={handleLoadMore}
              onResetFilters={handleResetFilters}
              expressedInterestListingIds={expressedInterestListingIds}
              collegeId={filters.collegeId}
              campusId={filters.campusId}
              onInterestClick={(listing) => {
                setSelectedListingForInterest(listing);
                setIsInterestOpen(true);
              }}
            />
          </div>
          <div className="lg:col-span-5 lg:sticky lg:top-6">
            <LocationMap
              listings={listings}
              centerLat={filters.latitude ?? campusCenter?.lat ?? 28.689}
              centerLng={filters.longitude ?? campusCenter?.lng ?? 77.2105}
              radiusMeters={filters.radiusMeters}
              selectedListingId={selectedListingId || undefined}
              onSelectListing={setSelectedListingId}
              onLocationSelect={(lat, lng) => handleFilterChange({ latitude: lat, longitude: lng })}
              heightClass="h-[550px]"
              title="Interactive Area Map"
            />
          </div>
        </div>
      )}

      {viewMode === 'grid' && (
        <ListingGrid
          listings={listings}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          nextCursor={nextCursor}
          onLoadMore={handleLoadMore}
          onResetFilters={handleResetFilters}
          expressedInterestListingIds={expressedInterestListingIds}
          collegeId={filters.collegeId}
          campusId={filters.campusId}
          onInterestClick={(listing) => {
            setSelectedListingForInterest(listing);
            setIsInterestOpen(true);
          }}
        />
      )}

      {/* Interest Dialog */}
      <InterestDialog
        listing={selectedListingForInterest}
        open={isInterestOpen}
        onOpenChange={setIsInterestOpen}
        onSuccess={() => {
          if (selectedListingForInterest) {
            setExpressedInterestListingIds((prev) => new Set([...prev, selectedListingForInterest.id]));
          }
        }}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading search...</div>}>
      <SearchContent />
    </React.Suspense>
  );
}
