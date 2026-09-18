/**
 * Basemap tile configuration (CARTO raster basemaps over OpenStreetMap data).
 *
 * CARTO now requires an API key for direct tile requests — without one every
 * raster tile is served with a repeated "API KEY REQUIRED" watermark.
 * Request the free key at https://carto.com/basemaps/apikey (no CARTO account
 * needed, 5M tile requests per calendar month) and set
 * NEXT_PUBLIC_CARTO_API_KEY in `.env.local` (local) and in the Vercel project
 * environment (production), then redeploy.
 *
 * The CARTO + OpenStreetMap attribution must stay visible on the map — it is
 * a condition of the free tier, not optional chrome.
 */

const CARTO_API_KEY = (process.env.NEXT_PUBLIC_CARTO_API_KEY ?? '').trim();

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Append the CARTO API key to a raster tile URL template (no-op without one). */
export function withCartoKey(url: string, apiKey: string = CARTO_API_KEY): string {
  if (!apiKey) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}key=${encodeURIComponent(apiKey)}`;
}

/** CARTO raster basemaps — theme to tile URL template + attribution. */
export const BASEMAP_TILES = {
  light: {
    url: withCartoKey('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'),
    attribution: CARTO_ATTRIBUTION,
  },
  dark: {
    url: withCartoKey('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'),
    attribution: CARTO_ATTRIBUTION,
  },
} as const;
