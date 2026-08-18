'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, Loader2, MapPin, Compass, X, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatFullAddress } from '@/lib/geocode/mapping';

export { formatFullAddress };

const DynamicLocationPickerMap = dynamic(
  () => import('./location-picker-map').then((mod) => mod.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full flex flex-col items-center justify-center rounded-lg border border-border bg-muted/20 text-muted-foreground animate-pulse gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-xs">Loading map…</span>
      </div>
    ),
  }
);

export interface PlaceSuggestion {
  id: string;
  lat: number;
  lng: number;
  primary: string;
  secondary: string;
  displayName: string;
  type?: string;
  class?: string;
  boundingbox?: string[];
}

function zoomForPlace(result: { type?: string; class?: string }): number {
  const type = (result.type || '').toLowerCase();
  const placeClass = (result.class || '').toLowerCase();
  if (['house', 'building', 'address'].includes(type) || placeClass === 'building') return 18;
  if (['residential', 'neighbourhood', 'neighborhood', 'suburb', 'quarter', 'colony'].includes(type)) {
    return 17;
  }
  if (placeClass === 'highway' || type === 'road' || type === 'pedestrian') return 17;
  if (['campus', 'university', 'college', 'school', 'amenity'].includes(type)) return 16;
  if (['city', 'town', 'municipality'].includes(type)) return 12;
  if (['state', 'region'].includes(type)) return 8;
  return 16;
}

function parseNominatimBounds(
  boundingbox?: string[]
): [number, number, number, number] | null {
  if (!boundingbox || boundingbox.length !== 4) return null;
  const [south, north, west, east] = boundingbox.map(Number);
  if (![south, north, west, east].every(Number.isFinite)) return null;
  if (south >= north || west >= east) return null;
  return [south, north, west, east];
}

async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({ q: trimmed });
  const res = await fetch(`/api/geocode/search?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) throw new Error('Place search failed');

  const data = await res.json();
  const rawPlaces = Array.isArray(data?.places) ? data.places : [];

  const places: PlaceSuggestion[] = [];
  for (let index = 0; index < rawPlaces.length; index++) {
    const item = rawPlaces[index] as Record<string, unknown>;
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const displayName = String(item.displayName || '');
    places.push({
      id: String(item.id ?? `${lat},${lng},${index}`),
      lat,
      lng,
      primary: String(item.primary || displayName),
      secondary: String(item.secondary || ''),
      displayName,
      type: typeof item.type === 'string' ? item.type : undefined,
      class: typeof item.class === 'string' ? item.class : undefined,
      boundingbox: Array.isArray(item.boundingbox) ? item.boundingbox.map(String) : undefined,
    });
  }
  return places;
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
    });
    const res = await fetch(`/api/geocode/reverse?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.displayName === 'string' ? data.displayName : null;
  } catch {
    return null;
  }
}

export interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  onAddressChange?: (addressText: string) => void;
  title?: string;
  className?: string;
  initialQuery?: string;
}

export function LocationPicker({
  latitude,
  longitude,
  onLocationChange,
  onAddressChange,
  title = 'Location',
  className,
  initialQuery = '',
}: LocationPickerProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(
    initialQuery.trim() ? initialQuery : null
  );
  const [mapZoom, setMapZoom] = useState(16);
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null);
  const [viewKey, setViewKey] = useState(0);

  const applyPlace = useCallback(
    (place: PlaceSuggestion) => {
      setQuery(place.displayName);
      setSelectedAddress(place.displayName);
      setSuggestions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      setSearchError(null);
      setMapZoom(zoomForPlace(place));
      setMapBounds(parseNominatimBounds(place.boundingbox));
      setViewKey((k) => k + 1);
      onLocationChange(place.lat, place.lng);
      onAddressChange?.(place.displayName);
    },
    [onLocationChange, onAddressChange]
  );

  const runSearch = useCallback(async (value: string, { openList }: { openList: boolean }) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const trimmed = value.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const places = await searchPlaces(trimmed, controller.signal);
      if (controller.signal.aborted) return;

      setSuggestions(places);
      setActiveIndex(places.length > 0 ? 0 : -1);
      if (openList) setIsOpen(places.length > 0);

      if (places.length === 0) {
        setSearchError('No places found. Try a fuller address, or place the pin on the map.');
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      setSuggestions([]);
      setSearchError('Search failed. Check your connection or pick on the map.');
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  }, []);

  const scheduleAutocomplete = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void runSearch(value, { openList: true });
      }, 400);
    },
    [runSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedAddress(null);
    setSearchError(null);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    scheduleAutocomplete(value);
  };

  const handleSubmitSearch = async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) return;

    if (isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
      applyPlace(suggestions[activeIndex]);
      return;
    }

    setIsSearching(true);
    try {
      const places = await searchPlaces(query);
      if (places.length === 0) {
        setSuggestions([]);
        setIsOpen(false);
        setSearchError('Address not found. Paste the full address like Google Maps, or drag the pin.');
        return;
      }
      applyPlace(places[0]);
      if (places.length > 1) {
        setSuggestions(places);
      }
    } catch {
      setSearchError('Search failed. Try again or pick on the map.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleMarkerChange = async (lat: number, lng: number) => {
    onLocationChange(lat, lng);
    const label = await reverseGeocode(lat, lng);
    if (label) {
      setSelectedAddress(label);
      setQuery(label);
      onAddressChange?.(label);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedAddress(null);
    setSearchError(null);
    setActiveIndex(-1);
  };

  return (
    <div className="space-y-3">
      <div ref={containerRef} className="relative">
        <div
          className={cn(
            'flex items-center gap-1 rounded-xl border bg-background shadow-sm transition-shadow',
            isOpen && suggestions.length > 0
              ? 'border-primary/40 shadow-md ring-2 ring-primary/15'
              : 'border-border'
          )}
        >
          <div className="pl-3 text-muted-foreground">
            {isSearching ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Search className="size-4" />
            )}
          </div>
          <Input
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
            }
            placeholder="Search full address like Google Maps (street, area, city, PIN)…"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!isOpen && suggestions.length > 0) setIsOpen(true);
                setActiveIndex((i) =>
                  suggestions.length === 0 ? -1 : Math.min(i + 1, suggestions.length - 1)
                );
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                void handleSubmitSearch();
              } else if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
            className="border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-11 text-sm bg-transparent"
          />
          {query ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 mr-0.5 text-muted-foreground"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            className="h-9 mr-1.5 rounded-lg text-xs gap-1.5 shrink-0"
            disabled={isSearching || !query.trim()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleSubmitSearch();
            }}
          >
            <Navigation className="size-3.5" />
            Search
          </Button>
        </div>

        {isOpen && suggestions.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-[9999] mt-1.5 w-full max-h-64 overflow-y-auto rounded-xl border border-border bg-background shadow-lg"
          >
            {suggestions.map((place, index) => (
              <li key={place.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  id={`${listboxId}-option-${index}`}
                  className={cn(
                    'w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                    index === activeIndex ? 'bg-primary/10' : 'hover:bg-muted/60'
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => applyPlace(place)}
                >
                  <MapPin className="size-4 mt-0.5 text-primary shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground truncate">
                      {place.primary}
                    </span>
                    {place.secondary ? (
                      <span className="block text-[0.75rem] text-muted-foreground leading-snug">
                        {place.secondary}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[0.7rem] text-muted-foreground">
        Type or paste a full address the way you would in Google Maps. Suggestions appear as you type —
        pick one, or press Search / Enter.
      </p>

      {searchError && (
        <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
          {searchError}
        </div>
      )}

      {selectedAddress && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
          <MapPin className="size-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400/80">
              Selected place
            </p>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              {selectedAddress}
            </p>
          </div>
        </div>
      )}

      <DynamicLocationPickerMap
        latitude={latitude}
        longitude={longitude}
        interactive={true}
        zoom={mapZoom}
        bounds={mapBounds}
        viewKey={viewKey}
        onChange={(lat, lng) => {
          void handleMarkerChange(lat, lng);
        }}
        title={title}
        className={className}
      />

      <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2">
        <span className="flex items-center gap-1 min-w-0">
          <Compass className="size-3 text-primary shrink-0" />
          <span className="truncate">Drag the pin to fine-tune · address updates automatically</span>
        </span>
        <span className="font-mono shrink-0">
          Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
        </span>
      </div>
    </div>
  );
}
