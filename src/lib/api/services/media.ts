/**
 * Media Upload & Download Service (Community Feed Integrity — Phase 12)
 * Presigned upload flow: request → PUT bytes to storage → confirm complete.
 * Media for personal posts must use purpose='community'; verification
 * evidence uses purpose='verification' (private, never analyzed).
 */

import { io, type Socket } from 'socket.io-client';
import { apiFetch } from '@/lib/api/client';
import {
  AllowedMimeType,
  MediaDownloadResponse,
  MediaPurpose,
  MediaStatusResponse,
  PresignedUploadResponse,
} from '@/types';

const ALLOWED_MIME_TYPES: AllowedMimeType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10MB

/** Canonical base64 SHA-256 of a file's bytes (required by the backend). */
export async function calculateSha256Base64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  const bytes = new Uint8Array(digest);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function validateMediaFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      valid: false,
      error: 'Unsupported image format. Only JPEG, PNG, and WebP are allowed.',
    };
  }
  if (file.size === 0) {
    return { valid: false, error: 'File cannot be empty.' };
  }
  if (file.size > MAX_MEDIA_BYTES) {
    return { valid: false, error: 'File exceeds the maximum size limit of 10MB.' };
  }
  return { valid: true };
}

/** Normalizes the nested { id, upload: { url, headers }, expiresAt } envelope. */
export function normalizePresignedUploadResponse(
  data: Record<string, unknown>
): PresignedUploadResponse {
  const payload =
    data && typeof data === 'object' && 'data' in data && data.data
      ? (data.data as Record<string, unknown>)
      : data;

  const upload =
    payload.upload && typeof payload.upload === 'object'
      ? (payload.upload as Record<string, unknown>)
      : undefined;

  const id = String(payload.id || payload.mediaId || '');
  const uploadUrl = String(
    upload?.url || payload.uploadUrl || payload.presignedUrl || payload.url || ''
  );
  const method = String(upload?.method || payload.method || 'PUT').toUpperCase();
  const headers =
    upload?.headers && typeof upload.headers === 'object'
      ? (upload.headers as Record<string, string>)
      : undefined;

  if (!id || !uploadUrl) {
    throw new Error('Invalid presigned upload response: missing media id or uploadUrl');
  }

  return { id, uploadUrl, method, headers };
}

/** Requests a presigned upload URL for a community/verification image. */
export async function requestPresignedUpload(
  file: File,
  purpose: MediaPurpose = 'community'
): Promise<PresignedUploadResponse> {
  const checksumSha256 = await calculateSha256Base64(file);
  const res = await apiFetch<unknown>({
    path: '/api/v1/media/uploads',
    method: 'POST',
    body: {
      mimeType: file.type as AllowedMimeType,
      sizeBytes: file.size,
      checksumSha256,
      visibility: 'private',
      purpose,
    },
  });

  const payload = (typeof res === 'object' && res !== null
    ? res
    : {}) as Record<string, unknown>;
  return normalizePresignedUploadResponse(payload);
}

/**
 * Direct upload to the presigned storage URL.
 * Deliberately sends NO backend session/auth headers to the storage host.
 */
export async function uploadToStorage(
  uploadUrl: string,
  file: File,
  options: {
    method?: string;
    headers?: Record<string, string>;
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  } = {}
): Promise<void> {
  const method = (options.method || 'PUT').toUpperCase();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, uploadUrl, true);
    xhr.withCredentials = false;

    if (file.type) xhr.setRequestHeader('Content-Type', file.type);

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        const lower = key.toLowerCase();
        // Never forward session/auth headers to storage; content-type is set above.
        if (lower === 'authorization' || lower === 'cookie' || lower === 'content-type') {
          continue;
        }
        xhr.setRequestHeader(key, value);
      }
    }

    if (options.onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          options.onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        options.onProgress?.(100);
        resolve();
      } else {
        reject(
          new Error(`Storage upload failed with HTTP status ${xhr.status}: ${xhr.statusText || 'Upload rejected'}`)
        );
      }
    };
    xhr.onerror = () => reject(new Error('Network error during direct storage upload'));
    xhr.onabort = () => reject(new Error('Upload cancelled by user'));

    if (options.signal) {
      options.signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });
}

/** Confirms the upload with the backend after the file reached storage. */
export async function confirmUploadComplete(mediaId: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/media/${encodeURIComponent(mediaId)}/complete`,
    method: 'POST',
  });
}

/** Requests a short-lived download URL for a media asset. */
export async function getMediaDownloadUrl(mediaId: string): Promise<MediaDownloadResponse> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/media/${encodeURIComponent(mediaId)}/download`,
    method: 'GET',
  });
  const payload = (typeof res === 'object' && res !== null
    ? res
    : {}) as Record<string, unknown>;
  const url = String(payload.url || payload.downloadUrl || payload.presignedUrl || '');
  if (!url) throw new Error(`Invalid download response for media ${mediaId}`);
  return { url, expiresAt: typeof payload.expiresAt === 'string' ? payload.expiresAt : undefined };
}

/** Fetches the owner's media processing/moderation status (used to surface rejections). */
export async function getMediaStatus(mediaId: string): Promise<MediaStatusResponse> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/media/${encodeURIComponent(mediaId)}/status`,
    method: 'GET',
  });
  return (typeof res === 'object' && res !== null
    ? res
    : {}) as MediaStatusResponse;
}

/** Terminal media states that resolve the picker's waiting upload. */
type TerminalMediaState = 'ready' | 'rejected';

interface MediaStatusEvent {
  id: string;
  status: TerminalMediaState;
  moderationStatus: 'approved' | 'rejected';
  rejectionReason: string | null;
}

function socketUrl(): string {
  const value = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (!value) throw new Error('Realtime media status is not configured (NEXT_PUBLIC_SOCKET_URL).');
  return value.replace(/\/$/, '');
}

/**
 * Waits for a media upload to reach a terminal state using the realtime
 * `media:status` socket event pushed by the media worker (via Redis → chat
 * gateway → user room). NO polling — the socket event resolves the wait. A
 * single status read happens only after the timeout as a safety net.
 */
export async function waitForMediaStatus(
  mediaId: string,
  options: { timeoutMs?: number } = {},
): Promise<MediaStatusResponse> {
  const timeoutMs = options.timeoutMs ?? 15_000;
  return new Promise<MediaStatusResponse>((resolve, reject) => {
    let settled = false;
    let socket: Socket | null = null;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket?.disconnect();
      // Safety net: ONE final status read (no polling), then give up.
      void getMediaStatus(mediaId).then(resolve).catch(() => {
        reject(new Error('Timed out waiting for media processing'));
      });
    }, timeoutMs);

    const finish = (status: MediaStatusResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      socket?.disconnect();
      resolve(status);
    };

    const onEvent = (payload: unknown) => {
      const event = (payload && typeof payload === 'object' ? payload : {}) as Partial<MediaStatusEvent>;
      if (event.id !== mediaId) return;
      if (event.status === 'ready' || event.status === 'rejected') {
        const reason = event.rejectionReason as MediaStatusResponse['rejectionReason'];
        finish({
          id: mediaId,
          status: event.status,
          moderationStatus: event.moderationStatus ?? 'rejected',
          rejectionReason: reason ?? null,
        });
      }
    };

    void (async () => {
      try {
        const tokenResponse = await fetch('/api/auth/socket-token', { method: 'POST', cache: 'no-store' });
        const tokenData = (await tokenResponse.json().catch(() => null)) as { token?: string } | null;
        if (!tokenResponse.ok || !tokenData?.token) throw new Error('no socket token');
        socket = io(socketUrl(), {
          autoConnect: false,
          transports: ['websocket', 'polling'],
          withCredentials: false,
          auth: { token: tokenData.token },
          reconnection: false,
          timeout: 6_000,
        });
        socket.on('media:status', onEvent);
        socket.connect();
      } catch {
        // Socket unavailable → the timeout safety net does one final read.
      }
    })();
  });
}

/** Deletes a media asset (used when removing a rejected/incorrect image). */
export async function deleteMediaAsset(mediaId: string): Promise<void> {
  await apiFetch<unknown>({
    path: `/api/v1/media/${encodeURIComponent(mediaId)}`,
    method: 'DELETE',
  });
}

/**
 * End-to-end upload pipeline: validate → checksum → presigned request →
 * storage PUT → complete. Returns the media id to include in a post's mediaIds.
 */
export async function uploadMediaPipeline(
  file: File,
  options: {
    purpose?: MediaPurpose;
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
  } = {}
): Promise<string> {
  const validation = validateMediaFile(file);
  if (!validation.valid) throw new Error(validation.error);

  const presigned = await requestPresignedUpload(file, options.purpose || 'community');

  await uploadToStorage(presigned.uploadUrl, file, {
    method: presigned.method,
    headers: presigned.headers,
    onProgress: options.onProgress,
    signal: options.signal,
  });

  await confirmUploadComplete(presigned.id);
  return presigned.id;
}
