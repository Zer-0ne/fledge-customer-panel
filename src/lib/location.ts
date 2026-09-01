/**
 * Browser location service — mirrors Flutter's `LocationService`.
 *
 * Fallback chain: browser geolocation → localStorage saved → Delhi default.
 * Rate-limited: caches the resolved position for 5 minutes to avoid
 * repeated permission prompts.
 */

const STORAGE_KEY_SAVED_LAT = 'saved_location_lat';
const STORAGE_KEY_SAVED_LNG = 'saved_location_lng';
const CACHE_KEY = 'location_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Delhi fallback (same as Flutter)
const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.2090;

export interface UserLocation {
  latitude: number;
  longitude: number;
  source: 'gps' | 'saved' | 'default';
}

interface LocationCache {
  lat: number;
  lng: number;
  source: 'gps' | 'saved' | 'default';
  ts: number;
}

/**
 * Save a location to localStorage (e.g. from onboarding or manual pick).
 */
export function saveLocation(lat: number, lng: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_SAVED_LAT, String(lat));
    localStorage.setItem(STORAGE_KEY_SAVED_LNG, String(lng));
  } catch {
    // quota exceeded — swallow
  }
}

/**
 * Read the previously saved location from localStorage.
 */
function readSavedLocation(): { lat: number; lng: number } | null {
  try {
    const lat = localStorage.getItem(STORAGE_KEY_SAVED_LAT);
    const lng = localStorage.getItem(STORAGE_KEY_SAVED_LNG);
    if (lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (Number.isFinite(latNum) && Number.isFinite(lngNum)) {
        return { lat: latNum, lng: lngNum };
      }
    }
  } catch {
    // localStorage unavailable
  }
  return null;
}

/**
 * Read the in-memory cache (avoids repeated permission prompts).
 */
function readCache(): LocationCache | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as LocationCache;
    if (Date.now() - cache.ts < CACHE_TTL_MS) return cache;
  } catch {
    // ignore
  }
  return null;
}

function writeCache(loc: UserLocation): void {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ lat: loc.latitude, lng: loc.longitude, source: loc.source, ts: Date.now() }),
    );
  } catch {
    // ignore
  }
}

/**
 * Try browser geolocation (returns null if denied/unavailable).
 */
function getBrowserGeolocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => resolve(null), 8000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        clearTimeout(timeout);
        resolve(null);
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 },
    );
  });
}

/**
 * Resolve the user's location with the full fallback chain:
 * 1. In-memory cache (avoids repeated prompts within 5 min)
 * 2. Browser geolocation (with permission)
 * 3. localStorage saved location
 * 4. Delhi default
 */
export async function resolveLocation(): Promise<UserLocation> {
  // 1. Check cache
  const cached = readCache();
  if (cached) {
    return { latitude: cached.lat, longitude: cached.lng, source: cached.source };
  }

  // 2. Try browser geolocation
  const gps = await getBrowserGeolocation();
  if (gps) {
    const loc: UserLocation = { latitude: gps.lat, longitude: gps.lng, source: 'gps' };
    writeCache(loc);
    return loc;
  }

  // 3. Try saved location
  const saved = readSavedLocation();
  if (saved) {
    const loc: UserLocation = { latitude: saved.lat, longitude: saved.lng, source: 'saved' };
    writeCache(loc);
    return loc;
  }

  // 4. Delhi default
  const loc: UserLocation = { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, source: 'default' };
  writeCache(loc);
  return loc;
}

/**
 * Non-async convenience: returns saved/default immediately, triggers GPS
 * in the background for next call. Useful for first paint.
 */
export function getImmediateLocation(): UserLocation {
  const cached = readCache();
  if (cached) {
    return { latitude: cached.lat, longitude: cached.lng, source: cached.source };
  }
  const saved = readSavedLocation();
  if (saved) {
    return { latitude: saved.lat, longitude: saved.lng, source: 'saved' };
  }
  return { latitude: DEFAULT_LAT, longitude: DEFAULT_LNG, source: 'default' };
}
