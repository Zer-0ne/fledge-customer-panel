import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  description = 'We encountered an error loading this information. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  const displayText = message || description;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-6 text-center rounded-xl border border-destructive/20 bg-destructive/5 text-destructive my-4',
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 mb-3">
        <AlertCircle className="size-6 text-destructive" />
      </div>
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="text-sm opacity-90 mt-1 max-w-md">{displayText}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-4 gap-2 border-destructive/30 hover:bg-destructive/10"
        >
          <RefreshCw className="size-3.5" />
          Try Again
        </Button>
      )}
    </div>
  );
}
