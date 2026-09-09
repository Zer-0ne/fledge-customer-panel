'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';

function LoginContent() {
  const searchParams = useSearchParams();
  const rawReturnUrl = searchParams.get('returnUrl');
  const returnUrl = rawReturnUrl && !rawReturnUrl.startsWith('/login') ? rawReturnUrl : '/dashboard';
  const { isAuthenticated, isLoading } = useAuth();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      window.location.href = returnUrl;
    }
  }, [isAuthenticated, isLoading, returnUrl]);

  const handleGoogleError = React.useCallback((message: string) => {
    setErrorMsg(message);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="space-y-2">
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-4 w-48 mx-auto rounded-md" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 animate-in fade-in duration-300">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Spinner className="size-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">Signing you in…</h2>
          <p className="text-xs text-muted-foreground">Redirecting to your dashboard, please wait.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Welcome back</h2>
        <p className="text-xs text-muted-foreground">
          Continue with your Google account to access your account.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium animate-in fade-in duration-200">
          {errorMsg}
        </div>
      )}

      <GoogleSignInButton returnUrl={returnUrl} onError={handleGoogleError} />

      <div className="rounded-xl border border-border/70 bg-muted/40 p-3 text-left">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Tapping Continue with Google sends a Google identity token to Fledge so the API can create or
          resume your account and session. Fledge receives your verified Google account identity;
          it never receives your Google password.
        </p>
      </div>

      <div className="pt-1 text-center">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          By continuing, you agree to the{' '}
          <Link href="/terms" className="font-medium text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and acknowledge the{' '}
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="space-y-2">
            <Skeleton className="h-6 w-36 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      }
    >
      <LoginContent />
    </React.Suspense>
  );
}
