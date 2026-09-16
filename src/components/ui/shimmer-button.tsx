'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ShimmerButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  /** Kept for API compatibility — the shimmer sweep was removed in 2026-09. */
  shimmerColor?: string;
  shimmerSize?: string;
  shimmerDuration?: string;
  borderRadius?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * ShimmerButton — now the design-system primary button (2026-09).
 *
 * The animated conic shimmer was one of five competing motion effects on the
 * home and roommate surfaces. Call sites only relied on the shape and the
 * primary colour, so this keeps the props and renders a calm primary button
 * with a 44px-friendly height on touch.
 */
export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor: _shimmerColor,
      shimmerSize: _shimmerSize,
      shimmerDuration: _shimmerDuration,
      borderRadius: _borderRadius,
      background: _background,
      className,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:min-h-9',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);

ShimmerButton.displayName = 'ShimmerButton';

export default ShimmerButton;
