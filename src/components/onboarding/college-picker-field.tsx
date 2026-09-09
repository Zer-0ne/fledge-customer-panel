'use client';

/**
 * College onboarding control — mirrors Flutter's `_CollegePickerField`.
 *
 * The student picks their college on a map (Leaflet + Nominatim search +
 * "use my location"). Stores structured `{name, latitude, longitude}` so the
 * backend (and /search) can use it as the radius anchor for nearby matches.
 */

import * as React from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Loader2, Edit3, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveLocation, type UserLocation } from '@/lib/location';
import { LocationSearchField, type PlaceResult } from '@/components/ui/location-search-field';
import type { OnboardingLocationAnswer } from '@/types';
import { cn } from '@/lib/utils';

const LocationMap = dynamic(
  () => import('@/components/map/location-map').then((m) => m.LocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 w-full animate-pulse rounded-2xl border bg-muted/40" />
    ),
  }
);

export type CollegeAnswer = OnboardingLocationAnswer;

export interface CollegePickerFieldProps {
  /** Current answer — string (legacy free-text) or structured `CollegeAnswer`. */
  value?: string | CollegeAnswer | null;
  /** Called whenever the user confirms a location. */
  onChange: (value: CollegeAnswer) => void;
}

function coerceValue(v: unknown): CollegeAnswer | null {
  if (!v) return null;
  if (typeof v === 'string' && v.trim().length > 0) {
    return { name: v, latitude: NaN, longitude: NaN };
  }
  if (typeof v === 'object' && v !== null) {
    const obj = v as Record<string, unknown>;
    const lat = Number(obj.latitude ?? obj.lat);
    const lng = Number(obj.longitude ?? obj.lng);
    const name = typeof obj.name === 'string' ? obj.name : '';
    if (name && Number.isFinite(lat) && Number.isFinite(lng)) {
      return { name, latitude: lat, longitude: lng };
    }
  }
  return null;
}

export function CollegePickerField({ value, onChange }: CollegePickerFieldProps) {
  const [picked, setPicked] = React.useState<CollegeAnswer | null>(() => coerceValue(value));
  const [center, setCenter] = React.useState<{ lat: number; lng: number } | null>(() => {
    const c = coerceValue(value);
    return c && Number.isFinite(c.latitude) ? { lat: c.latitude, lng: c.longitude } : null;
  });
  const [locating, setLocating] = React.useState(false);

  const handlePlace = (place: PlaceResult) => {
    const next: CollegeAnswer = {
      name: place.displayName.split(',').slice(0, 2).join(', ').trim() || place.displayName,
      latitude: place.latitude,
      longitude: place.longitude,
    };
    setPicked(next);
    setCenter({ lat: place.latitude, lng: place.longitude });
    onChange(next);
  };

  const handleUseCurrent = async () => {
    setLocating(true);
    try {
      const loc: UserLocation = await resolveLocation();
      const next: CollegeAnswer = {
        name: loc.source === 'gps' ? 'Current location' : 'Selected on map',
        latitude: loc.latitude,
        longitude: loc.longitude,
      };
      setPicked(next);
      setCenter({ lat: loc.latitude, lng: loc.longitude });
      onChange(next);
    } finally {
      setLocating(false);
    }
  };

  const handleMapPick = (lat: number, lng: number) => {
    setCenter({ lat, lng });
    setPicked((prev) => ({
      name: prev?.name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      latitude: lat,
      longitude: lng,
    }));
  };

  const hasCoords = picked && Number.isFinite(picked.latitude);

  return (
    <div className="space-y-3">
      <LocationSearchField
        placeholder="Search your college…"
        onPlaceSelected={handlePlace}
      />

      {hasCoords ? (
        <div
          className={cn(
            'flex items-center justify-between gap-2 rounded-2xl border px-3 py-2',
            'border-primary/40 bg-primary/[0.06]'
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">
                {picked!.name}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {picked!.latitude.toFixed(4)}, {picked!.longitude.toFixed(4)}
              </div>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPicked(null);
              setCenter(null);
            }}
            aria-label="Clear picked location"
            className="size-7 p-0"
          >
            <Edit3 className="size-3.5" />
          </Button>
        </div>
      ) : null}

      <LocationMap
        centerLat={center?.lat ?? 28.6139}
        centerLng={center?.lng ?? 77.2090}
        radiusMeters={3000}
        heightClass="h-56"
        interactive
        onLocationSelect={handleMapPick}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleUseCurrent}
        disabled={locating}
        className="w-full gap-2"
      >
        {locating ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Crosshair className="size-3.5" />
        )}
        Use my current location
      </Button>
    </div>
  );
}
