'use client';

/**
 * UPI Identity Verification page — mirrors Flutter's `upi_verify_screen.dart`.
 *
 * Flow: initiate ₹1 Razorpay UPI mandate → user approves → verify status.
 * Auto-cancelled after verification. No actual charge.
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import { browserApiFetch } from '@/lib/api/client';
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Copy,
  CheckCircle2,
  XCircle,
  Smartphone,
  Info,
} from 'lucide-react';
import VerificationExplainer from '../verification-explainer';

export default function UpiVerifyPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [mandateActive, setMandateActive] = React.useState(false);
  const [shortUrl, setShortUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [upiUnavailable, setUpiUnavailable] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const unavailablePattern = /only available in.*mode/i;

  async function handleInitiate() {
    setLoading(true);
    setError(null);
    setUpiUnavailable(false);
    try {
      const res = await browserApiFetch('/api/v1/verification/upi/initiate', {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = data.message ?? 'Failed to initiate verification';
        if (unavailablePattern.test(msg)) {
          setUpiUnavailable(true);
          return;
        }
        throw new Error(msg);
      }
      const data = await res.json();
      const url = data?.shortUrl ?? data?.checkoutUrl ?? null;
      if (!url) {
        setError('Verification link could not be created. Try again.');
        return;
      }
      setShortUrl(url);
      setMandateActive(true);
    } catch (err: any) {
      const msg = err?.message ?? 'Failed to initiate verification';
      if (unavailablePattern.test(msg)) {
        setUpiUnavailable(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    setError(null);
    try {
      await browserApiFetch('/api/v1/verification/upi/cancel', { method: 'POST' });
    } catch {
      // best-effort
    }
    setMandateActive(false);
    setShortUrl(null);
    setLoading(false);
  }

  async function handleCheck() {
    setChecking(true);
    try {
      const res = await browserApiFetch('/api/v1/auth/me');
      if (!res.ok) throw new Error('Failed to check status');
      const data = await res.json();
      const method = data?.user?.verificationMethod ?? data?.verificationMethod;
      if (method === 'UPI_OTM') {
        showToast('Verified successfully!');
        router.push('/settings/profile');
      } else {
        showToast('Not verified yet. Approve the mandate first.');
      }
    } catch (err: any) {
      showToast(err?.message ?? 'Check failed');
    } finally {
      setChecking(false);
    }
  }

  function handleCopy() {
    if (!shortUrl) return;
    navigator.clipboard.writeText(shortUrl).then(() => {
      setCopied(true);
      showToast('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    });
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

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            <Smartphone className="size-3" />
            UPI Verification
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Verify via UPI
          </h1>
          <p className="text-sm text-muted-foreground">
            Block ₹1 temporarily to prove you are real. Auto-cancelled after verification.
          </p>
        </div>

        {/* UPI unavailable banner */}
        {upiUnavailable && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">UPI verification unavailable</p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed">
                UPI OTM verification is only available in production mode. Contact support to enable it.
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Not started state */}
        {!mandateActive && !upiUnavailable && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">₹1 Auto-Cancel Mandate</p>
                  <p className="text-xs text-muted-foreground">Temporary hold, never charged</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                <p>1. We create a ₹1 UPI mandate via Razorpay</p>
                <p>2. You approve it in your UPI app</p>
                <p>3. Verification is confirmed automatically</p>
                <p>4. The mandate is cancelled — no money is deducted</p>
              </div>
            </div>

            <Button
              onClick={() => void handleInitiate()}
              disabled={loading}
              className="w-full rounded-xl"
            >
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Smartphone className="size-4 mr-2" />}
              Start verification
            </Button>
          </div>
        )}

        {/* Mandate active state */}
        {mandateActive && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ExternalLink className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Approve the mandate</p>
                  <p className="text-xs text-muted-foreground">Tap the link below to open in your UPI app</p>
                </div>
              </div>

              {/* Checkout link */}
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-3">
                <a
                  href={shortUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-sm text-primary font-medium truncate hover:underline"
                >
                  {shortUrl}
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copied ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                </button>
              </div>

              <Button
                onClick={() => window.open(shortUrl!, '_blank')}
                className="w-full rounded-xl gap-2"
              >
                <ExternalLink className="size-4" />
                Open in UPI app
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => void handleCheck()}
                disabled={checking}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                {checking ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
                Check status
              </Button>
              <Button
                onClick={() => void handleCancel()}
                disabled={loading}
                variant="ghost"
                className="rounded-xl text-destructive hover:text-destructive"
              >
                <XCircle className="size-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3">
          <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Why verify via UPI?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              UPI verification is the fastest way to prove you&apos;re a real person. It increases
              your trust score and unlocks housing requests. Your UPI ID is never shared.
            </p>
          </div>
        </div>

        <VerificationExplainer />
      </div>
    </div>
  );
}
