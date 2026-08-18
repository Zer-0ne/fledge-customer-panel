import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateSha256Base64,
  validateMediaFile,
  normalizePresignedUploadResponse,
  requestPresignedUpload,
  confirmUploadComplete,
  getMediaDownloadUrl,
  getMediaStatus,
  waitForMediaStatus,
  deleteMediaAsset,
} from './media';
import * as clientModule from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

describe('Media Service (Phase 12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateMediaFile', () => {
    it('accepts JPEG/PNG/WebP under 10MB', () => {
      const file = new File(['x'], 'room.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 });
      expect(validateMediaFile(file).valid).toBe(true);
    });

    it('rejects unsupported formats', () => {
      const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
      const result = validateMediaFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/JPEG, PNG, and WebP/);
    });

    it('rejects files over 10MB', () => {
      const file = new File(['x'], 'big.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
      expect(validateMediaFile(file).valid).toBe(false);
    });
  });

  describe('calculateSha256Base64', () => {
    it('computes the canonical base64 SHA-256 of file bytes', async () => {
      const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
      const digest = await calculateSha256Base64(file);
      // SHA-256 of "hello" (base64)
      expect(digest).toBe('LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=');
    });
  });

  describe('normalizePresignedUploadResponse', () => {
    it('unwraps the nested { id, upload: { url, headers } } envelope', () => {
      const normalized = normalizePresignedUploadResponse({
        data: {
          id: 'media_1',
          status: 'PENDING',
          upload: {
            url: 'https://storage.example.com/upload',
            headers: { 'x-amz-credential': 'abc' },
            method: 'PUT',
          },
          expiresAt: '2026-08-04T00:00:00Z',
        },
      });
      expect(normalized.id).toBe('media_1');
      expect(normalized.uploadUrl).toBe('https://storage.example.com/upload');
      expect(normalized.method).toBe('PUT');
      expect(normalized.headers?.['x-amz-credential']).toBe('abc');
    });

    it('throws when the response is missing the upload url', () => {
      expect(() => normalizePresignedUploadResponse({ id: 'media_1' })).toThrow(
        /missing media id or uploadUrl/
      );
    });
  });

  describe('requestPresignedUpload', () => {
    it('requests a community-purpose presigned upload via the BFF', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({
        data: {
          id: 'media_2',
          status: 'PENDING',
          upload: { url: 'https://storage.example.com/up', headers: {}, method: 'PUT' },
          expiresAt: '2026-08-04T00:00:00Z',
        },
      });
      const file = new File(['x'], 'room.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 2048 });

      const result = await requestPresignedUpload(file, 'community');

      const call = vi.mocked(clientModule.apiFetch).mock.calls[0][0] as {
        path: string;
        method: string;
        body: Record<string, unknown>;
      };
      expect(call.path).toBe('/api/v1/media/uploads');
      expect(call.method).toBe('POST');
      expect(call.body.mimeType).toBe('image/png');
      expect(call.body.sizeBytes).toBe(2048);
      expect(call.body.visibility).toBe('private');
      expect(call.body.purpose).toBe('community');
      expect(typeof call.body.checksumSha256).toBe('string');
      expect(result.id).toBe('media_2');
    });
  });

  describe('confirmUploadComplete / getMediaDownloadUrl / deleteMediaAsset', () => {
    it('confirms completion', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({});
      await confirmUploadComplete('media_2');
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/media/media_2/complete',
        method: 'POST',
      });
    });

    it('fetches a download url', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({
        url: 'https://storage.example.com/down?token=abc',
        expiresAt: '2026-08-04T00:00:00Z',
      });
      const download = await getMediaDownloadUrl('media_2');
      expect(download.url).toContain('storage.example.com');
      expect(download.expiresAt).toBe('2026-08-04T00:00:00Z');
    });

    it('surfaces rejection reasons via the status endpoint', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({
        id: 'media_2',
        status: 'rejected',
        moderationStatus: 'rejected',
        rejectionReason: 'qr_code_detected',
      });
      const status = await getMediaStatus('media_2');
      expect(status.status).toBe('rejected');
      expect(status.rejectionReason).toBe('qr_code_detected');
    });

    it('waits for a terminal state via the socket event', async () => {
      // Socket path: token fetch fails → timeout safety net does ONE read.
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({
        id: 'media_2',
        status: 'ready',
        moderationStatus: 'approved',
        rejectionReason: null,
      });
      const status = await waitForMediaStatus('media_2', { timeoutMs: 4_000 });
      expect(status.status).toBe('ready');
    });

    it('deletes a media asset', async () => {
      vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({});
      await deleteMediaAsset('media_2');
      expect(clientModule.apiFetch).toHaveBeenCalledWith({
        path: '/api/v1/media/media_2',
        method: 'DELETE',
      });
    });
  });
});
