/**
 * Runtime browser-tab icon switcher (Settings → Appearance → Browser tab icon).
 *
 * Swaps the <link rel="icon"> tags that Next.js metadata renders, and persists
 * the choice in localStorage. `FaviconSync` (mounted in the root layout)
 * re-applies the stored variant on every load.
 *
 * NOTE — what this CANNOT do: change the home-screen icon of an ALREADY
 * INSTALLED PWA. Browsers only re-read installed icons when the web app
 * manifest changes (see scripts/generate-icons.py for the ?v= bump rule);
 * reinstalling is the only instant path. The tab icon is fully ours though.
 */
import {
  DEFAULT_FAVICON_VARIANT,
  FAVICON_STORAGE_KEY,
  isFaviconVariantId,
  variantPngPath,
  variantSvgPath,
} from './favicon-variants';

function ensureLink(matcher: (link: HTMLLinkElement) => boolean, create: () => HTMLLinkElement): HTMLLinkElement {
  for (const link of Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'))) {
    if (matcher(link)) return link;
  }
  const link = create();
  document.head.appendChild(link);
  return link;
}

/** Points every favicon link at the given variant (client-only). */
export function applyFaviconVariant(id: string): void {
  if (typeof document === 'undefined') return;
  const variantId = isFaviconVariantId(id) ? id : DEFAULT_FAVICON_VARIANT;

  const svgLink = ensureLink(
    (link) => (link.getAttribute('type') ?? '').includes('svg') || link.href.endsWith('.svg'),
    () => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      return link;
    },
  );
  svgLink.href = variantSvgPath(variantId);

  const pngLink = ensureLink(
    (link) => link.getAttribute('sizes') === '32x32' || (link.getAttribute('type') ?? '') === 'image/png',
    () => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.sizes = '32x32';
      return link;
    },
  );
  pngLink.href = variantPngPath(variantId);
}

/** Stored variant (falls back to the default when unset/unavailable). */
export function readFaviconVariant(): string {
  if (typeof window === 'undefined') return DEFAULT_FAVICON_VARIANT;
  try {
    const stored = window.localStorage.getItem(FAVICON_STORAGE_KEY);
    return stored && isFaviconVariantId(stored) ? stored : DEFAULT_FAVICON_VARIANT;
  } catch {
    return DEFAULT_FAVICON_VARIANT;
  }
}

/** Applies + persists the chosen variant. */
export function setFaviconVariant(id: string): void {
  applyFaviconVariant(id);
  try {
    window.localStorage.setItem(FAVICON_STORAGE_KEY, id);
  } catch {
    // Private mode / storage disabled — the icon still switches for this visit.
  }
}

/** Re-applies the stored variant (called from FaviconSync on mount). */
export function syncFaviconFromStorage(): void {
  const stored = readFaviconVariant();
  if (stored !== DEFAULT_FAVICON_VARIANT) {
    applyFaviconVariant(stored);
  }
}
