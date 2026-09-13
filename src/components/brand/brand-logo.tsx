import * as React from 'react';

import { BRAND_LOGOS, type BrandLogoKey } from '@/lib/brand/logos';
import { cn } from '@/lib/utils';

type BrandLogoSize = 'sm' | 'md' | 'lg' | 'xl';

/** Rendered box for each size — the source SVGs keep their own aspect ratio. */
const SIZE_CLASS: Record<BrandLogoSize, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-7',
  xl: 'size-9',
};

export interface BrandLogoProps {
  brand: BrandLogoKey;
  size?: BrandLogoSize;
  className?: string;
  /** Announce the brand to assistive tech (use when the mark is the only label). */
  title?: string;
}

/**
 * Brand mark from svgl.app (assets in `public/brand/svgl/`).
 *
 * Plain `<img>` on purpose: these are full-colour brand files (several carry
 * their own gradients), so they must not be re-coloured or inlined into the JS
 * bundle. Animate with the `animate-brand-*` utilities from `globals.css`.
 */
export function BrandLogo({ brand, size = 'md', className, title }: BrandLogoProps) {
  const { src, label, invertInDark } = BRAND_LOGOS[brand];
  const accessibleName = title ?? undefined;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand SVGs are static local files; next/image adds no value for 1-17 KB vectors
    <img
      src={src}
      alt={accessibleName ?? ''}
      aria-hidden={accessibleName ? undefined : true}
      title={label}
      width={28}
      height={28}
      loading="lazy"
      decoding="async"
      className={cn(
        SIZE_CLASS[size],
        'shrink-0 object-contain',
        invertInDark && 'dark:invert',
        className,
      )}
    />
  );
}
