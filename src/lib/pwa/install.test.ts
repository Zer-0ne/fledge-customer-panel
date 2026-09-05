import { describe, expect, it } from 'vitest';

import { getPwaInstallGuidance } from '@/lib/pwa/install';

const guidanceFor = (userAgent: string, maxTouchPoints = 0) =>
  getPwaInstallGuidance({ userAgent, maxTouchPoints });

describe('PWA install guidance', () => {
  it('returns truthful instructions for Chromium, iOS, and Firefox', () => {
    expect(
      guidanceFor(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
      ).title,
    ).toBe('Install Fledge');

    expect(
      guidanceFor(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/140.0 Mobile/15E148 Safari/604.1',
        5,
      ).steps,
    ).toContain('Tap Add to Home Screen, then confirm Add.');

    expect(
      guidanceFor(
        'Mozilla/5.0 (Android 15; Mobile; rv:141.0) Gecko/141.0 Firefox/141.0',
        5,
      ).steps,
    ).toEqual(['Open the Firefox menu (⋮).', 'Tap Install.']);

    expect(
      guidanceFor(
        'Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0',
      ).title,
    ).toBe('Install with Chrome or Edge');
  });
});
