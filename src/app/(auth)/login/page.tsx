'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const rawReturnUrl = searchParams.get('returnUrl');
  const returnUrl = rawReturnUrl && !rawReturnUrl.startsWith('/login') ? rawReturnUrl : '/dashboard';
  const { isAuthenticated } = useAuth();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      window.location.href = returnUrl;
    }
  }, [isAuthenticated, returnUrl]);

  const handleGoogleError = React.useCallback((message: string) => {
    setErrorMsg(message);
  }, []);

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
