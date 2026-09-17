import * as React from 'react';

import { cn } from '@/lib/utils';

export interface FledgeMarkProps {
  /** Rendered box, e.g. 'size-8' or 'size-12'. */
  className?: string;
  /** Announce the mark to assistive tech (when it is the only label). */
  title?: string;
}

/**
 * Fledge app mark — the exact artwork of the favicon / PWA icon
 * (scripts/generate-icons.py is the source of truth; public/icons/favicon.svg
 * is its vector output). Used in the header, footer, and auth screens so the
 * in-app brand matches the tab icon, the installed PWA icon, and the push
 * notification badge.
 *
 * Plain `<img>` on purpose: static local SVG with its own gradient — it must
 * not be re-coloured or bundled (same rationale as BrandLogo).
 */
export function FledgeMark({ className, title }: FledgeMarkProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static local SVG mark; next/image adds no value for a <6 KB vector
    <img
      src="/icons/favicon.svg"
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      width={48}
      height={48}
      decoding="async"
      className={cn('shrink-0 select-none', className)}
    />
  );
}
