'use client';

import * as React from 'react';
import { ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react';
import {
  uploadMediaPipeline,
  getMediaDownloadUrl,
  waitForMediaStatus,
  deleteMediaAsset,
} from '@/lib/api/services/media';
import { MediaPurpose, MediaRejectionReason } from '@/types';
import { cn } from '@/lib/utils';

interface PickedImage {
  mediaId: string;
  url?: string;
}

interface MediaPickerProps {
  value: PickedImage[];
  onChange: (images: PickedImage[]) => void;
  purpose?: MediaPurpose;
  maxCount?: number;
  disabled?: boolean;
  /** Show a "processing media" banner while uploads are in flight. */
  onUploadingChange?: (uploading: boolean) => void;
}

/** Human-readable reason for a rejected upload (shown instead of a stuck spinner). */
const REJECTION_MESSAGES: Record<Exclude<MediaRejectionReason, null>, string> = {
  contact_in_image: 'Image rejected: it contains contact details (phone, WhatsApp, email, website, or QR).',
  qr_code_detected: 'Image rejected: QR codes are not allowed in personal posts.',
  promotional_layout: 'Image rejected: it looks like promotional content rather than a real photo.',
  reposted_rejected_media: 'Image rejected: this image was previously rejected on the platform.',
  technical_validation_failed: 'Image rejected: the file could not be processed. Try a different image.',
};

/**
 * Waits for the media worker to finish via the realtime socket event, then
 * resolves the preview URL. Rejected uploads throw with a user-facing message
 * instead of leaving the picker stuck on a spinner.
 */
async function resolvePreviewUrl(mediaId: string): Promise<string> {
  const status = await waitForMediaStatus(mediaId);
  if (status.status === 'rejected' || status.moderationStatus === 'rejected') {
    const reason = status.rejectionReason ?? 'technical_validation_failed';
    throw new Error(REJECTION_MESSAGES[reason] ?? REJECTION_MESSAGES.technical_validation_failed);
  }
  const download = await getMediaDownloadUrl(mediaId);
  return download.url;
}

/**
 * Community media picker (Phase 12): pick images → presigned upload pipeline →
 * returns media ids. Shows transient 'Uploading'/'Processing media' states and
 * a contact-in-image reminder. Never sends session cookies to the storage host.
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

  const reportUploading = (active: boolean) => {
    setUploading(active);
    onUploadingChange?.(active);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    reportUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (value.length >= maxCount) break;
        const mediaId = await uploadMediaPipeline(file, { purpose });
        // Resolve a preview URL after the worker finishes; rejected uploads
        // throw with a clear reason instead of hanging on the spinner.
        const url = await resolvePreviewUrl(mediaId);
        onChange([...value, { mediaId, url }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload image');
    } finally {
      reportUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeImage = async (index: number) => {
    const image = value[index];
    const next = value.filter((_, i) => i !== index);
    onChange(next);
    if (image?.mediaId) {
      try {
        await deleteMediaAsset(image.mediaId);
      } catch {
        // Non-critical: the media row will be cleaned up server-side on expiry.
      }
    }
  };

  const remaining = Math.max(0, maxCount - value.length);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {value.map((image, index) => (
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
            <button
              type="button"
              aria-label={`Remove photo ${index + 1}`}
              onClick={() => removeImage(index)}
              className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}

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
          Uploading and processing media…
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <p className="text-[11px] text-muted-foreground">
        Use actual photos of the room or flat. Images containing contact details
        (phone numbers, WhatsApp, emails, URLs or QR codes) are rejected.
      </p>
    </div>
  );
}
