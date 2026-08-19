/**
 * i18n Strings API Service
 * `GET /api/v1/i18n/strings?locale=en|hi` — server-side localized UI strings.
 * The backend serves exactly two locales: `en` and `hi`.
 * Reference: backend i18n module.
 */

import { apiFetch } from '@/lib/api/client';
import { I18nStrings } from '@/types';

function unwrap<T>(res: unknown): T {
  if (typeof res === 'object' && res !== null && 'data' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

/**
 * Fetches localized strings for a locale (`GET /i18n/strings`).
 */
export async function fetchI18nStrings(locale: string): Promise<I18nStrings> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/i18n/strings',
    method: 'GET',
    params: { locale },
  });

  const raw = unwrap<Record<string, unknown>>(res);

  const strings =
    typeof raw.strings === 'object' && raw.strings !== null
      ? Object.fromEntries(
          Object.entries(raw.strings as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')])
        )
      : {};

  return {
    locale: String(raw.locale || locale || 'en'),
    supported: Array.isArray(raw.supported) ? (raw.supported as unknown[]).map(String) : ['en', 'hi'],
    strings,
  };
}
