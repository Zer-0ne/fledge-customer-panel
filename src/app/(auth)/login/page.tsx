'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';

// ─────────────────────────────────────────────────────────────────────────────
// Email/password login — TEMPORARILY DISABLED (2026-08-10, Google-only login).
// Restore by uncommenting: the imports below, the form state + handleSubmit,
// and the <form>…</form> block in the JSX.
// ─────────────────────────────────────────────────────────────────────────────
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { useToast } from '@/components/ui/toast';
// import { Lock, Mail, Phone, Eye, EyeOff, ArrowRight, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const { isAuthenticated } = useAuth();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // ── Email/password form state (disabled) ──
  // const [identifier, setIdentifier] = React.useState('');
  // const [password, setPassword] = React.useState('');
  // const [showPassword, setShowPassword] = React.useState(false);
  // const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace(returnUrl);
    }
  }, [isAuthenticated, router, returnUrl]);

  // ── Email/password submit (disabled) ──
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setErrorMsg(null);
  //
  //   if (!identifier.trim()) {
  //     setErrorMsg('Please enter your email address or phone number.');
  //     return;
  //   }
  //   if (!password) {
  //     setErrorMsg('Please enter your password.');
  //     return;
  //   }
  //
  //   try {
  //     setIsSubmitting(true);
  //     await login(identifier.trim(), password);
  //     addToast('Success', 'Log in successful!', 'success');
  //     router.push(returnUrl);
  //   } catch (err: unknown) {
  //     const message = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
  //     setErrorMsg(message);
  //     addToast('Login Failed', message, 'error');
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

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

      {/* ── Email/password form (temporarily disabled 2026-08-10 — Google-only login) ──
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="identifier" className="text-xs font-semibold text-foreground">
            Email or Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              {identifier.includes('@') ? <Mail className="size-4" /> : <Phone className="size-4" />}
            </div>
            <Input
              id="identifier"
              type="text"
              placeholder="name@example.com or +919****3210"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="pl-9 text-sm"
              disabled={isSubmitting}
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-semibold text-foreground">
              Password
            </label>
            <Link
              href="/otp"
              className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
            >
              <KeyRound className="size-3" />
              Log in via OTP instead
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <Lock className="size-4" />
            </div>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-10 text-sm"
              disabled={isSubmitting}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full font-semibold gap-2 mt-2 shadow-md"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            'Authenticating...'
          ) : (
            <>
              <span>Log In</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
      ── end of disabled email/password form ── */}

      {/* Alternative Options */}
      <div className="space-y-4 pt-2 border-t border-border/60">
        {/* ── OTP link (temporarily disabled 2026-08-10 — Google-only login) ──
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Link
            href="/otp"
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            <KeyRound className="size-3" />
            Log in via OTP instead
          </Link>
        </div>
        ── end of disabled OTP link ── */}
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <span>Don&apos;t have an account?</span>
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Sign up now
          </Link>
        </div>
      </div>
    </div>
  );
}
