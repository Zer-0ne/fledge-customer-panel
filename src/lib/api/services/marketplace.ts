/**
 * Marketplace surround — resale goods, local services, utility board.
 *
 * Backed by /api/v1/resale-*, /api/v1/service-* and /api/v1/utility-* (all
 * location-scoped by city/locality free text, so one build serves every city).
 */
import { apiFetch } from '@/lib/api/client';

// ── Resale (second-hand goods) ──────────────────────────────────────────────

export const RESALE_CATEGORIES = [
  { code: 'cooler', label: 'Cooler' },
  { code: 'fridge', label: 'Fridge' },
  { code: 'almari', label: 'Almari' },
  { code: 'washing_machine', label: 'Washing machine' },
  { code: 'bed', label: 'Bed' },
  { code: 'study_table', label: 'Study table' },
  { code: 'ro', label: 'RO / purifier' },
  { code: 'ac', label: 'AC' },
  { code: 'electronics', label: 'Electronics' },
  { code: 'furniture', label: 'Furniture' },
  { code: 'books', label: 'Books' },
  { code: 'kitchenware', label: 'Kitchenware' },
  { code: 'other', label: 'Other' },
] as const;

export type ResaleCategory = typeof RESALE_CATEGORIES[number]['code'];

export interface ResalePost {
  id: string;
  sellerId: string;
  category: string;
  title: string;
  description: string;
  pricePaise: number;
  negotiable: boolean;
  condition: 'new' | 'like_new' | 'used';
  mediaIds: string[];
  locality: string | null;
  streetLabel: string | null;
  cityCode: string | null;
  status: 'active' | 'reserved' | 'sold' | 'expired' | 'removed';
  /** Photo moderation state: 'pending' → visible to the seller only. */
  mediaState?: 'pending' | 'approved';
  createdAt: string;
}

export interface ResaleInterest {
  id: string;
  postId: string;
  userId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: string;
  postTitle: string;
  postStatus: string;
}

export interface Page<T> { items: T[]; nextCursor: string | null }

function unwrapPage<T>(res: unknown): Page<T> {
  const raw = (res ?? {}) as { items?: T[]; nextCursor?: string | null };
  return { items: Array.isArray(raw.items) ? raw.items : [], nextCursor: raw.nextCursor ?? null };
}

export async function fetchResalePosts(filters?: { category?: string; locality?: string; limit?: number }): Promise<Page<ResalePost>> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.locality) params.set('locality', filters.locality);
  params.set('limit', String(filters?.limit ?? 30));
  const res = await apiFetch<unknown>({ path: `/api/v1/resale-posts?${params.toString()}` });
  return unwrapPage<ResalePost>(res);
}

export async function createResalePost(params: {
  category: ResaleCategory; title: string; description: string; pricePaise: number;
  negotiable?: boolean; condition?: 'new' | 'like_new' | 'used'; locality: string;
  streetLabel?: string; cityCode?: string; mediaIds?: string[];
}): Promise<ResalePost> {
  return await apiFetch<ResalePost>({ path: '/api/v1/resale-posts', method: 'POST', body: params });
}

export async function fetchMyResaleInterests(): Promise<ResaleInterest[]> {
  const res = await apiFetch<ResaleInterest[] | { items?: ResaleInterest[] }>({ path: '/api/v1/resale-interests' });
  return Array.isArray(res) ? res : res.items ?? [];
}

export async function expressResaleInterest(postId: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/resale-posts/${postId}/interests`, method: 'POST', body: {} });
}

export async function markResaleSold(postId: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/resale-posts/${postId}/sold`, method: 'POST', body: {} });
}

// ── Local services directory ────────────────────────────────────────────────

export const SERVICE_CATEGORIES = [
  { code: 'maid', label: 'Maid / house help' },
  { code: 'cook', label: 'Cook' },
  { code: 'tiffin', label: 'Tiffin / mess' },
  { code: 'laundry', label: 'Laundry' },
  { code: 'plumber', label: 'Plumber' },
  { code: 'electrician', label: 'Electrician' },
  { code: 'carpenter', label: 'Carpenter' },
  { code: 'keymaker', label: 'Key maker' },
  { code: 'water_tanker', label: 'Water tanker' },
  { code: 'wifi_install', label: 'WiFi installation' },
  { code: 'other', label: 'Other' },
] as const;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number]['code'];

export interface ServiceProvider {
  id: string;
  userId: string;
  category: string;
  displayName: string;
  description: string | null;
  priceNote: string | null;
  experienceYears: number | null;
  locality: string | null;
  cityCode: string | null;
  verifiedAt: string | null;
  ratingSum: number;
  ratingCount: number;
  rating?: number | null;
  status: string;
  createdAt: string;
  reviews?: { id: string; rating: number; comment: string | null; createdAt: string }[];
}

export interface ServiceEnquiry {
  id: string;
  providerId: string;
  requesterId: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed' | 'withdrawn';
  createdAt: string;
  providerName: string;
  providerCategory: string;
}

export async function fetchServiceProviders(filters?: { category?: string; locality?: string; limit?: number }): Promise<Page<ServiceProvider>> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.locality) params.set('locality', filters.locality);
  params.set('limit', String(filters?.limit ?? 30));
  const res = await apiFetch<unknown>({ path: `/api/v1/service-providers?${params.toString()}` });
  return unwrapPage<ServiceProvider>(res);
}

export async function fetchServiceProvider(id: string): Promise<ServiceProvider> {
  return await apiFetch<ServiceProvider>({ path: `/api/v1/service-providers/${id}` });
}

export async function registerServiceProvider(params: {
  category: ServiceCategory; displayName: string; locality: string;
  description?: string; priceNote?: string; experienceYears?: number; cityCode?: string;
}): Promise<ServiceProvider> {
  return await apiFetch<ServiceProvider>({ path: '/api/v1/service-providers', method: 'POST', body: params });
}

export async function sendServiceEnquiry(providerId: string, message: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/service-providers/${providerId}/enquiries`, method: 'POST', body: { message } });
}

export async function fetchServiceEnquiries(direction: 'received' | 'sent' = 'received'): Promise<ServiceEnquiry[]> {
  const res = await apiFetch<ServiceEnquiry[] | { items?: ServiceEnquiry[] }>({ path: `/api/v1/service-enquiries?direction=${direction}` });
  return Array.isArray(res) ? res : res.items ?? [];
}

export async function decideServiceEnquiry(id: string, status: 'accepted' | 'declined' | 'completed' | 'withdrawn'): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/service-enquiries/${id}`, method: 'PATCH', body: { status } });
}

export async function reviewServiceProvider(providerId: string, rating: number, comment?: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/service-providers/${providerId}/reviews`, method: 'POST', body: { rating, comment } });
}

// ── Utility status board ────────────────────────────────────────────────────

export const UTILITY_KINDS = [
  { code: 'water', label: 'Water', icon: '💧' },
  { code: 'power', label: 'Power', icon: '⚡' },
  { code: 'gas', label: 'Gas', icon: '🔥' },
  { code: 'other', label: 'Other', icon: '📣' },
] as const;

export const UTILITY_STATUSES = [
  { code: 'available', label: 'Available' },
  { code: 'unavailable', label: 'Not available' },
  { code: 'intermittent', label: 'On and off' },
  { code: 'restored', label: 'Back now' },
] as const;

export interface UtilityReport {
  id: string;
  authorId: string;
  kind: string;
  status: string;
  locality: string | null;
  streetLabel: string | null;
  cityCode: string | null;
  note: string | null;
  confirmations: number;
  disputes: number;
  expiresAt: string;
  createdAt: string;
}

export async function fetchUtilityBoard(filters?: { kind?: string; locality?: string }): Promise<UtilityReport[]> {
  const params = new URLSearchParams();
  if (filters?.kind) params.set('kind', filters.kind);
  if (filters?.locality) params.set('locality', filters.locality);
  const res = await apiFetch<UtilityReport[] | { items?: UtilityReport[] }>({ path: `/api/v1/utility-board?${params.toString()}` });
  return Array.isArray(res) ? res : res.items ?? [];
}

export async function postUtilityReport(params: {
  kind: string; status: string; locality: string; streetLabel?: string;
  cityCode?: string; note?: string; ttlMinutes?: number;
}): Promise<UtilityReport> {
  return await apiFetch<UtilityReport>({ path: '/api/v1/utility-reports', method: 'POST', body: params });
}

export async function voteUtilityReport(reportId: string, vote: 'confirm' | 'dispute'): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/utility-reports/${reportId}/votes`, method: 'POST', body: { vote } });
}

export async function retractUtilityReport(reportId: string): Promise<void> {
  await apiFetch<unknown>({ path: `/api/v1/utility-reports/${reportId}`, method: 'DELETE' });
}

/** ₹ formatting shared by the marketplace screens. */
export function formatInr(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

/** "3h left" / "45m left" — utility posts are racing the clock. */
export function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes}m left`;
  return `${Math.round(minutes / 60)}h left`;
}
