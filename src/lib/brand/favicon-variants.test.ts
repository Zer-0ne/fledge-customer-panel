import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FAVICON_VARIANT,
  FAVICON_VARIANTS,
  faviconVariantIds,
  isFaviconVariantId,
  variantPngPath,
  variantSvgPath,
} from './favicon-variants';

describe('favicon variants', () => {
  it('exposes the six shared ids in picker order', () => {
    expect(faviconVariantIds()).toEqual([
      'classic',
      'midnight',
      'emerald',
      'sunset',
      'purple',
      'rose',
    ]);
  });

  it('has unique ids, labels, and a valid default', () => {
    const ids = faviconVariantIds();
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(FAVICON_VARIANTS.map((v) => v.label)).size).toBe(FAVICON_VARIANTS.length);
    expect(isFaviconVariantId(DEFAULT_FAVICON_VARIANT)).toBe(true);
    expect(isFaviconVariantId('nope')).toBe(false);
  });

  it('maps ids to the generated asset paths', () => {
    expect(variantSvgPath('sunset')).toBe('/icons/variants/sunset.svg');
    expect(variantPngPath('sunset')).toBe('/icons/variants/sunset-32.png');
  });
});
