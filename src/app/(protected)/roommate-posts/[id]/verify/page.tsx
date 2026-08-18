'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, KeyRound, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import { fetchMyRoommatePosts } from '@/lib/api/services/roommates';
import {
  requestTenantVerification,
  submitLivePhoto,
  submitVerificationEvidence,
  refreshVerificationCode,
  fetchMyVerifications,
  VERIFICATION_METHODS,
} from '@/lib/api/services/integrity';
import { uploadMediaPipeline } from '@/lib/api/services/media';
import { RoommatePost, TenantVerification, VerificationMethod } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';

const EVIDENCE_METHODS: VerificationMethod[] = [
  'REDACTED_RENT_RECEIPT',
  'REDACTED_RENTAL_AGREEMENT',
  'MANUAL_VIDEO_REVIEW',
];

const CONFIRMATION_METHODS: VerificationMethod[] = [
  'EXISTING_ROOMMATE_CONFIRMATION',
  'PROPERTY_OWNER_CONFIRMATION',
  'PROPERTY_MANAGER_CONFIRMATION',
];

export default function VerifyPostPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const postId = React.use(params).id;

  const [post, setPost] = React.useState<RoommatePost | null>(null);
  const [verifications, setVerifications] = React.useState<TenantVerification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [method, setMethod] = React.useState<VerificationMethod>('LIVE_ROOM_PHOTO_WITH_CODE');
  const [requesting, setRequesting] = React.useState(false);
  const [verificationId, setVerificationId] = React.useState<string | null>(null);
  const [liveCode, setLiveCode] = React.useState<string | null>(null);
  const [codeInput, setCodeInput] = React.useState('');
  const [evidenceMediaId, setEvidenceMediaId] = React.useState<string | null>(null);
  const [evidenceUploading, setEvidenceUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const refreshVerifications = React.useCallback(async () => {
    const mine = await fetchMyVerifications();
    setVerifications(mine.filter((verification) => verification.postId === postId));
  }, [postId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const mine = await fetchMyRoommatePosts();
      if (cancelled) return;
      const found = mine.find((item) => item.id === postId);
      if (!found) {
        setLoadError('Post not found or you do not own this post.');
        setLoading(false);
        return;
      }
      setPost(found);
      await refreshVerifications();
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, refreshVerifications]);

  const activeVerification = verifications.find(
    (verification) => verification.status === 'PENDING' || verification.status === 'UNDER_REVIEW'
  );

  const startRequest = async () => {
    setRequesting(true);
    try {
      const result = await requestTenantVerification(postId, method);
      setVerificationId(result.verificationId);
      setLiveCode(result.liveCode ?? null);
      await refreshVerifications();
      showToast({
        title: 'Verification started',
        description:
          method === 'LIVE_ROOM_PHOTO_WITH_CODE'
            ? 'Your one-time code is shown below — use it once.'
            : 'Follow the steps for your chosen method.',
        variant: 'default',
      });
    } catch (err) {
      showToast({
        title: 'Could not start verification',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleRefreshCode = async () => {
    if (!verificationId) return;
    try {
      const result = await refreshVerificationCode(verificationId);
      setLiveCode(result.liveCode);
      showToast({ title: 'New code issued', description: 'The previous code is no longer valid.', variant: 'default' });
    } catch (err) {
      showToast({
        title: 'Could not refresh code',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    }
  };

  const handleLivePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationId || !evidenceMediaId) return;
    if (!/^\d{6}$/.test(codeInput)) {
      showToast({ title: 'Invalid code', description: 'Enter the 6-digit code shown to you.', variant: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      await submitLivePhoto(verificationId, codeInput, evidenceMediaId);
      showToast({ title: 'Photo submitted', description: 'Your live room photo is being verified.', variant: 'default' });
      await refreshVerifications();
      setEvidenceMediaId(null);
      setCodeInput('');
    } catch (err) {
      showToast({
        title: 'Could not submit photo',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!verificationId) return;
    setEvidenceUploading(true);
    try {
      // Private evidence: purpose='verification' — never analyzed, never public.
      const mediaId = await uploadMediaPipeline(file, { purpose: 'verification' });
      await submitVerificationEvidence(verificationId, mediaId);
      showToast({ title: 'Evidence submitted', description: 'Your evidence is being reviewed privately.', variant: 'default' });
      await refreshVerifications();
    } catch (err) {
      showToast({
        title: 'Could not submit evidence',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setEvidenceUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto max-w-2xl px-4 sm:px-6 space-y-4">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (loadError || !post) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto max-w-2xl px-4 sm:px-6">
          <ErrorState title="Cannot verify this post" description={loadError ?? 'Post not found'} />
        </div>
      </div>
    );
  }

  const verified = verifications.find((verification) => verification.status === 'VERIFIED');

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto max-w-2xl px-4 sm:px-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/roommate-posts')} className="rounded-xl text-muted-foreground hover:text-foreground gap-1.5">
          <ArrowLeft className="size-4" />
          Back to my posts
        </Button>

        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" />
            Verify your tenant context
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Proving you actually live in (or are leaving) the flat helps personal
            posts stay personal.
          </p>
        </div>

        {verified && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Verification complete
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                {post.title} is verified on {new Date(verified.verifiedAt ?? verified.requestedAt).toLocaleDateString()}.
              </p>
            </div>
          </div>
        )}

        {!verified && !activeVerification && !verificationId && (
          <>
            <div className="rounded-3xl border border-border/60 bg-card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Choose a verification method</h2>
              <div className="space-y-2" role="radiogroup" aria-label="Verification method">
                {VERIFICATION_METHODS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={method === option.value}
                    onClick={() => setMethod(option.value)}
                    className={cn(
                      'flex w-full flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors',
                      method === option.value
                        ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/60 bg-card hover:border-border'
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">{option.label}</span>
                    <span className="text-xs text-muted-foreground">{option.hint}</span>
                  </button>
                ))}
              </div>
              <Button onClick={startRequest} disabled={requesting} className="rounded-xl font-semibold">
                {requesting ? 'Starting…' : 'Start verification'}
              </Button>
            </div>
          </>
        )}

        {verificationId && (
          <div className="rounded-3xl border border-border/60 bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Complete verification</h2>
              <span className="text-[11px] text-muted-foreground">Reference: {verificationId.slice(0, 8)}…</span>
            </div>

            {liveCode && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center space-y-2">
                <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <KeyRound className="size-3.5" />
                  Your one-time code — shown only once
                </p>
                <p className="font-mono text-3xl font-bold tracking-[0.3em] text-foreground">{liveCode}</p>
                <Button variant="outline" size="sm" onClick={handleRefreshCode} className="rounded-lg">
                  <RefreshCw className="size-3.5" />
                  Get a new code
                </Button>
              </div>
            )}

            {method === 'LIVE_ROOM_PHOTO_WITH_CODE' && (
              <form onSubmit={handleLivePhoto} className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-foreground">
                    Live room photo — with the code clearly visible
                  </span>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setEvidenceUploading(true);
                      try {
                        const mediaId = await uploadMediaPipeline(file, { purpose: 'verification' });
                        setEvidenceMediaId(mediaId);
                      } catch (err) {
                        showToast({
                          title: 'Could not upload photo',
                          description: err instanceof Error ? err.message : 'Please try again.',
                          variant: 'error',
                        });
                      } finally {
                        setEvidenceUploading(false);
                      }
                    }}
                    className="rounded-xl file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-foreground">6-digit code</span>
                  <Input
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    placeholder="000000"
                    className="rounded-xl font-mono tracking-[0.3em]"
                  />
                </label>
                <Button type="submit" disabled={submitting || evidenceUploading || !evidenceMediaId || codeInput.length !== 6} className="rounded-xl font-semibold">
                  <UploadCloud className="size-4" />
                  {submitting ? 'Submitting…' : 'Submit live photo'}
                </Button>
              </form>
            )}

            {EVIDENCE_METHODS.includes(method) && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Upload {method === 'MANUAL_VIDEO_REVIEW' ? 'a short video of the room' : 'the document with all private details (amount, address, name) redacted'}. Your evidence stays private and is never shown to other users.
                </p>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/*"
                  onChange={handleEvidence}
                  disabled={evidenceUploading}
                  className="rounded-xl file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
                />
                {evidenceUploading && <p className="text-xs text-muted-foreground">Uploading private evidence…</p>}
              </div>
            )}

            {CONFIRMATION_METHODS.includes(method) && (
              <div className="space-y-2 rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="text-xs text-muted-foreground">
                  Share this verification reference with your{' '}
                  {method === 'EXISTING_ROOMMATE_CONFIRMATION'
                    ? 'roommate'
                    : method === 'PROPERTY_OWNER_CONFIRMATION'
                      ? 'property owner'
                      : 'property manager'}
                  . They must confirm your tenant context from their own account.
                </p>
                <code className="block rounded-lg bg-muted px-3 py-2 text-xs text-foreground select-all">
                  {verificationId}
                </code>
                <p className="text-[11px] text-muted-foreground">
                  Verification stays pending until they confirm.
                </p>
              </div>
            )}
          </div>
        )}

        {activeVerification && !verificationId && (
          <div className="rounded-3xl border border-border/60 bg-card p-6 text-center space-y-2">
            <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Verification pending</p>
            <p className="text-xs text-muted-foreground">
              {activeVerification.method === 'LIVE_ROOM_PHOTO_WITH_CODE'
                ? 'Your live photo is being checked.'
                : 'Your verification is under review.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
