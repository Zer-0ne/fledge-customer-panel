'use client';

import * as React from 'react';
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

      <div className="pt-2 text-center">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
