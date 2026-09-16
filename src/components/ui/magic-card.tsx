'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * MagicCard — now a plain surface (2026-09).
 *
 * The mouse-tracking spotlight/gradient implementation (motion + rAF per
 * pointer move, theme-aware) was decorative noise on cards that hold real
 * content — inventory tiles, roommate posts, contact panels. Cards now share
 * ONE hover treatment from the design system (`.fl-lift`), which is also
 * cheaper and respects `prefers-reduced-motion`. The exported name and props
 * are unchanged so call sites keep working.
 */
export type MagicCardProps = React.HTMLAttributes<HTMLDivElement> & {
  children?: React.ReactNode;
};

export function MagicCard({ className, children, ...props }: MagicCardProps) {
  return (
    <div className={cn('fl-lift overflow-hidden bg-card', className)} {...props}>
      {children}
    </div>
  );
}

export default MagicCard;
