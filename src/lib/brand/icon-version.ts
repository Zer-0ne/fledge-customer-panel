import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Icon version — the bytes of the launcher/app icons, hashed.
 *
 * Installed Android PWAs (WebAPKs) and iOS home-screen apps only re-read their
 * icon when the browser sees a CHANGED manifest. Bumping a hand-written `?v=`
 * works but is silently forgotten the next time the art changes — so the
 * version is derived from the art itself: touch any icon in `public/icons/`
 * and every manifest/icon URL changes with it, which is what triggers the
 * refresh. iOS still caches its home-screen icon until the app is re-added
 * (platform behaviour, not controllable from here).
 */

const ICON_FILES = [
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-192.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png',
  'favicon-32.png',
] as const;

function computeIconVersion(): string {
  try {
    const hash = createHash('sha256');
    for (const file of ICON_FILES) {
      hash.update(readFileSync(join(process.cwd(), 'public', 'icons', file)));
    }
    return hash.digest('hex').slice(0, 8);
  } catch {
    // Non-fatal: a missing icon file must not break the build.
    return '1';
  }
}

export const ICON_VERSION = computeIconVersion();
