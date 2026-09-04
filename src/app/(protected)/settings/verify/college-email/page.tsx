'use client';

/**
 * College Email Verification page.
 *
 * Flow: enter college email → request 6-digit code → enter code → verified
 * immediately (deterministic, no Hermes review). Grants the membership-only
 * 'College Verified' badge — never a student/faculty role badge.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Loader2,
  MailCheck,
  RefreshCw,
  Shield,
} from 'lucide-react';
import VerificationExplainer from '../verification-explainer';

type Step = 'email' | 'code' | 'done';

function errorMessage(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
    const nested = (data as { error?: unknown }).error;
    if (typeof nested === 'string' && nested.length > 0) return nested;
  }
  return fallback;
}

export default function CollegeEmailVerifyPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>('email');
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [expiresIn, setExpiresIn] = React.useState<number | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleRequest(isResend = false) {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/.test(trimmed)) {
      showToast('Enter a valid college email address');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/proxy/api/v1/student-verifications/college-email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorMessage(data, 'Could not send code'));
      if (typeof (data as { expiresInSeconds?: unknown }).expiresInSeconds === 'number') {
        setExpiresIn((data as { expiresInSeconds: number }).expiresInSeconds);
      }
      setStep('code');
      setCooldown(60);
      if (!isResend) showToast('Code sent! Check your college inbox.');
      else showToast('New code sent!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not send code');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (!/^\d{6}$/.test(code.trim())) {
      showToast('Enter the 6-digit code');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/proxy/api/v1/student-verifications/college-email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(errorMessage(data, 'Verification failed'));
      setStep('done');
      showToast('College email verified!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="rounded-xl text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-600 dark:text-sky-400">
            <MailCheck className="size-3" />
            College Email Verification
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Verify with your college email
          </h1>
          <p className="text-sm text-muted-foreground">
            Instant verification — a 6-digit code, no document upload. Earns the College Verified badge.
          </p>
        </div>

        {step === 'done' ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-3">
            <CheckCircle2 className="size-10 text-emerald-500 mx-auto" />
            <p className="text-base font-bold text-foreground">You are College Verified!</p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 px-3 py-1 text-xs font-bold text-sky-600 dark:text-sky-400">
              <BadgeCheck className="size-3.5" />
              College Verified
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This proves you belong to {email.trim().toLowerCase()}. Want a student or faculty badge too? Upload your ID on the verification page.
            </p>
            <Button onClick={() => router.push('/settings/profile')} className="rounded-xl">
              Go to profile
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="college-email" className="text-xs font-medium text-muted-foreground">
                College email address
              </label>
              <input
                id="college-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@college.ac.in"
                value={email}
                disabled={step === 'code' || busy}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50"
              />
              <p className="text-[11px] text-muted-foreground">
                Use your official college address. Gmail, Yahoo, Outlook etc. are not accepted.
              </p>
            </div>

            {step === 'email' ? (
              <Button onClick={() => void handleRequest(false)} disabled={busy} className="w-full rounded-xl">
                {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : <MailCheck className="size-4 mr-2" />}
                Send verification code
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="college-otp" className="text-xs font-medium text-muted-foreground">
                    6-digit code{expiresIn ? ` (expires in ${Math.max(1, Math.round(expiresIn / 60))} min)` : ''}
                  </label>
                  <input
                    id="college-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    maxLength={6}
                    value={code}
                    disabled={busy}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm tracking-[0.3em] text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50"
                  />
                </div>
                <Button onClick={() => void handleVerify()} disabled={busy} className="w-full rounded-xl">
                  {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : <Shield className="size-4 mr-2" />}
                  Verify code
                </Button>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setCode(''); }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change email
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy || cooldown > 0}
                    onClick={() => void handleRequest(true)}
                    className="h-7 text-xs gap-1"
                  >
                    <RefreshCw className="size-3" />
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <VerificationExplainer />
      </div>
    </div>
  );
}
