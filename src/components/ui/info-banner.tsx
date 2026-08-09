import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const infoBannerVariants = cva(
  'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium',
  {
    variants: {
      tone: {
        info: 'border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-400',
        warning: 'border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400',
        neutral: 'border-border bg-muted/40 text-muted-foreground',
      },
    },
    defaultVariants: { tone: 'info' },
  }
);

export interface InfoBannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof infoBannerVariants> {
  icon?: React.ReactNode;
  title?: string;
  description?: React.ReactNode;
}

/**
 * Compact informational banner with an optional leading icon.
 * Readable labels only — never raw API values.
 */
function InfoBanner({
  tone,
  icon,
  title,
  description,
  className,
  children,
  ...props
}: InfoBannerProps) {
  return (
    <div className={cn(infoBannerVariants({ tone }), className)} {...props}>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <span className="min-w-0">
        {title ? <span className="font-semibold">{title} </span> : null}
        {description ?? children}
      </span>
    </div>
  );
}

export { InfoBanner, infoBannerVariants };
