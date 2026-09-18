'use client';

import * as React from 'react';
import { College, Campus, ListingFilterParams } from '@/types';
import { fetchCampuses } from '@/lib/api/services/discovery';
import { paiseToRupees } from '@/lib/listings/filters';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, RotateCcw, SlidersHorizontal, MapPin, X, ChevronDown } from 'lucide-react';
import { LocationSearchField, type PlaceResult } from '@/components/ui/location-search-field';

export interface ListingFiltersProps {
  colleges: College[];
  filters: ListingFilterParams;
  onFilterChange: (filters: Partial<ListingFilterParams>) => void;
  onReset: () => void;
}

const FURNISHING_LABELS: Record<string, string> = {
  unfurnished: 'Unfurnished',
  'semi-furnished': 'Semi-furnished',
  'fully-furnished': 'Fully furnished',
};

interface ActiveChip {
  key: string;
  label: string;
  clear: () => void;
}

export function ListingFilters({
  colleges,
  filters,
  onFilterChange,
  onReset,
}: ListingFiltersProps) {
  const [campuses, setCampuses] = React.useState<Campus[]>([]);
  const [isLoadingCampuses, setIsLoadingCampuses] = React.useState(false);
  const [showMore, setShowMore] = React.useState(false);

  // Load campuses when selected college changes
  React.useEffect(() => {
    if (filters.collegeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoadingCampuses(true);
      fetchCampuses(filters.collegeId)
        .then((res) => setCampuses(res))
        .finally(() => setIsLoadingCampuses(false));
    } else {
      setCampuses([]);
    }
  }, [filters.collegeId]);

  const minRupees = paiseToRupees(filters.minRentPaise);
  const maxRupees = paiseToRupees(filters.maxRentPaise);

  // Every applied filter becomes a removable chip — active state is always
  // visible and reversible in one tap, instead of being buried in the panel.
  const primaryChips: ActiveChip[] = [];
  const college = colleges.find((c) => c.id === filters.collegeId);
  if (filters.query) {
    primaryChips.push({
      key: 'query',
      label: `“${filters.query}”`,
      clear: () => onFilterChange({ query: undefined }),
    });
  }
  if (college) {
    primaryChips.push({
      key: 'college',
      label: college.name,
      clear: () => onFilterChange({ collegeId: undefined, campusId: undefined }),
    });
  }
  const campus = campuses.find((c) => c.id === filters.campusId);
  if (campus) {
    primaryChips.push({
      key: 'campus',
      label: campus.name,
      clear: () => onFilterChange({ campusId: undefined }),
    });
  }
  if (filters.bedrooms) {
    primaryChips.push({
      key: 'bedrooms',
      label: `${filters.bedrooms} BHK`,
      clear: () => onFilterChange({ bedrooms: undefined }),
    });
  }

  const advancedChips: ActiveChip[] = [];
  if (minRupees !== undefined) {
    advancedChips.push({
      key: 'minRent',
      label: `Min ₹${minRupees.toLocaleString('en-IN')}`,
      clear: () => onFilterChange({ minRentPaise: undefined }),
    });
  }
  if (maxRupees !== undefined) {
    advancedChips.push({
      key: 'maxRent',
      label: `Max ₹${maxRupees.toLocaleString('en-IN')}`,
      clear: () => onFilterChange({ maxRentPaise: undefined }),
    });
  }
  if (filters.furnishing) {
    advancedChips.push({
      key: 'furnishing',
      label: FURNISHING_LABELS[filters.furnishing] ?? filters.furnishing,
      clear: () => onFilterChange({ furnishing: undefined }),
    });
  }
  if (filters.petFriendly === true) {
    advancedChips.push({
      key: 'petFriendly',
      label: 'Pet friendly',
      clear: () => onFilterChange({ petFriendly: undefined }),
    });
  }
  if (filters.radiusMeters) {
    advancedChips.push({
      key: 'radius',
      label: `Within ${filters.radiusMeters / 1000} km`,
      clear: () => onFilterChange({ radiusMeters: undefined }),
    });
  }
  if (filters.latitude !== undefined && filters.longitude !== undefined) {
    advancedChips.push({
      key: 'pin',
      label: 'Pin dropped',
      clear: () => onFilterChange({ latitude: undefined, longitude: undefined }),
    });
  }

  const chips = [...primaryChips, ...advancedChips];
  const advancedCount = advancedChips.length;
  // Active advanced filters must stay visible — collapsing never hides state.
  const showAdvanced = showMore || advancedCount > 0;

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
          <SlidersHorizontal className="size-4 text-primary" />
          <span>Search &amp; Filter Listings</span>
          {chips.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {chips.length} active
            </span>
          )}
        </div>
        {chips.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Clear all
          </Button>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              aria-label={`Remove filter: ${chip.label}`}
              className="group inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/15"
            >
              {chip.label}
              <X className="size-3 opacity-60 group-hover:opacity-100" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search Query */}
        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-keywords">
            Keywords
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              id="filter-keywords"
              type="text"
              placeholder="Area, title, property..."
              value={filters.query || ''}
              onChange={(e) => onFilterChange({ query: e.target.value })}
              className="pl-9"
            />
          </div>
        </div>

        {/* College Selector */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-college">
            College
          </label>
          <Select
            id="filter-college"
            value={filters.collegeId || ''}
            onChange={(e) => {
              onFilterChange({ collegeId: e.target.value, campusId: undefined });
            }}
          >
            <option value="">All Colleges</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Campus Selector */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-campus">
            Campus
          </label>
          <Select
            id="filter-campus"
            value={filters.campusId || ''}
            onChange={(e) => onFilterChange({ campusId: e.target.value })}
            disabled={!filters.collegeId || isLoadingCampuses}
          >
            <option value="">
              {isLoadingCampuses ? 'Loading campuses...' : 'All Campuses'}
            </option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Bedrooms */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-bhk">
            Bedrooms (BHK)
          </label>
          <Select
            id="filter-bhk"
            value={filters.bedrooms ? String(filters.bedrooms) : ''}
            onChange={(e) =>
              onFilterChange({
                bedrooms: e.target.value ? parseInt(e.target.value, 10) : undefined,
              })
            }
          >
            <option value="">Any BHK</option>
            <option value="1">1 BHK</option>
            <option value="2">2 BHK</option>
            <option value="3">3 BHK</option>
            <option value="4">4+ BHK</option>
          </Select>
        </div>
      </div>

      {/* Advanced filters — collapsed until asked for, auto-opened when active */}
      <div className="border-t border-border/40 pt-3">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showAdvanced}
          aria-controls="listing-advanced-filters"
          className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="flex items-center gap-1.5">
            More filters
            {advancedCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {advancedCount}
              </span>
            )}
          </span>
          <ChevronDown
            className={`size-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {showAdvanced && (
          <div id="listing-advanced-filters" className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              {/* Min Rent */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-min-rent">
                  Min Rent (₹/mo)
                </label>
                <Input
                  id="filter-min-rent"
                  type="number"
                  placeholder="e.g. 5000"
                  value={minRupees !== undefined ? minRupees : ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                    onFilterChange({
                      minRentPaise: val !== undefined ? val * 100 : undefined,
                    });
                  }}
                />
              </div>

              {/* Max Rent */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-max-rent">
                  Max Rent (₹/mo)
                </label>
                <Input
                  id="filter-max-rent"
                  type="number"
                  placeholder="e.g. 30000"
                  value={maxRupees !== undefined ? maxRupees : ''}
                  onChange={(e) => {
                    const val = e.target.value ? parseFloat(e.target.value) : undefined;
                    onFilterChange({
                      maxRentPaise: val !== undefined ? val * 100 : undefined,
                    });
                  }}
                />
              </div>

              {/* Furnishing */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-furnishing">
                  Furnishing
                </label>
                <Select
                  id="filter-furnishing"
                  value={filters.furnishing || ''}
                  onChange={(e) => onFilterChange({ furnishing: e.target.value || undefined })}
                >
                  <option value="">All Furnishing Types</option>
                  <option value="unfurnished">Unfurnished</option>
                  <option value="semi-furnished">Semi-Furnished</option>
                  <option value="fully-furnished">Fully Furnished</option>
                </Select>
              </div>

              {/* Pet Friendly */}
              <div className="space-y-1 flex items-end">
                <label className="flex min-h-9 items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filters.petFriendly === true}
                    onChange={(e) => onFilterChange({ petFriendly: e.target.checked || undefined })}
                    className="size-4 rounded border-border accent-primary"
                  />
                  <span className="text-xs font-medium text-muted-foreground">🐾 Pet Friendly Only</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Search Radius */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-radius">
                  Search Radius (km)
                </label>
                <Select
                  id="filter-radius"
                  value={filters.radiusMeters ? String(filters.radiusMeters) : ''}
                  onChange={(e) =>
                    onFilterChange({
                      radiusMeters: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                >
                  <option value="">Any Distance</option>
                  <option value="1000">Within 1 km</option>
                  <option value="2000">Within 2 km</option>
                  <option value="5000">Within 5 km</option>
                  <option value="10000">Within 10 km</option>
                </Select>
              </div>

              {/* Location Search + pin state */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-pin">
                  Location Pin
                </label>
                <LocationSearchField
                  placeholder="Search area to set map pin…"
                  onPlaceSelected={(place: PlaceResult) =>
                    onFilterChange({ latitude: place.latitude, longitude: place.longitude })
                  }
                />
                {filters.latitude !== undefined && filters.longitude !== undefined && (
                  <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      Pin dropped on the map
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => onFilterChange({ latitude: undefined, longitude: undefined })}
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
