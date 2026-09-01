'use client';

/**
 * Location search autocomplete field — mirrors Flutter's `LocationSearchField`.
 *
 * Uses the BFF `/api/geocode/search` endpoint (Photon + Nominatim fallback).
 * Debounced at 400ms, minimum 2 characters, dropdown with place results.
 */

import * as React from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlaceResult {
  latitude: number;
  longitude: number;
  displayName: string;
  /** Short label (first 2 comma-separated parts). */
  shortLabel: string;
}

interface LocationSearchFieldProps {
  /** Initial text to show in the input. */
  defaultValue?: string;
  /** Called when a place is selected from the dropdown. */
  onPlaceSelected: (place: PlaceResult) => void;
  /** Placeholder text. */
  placeholder?: string;
  /** Additional CSS classes. */
  className?: string;
}

/**
 * Normalize a raw geocode API response into PlaceResult[].
 */
function normalizePlaces(raw: unknown): PlaceResult[] {
  if (!raw || typeof raw !== 'object') return [];
  const data = raw as Record<string, unknown>;
  const places = data.places;
  if (!Array.isArray(places)) return [];

  return places
    .filter((p): p is Record<string, unknown> => typeof p === 'object' && p !== null)
    .map((p) => {
      const lat = typeof p.latitude === 'number' ? p.latitude : parseFloat(String(p.latitude ?? '0'));
      const lng = typeof p.longitude === 'number' ? p.longitude : parseFloat(String(p.longitude ?? '0'));
      const displayName = String(p.displayName ?? p.display_name ?? '');
      const shortLabel = displayName
        .split(',')
        .slice(0, 2)
        .join(',')
        .trim();
      return { latitude: lat, longitude: lng, displayName, shortLabel };
    })
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
}

export function LocationSearchField({
  defaultValue = '',
  onPlaceSelected,
  placeholder = 'Search city or area…',
  className,
}: LocationSearchFieldProps) {
  const [query, setQuery] = React.useState(defaultValue);
  const [results, setResults] = React.useState<PlaceResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleChange(value: string) {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(value.trim())}`);
        const data = await res.json();
        const places = normalizePlaces(data);
        setResults(places);
        setOpen(places.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function handleSelect(place: PlaceResult) {
    setQuery(place.shortLabel);
    setResults([]);
    setOpen(false);
    onPlaceSelected(place);
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-9',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20',
            'transition-colors',
          )}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <X className="size-4" />
            )}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {results.map((place, i) => (
            <button
              key={`${place.latitude}-${place.longitude}-${i}`}
              type="button"
              onClick={() => handleSelect(place)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors"
            >
              <MapPin className="size-4 shrink-0 text-primary/60" />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{place.shortLabel}</p>
                <p className="truncate text-xs text-muted-foreground">{place.displayName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
