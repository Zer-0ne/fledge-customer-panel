import type { MetadataRoute } from 'next';
import { ICON_VERSION } from '@/lib/brand/icon-version';

/**
 * Web app manifest — served at `/manifest.webmanifest`.
 *
 * Icon URLs carry the content hash from [ICON_VERSION]: an installed Android
 * WebAPK only refreshes its launcher icon when Chrome sees a *changed*
 * manifest, so the version must move whenever the art does. Deriving it from
 * the icon bytes removes the manual `?v=` bump that used to live here (and in
 * the root layout's `manifest` link, which imports the same constant).
 */
export default function manifest(): MetadataRoute.Manifest {
  const v = ICON_VERSION;
  return {
    name: 'Fledge — Student Housing & Flat Sharing',
    short_name: 'Fledge',
    description:
      'Find student apartments, room rentals, and compatible roommates near top colleges and university campuses.',
    id: '/',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0c0e12',
    theme_color: '#0c0e12',
    icons: [
      { src: `/icons/icon-192.png?v=${v}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/icons/icon-512.png?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `/icons/icon-maskable-192.png?v=${v}`, sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: `/icons/icon-maskable-512.png?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
