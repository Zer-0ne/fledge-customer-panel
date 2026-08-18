'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Moon, Sun, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

const TILE_LAYERS = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
} as const;

export type MapThemeMode = 'sync' | 'light' | 'dark';

function isDocumentDark(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

function resolveMapDark(mode: MapThemeMode): boolean {
  if (mode === 'sync') return isDocumentDark();
  return mode === 'dark';
}

function createBasemap(isDark: boolean): L.TileLayer {
  const config = isDark ? TILE_LAYERS.dark : TILE_LAYERS.light;
  return L.tileLayer(config.url, {
    attribution: config.attribution,
    maxZoom: 20,
    maxNativeZoom: 20,
    subdomains: 'abcd',
  });
}

export interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  interactive?: boolean;
  zoom?: number;
  title?: string;
  onChange?: (lat: number, lng: number) => void;
  className?: string;
  bounds?: [number, number, number, number] | null;
  viewKey?: number;
  showThemeToggle?: boolean;
}

export function LocationPickerMap({
  latitude,
  longitude,
  interactive = false,
  zoom = 16,
  title = 'Location',
  onChange,
  className = 'h-64 w-full rounded-lg overflow-hidden border border-border',
  bounds = null,
  viewKey = 0,
  showThemeToggle = true,
}: LocationPickerMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const leafletMapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const lastViewKeyRef = useRef<number>(-1);
  const onChangeRef = useRef(onChange);

  const [themeMode, setThemeMode] = useState<MapThemeMode>('sync');
  const [mapIsDark, setMapIsDark] = useState(() => resolveMapDark('sync'));
  const themeModeRef = useRef(themeMode);
  useEffect(() => {
    onChangeRef.current = onChange;
    themeModeRef.current = themeMode;
  }, [onChange, themeMode]);

  const applyBasemap = useCallback((isDark: boolean) => {
    const mapInstance = leafletMapInstanceRef.current;
    if (!mapInstance) return;
    const current = tileLayerRef.current;
    const next = createBasemap(isDark);
    if (current) mapInstance.removeLayer(current);
    next.addTo(mapInstance);
    next.bringToBack();
    tileLayerRef.current = next;
    setMapIsDark(isDark);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    if (leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current.remove();
    }

    const initialLat =
      Number.isFinite(latitude) && latitude !== 0 ? latitude : 28.6139;
    const initialLng =
      Number.isFinite(longitude) && longitude !== 0 ? longitude : 77.209;

    const map = L.map(mapRef.current, {
      center: [initialLat, initialLng],
      zoom,
      zoomControl: true,
      attributionControl: false,
      dragging: interactive,
      doubleClickZoom: interactive,
      scrollWheelZoom: true,
      boxZoom: interactive,
      keyboard: interactive,
      touchZoom: interactive,
      maxZoom: 20,
      minZoom: 3,
    });

    const initialDark = resolveMapDark(themeModeRef.current);
    const tiles = createBasemap(initialDark);
    tiles.addTo(map);
    tileLayerRef.current = tiles;
    setMapIsDark(initialDark);

    const marker = L.marker([initialLat, initialLng], {
      draggable: interactive,
    }).addTo(map);

    if (title) {
      marker.bindPopup(
        `<b>${title}</b><br/>Lat: ${initialLat.toFixed(5)}, Lng: ${initialLng.toFixed(5)}`
      );
    }

    if (interactive) {
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        onChangeRef.current?.(position.lat, position.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        marker.setPopupContent(
          `<b>Selected Location</b><br/>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`
        );
        onChangeRef.current?.(lat, lng);
      });
    }

    leafletMapInstanceRef.current = map;
    markerRef.current = marker;

    const invalidate = () => map.invalidateSize({ animate: false });
    const raf = requestAnimationFrame(invalidate);
    const t1 = window.setTimeout(invalidate, 100);
    const t2 = window.setTimeout(invalidate, 350);

    let lastAppDark = isDocumentDark();
    const themeObserver = new MutationObserver(() => {
      const nextAppDark = isDocumentDark();
      if (nextAppDark === lastAppDark) return;
      lastAppDark = nextAppDark;
      setThemeMode('sync');
      applyBasemap(nextAppDark);
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      themeObserver.disconnect();
      map.remove();
      leafletMapInstanceRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map init once; lat/lng/zoom/bounds handled below
  }, [interactive, applyBasemap]);

  useEffect(() => {
    const map = leafletMapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    const validLat = Number.isFinite(latitude) ? latitude : 28.6139;
    const validLng = Number.isFinite(longitude) ? longitude : 77.209;

    const currentPos = marker.getLatLng();
    if (
      Math.abs(currentPos.lat - validLat) > 0.00001 ||
      Math.abs(currentPos.lng - validLng) > 0.00001
    ) {
      marker.setLatLng([validLat, validLng]);
    }

    if (title) {
      marker.setPopupContent(
        `<b>${title}</b><br/>Lat: ${validLat.toFixed(5)}, Lng: ${validLng.toFixed(5)}`
      );
    }
  }, [latitude, longitude, title]);

  useEffect(() => {
    const map = leafletMapInstanceRef.current;
    if (!map) return;
    if (viewKey === lastViewKeyRef.current) return;
    lastViewKeyRef.current = viewKey;

    const validLat = Number.isFinite(latitude) ? latitude : 28.6139;
    const validLng = Number.isFinite(longitude) ? longitude : 77.209;

    map.invalidateSize({ animate: false });

    if (bounds && bounds.length === 4) {
      const [south, north, west, east] = bounds;
      if (
        [south, north, west, east].every(Number.isFinite) &&
        south < north &&
        west < east
      ) {
        map.fitBounds(
          [
            [south, west],
            [north, east],
          ],
          { padding: [28, 28], maxZoom: 18, animate: true }
        );
        return;
      }
    }

    map.flyTo([validLat, validLng], zoom, {
      duration: 0.65,
      easeLinearity: 0.25,
    });
  }, [viewKey, bounds, zoom, latitude, longitude]);

  const toggleMapTheme = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextDark = !mapIsDark;
    setThemeMode(nextDark ? 'dark' : 'light');
    applyBasemap(nextDark);
  };

  const resyncWithAppTheme = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setThemeMode('sync');
    applyBasemap(isDocumentDark());
  };

  const isSynced = themeMode === 'sync';

  return (
    <div className={cn('relative', className)}>
      <div ref={mapRef} className="absolute inset-0 h-full w-full" />

      {showThemeToggle && (
        <div className="absolute top-2 right-2 z-[1000] flex items-center gap-1 rounded-md border border-border bg-background/90 p-0.5 shadow-sm backdrop-blur-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7"
            onClick={toggleMapTheme}
            title={mapIsDark ? 'Switch map to light' : 'Switch map to dark'}
            aria-label={mapIsDark ? 'Switch map to light' : 'Switch map to dark'}
          >
            {mapIsDark ? (
              <Sun className="size-3.5 text-amber-400" />
            ) : (
              <Moon className="size-3.5 text-muted-foreground" />
            )}
          </Button>
          {!isSynced && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-7"
              onClick={resyncWithAppTheme}
              title="Sync map with app theme"
              aria-label="Sync map with app theme"
            >
              <RefreshCw className="size-3.5 text-primary" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
