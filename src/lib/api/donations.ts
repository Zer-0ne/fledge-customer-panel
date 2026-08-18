/**
 * Donations API — customer panel.
 * Calls the backend donations module through the BFF proxy; Razorpay checkout
 * uses only the key id + provider order id returned by the backend.
 */
import { apiFetch } from '@/lib/api/client';

export interface DonationOrder {
  id: string;
  amountPaise: number;
  currency: string;
  frequency: 'once' | 'monthly';
  status: string;
  providerOrderId: string | null;
  providerSubscriptionId?: string | null;
  razorpayKeyId?: string;
}

export interface VerifyDonationInput {
  donationId: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function readString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

export function normalizeDonationOrder(raw: unknown): DonationOrder | null {
  if (!isObject(raw)) return null;
  const id = readString(raw.id);
  if (!id) return null;
  return {
    id,
    amountPaise: typeof raw.amountPaise === 'number' ? raw.amountPaise : 0,
    currency: readString(raw.currency) ?? 'INR',
    frequency: raw.frequency === 'monthly' ? 'monthly' : 'once',
    status: readString(raw.status) ?? 'PENDING',
    providerOrderId: readString(raw.providerOrderId),
    providerSubscriptionId: readString(raw.providerSubscriptionId),
    razorpayKeyId: readString(raw.razorpayKeyId) ?? undefined,
  };
}

export async function createDonationOrder(amountPaise: number, frequency: 'once' | 'monthly'): Promise<DonationOrder | null> {
  const raw = await apiFetch<unknown>({
    path: '/api/v1/donations/orders',
    method: 'POST',
    body: { amountPaise, frequency },
  });
  return normalizeDonationOrder(raw);
}

export async function verifyDonationPayment(input: VerifyDonationInput): Promise<{ id: string; status: string } | null> {
  const raw = await apiFetch<unknown>({
    path: '/api/v1/donations/verify',
    method: 'POST',
    body: input,
  });
  return isObject(raw) ? (raw as unknown as { id: string; status: string }) : null;
}
