/**
 * API Client & Query Parameter Serializer
 * Provides standard, secure data fetching layer with error normalization and 10s default timeout.
 */

import { env } from '@/lib/env';
import { normalizeApiError, ApiError } from './errors';

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  params?: Record<string, unknown>;
  body?: unknown;
  accessToken?: string;
  timeoutMs?: number;
  baseUrl?: string;
}

/**
 * Serializes query parameters into a URL query string.
 * Strips undefined, null, and empty string values.
 * Array values are expanded: `tags: ['a', 'b']` -> `tags=a&tags=b`.
 */
export function serializeQueryParams(params?: Record<string, unknown>): string {
  if (!params) return '';

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, String(item));
        }
      }
    } else {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Low-level API fetch wrapper with timeout, header management, and error normalization.
 * Security notice: Never logs access tokens or secrets.
 */
export async function apiFetch<T = unknown>(options: ApiFetchOptions): Promise<T> {
  const {
    method = 'GET',
    path,
    params,
    body,
    accessToken,
    timeoutMs = 10000,
    baseUrl,
    headers: customHeaders,
    signal: externalSignal,
    ...fetchOptions
  } = options;

  const queryString = serializeQueryParams(params);
  const targetBaseUrl =
    baseUrl || (typeof window === 'undefined' ? env.BACKEND_API_BASE_URL : env.NEXT_PUBLIC_API_BASE_URL);
  
  // Ensure path is properly formatted
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${targetBaseUrl}${cleanPath}${queryString}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Combine external abort signal if provided
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && body && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      method,
      headers,
      body: body && !(body instanceof FormData) ? JSON.stringify(body) : (body as BodyInit),
      signal: controller.signal,
      // Include cookies for same-origin proxy requests (cp_access_token session cookie)
      credentials: typeof window !== 'undefined' ? 'include' : 'omit',
    });

    clearTimeout(timeoutId);

    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    let responseData: unknown;
    if (isJson) {
      const text = await response.text();
      responseData = text ? JSON.parse(text) : {};
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      throw normalizeApiError(responseData, response.status);
    }

    return responseData as T;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw normalizeApiError({ message: 'Request timed out after 10 seconds', status: 408 }, 408);
    }

    throw normalizeApiError(error);
  }
}
