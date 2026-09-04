'use client';

import * as React from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Listing } from '@/types';
import { formatPaiseToINR } from '@/lib/formatting';
import { useTheme } from '@/components/providers/theme-provider';
import { Navigation, Compass, ZoomIn, ZoomOut, ExternalLink, Bed, AlertCircle, MapPin } from 'lucide-react';

export interface LeafletMapInnerProps {
  listings?: Listing[];
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
  selectedListingId?: string;
  onSelectListing?: (listingId: string | null) => void;
  onLocationSelect?: (lat: number, lng: number) => void;
  interactive?: boolean;
  title?: string;
  className?: string;
  heightClass?: string;
}

type TileProvider = 'osm' | 'cartoLight' | 'cartoDark';

const MAX_ZOOM = 19;
const MIN_ZOOM = 3;
const DEFAULT_ZOOM = 16;

/** Fly / pan when center props change — keeps the user's current zoom unless a target zoom is passed. */
function MapCenterController({
  lat,
  lng,
  targetZoom,
}: {
  lat: number;
  lng: number;
  targetZoom?: number | null;
}) {
  const map = useMap();
  const prevCenter = React.useRef({ lat, lng });

  React.useEffect(() => {
    const latChanged = Math.abs(prevCenter.current.lat - lat) > 1e-6;
    const lngChanged = Math.abs(prevCenter.current.lng - lng) > 1e-6;

    if (latChanged || lngChanged) {
      const zoom = targetZoom ?? Math.max(map.getZoom(), DEFAULT_ZOOM);
      map.flyTo([lat, lng], zoom, { animate: true, duration: 0.6 });
      prevCenter.current = { lat, lng };
    } else if (typeof targetZoom === 'number' && map.getZoom() !== targetZoom) {
      map.setZoom(targetZoom);
    }
  }, [map, lat, lng, targetZoom]);

  return null;
}

function LocationPickerEvents({
  onLocationSelect,
}: {
  onLocationSelect?: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
      }
    },
  });
  return null;
}

/** Capture Leaflet map instance for overlay controls outside MapContainer. */
function MapInstanceBridge({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  React.useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

export function LeafletMapInner({
  listings = [],
  centerLat = 28.689,
  centerLng = 77.2105,
  radiusMeters,
  selectedListingId,
  onSelectListing,
  onLocationSelect,
  interactive = true,
  title,
  className = '',
  heightClass = 'h-[450px]',
}: LeafletMapInnerProps) {
  const { resolvedTheme } = useTheme();
  const [flyZoom, setFlyZoom] = React.useState<number | null>(null);
  const [userGeo, setUserGeo] = React.useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = React.useState<string | null>(null);
  const [tileOverride, setTileOverride] = React.useState<TileProvider | null>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const lastThemeRef = React.useRef(resolvedTheme);

  const handleMapReady = React.useCallback((map: L.Map) => {
    mapRef.current = map;
  }, []);

  // When app theme changes, drop manual override so map stays in sync
  React.useEffect(() => {
    if (lastThemeRef.current !== resolvedTheme) {
      lastThemeRef.current = resolvedTheme;
      setTileOverride(null);
    }
  }, [resolvedTheme]);

  const themeTile: TileProvider = resolvedTheme === 'dark' ? 'cartoDark' : 'osm';
  const tileProvider = tileOverride ?? themeTile;

  const tileUrls = {
    osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    cartoLight: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    cartoDark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  } as const;

  const tileAttributions = {
    osm: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    cartoLight: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
    cartoDark: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap',
  } as const;

  const createPriceIcon = (pricePaise: number, isSelected: boolean) => {
    const priceText = formatPaiseToINR(pricePaise);
    return L.divIcon({
      className: 'leaflet-price-pin',
      html: `
        <div class="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold shadow-lg transition-transform hover:scale-110 cursor-pointer ${
          isSelected
            ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background scale-110'
            : 'bg-card text-foreground border border-border'
        }" style="background-color: ${isSelected ? 'hsl(var(--primary, 221.2 83.2% 53.3%))' : '#ffffff'}; color: ${isSelected ? '#ffffff' : '#0f172a'}; border: 1px solid #e2e8f0; border-radius: 9999px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: ${isSelected ? '#ffffff' : 'hsl(var(--primary, 221.2 83.2% 53.3%))'}"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          <span>${priceText}</span>
        </div>
      `,
      iconSize: [80, 32],
      iconAnchor: [40, 16],
    });
  };

  const createCenterIcon = () => {
    return L.divIcon({
      className: 'leaflet-center-pin',
      html: `
        <div class="relative flex items-center justify-center">
          <span class="absolute size-6 rounded-full bg-primary/40 animate-ping"></span>
          <div class="size-4 rounded-full bg-primary border-2 border-white shadow-md"></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const createUserIcon = () => {
    return L.divIcon({
      className: 'leaflet-user-pin',
      html: `
        <div class="flex items-center justify-center size-7 rounded-full bg-blue-500/30 border-2 border-blue-600 shadow">
          <div class="size-3 rounded-full bg-blue-600"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser');
      return;
    }
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserGeo({ lat, lng });
        setFlyZoom(18);
        mapRef.current?.flyTo([lat, lng], 18, { animate: true, duration: 0.8 });
        if (onLocationSelect) {
          onLocationSelect(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
        }
      },
      (err) => {
        setGeoError(err.message || 'Unable to retrieve location');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Clear one-shot fly zoom after it has been applied via center change
  React.useEffect(() => {
    if (flyZoom == null) return;
    const t = window.setTimeout(() => setFlyZoom(null), 700);
    return () => window.clearTimeout(t);
  }, [flyZoom, centerLat, centerLng]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm isolate z-0 ${className}`}>
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Compass className="size-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            {title || 'OpenStreetMap Discovery'}
          </h3>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {listings.length} {listings.length === 1 ? 'Property' : 'Properties'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleLocateUser}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title="Use Current Location"
          >
            <Navigation className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Near Me</span>
          </button>

          <div
            className="flex rounded-lg border border-border bg-background p-0.5"
            title="Map style follows app theme; click to override"
          >
            {(
              [
                { id: 'osm' as const, label: 'OSM' },
                { id: 'cartoLight' as const, label: 'Light' },
                { id: 'cartoDark' as const, label: 'Dark' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTileOverride(option.id)}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                  tileProvider === option.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`relative w-full ${heightClass} overflow-hidden isolate z-0`}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={DEFAULT_ZOOM}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          scrollWheelZoom={true}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full isolate z-0"
        >
          <MapInstanceBridge onReady={handleMapReady} />
          <MapCenterController lat={centerLat} lng={centerLng} targetZoom={flyZoom} />
          {interactive && <LocationPickerEvents onLocationSelect={onLocationSelect} />}

          <TileLayer
            key={tileProvider}
            url={tileUrls[tileProvider]}
            attribution={tileAttributions[tileProvider]}
            maxZoom={MAX_ZOOM}
            maxNativeZoom={19}
            className={tileProvider === 'osm' && resolvedTheme === 'dark' ? 'osm-dark-filter' : ''}
          />

          <Marker position={[centerLat, centerLng]} icon={createCenterIcon()} />

          {radiusMeters && (
            <Circle
              center={[centerLat, centerLng]}
              radius={radiusMeters}
              pathOptions={{
                color: 'hsl(var(--primary, 221.2 83.2% 53.3%))',
                fillColor: 'hsl(var(--primary, 221.2 83.2% 53.3%))',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '6, 6',
              }}
            />
          )}

          {userGeo && (
            <Marker position={[userGeo.lat, userGeo.lng]} icon={createUserIcon()} />
          )}

          {listings.map((listing) => {
            const lat = Number(
              listing.property?.approximateLocation?.latitude ??
              listing.property?.address?.latitude ??
              centerLat
            );
            const lng = Number(
              listing.property?.approximateLocation?.longitude ??
              listing.property?.address?.longitude ??
              centerLng
            );
            const isSelected = listing.id === selectedListingId;

            return (
              <Marker
                key={listing.id}
                position={[lat, lng]}
                icon={createPriceIcon(listing.monthlyRentPaise, isSelected)}
                eventHandlers={{
                  click: () => {
                    if (onSelectListing) onSelectListing(listing.id);
                  },
                }}
              >
                <Popup className="leaflet-custom-popup">
                  <div className="p-1 min-w-[220px]">
                    <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {listing.property?.type || 'Rental Flat'}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1 mt-1">
                      {listing.title || listing.property?.name}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {listing.property?.city} {listing.campusName ? `• ${listing.campusName}` : ''}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between border-t border-slate-200 pt-2 text-xs text-slate-600">
                      <span className="flex items-center gap-1 font-medium">
                        <Bed className="size-3.5 text-primary" />
                        {listing.bedrooms} BHK
                      </span>
                      <span className="font-extrabold text-primary text-sm">
                        {formatPaiseToINR(listing.monthlyRentPaise)}/mo
                      </span>
                    </div>

                    <Link
                      href={`/listings/${listing.id}`}
                      className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
                    >
                      View Flat
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="absolute right-3 top-3 z-[400] flex flex-col gap-1 rounded-lg border border-border bg-card/90 p-1 shadow-md backdrop-blur">
          <button
            type="button"
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              map.setZoom(Math.min(MAX_ZOOM, map.getZoom() + 1));
            }}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="size-4" />
          </button>
          <div className="h-px bg-border my-0.5" />
          <button
            type="button"
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              map.setZoom(Math.max(MIN_ZOOM, map.getZoom() - 1));
            }}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="size-4" />
          </button>
        </div>

        {interactive && onLocationSelect && (
          <div className="absolute top-3 left-3 z-[400] hidden sm:flex items-center gap-1.5 rounded-lg border border-border/80 bg-card/90 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur shadow-sm">
            <MapPin className="size-3 text-primary" />
            Click anywhere on the map to set radius center
          </div>
        )}

        {geoError && (
          <div className="absolute top-3 left-3 right-12 z-[500] flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/90 text-destructive-foreground px-3 py-1.5 text-xs shadow-lg backdrop-blur">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{geoError}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-primary" /> Center: {centerLat.toFixed(5)},{' '}
            {centerLng.toFixed(5)}
          </span>
          {radiusMeters && (
            <span className="flex items-center gap-1">Radius: {(radiusMeters / 1000).toFixed(1)} km</span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground/70">Map data © Fledge</div>
      </div>
    </div>
  );
}
