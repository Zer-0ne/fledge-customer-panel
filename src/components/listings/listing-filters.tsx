'use client';

import * as React from 'react';
import { College, Campus, ListingFilterParams } from '@/types';
import { fetchCampuses } from '@/lib/api/services/discovery';
import { paiseToRupees } from '@/lib/listings/filters';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/ui/drawer';
import { Search, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
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

/**
 * Compact search bar + advanced filters in a sheet.
 *
 * Previously every control (keywords, college, campus, BHK, min/max rent,
 * furnishing, pets, radius, map pin, raw lat/long) sat permanently expanded in
 * three rows — a wall of inputs on a 360px phone. Baymard's filter research is
 * explicit here: keep the primary controls visible, move the rest behind an
 * explicit entry point and show the applied filters as removable chips.
 */
export function ListingFilters({ colleges, filters, onFilterChange, onReset }: ListingFiltersProps) {
  const [campuses, setCampuses] = React.useState<Campus[]>([]);
  const [isLoadingCampuses, setIsLoadingCampuses] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

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
  const collegeName = colleges.find((c) => c.id === filters.collegeId)?.name;
  const campusName = campuses.find((c) => c.id === filters.campusId)?.name;

  // Everything that lives in the sheet, surfaced as removable chips.
  const chips = React.useMemo(() => {
    const list: { key: keyof ListingFilterParams | 'rent'; label: string; clear: Partial<ListingFilterParams> }[] = [];
    if (filters.campusId) {
      list.push({ key: 'campusId', label: campusName ?? 'Campus', clear: { campusId: undefined } });
    }
    if (filters.bedrooms) {
      list.push({ key: 'bedrooms', label: `${filters.bedrooms} BHK`, clear: { bedrooms: undefined } });
    }
    if (minRupees !== undefined || maxRupees !== undefined) {
      const label =
        minRupees !== undefined && maxRupees !== undefined
          ? `₹${minRupees.toLocaleString('en-IN')}–₹${maxRupees.toLocaleString('en-IN')}`
          : maxRupees !== undefined
            ? `Under ₹${maxRupees.toLocaleString('en-IN')}`
            : `Over ₹${minRupees?.toLocaleString('en-IN')}`;
      list.push({ key: 'rent', label, clear: { minRentPaise: undefined, maxRentPaise: undefined } });
    }
    if (filters.furnishing) {
      list.push({
        key: 'furnishing',
        label: FURNISHING_LABELS[filters.furnishing] ?? filters.furnishing,
        clear: { furnishing: undefined },
      });
    }
    if (filters.petFriendly) {
      list.push({ key: 'petFriendly', label: 'Pet friendly', clear: { petFriendly: undefined } });
    }
    if (filters.radiusMeters) {
      list.push({
        key: 'radiusMeters',
        label: `Within ${filters.radiusMeters / 1000} km`,
        clear: { radiusMeters: undefined },
      });
    }
    if (filters.latitude && filters.longitude) {
      list.push({
        key: 'latitude',
        label: 'Map pin set',
        clear: { latitude: undefined, longitude: undefined },
      });
    }
    return list;
  }, [
    filters.campusId,
    filters.bedrooms,
    filters.furnishing,
    filters.latitude,
    filters.longitude,
    filters.petFriendly,
    filters.radiusMeters,
    minRupees,
    maxRupees,
    campusName,
  ]);

  const hasAnyFilter =
    chips.length > 0 || Boolean(filters.query) || Boolean(filters.collegeId);

  return (
    <div className="space-y-3">
      {/* Primary row — always visible, thumb sized */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            inputMode="search"
            aria-label="Search flats by area, title or property"
            placeholder="Area, landmark or project name…"
            value={filters.query || ''}
            onChange={(e) => onFilterChange({ query: e.target.value })}
            className="h-12 rounded-xl pl-10 text-base sm:h-11 sm:text-sm"
          />
        </div>

        <div className="relative sm:w-56">
          <Select
            aria-label="Filter by college"
            value={filters.collegeId || ''}
            onChange={(e) => onFilterChange({ collegeId: e.target.value, campusId: undefined })}
            className="h-12 rounded-xl sm:h-11"
          >
            <option value="">All colleges</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <Button
          type="button"
          variant={chips.length > 0 ? 'default' : 'outline'}
          onClick={() => setSheetOpen(true)}
          className="h-12 shrink-0 gap-2 rounded-xl px-4 text-sm sm:h-11"
          aria-expanded={sheetOpen}
        >
          <SlidersHorizontal className="size-4" />
          Filters
          {chips.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary-foreground/20 text-[11px] font-bold">
              {chips.length}
            </span>
          )}
        </Button>
      </div>

      {/* Applied filters as removable chips */}
      {(chips.length > 0 || filters.query || filters.collegeId) && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.query && (
            <FilterChip
              label={`“${filters.query}”`}
              onRemove={() => onFilterChange({ query: undefined })}
            />
          )}
          {filters.collegeId && (
            <FilterChip
              label={collegeName ?? 'College'}
              onRemove={() => onFilterChange({ collegeId: undefined, campusId: undefined })}
            />
          )}
          {chips.map((chip) => (
            <FilterChip
              key={String(chip.key)}
              label={chip.label}
              onRemove={() => onFilterChange(chip.clear)}
            />
          ))}
          {hasAnyFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
              Clear all
            </Button>
          )}
        </div>
      )}

      {/* Advanced filters */}
      <Drawer isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
        <div className="space-y-5 pb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Campus</label>
            <Select
              value={filters.campusId || ''}
              onChange={(e) => onFilterChange({ campusId: e.target.value })}
              disabled={!filters.collegeId || isLoadingCampuses}
              className="h-11"
            >
              <option value="">{isLoadingCampuses ? 'Loading campuses…' : 'All campuses'}</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {!filters.collegeId && (
              <p className="text-xs text-muted-foreground">Pick a college first to filter by campus.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Bedrooms</label>
            <Select
              value={filters.bedrooms ? String(filters.bedrooms) : ''}
              onChange={(e) =>
                onFilterChange({
                  bedrooms: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
              className="h-11"
            >
              <option value="">Any</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4+ BHK</option>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Monthly rent (₹)</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Min"
                aria-label="Minimum rent in rupees"
                value={minRupees !== undefined ? minRupees : ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : undefined;
                  onFilterChange({ minRentPaise: val !== undefined ? val * 100 : undefined });
                }}
                className="h-11"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Max"
                aria-label="Maximum rent in rupees"
                value={maxRupees !== undefined ? maxRupees : ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : undefined;
                  onFilterChange({ maxRentPaise: val !== undefined ? val * 100 : undefined });
                }}
                className="h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Furnishing</label>
            <Select
              value={filters.furnishing || ''}
              onChange={(e) => onFilterChange({ furnishing: e.target.value || undefined })}
              className="h-11"
            >
              <option value="">Any furnishing</option>
              <option value="unfurnished">Unfurnished</option>
              <option value="semi-furnished">Semi-furnished</option>
              <option value="fully-furnished">Fully furnished</option>
            </Select>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3">
            <input
              type="checkbox"
              checked={filters.petFriendly === true}
              onChange={(e) => onFilterChange({ petFriendly: e.target.checked || undefined })}
              className="size-4 rounded border-border accent-primary"
            />
            <span className="text-sm font-medium text-foreground">Pet friendly only</span>
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Distance from campus</label>
            <Select
              value={filters.radiusMeters ? String(filters.radiusMeters) : ''}
              onChange={(e) =>
                onFilterChange({
                  radiusMeters: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
              className="h-11"
            >
              <option value="">Any distance</option>
              <option value="1000">Within 1 km</option>
              <option value="2000">Within 2 km</option>
              <option value="5000">Within 5 km</option>
              <option value="10000">Within 10 km</option>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Where should we centre the map?</label>
            <LocationSearchField
              placeholder="Search an area or landmark…"
              onPlaceSelected={(place: PlaceResult) =>
                onFilterChange({ latitude: place.latitude, longitude: place.longitude })
              }
            />
            {filters.latitude && filters.longitude && (
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                <span className="text-xs font-medium text-primary">Map centred on your chosen area</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => onFilterChange({ latitude: undefined, longitude: undefined })}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="h-11 flex-1 rounded-xl" onClick={onReset}>
              Clear all
            </Button>
            <Button className="h-11 flex-1 rounded-xl" onClick={() => setSheetOpen(false)}>
              Show results
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="h-7 gap-1 rounded-full pr-1 pl-2.5 text-xs font-medium">
      <span className="max-w-40 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="flex size-5 items-center justify-center rounded-full transition-colors hover:bg-foreground/10"
      >
        <X className="size-3" />
      </button>
    </Badge>
  );
}
