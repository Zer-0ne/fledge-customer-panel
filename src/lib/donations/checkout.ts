/**
 * Razorpay checkout adapter for donations (customer panel).
 * Loads the official checkout.js only when an order exists; the key secret
 * never exists in the browser. Success is verified server-side by HMAC.
 */
import { verifyDonationPayment, type DonationOrder, type VerifyDonationInput } from '@/lib/api/donations';

export type DonationCheckoutState =
  | { phase: 'idle' }
  | { phase: 'open' }
  | { phase: 'paid'; id: string }
  | { phase: 'failed'; message: string }
  | { phase: 'unavailable'; message: string };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Razorpay checkout requires a browser'));
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay checkout script')));
      return;
    }
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export async function openDonationCheckout(order: DonationOrder, prefill?: { name?: string; email?: string; contact?: string }): Promise<DonationCheckoutState> {
  try {
    await loadRazorpayScript();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout script unavailable';
    return { phase: 'unavailable', message };
  }
  if (!window.Razorpay) return { phase: 'unavailable', message: 'Razorpay checkout is not available in this browser' };
  if (!order.razorpayKeyId || (!order.providerOrderId && !order.providerSubscriptionId)) {
    return { phase: 'unavailable', message: 'Payment provider is not configured' };
  }

  return new Promise<DonationCheckoutState>((resolve) => {
    const options: Record<string, unknown> = {
      key: order.razorpayKeyId,
      amount: order.amountPaise,
      currency: order.currency ?? 'INR',
      name: 'Fledge',
      description: `Donation (${order.frequency === 'monthly' ? 'monthly' : 'one-time'})`,
      prefill,
      modal: { ondismiss: () => resolve({ phase: 'failed', message: 'Checkout closed before payment completed' }) },
      handler: async (response: Record<string, unknown>) => {
        const input: VerifyDonationInput = {
          donationId: order.id,
          razorpay_order_id: typeof response.razorpay_order_id === 'string' ? response.razorpay_order_id : undefined,
          razorpay_subscription_id: typeof response.razorpay_subscription_id === 'string' ? response.razorpay_subscription_id : undefined,
          razorpay_payment_id: typeof response.razorpay_payment_id === 'string' ? response.razorpay_payment_id : '',
          razorpay_signature: typeof response.razorpay_signature === 'string' ? response.razorpay_signature : '',
        };
        try {
          const result = await verifyDonationPayment(input);
          resolve(result ? { phase: 'paid', id: result.id } : { phase: 'failed', message: 'Payment verification failed' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Payment verification failed';
          resolve({ phase: 'failed', message });
        }
      },
    };
    if (order.frequency === 'monthly' && order.providerSubscriptionId) {
      options.subscription_id = order.providerSubscriptionId;
    } else if (order.providerOrderId) {
      options.order_id = order.providerOrderId;
    } else {
      resolve({ phase: 'failed', message: 'Payment provider is not configured' });
      return;
    }
    const razorpay = new window.Razorpay!(options);
    razorpay.open();
  });
}
