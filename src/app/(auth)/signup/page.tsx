'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { User as UserIcon, Mail, Phone, Lock, Eye, EyeOff, UserPlus, CheckCircle2 } from 'lucide-react';

export default function SignupPage() {
  const { signup, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Email/password form state
  const [displayName, setDisplayName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const passwordLengthValid = password.length >= 8;
  const hasSpecialOrNum = /[0-9!@#$%^&*]/.test(password);

  React.useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!displayName.trim()) {
      setErrorMsg('Full name is required.');
      return;
    }

    if (!email.trim() && !phone.trim()) {
      setErrorMsg('Please provide either an email address or phone number.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      await signup(
        displayName.trim(),
        password,
        email.trim() ? email.trim() : undefined,
        phone.trim() ? phone.trim() : undefined
      );
      addToast('Account Created', 'Welcome to Fledge!', 'success');
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please check your information.';
      setErrorMsg(message);
      addToast('Signup Failed', message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleError = React.useCallback((message: string) => {
    setErrorMsg(message);
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Create an account</h2>
        <p className="text-xs text-muted-foreground">
          Sign up to get started.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium animate-in fade-in duration-200">
          {errorMsg}
        </div>
      )}

      <GoogleSignInButton returnUrl="/dashboard" onError={handleGoogleError} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or sign up with email</span>
        </div>
      </div>

      {/* Email/password signup form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="displayName" className="text-xs font-semibold text-foreground">
            Full Name <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <UserIcon className="size-4" />
            </div>
            <Input
              id="displayName"
              type="text"
              placeholder="Rahul Sharma"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="pl-9 text-sm"
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-semibold text-foreground">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <Mail className="size-4" />
            </div>
            <Input
              id="email"
              type="email"
              placeholder="rahul@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 text-sm"
              disabled={isSubmitting}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-xs font-semibold text-foreground">
            Phone Number
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <Phone className="size-4" />
            </div>
            <Input
              id="phone"
              type="tel"
              placeholder="+919876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-9 text-sm"
              disabled={isSubmitting}
              autoComplete="tel"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-semibold text-foreground">
            Password <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <Lock className="size-4" />
            </div>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 pr-10 text-sm"
              disabled={isSubmitting}
              autoComplete="new-password"
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

          {password.length > 0 && (
            <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
              <span className={`flex items-center gap-1 ${passwordLengthValid ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
                <CheckCircle2 className="size-3" />
                8+ characters
              </span>
              <span className={`flex items-center gap-1 ${hasSpecialOrNum ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
                <CheckCircle2 className="size-3" />
                Numbers/symbols
              </span>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full font-semibold gap-2 mt-2 shadow-md"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            'Creating Account...'
          ) : (
            <>
              <UserPlus className="size-4" />
              <span>Create Account</span>
            </>
          )}
        </Button>
      </form>

      <div className="space-y-4 pt-2 border-t border-border/60">
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <span>Already have an account?</span>
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
