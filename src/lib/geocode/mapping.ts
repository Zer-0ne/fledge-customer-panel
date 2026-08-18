export type PlaceDto = {
  id: string;
  lat: number;
  lng: number;
  primary: string;
  secondary: string;
  displayName: string;
  type?: string;
  class?: string;
  boundingbox?: string[];
};

export function splitDisplayName(displayName: string): { primary: string; secondary: string } {
  const parts = displayName.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return { primary: displayName, secondary: '' };
  return { primary: parts[0], secondary: parts.slice(1).join(', ') };
}

export function photonDisplayName(props: Record<string, unknown>): string {
  const bits = [
    props.name,
    props.housenumber && props.street
      ? `${props.housenumber} ${props.street}`
      : props.street,
    props.district,
    props.city || props.county,
    props.state,
    props.postcode,
    props.country,
  ]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);

  const unique: string[] = [];
  for (const bit of bits) {
    if (unique[unique.length - 1]?.toLowerCase() !== bit.toLowerCase()) {
      unique.push(bit);
    }
  }
  return unique.join(', ');
}

export function fromPhoton(data: unknown): PlaceDto[] {
  if (!data || typeof data !== 'object') return [];
  const features = (data as { features?: unknown[] }).features;
  if (!Array.isArray(features)) return [];

  const places: PlaceDto[] = [];
  for (let i = 0; i < features.length; i++) {
    const feature = features[i] as {
      geometry?: { coordinates?: number[] };
      properties?: Record<string, unknown>;
    };
    const coords = feature.geometry?.coordinates;
    const props = feature.properties || {};
    if (!Array.isArray(coords) || coords.length < 2) continue;

    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const countryCode = String(props.countrycode || '').toUpperCase();
    if (countryCode && countryCode !== 'IN') continue;

    const displayName = photonDisplayName(props) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const { primary, secondary } = splitDisplayName(displayName);
    const extent = Array.isArray(props.extent) ? props.extent.map(Number) : null;
    // Photon extent is [minLon, maxLat, maxLon, minLat] → Nominatim-style [south,north,west,east]
    let boundingbox: string[] | undefined;
    if (extent && extent.length === 4 && extent.every(Number.isFinite)) {
      const [minLon, maxLat, maxLon, minLat] = extent;
      boundingbox = [String(minLat), String(maxLat), String(minLon), String(maxLon)];
    }

    places.push({
      id: String(props.osm_id ?? `${lat},${lng},${i}`),
      lat,
      lng,
      primary,
      secondary,
      displayName,
      type:
        typeof props.type === 'string'
          ? props.type
          : typeof props.osm_value === 'string'
            ? props.osm_value
            : undefined,
      class: typeof props.osm_key === 'string' ? props.osm_key : undefined,
      boundingbox,
    });
  }
  return places;
}

export function fromNominatim(data: unknown): PlaceDto[] {
  if (!Array.isArray(data)) return [];
  const places: PlaceDto[] = [];
  for (let i = 0; i < data.length; i++) {
    const item = data[i] as Record<string, unknown>;
    const lat = parseFloat(String(item.lat));
    const lng = parseFloat(String(item.lon));
    if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
    const displayName = String(item.display_name || '');
    const { primary, secondary } = splitDisplayName(displayName);
    places.push({
      id: String(item.place_id ?? `${lat},${lng},${i}`),
      lat,
      lng,
      primary,
      secondary,
      displayName,
      type: typeof item.type === 'string' ? item.type : undefined,
      class: typeof item.class === 'string' ? item.class : undefined,
      boundingbox: Array.isArray(item.boundingbox) ? item.boundingbox.map(String) : undefined,
    });
  }
  return places;
}

/** Progressive query variants when full address is too specific for OSM. */
export function queryVariants(query: string): string[] {
  const cleaned = query.replace(/\s+/g, ' ').trim();
  const variants = [cleaned];

  const parts = cleaned.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    variants.push(parts.slice(1).join(', '));
    variants.push(parts.slice(-3).join(', '));
  }

  const tokens = cleaned.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length >= 3) {
    variants.push(tokens.slice(-3).join(' '));
  }
  if (tokens.length >= 2) {
    variants.push(tokens.slice(-2).join(' '));
  }

  const seen = new Set<string>();
  return variants.filter((v) => {
    const key = v.toLowerCase();
    if (seen.has(key) || key.length < 3) return false;
    seen.add(key);
    return true;
  });
}

export function dedupePlaces(places: PlaceDto[]): PlaceDto[] {
  const seen = new Set<string>();
  const out: PlaceDto[] = [];
  for (const place of places) {
    const key = `${place.lat.toFixed(5)},${place.lng.toFixed(5)},${place.displayName.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(place);
    if (out.length >= 8) break;
  }
  return out;
}

/** Join address parts for tests / callers that build a single search string. */
export function formatFullAddress(parts: {
  line1?: string;
  line2?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}): string {
  return [parts.line1, parts.line2, parts.area, parts.city, parts.state, parts.pincode, parts.country]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(', ');
}
