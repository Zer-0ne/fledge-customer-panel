/**
 * College Rules API Service
 * `GET /api/v1/colleges/:collegeId/rules` — active rules for a college
 * (ordered by category, then title). Public endpoint, no auth needed.
 * Reference: backend college-rules module.
 */

import { apiFetch } from '@/lib/api/client';
import { CollegeRule } from '@/types';

/**
 * Maps a raw college rule into a CollegeRule.
 */
export function mapRawToCollegeRule(item: unknown): CollegeRule {
  const raw = (item || {}) as Record<string, unknown>;

  return {
    id: String(raw.id || ''),
    collegeId: String(raw.collegeId || ''),
    category: String(raw.category || 'General'),
    title: String(raw.title || ''),
    body: String(raw.body || ''),
    isActive: raw.isActive === undefined ? true : Boolean(raw.isActive),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || raw.createdAt || new Date().toISOString()),
  };
}

/**
 * Normalizes college rules responses (array or envelope).
 */
export function normalizeCollegeRulesResponse(res: unknown): CollegeRule[] {
  if (!res) return [];

  let items: unknown[] = [];
  if (Array.isArray(res)) {
    items = res;
  } else if (typeof res === 'object' && res !== null) {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) items = obj.data;
    else if (Array.isArray(obj.items)) items = obj.items;
    else if (Array.isArray(obj.rules)) items = obj.rules;
  }

  return items.map(mapRawToCollegeRule);
}

/**
 * Fetches active rules for a college.
 */
export async function fetchCollegeRules(collegeId: string): Promise<CollegeRule[]> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/colleges/${collegeId}/rules`,
    method: 'GET',
  });

  return normalizeCollegeRulesResponse(res);
}
