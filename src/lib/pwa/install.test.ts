import { describe, expect, it } from 'vitest';

import { BRAND_LOGOS } from '@/lib/brand/logos';
import { getPwaInstallGuidance } from '@/lib/pwa/install';

const guidanceFor = (userAgent: string, maxTouchPoints = 0) =>
  getPwaInstallGuidance({ userAgent, maxTouchPoints });

const WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36';
const WINDOWS_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0';
const DESKTOP_FIREFOX =
  'Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0';
const ANDROID_FIREFOX =
  'Mozilla/5.0 (Android 15; Mobile; rv:141.0) Gecko/141.0 Firefox/141.0';
const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0 Mobile/15E148 Safari/604.1';
const MAC_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const IOS_BRAVE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Brave/1.70 Mobile/15E148 Safari/604.1';

const ALL_AGENTS = [
  WINDOWS_CHROME,
  WINDOWS_EDGE,
  DESKTOP_FIREFOX,
  ANDROID_FIREFOX,
  IOS_SAFARI,
  IOS_CHROME,
  MAC_SAFARI,
  ANDROID_CHROME,
  IOS_BRAVE,
];

describe('PWA install guidance', () => {
  it('returns truthful instructions for Chromium, iOS, and Firefox', () => {
    expect(guidanceFor(WINDOWS_CHROME).title).toBe('Install Fledge');

    expect(guidanceFor(IOS_CHROME, 5).steps).toContain(
      'Tap Add to Home Screen, then confirm Add.',
    );

    expect(guidanceFor(ANDROID_FIREFOX, 5).steps).toEqual([
      'Open the Firefox menu (⋮).',
      'Tap Install.',
    ]);

    expect(guidanceFor(DESKTOP_FIREFOX).title).toBe('Install with Chrome or Edge');
  });

  it('carries the brand marks its copy names', () => {
    // iOS: the browser share menu + the platform it belongs to.
    expect(guidanceFor(IOS_SAFARI, 5).brands).toEqual(['safari', 'apple']);
    expect(guidanceFor(IOS_CHROME, 5).brands).toEqual(['chrome', 'apple']);
    expect(guidanceFor(IOS_BRAVE, 5).brands).toEqual(['brave', 'apple']);

    // Firefox on Android installs in place; desktop Firefox points at Chrome/Edge.
    expect(guidanceFor(ANDROID_FIREFOX, 5).brands).toEqual(['firefox', 'android']);
    expect(guidanceFor(DESKTOP_FIREFOX).brands).toEqual(['chrome', 'edge']);

    // Safari desktop → Dock instructions on macOS.
    expect(guidanceFor(MAC_SAFARI).brands).toEqual(['safari', 'apple']);

    // Chromium family → a single, correctly detected mark.
    expect(guidanceFor(WINDOWS_CHROME).brands).toEqual(['chrome']);
    expect(guidanceFor(WINDOWS_EDGE).brands).toEqual(['edge']);
    expect(guidanceFor(ANDROID_CHROME).brands).toEqual(['chrome']);
  });

  it('never points at a brand mark the panel does not ship', () => {
    const shipped = new Set<string>(Object.keys(BRAND_LOGOS));

    for (const userAgent of ALL_AGENTS) {
      for (const brand of guidanceFor(userAgent, 5).brands) {
        expect(shipped.has(brand)).toBe(true);
      }
    }
  });

  it('degrades to no logo row for an unknown browser', () => {
    expect(
      guidanceFor('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko)').brands,
    ).toEqual([]);
  });
});
