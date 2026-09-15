'use client';

import * as React from 'react';
import { ImagePlus, Loader2, ShieldAlert, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import {
  uploadMediaPipeline,
  getMediaDownloadUrl,
  getMediaStatus,
  waitForMediaStatus,
  deleteMediaAsset,
} from '@/lib/api/services/media';
import { MediaPurpose, MediaRejectionReason, MediaStatusResponse } from '@/types';
import { cn } from '@/lib/utils';

export interface PickedImage {
  mediaId: string;
  url?: string;
}

interface MediaPickerProps {
  value: PickedImage[];
  /**
   * React state setter for the parent's selection. The picker uses functional
   * updates so several photos (and late verdicts) can land without racing on a
   * stale copy of `value`.
   */
  onChange: React.Dispatch<React.SetStateAction<PickedImage[]>>;
  purpose?: MediaPurpose;
  maxCount?: number;
  disabled?: boolean;
  /**
   * Fires while any picked photo is still uploading or still waiting for its
   * moderation verdict — posting flows use it to keep submit disabled, so a
   * pending or rejected photo can never ride into a published post.
   */
  onUploadingChange?: (uploading: boolean) => void;
}

/** Human-readable reason for a rejected upload (shown instead of a stuck spinner). */
const REJECTION_MESSAGES: Record<Exclude<MediaRejectionReason, null>, string> = {
  contact_in_image: 'Photo removed: it shows contact details (phone, WhatsApp, email, website or QR). Post the room, not your number.',
  qr_code_detected: 'Photo removed: QR codes are not allowed in personal posts.',
  promotional_layout: 'Photo removed: it looks like promotional or broker artwork rather than a real photo of the room.',
  reposted_rejected_media: 'Photo removed: this image was rejected on Fledge before and cannot be re-uploaded.',
  technical_validation_failed: 'Photo removed: the file could not be processed. Try a different image.',
};

/** Verdict of one uploaded photo, as far as the client knows it. */
type Verdict =
  | { state: 'checking' }
  | { state: 'approved'; url?: string }
  | { state: 'rejected'; reason: Exclude<MediaRejectionReason, null> }
  | { state: 'unverified' };

/** Realtime first (fast path), then bounded polling — the queue can lag. */
const POLL_DELAYS_MS = [2_000, 3_000, 4_000, 5_000, 6_000, 8_000, 10_000, 12_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

function verdictFromStatus(status: MediaStatusResponse): Verdict {
  if (status.moderationStatus === 'rejected' || status.status === 'rejected') {
    return { state: 'rejected', reason: status.rejectionReason ?? 'technical_validation_failed' };
  }
  if (status.moderationStatus === 'approved' && status.status === 'ready') {
    return { state: 'approved' };
  }
  // `deleted` (removed elsewhere) is not a verdict we can act on.
  return { state: 'checking' };
}

/**
 * Resolves a photo's moderation verdict. Approved photos resolve fast; the
 * pipeline analyses in a queue, so a slow worker must not be mistaken for a
 * pass — that is exactly how promo artwork used to slip into a post. Everything
 * after the realtime wait is a bounded poll; an unknown verdict is reported as
 * `unverified`, never as approval.
 */
async function resolveVerdict(mediaId: string, isCancelled: () => boolean): Promise<Verdict> {
  try {
    const status = await waitForMediaStatus(mediaId, { timeoutMs: 20_000 });
    const fast = verdictFromStatus(status);
    if (fast.state !== 'checking') return fast;
  } catch {
    // Realtime unavailable or too slow — polling below is the safety net.
  }
  for (const delay of POLL_DELAYS_MS) {
    if (isCancelled()) return { state: 'unverified' };
    await sleep(delay);
    try {
      const status = await getMediaStatus(mediaId);
      const verdict = verdictFromStatus(status);
      if (verdict.state !== 'checking') {
        if (verdict.state === 'approved') {
          const download = await getMediaDownloadUrl(mediaId);
          return { state: 'approved', url: download.url };
        }
        return verdict;
      }
    } catch {
      // Transient read failure — keep polling until the window closes.
    }
  }
  return { state: 'unverified' };
}

/**
 * Community media picker (Phase 12): pick photos → presigned upload pipeline →
 * moderation verdict per photo. Rejected artwork is removed from the selection
 * with the reason shown; nothing is handed back to the parent while its verdict
 * is still unknown, so posting flows can keep submit disabled.
 */
export function MediaPicker({
  value,
  onChange,
  purpose = 'community',
  maxCount = 10,
  disabled = false,
  onUploadingChange,
}: MediaPickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verdicts, setVerdicts] = React.useState<Record<string, Verdict>>({});
  const cancelled = React.useRef<Set<string>>(new Set());
  const inFlight = React.useRef(0);

  const reportUploading = (active: boolean) => {
    setUploading(active);
    onUploadingChange?.(active);
  };

  const startCheck = () => {
    inFlight.current += 1;
    reportUploading(true);
  };

  const finishCheck = () => {
    inFlight.current = Math.max(0, inFlight.current - 1);
    if (inFlight.current === 0) reportUploading(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const room = Math.max(0, maxCount - value.length);
    for (const file of Array.from(files).slice(0, room)) {
      const localUrl = URL.createObjectURL(file);
      startCheck();
      try {
        const mediaId = await uploadMediaPipeline(file, { purpose });
        // Instant preview; the verdict arrives below and decides its fate.
        onChange((prev) => (prev.length >= maxCount ? prev : [...prev, { mediaId, url: localUrl }]));
        setVerdicts((prev) => ({ ...prev, [mediaId]: { state: 'checking' } }));

        void resolveVerdict(mediaId, () => cancelled.current.has(mediaId)).then((verdict) => {
          if (cancelled.current.has(mediaId)) return;
          setVerdicts((prev) => ({ ...prev, [mediaId]: verdict }));
          if (verdict.state === 'rejected') {
            setError(REJECTION_MESSAGES[verdict.reason] ?? REJECTION_MESSAGES.technical_validation_failed);
            onChange((prev) => prev.filter((image) => image.mediaId !== mediaId));
          } else if (verdict.state === 'approved' && verdict.url) {
            const approvedUrl = verdict.url;
            onChange((prev) => prev.map((image) => (
              image.mediaId === mediaId ? { ...image, url: approvedUrl } : image
            )));
          }
        }).finally(() => { finishCheck(); });
      } catch (err) {
        finishCheck();
        setError(err instanceof Error ? err.message : 'Could not upload photo');
      }
    }
  };

  const removeImage = async (index: number) => {
    const image = value[index];
    if (!image) return;
    cancelled.current.add(image.mediaId);
    onChange((prev) => prev.filter((_, i) => i !== index));
    setVerdicts((prev) => {
      const next = { ...prev };
      delete next[image.mediaId];
      return next;
    });
    try {
      await deleteMediaAsset(image.mediaId);
    } catch {
      // Non-critical: the media row will be cleaned up server-side on expiry.
    }
  };

  const remaining = Math.max(0, maxCount - value.length);
  const unverified = value.filter((image) => verdicts[image.mediaId]?.state === 'unverified').length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {value.map((image, index) => {
          const verdict = verdicts[image.mediaId];
          return (
            <div
              key={image.mediaId}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted"
            >
              {image.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.url}
                  alt={`Room photo ${index + 1}`}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {verdict?.state === 'checking' && (
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/65 px-2 py-1 text-[10px] font-medium text-white">
                  <Loader2 className="size-3 animate-spin" />
                  Checking…
                </div>
              )}
              {verdict?.state === 'approved' && (
                <div className="absolute left-1.5 top-1.5 rounded-full bg-emerald-600/90 p-1 text-white" title="Checked — looks like a real photo">
                  <ShieldCheck className="size-3.5" />
                </div>
              )}
              {verdict?.state === 'unverified' && (
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-amber-600/85 px-2 py-1 text-[10px] font-medium text-white">
                  <ShieldAlert className="size-3" />
                  Not checked yet
                </div>
              )}
              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => removeImage(index)}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}

        {remaining > 0 && (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground',
              (disabled || uploading) && 'opacity-50 pointer-events-none'
            )}
          >
            {uploading ? (
              <UploadCloud className="size-5 animate-pulse" />
            ) : (
              <ImagePlus className="size-5" />
            )}
            <span className="text-[11px] font-medium">
              {uploading ? 'Uploading…' : 'Add photo'}
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {uploading && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Uploading and checking every photo…
        </p>
      )}

      {unverified > 0 && (
        <p className="text-xs text-amber-600">
          {unverified === 1 ? 'One photo is' : `${String(unverified)} photos are`} still being checked —
          {' '}your post stays private until the check passes.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <p className="text-[11px] text-muted-foreground">
        Use real photos of the room or flat. Promotional artwork, broker flyers, QR codes
        and images with phone numbers, WhatsApp, emails or websites are rejected automatically.
      </p>
    </div>
  );
}
