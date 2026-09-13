import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { BrandLogo } from '@/components/brand/brand-logo';
import { BRAND_LOGOS, type BrandLogoKey } from '@/lib/brand/logos';

const keys = Object.keys(BRAND_LOGOS) as BrandLogoKey[];

describe('BrandLogo', () => {
  it('ships the svgl file behind every mark', () => {
    for (const key of keys) {
      const file = path.join(process.cwd(), 'public', BRAND_LOGOS[key].src);
      expect(fs.existsSync(file), `${key} → ${BRAND_LOGOS[key].src}`).toBe(true);
    }
  });

  it('renders each mark as a decorative <img> pointing at its local copy', () => {
    for (const key of keys) {
      const html = renderToStaticMarkup(<BrandLogo brand={key} />);
      expect(html).toContain(`src="${BRAND_LOGOS[key].src}"`);
      expect(html).toContain('aria-hidden="true"');
    }
  });

  it('labels the mark on request and inverts black artwork in dark mode', () => {
    const apple = renderToStaticMarkup(<BrandLogo brand="apple" size="lg" title="Apple" />);

    expect(apple).toContain('alt="Apple"');
    expect(apple).toContain('dark:invert');
    expect(apple).not.toContain('aria-hidden');

    // Full-colour marks must never be re-tinted.
    expect(renderToStaticMarkup(<BrandLogo brand="whatsapp" />)).not.toContain('invert');
  });

  it('passes caller classes through so animation utilities reach the DOM', () => {
    const html = renderToStaticMarkup(
      <BrandLogo brand="whatsapp" size="sm" className="group-hover:animate-brand-wiggle" />,
    );

    expect(html).toContain('group-hover:animate-brand-wiggle');
    expect(html).toContain('size-4');
  });
});
