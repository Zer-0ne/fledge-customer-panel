'use client';

import * as React from 'react';
import { College, Campus, ListingFilterParams } from '@/types';
import { fetchCampuses } from '@/lib/api/services/discovery';
import { paiseToRupees } from '@/lib/listings/filters';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { LocationSearchField, type PlaceResult } from '@/components/ui/location-search-field';

export interface ListingFiltersProps {
  colleges: College[];
  filters: ListingFilterParams;
  onFilterChange: (filters: Partial<ListingFilterParams>) => void;
  onReset: () => void;
}

export function ListingFilters({
  colleges,
  filters,
  onFilterChange,
  onReset,
}: ListingFiltersProps) {
  const [campuses, setCampuses] = React.useState<Campus[]>([]);
  const [isLoadingCampuses, setIsLoadingCampuses] = React.useState(false);

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

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
          <SlidersHorizontal className="size-4 text-primary" />
          <span>Search & Filter Listings</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
          Reset Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search Query */}
        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-medium text-muted-foreground">Keywords</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
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
          <label className="text-xs font-medium text-muted-foreground">College</label>
          <Select
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
          <label className="text-xs font-medium text-muted-foreground">Campus</label>
          <Select
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
          <label className="text-xs font-medium text-muted-foreground">Bedrooms (BHK)</label>
          <Select
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

      {/* Expanded Filter Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 border-t border-border/40 pt-3">
        {/* Min Rent */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Min Rent (₹/mo)</label>
          <Input
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
          <label className="text-xs font-medium text-muted-foreground">Max Rent (₹/mo)</label>
          <Input
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
          <label className="text-xs font-medium text-muted-foreground">Furnishing</label>
          <Select
            value={filters.furnishing || ''}
            onChange={(e) => onFilterChange({ furnishing: e.target.value || undefined })}
          >
            <option value="">All Furnishing Types</option>
            <option value="unfurnished">Unfurnished</option>
            <option value="semi-furnished">Semi-Furnished</option>
            <option value="fully-furnished">Fully Furnished</option>
          </Select>
        </div>
      </div>

      {/* Geo Radius Filter Row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 border-t border-border/40 pt-3">
        {/* Search Radius */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Search Radius (km)</label>
          <Select
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

        {/* Location Search + Coordinates Status */}
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-medium text-muted-foreground">Location Pin</label>
          <LocationSearchField
            placeholder="Search area to set map pin…"
            onPlaceSelected={(place: PlaceResult) =>
              onFilterChange({ latitude: place.latitude, longitude: place.longitude })
            }
          />
          {filters.latitude && filters.longitude && (
            <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-[10px]">
              <span className="font-mono text-primary/70">
                {filters.latitude.toFixed(4)}, {filters.longitude.toFixed(4)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                onClick={() => onFilterChange({ latitude: undefined, longitude: undefined })}
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
