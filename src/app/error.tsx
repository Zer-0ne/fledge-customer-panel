'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log the error to error tracking service silently
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <AlertTriangle className="size-8" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="size-4" />
          Try Again
        </Button>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <Home className="size-4" />
            Go to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
