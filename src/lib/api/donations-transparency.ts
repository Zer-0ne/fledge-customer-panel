/**
 * Donations transparency API — customer panel (Phase 6/14 extension).
 * Server-authoritative config + monthly funding summary + Recent Supporters
 * wall + donor privacy preferences. The client NEVER hardcodes goals,
 * presets or enablement; the backend owns all of it.
 */
import { apiFetch } from '@/lib/api/client';

export interface DonationConfigSummary {
  donationsEnabled: boolean;
  monthlyGoalPaise: number;
  currency: string;
  suggestedAmountsPaise: number[];
  allowCustomAmount: boolean;
  supporterWallEnabled: boolean;
  foundingSupporterEnabled: boolean;
  minimumDonationPaise: number;
  maximumDonationPaise: number;
  amountRaisedPaise: number;
  supporterCount: number;
  currentMonth: string;
}

export interface SupporterEntry {
  displayName: string;
  amountPaise: number | null;
  currency: string | null;
  isFoundingSupporter: boolean;
  paidAt: string;
}

export interface SupportersPage {
  items: SupporterEntry[];
  nextCursor: string | null;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function normalizeDonationConfig(raw: unknown): DonationConfigSummary {
  const o = isObject(raw) ? raw : {};
  const summary = isObject(o.summary) ? o.summary : {};
  return {
    donationsEnabled: o.donationsEnabled === true,
    monthlyGoalPaise: num(summary.monthlyGoalPaise),
    currency: typeof o.currency === 'string' ? o.currency : 'INR',
    suggestedAmountsPaise: Array.isArray(o.suggestedAmountsPaise)
      ? o.suggestedAmountsPaise.filter((v): v is number => typeof v === 'number')
      : [],
    allowCustomAmount: o.allowCustomAmount !== false,
    supporterWallEnabled: o.supporterWallEnabled === true,
    foundingSupporterEnabled: o.foundingSupporterEnabled === true,
    minimumDonationPaise: num(o.minimumDonationAmountPaise, 100),
    maximumDonationPaise: num(o.maximumDonationAmountPaise, 10_000_000),
    amountRaisedPaise: num(summary.amountRaisedPaise),
    supporterCount: num(summary.supporterCount),
    currentMonth: typeof summary.currentMonth === 'string' ? summary.currentMonth : '',
  };
}

export async function fetchDonationConfig(): Promise<DonationConfigSummary> {
  const raw = await apiFetch<unknown>({ path: '/api/v1/donations/config', method: 'GET' });
  return normalizeDonationConfig(raw);
}

export function normalizeSupportersPage(raw: unknown): SupportersPage {
  const o = isObject(raw) ? raw : {};
  const items = Array.isArray(o.items) ? o.items : [];
  return {
    items: items.map((item) => {
      const e = isObject(item) ? item : {};
      return {
        displayName: typeof e.displayName === 'string' && e.displayName.length > 0 ? e.displayName : 'Anonymous',
        amountPaise: typeof e.amountPaise === 'number' ? e.amountPaise : null,
        currency: typeof e.currency === 'string' ? e.currency : null,
        isFoundingSupporter: e.isFoundingSupporter === true,
        paidAt: typeof e.paidAt === 'string' ? e.paidAt : '',
      };
    }),
    nextCursor: typeof o.nextCursor === 'string' && o.nextCursor.length > 0 ? o.nextCursor : null,
  };
}

export async function fetchSupporters(cursor?: string): Promise<SupportersPage> {
  const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=20` : '?limit=20';
  const raw = await apiFetch<unknown>({ path: `/api/v1/donations/supporters${qs}`, method: 'GET' });
  return normalizeSupportersPage(raw);
}

export async function setDonorPreferences(input: {
  donationId: string;
  isPublic: boolean;
  showAmount: boolean;
  useProfileName?: boolean;
  customDisplayName?: string;
}): Promise<boolean> {
  await apiFetch<unknown>({ path: '/api/v1/donations/preferences', method: 'POST', body: input });
  return true;
}
