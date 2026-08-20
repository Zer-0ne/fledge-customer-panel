/**
 * User Settings API Service
 * `GET/PUT /api/v1/settings` (batch, 1..50) + `GET/PUT /api/v1/settings/:key`.
 * Keys are fixed by USER_SETTING_KEYS on the backend:
 * language, theme, marketingOptOut, availabilityReminders,
 * contactShareReminders, chatNotifications, compactMode.
 * Reference: backend user-settings module.
 */

import { apiFetch } from '@/lib/api/client';
import { UpdateUserSettingsPayload, UserSetting, UserSettingKey, UserSettingValue } from '@/types';

/**
 * Maps a raw user setting into a UserSetting.
 */
export function mapRawToUserSetting(item: unknown): UserSetting {
  const raw = (item || {}) as Record<string, unknown>;

  const value = raw.value ?? raw.settingValue ?? '';
  let normalizedValue: string | number | boolean = String(value ?? '');
  if (typeof value === 'boolean') normalizedValue = value;
  else if (typeof value === 'number') normalizedValue = value;

  return {
    key: String(raw.key || '') as UserSettingKey,
    value: normalizedValue,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

/**
 * Normalizes user settings responses (object map or array).
 */
export function normalizeUserSettingsResponse(res: unknown): UserSetting[] {
  if (!res) return [];

  if (Array.isArray(res)) {
    return res.map(mapRawToUserSetting);
  }

  if (typeof res === 'object' && res !== null) {
    const obj = res as Record<string, unknown>;

    // Map of { key: value } (e.g. settings from GET /settings)
    const directMap = Object.entries(obj).filter(
      ([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
    );
    if (directMap.length > 0) {
      return directMap.map(([key, value]) => ({
        key: key as UserSettingKey,
        value: value as UserSettingValue,
      }));
    }

    if (Array.isArray(obj.data)) return (obj.data as unknown[]).map(mapRawToUserSetting);
    if (Array.isArray(obj.items)) return (obj.items as unknown[]).map(mapRawToUserSetting);
    if (Array.isArray(obj.settings)) return (obj.settings as unknown[]).map(mapRawToUserSetting);
  }

  return [];
}

/**
 * Fetches all user settings (`GET /settings`).
 */
export async function fetchUserSettings(): Promise<UserSetting[]> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/settings',
    method: 'GET',
  });
  return normalizeUserSettingsResponse(res);
}

/**
 * Batch-updates user settings (`PUT /settings`).
 */
export async function updateUserSettings(payload: UpdateUserSettingsPayload): Promise<UserSetting[]> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/settings',
    method: 'PUT',
    body: payload,
  });
  return normalizeUserSettingsResponse(res);
}

/**
 * Fetches a single user setting (`GET /settings/:key`).
 */
export async function fetchUserSetting(key: UserSettingKey): Promise<UserSetting> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/settings/${key}`,
    method: 'GET',
  });

  const raw =
    typeof res === 'object' && res !== null && 'data' in res
      ? (res as { data: unknown }).data
      : res;

  return mapRawToUserSetting(raw);
}

/**
 * Updates a single user setting (`PUT /settings/:key`).
 */
export async function updateUserSetting(key: UserSettingKey, value: UserSetting['value']): Promise<UserSetting> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/settings/${key}`,
    method: 'PUT',
    body: { value },
  });

  const raw =
    typeof res === 'object' && res !== null && 'data' in res
      ? (res as { data: unknown }).data
      : res;

  return mapRawToUserSetting(raw);
}
