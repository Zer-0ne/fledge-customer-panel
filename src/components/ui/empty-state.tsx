import * as React from 'react';
import { cn } from '@/lib/utils';
import { FolderOpen } from 'lucide-react';
import { Button } from './button';

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = FolderOpen,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-card/50 my-4',
        className
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-muted/80 text-muted-foreground mb-4">
        <Icon className="size-7" />
      </div>
      <h3 className="text-lg font-semibold text-foreground tracking-tight">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>}
      {action ? (
        <div className="mt-5">{action}</div>
      ) : (
        actionLabel &&
        onAction && (
          <Button onClick={onAction} className="mt-5" size="sm">
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}
