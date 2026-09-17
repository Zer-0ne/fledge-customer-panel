/**
 * Browser-tab icon variants (Settings → Appearance picker).
 *
 * Ids/labels/colours MUST stay in sync with:
 *  - scripts/generate-icons.py (artwork — public/icons/variants/*)
 *  - the Flutter app pickers (customer + partner: app_icon_service.dart)
 */
export interface FaviconVariant {
  id: string;
  label: string;
  /** First word — rendered under the swatch in tight grids. */
  shortLabel: string;
}

export const FAVICON_VARIANTS: readonly FaviconVariant[] = [
  { id: 'classic', label: 'Classic Blue', shortLabel: 'Classic' },
  { id: 'midnight', label: 'Midnight', shortLabel: 'Midnight' },
  { id: 'emerald', label: 'Emerald', shortLabel: 'Emerald' },
  { id: 'sunset', label: 'Sunset', shortLabel: 'Sunset' },
  { id: 'purple', label: 'Violet', shortLabel: 'Violet' },
  { id: 'rose', label: 'Rose', shortLabel: 'Rose' },
] as const;

export const DEFAULT_FAVICON_VARIANT = 'classic';
export const FAVICON_STORAGE_KEY = 'favicon_variant';

export function faviconVariantIds(): string[] {
  return FAVICON_VARIANTS.map((variant) => variant.id);
}

export function isFaviconVariantId(id: string): boolean {
  return FAVICON_VARIANTS.some((variant) => variant.id === id);
}

export function variantSvgPath(id: string): string {
  return `/icons/variants/${id}.svg`;
}

export function variantPngPath(id: string): string {
  return `/icons/variants/${id}-32.png`;
}
