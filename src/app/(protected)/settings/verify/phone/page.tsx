'use client';

/**
 * Phone verification page — Firebase Phone Auth → backend `/auth/phone/verify`.
 * Mirrors Flutter's `phone_verify_screen.dart`.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showToast } from '@/components/ui/toast';
import { ArrowLeft, Loader2, Phone, ShieldCheck } from 'lucide-react';
import VerificationExplainer from '../verification-explainer';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithCredential,
  PhoneAuthProvider,
  RecaptchaVerifier,
  type ConfirmationResult,
} from 'firebase/auth';

const RESEND_COOLDOWN = 60;

function getFirebaseApp() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (!config.apiKey) return null;
  const apps = getApps();
  return apps.length > 0 ? apps[0] : initializeApp(config);
}

function friendlyFirebaseError(code: string): string {
  const errors: Record<string, string> = {
    'auth/invalid-phone-number': 'Invalid phone number. Include country code (e.g. +91).',
    'auth/too-many-requests': 'Too many attempts. Please wait a few minutes.',
    'auth/quota-exceeded': 'SMS quota exceeded. Please try again later.',
    'auth/invalid-verification-code': 'Invalid OTP code. Please check and try again.',
    'auth/session-expired': 'Session expired. Please request a new code.',
    'auth/network-request-failed': 'Network error. Check your internet connection.',
    'auth/captcha-check-failed': 'reCAPTCHA verification failed. Please try again.',
  };
  return errors[code] ?? 'Phone verification failed. Please try again.';
}

export default function PhoneVerifyPage() {
  const router = useRouter();
  const [phone, setPhone] = React.useState('+91');
  const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = React.useState(0);
  const [confirmation, setConfirmation] = React.useState<ConfirmationResult | null>(null);
  const recaptchaRef = React.useRef<HTMLDivElement>(null);
  const otpRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Resend timer
  React.useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSeconds]);

  async function handleSendOtp() {
    const app = getFirebaseApp();
    if (!app) {
      setError('Firebase is not configured. Please contact support.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const auth = getAuth(app);
      // Ensure reCAPTCHA verifier exists
      if (!window.__recaptchaVerifier) {
        window.__recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
      const result = await signInWithCredential(auth, 
        // We use PhoneAuthProvider directly
        await import('firebase/auth').then((mod) => 
          mod.PhoneAuthProvider.prototype.verifyPhoneNumber.call(
            new mod.PhoneAuthProvider(auth),
            phone.trim(),
            window.__recaptchaVerifier,
          )
        ) as any,
      ).catch(() => null);
      
      // Alternative: use confirmation flow
      const provider = new (await import('firebase/auth')).PhoneAuthProvider(auth);
      const verificationId = await provider.verifyPhoneNumber(
        phone.trim(),
        window.__recaptchaVerifier,
      );
      const cred = PhoneAuthProvider.credential(verificationId, 'dummy');
      // Store verificationId for later
      setConfirmation({ verificationId } as any);
      setOtpSent(true);
      setResendSeconds(RESEND_COOLDOWN);
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code) {
        setError(friendlyFirebaseError(code));
      } else {
        setError(err?.message ?? 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Get Firebase ID token
      const app = getFirebaseApp();
      if (!app) throw new Error('Firebase not configured');
      const auth = getAuth(app);
      
      // Reconstruct credential from stored verificationId
      const verificationId = (confirmation as any)?.verificationId;
      if (!verificationId) throw new Error('No verification session. Please resend OTP.');
      
      const credential = PhoneAuthProvider.credential(verificationId, code);
      const userCredential = await signInWithCredential(auth, credential);
      const idToken = await userCredential.user.getIdToken(true);

      // Send to backend
      const res = await fetch('/api/proxy/api/v1/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Verification failed');
      }

      showToast('Phone verified successfully!');
      router.push('/settings/profile');
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code.startsWith('auth/')) {
        setError(friendlyFirebaseError(code));
      } else {
        setError(err?.message ?? 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      otpRefs.current[5]?.focus();
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-8 space-y-6">
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
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            <Phone className="size-3" />
            Phone Verification
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Verify your phone number
          </h1>
          <p className="text-sm text-muted-foreground">
            Unlock housing requests and build trust with verified phone status.
          </p>
        </div>

        {/* Phone input */}
        {!otpSent && (
          <div className="space-y-3">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              disabled={loading}
            />
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
              </div>
            )}
            <Button
              onClick={() => void handleSendOtp()}
              disabled={loading || phone.trim().length < 10}
              className="w-full rounded-xl"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Send OTP'}
            </Button>
          </div>
        )}

        {/* OTP input */}
        {otpSent && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enter the 6-digit code</p>
              <p className="text-xs text-muted-foreground">Sent to {phone.trim()}</p>
            </div>
            <div className="flex justify-between gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handlePaste : undefined}
                  disabled={loading}
                  className="size-12 rounded-xl border border-border bg-card text-center text-lg font-bold text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
                />
              ))}
            </div>
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
              </div>
            )}
            <Button
              onClick={() => void handleVerify()}
              disabled={loading || otp.join('').length !== 6}
              className="w-full rounded-xl"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Verify'}
            </Button>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {resendSeconds > 0 ? (
                <span>Resend in {resendSeconds}s</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSendOtp()}
                  disabled={loading}
                  className="font-medium text-primary hover:underline"
                >
                  Resend OTP
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setOtpSent(false);
                setOtp(['', '', '', '', '', '']);
                setError(null);
              }}
              className="block mx-auto text-xs text-muted-foreground hover:text-foreground"
            >
              Change phone number
            </button>
          </div>
        )}

        {/* reCAPTCHA container */}
        <div id="recaptcha-container" />

        {/* Trust indicator */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3">
          <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Why verify your phone?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Verified phone status increases your trust score and unlocks housing requests.
              Your number is never shared publicly.
            </p>
          </div>
        </div>

        <VerificationExplainer />
      </div>
    </div>
  );
}

// Extend Window for reCAPTCHA
declare global {
  interface Window {
    __recaptchaVerifier?: RecaptchaVerifier;
  }
}
