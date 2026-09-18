/**
 * Runtime browser-tab icon switcher (Settings → Appearance → Browser tab icon).
 *
 * Retargets EVERY <link rel="icon"> in the document (Next.js metadata renders
 * its own set; React can re-insert the originals on hydration/re-render), and
 * watches the head with a MutationObserver so late re-insertions are
 * re-retargeted immediately. The choice persists in localStorage and
 * `FaviconSync` (root layout) re-applies it on every load.
 *
 * NOTE — what this CANNOT do: change the home-screen icon of an ALREADY
 * INSTALLED PWA. Browsers only re-read installed icons when the web app
 * manifest changes — the manifest's icon URLs carry a content hash of the art
 * (src/lib/brand/icon-version.ts) so that change fires by itself after a
 * rebuild; reinstalling is the only instant path. iOS caches its home-screen
 * icon regardless and needs a remove + re-add. The tab icon is fully ours
 * though.
 */
import {
  DEFAULT_FAVICON_VARIANT,
  FAVICON_STORAGE_KEY,
  isFaviconVariantId,
  variantPngPath,
  variantSvgPath,
} from './favicon-variants';

/** Variant currently applied to the document (null until first apply). */
let activeVariantId: string | null = null;
let observer: MutationObserver | null = null;

function normalize(id: string): string {
  return isFaviconVariantId(id) ? id : DEFAULT_FAVICON_VARIANT;
}

function isSvgLink(link: HTMLLinkElement): boolean {
  const type = link.getAttribute('type') ?? '';
  const href = link.getAttribute('href') ?? '';
  return type.includes('svg') || href.endsWith('.svg');
}

function isPngLink(link: HTMLLinkElement): boolean {
  const type = link.getAttribute('type') ?? '';
  const href = link.getAttribute('href') ?? '';
  return type.includes('png') || href.endsWith('.png');
}

/** Points every existing favicon link at the active variant. */
function retargetIconLinks(): void {
  if (typeof document === 'undefined' || activeVariantId === null) return;
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));

  let sawSvg = false;
  let sawPng = false;
  for (const link of links) {
    if (isSvgLink(link)) {
      if (link.getAttribute('href') !== variantSvgPath(activeVariantId)) {
        link.setAttribute('href', variantSvgPath(activeVariantId));
      }
      sawSvg = true;
    } else if (isPngLink(link)) {
      if (link.getAttribute('href') !== variantPngPath(activeVariantId)) {
        link.setAttribute('href', variantPngPath(activeVariantId));
      }
      sawPng = true;
    }
  }

  // Defensive: no metadata links at all (unusual) — add our own.
  if (!sawSvg) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = variantSvgPath(activeVariantId);
    document.head.appendChild(link);
  }
  if (!sawPng) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.sizes = '32x32';
    link.href = variantPngPath(activeVariantId);
    document.head.appendChild(link);
  }
}

/** React/Next can re-insert their metadata links — re-retarget when they do. */
function ensureObserver(): void {
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver(() => {
    retargetIconLinks();
  });
  observer.observe(document.head, { childList: true });
}

/** Applies the variant to the current document (client-only, idempotent). */
export function applyFaviconVariant(id: string): void {
  if (typeof document === 'undefined') return;
  activeVariantId = normalize(id);
  retargetIconLinks();
  ensureObserver();
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
  const variantId = normalize(id);
  applyFaviconVariant(variantId);
  try {
    window.localStorage.setItem(FAVICON_STORAGE_KEY, variantId);
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
