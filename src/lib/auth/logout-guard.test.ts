import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  beginLogout,
  endLogout,
  guardedAuthFetch,
  isLoggingOut,
} from './logout-guard';

afterEach(() => {
  endLogout();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('logout-guard', () => {
  it('lets auth fetches through when not logging out', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await guardedAuthFetch('/api/auth/socket-token', { method: 'POST' });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(isLoggingOut()).toBe(false);
  });

  it('aborts in-flight auth fetches when logout begins', async () => {
    let seenSignal: AbortSignal | undefined;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      seenSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
        );
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const pending = guardedAuthFetch('/api/auth/socket-token', { method: 'POST' });
    expect(seenSignal?.aborted).toBe(false);

    beginLogout();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(seenSignal?.aborted).toBe(true);
    expect(isLoggingOut()).toBe(true);
  });

  it('refuses new auth fetches while logging out', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    beginLogout();

    await expect(
      guardedAuthFetch('/api/auth/socket-token', { method: 'POST' })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resumes normal operation after endLogout', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    beginLogout();
    endLogout();

    await expect(
      guardedAuthFetch('/api/auth/socket-token', { method: 'POST' })
    ).resolves.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(isLoggingOut()).toBe(false);
  });
});
