'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Phone, Mail, ShieldCheck, ArrowRight, RotateCcw, Lock } from 'lucide-react';

export default function OtpPage() {
  const router = useRouter();
  const { otpRequest, otpLogin, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [step, setStep] = React.useState<'request' | 'verify'>('request');
  const [identifier, setIdentifier] = React.useState('');
  const [code, setCode] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!identifier.trim()) {
      setErrorMsg('Please enter your phone number or email.');
      return;
    }

    try {
      setIsSubmitting(true);
      await otpRequest(identifier.trim());
      setStep('verify');
      setCooldown(60);
      addToast('OTP Sent', `Verification code sent to ${identifier.trim()}`, 'info');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP. Please try again.';
      setErrorMsg(message);
      addToast('OTP Request Failed', message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!code.trim() || code.trim().length < 4) {
      setErrorMsg('Please enter the verification code sent to your device.');
      return;
    }

    try {
      setIsSubmitting(true);
      await otpLogin(identifier.trim(), code.trim());
      addToast('Login Successful', 'Welcome back!', 'success');
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid or expired OTP code.';
      setErrorMsg(message);
      addToast('Verification Failed', message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          {step === 'request' ? 'OTP Login' : 'Enter Verification Code'}
        </h2>
        <p className="text-xs text-muted-foreground">
          {step === 'request'
            ? 'We will send a one-time verification code to your email or phone.'
            : `Code sent to ${identifier}. Enter it below to complete login.`}
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 text-xs rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-medium animate-in fade-in duration-200">
          {errorMsg}
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="text-xs font-semibold text-foreground">
              Phone Number or Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                {identifier.includes('@') ? <Mail className="size-4" /> : <Phone className="size-4" />}
              </div>
              <Input
                id="identifier"
                type="text"
                placeholder="+919876543210 or name@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="pl-9 text-sm"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full font-semibold gap-2 mt-2 shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'Sending OTP...'
            ) : (
              <>
                <span>Send Code</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="code" className="text-xs font-semibold text-foreground">
              6-Digit Verification Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <ShieldCheck className="size-4" />
              </div>
              <Input
                id="code"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="pl-9 text-center text-lg font-mono tracking-widest"
                disabled={isSubmitting}
                autoFocus
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full font-semibold gap-2 shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'Verifying...'
            ) : (
              <>
                <Lock className="size-4" />
                <span>Verify & Log In</span>
              </>
            )}
          </Button>

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => setStep('request')}
              className="text-muted-foreground hover:text-foreground font-medium"
            >
              Change phone/email
            </button>

            <button
              type="button"
              onClick={() => handleRequestOtp({ preventDefault: () => {} } as React.FormEvent)}
              disabled={cooldown > 0 || isSubmitting}
              className="text-primary hover:underline font-semibold disabled:text-muted-foreground disabled:no-underline flex items-center gap-1"
            >
              <RotateCcw className="size-3" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4 pt-2 border-t border-border/60">
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <span>Prefer password login?</span>
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Log in with password
          </Link>
        </div>
      </div>
    </div>
  );
}
