/**
 * Third-party brand marks used by the customer panel.
 *
 * Source: svgl.app (https://svgl.app) — downloaded once into
 * `public/brand/svgl/` so the panel never calls a third-party host at runtime.
 * Refresh a mark with the curl list in `docs/svgl-icon-audit.md`.
 *
 * Usage rule: only render a brand mark where the UI genuinely talks about that
 * product (WhatsApp sharing, install steps for Chrome/Safari/Firefox/Edge/Brave,
 * iOS/Android). Each file ships under its owner's brand guidelines — never use a
 * mark as decoration. Marks that svgl does not carry, or that look different
 * from the vendor's official flat asset (e.g. Google's sign-in "G"), stay in the
 * app as inline SVG instead — see the audit doc.
 */

export type BrandLogoKey =
  | 'whatsapp'
  | 'chrome'
  | 'safari'
  | 'firefox'
  | 'edge'
  | 'brave'
  | 'android'
  | 'apple';

export interface BrandLogoAsset {
  /** Path under `public/`. */
  src: string;
  /** Human label — used for `alt`/`title` when the mark is the only label. */
  label: string;
  /** Marks whose artwork is solid black and must be inverted in dark mode. */
  invertInDark?: boolean;
}

export const BRAND_LOGOS: Record<BrandLogoKey, BrandLogoAsset> = {
  whatsapp: { src: '/brand/svgl/whatsapp.svg', label: 'WhatsApp' },
  chrome: { src: '/brand/svgl/chrome.svg', label: 'Google Chrome' },
  safari: { src: '/brand/svgl/safari.svg', label: 'Safari' },
  firefox: { src: '/brand/svgl/firefox.svg', label: 'Firefox' },
  edge: { src: '/brand/svgl/edge.svg', label: 'Microsoft Edge' },
  brave: { src: '/brand/svgl/brave.svg', label: 'Brave' },
  android: { src: '/brand/svgl/android.svg', label: 'Android' },
  apple: { src: '/brand/svgl/apple.svg', label: 'Apple', invertInDark: true },
};

export function isBrandLogoKey(value: string): value is BrandLogoKey {
  return Object.prototype.hasOwnProperty.call(BRAND_LOGOS, value);
}

export function brandLogo(key: BrandLogoKey): BrandLogoAsset {
  return BRAND_LOGOS[key];
}
