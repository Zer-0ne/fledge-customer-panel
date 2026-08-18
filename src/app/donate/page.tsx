'use client';

import * as React from 'react';
import Link from 'next/link';
import { HeartHandshake, ShieldCheck, Sparkles, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showToast } from '@/components/ui/toast';
import { createDonationOrder } from '@/lib/api/donations';
import { openDonationCheckout } from '@/lib/donations/checkout';

const AMOUNTS = [100, 250, 500, 1000];

const IMPACT = [
  { icon: Sparkles, title: 'Better listings', text: 'Helps us keep the platform free for students and tenants.' },
  { icon: ShieldCheck, title: 'Safer community', text: 'Funds moderation, verification, and fraud prevention.' },
  { icon: Users, title: 'More reach', text: 'Supports housing drives for students across campuses.' },
];

export default function DonatePage() {
  const [amount, setAmount] = React.useState<number>(250);
  const [custom, setCustom] = React.useState('');
  const [frequency, setFrequency] = React.useState<'once' | 'monthly'>('once');
  const [processing, setProcessing] = React.useState(false);

  const selected = custom ? Math.max(1, Number(custom) || 0) : amount;

  const handleDonate = async () => {
    if (!selected) {
      showToast({ type: 'error', title: 'Enter an amount', description: 'Please pick or enter a donation amount.' });
      return;
    }
    setProcessing(true);
    try {
      const order = await createDonationOrder(selected * 100, frequency);
      if (!order) {
        showToast({ type: 'error', title: 'Could not create order', description: 'The payment provider is unavailable right now.' });
        return;
      }
      const state = await openDonationCheckout(order);
      if (state.phase === 'paid') {
        showToast({
          type: 'success',
          title: 'Thank you for your support!',
          description: `${frequency === 'monthly' ? 'Monthly' : 'One-time'} donation of ₹${selected.toLocaleString('en-IN')} received.`,
        });
      } else if (state.phase === 'failed') {
        showToast({ type: 'error', title: 'Payment not completed', description: state.message });
      } else if (state.phase === 'unavailable') {
        showToast({ type: 'error', title: 'Payment unavailable', description: state.message });
      }
    } catch (error) {
      showToast({ type: 'error', title: 'Donation failed', description: error instanceof Error ? error.message : 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HeartHandshake className="size-7" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Support Flat Finder</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Flat Finder runs free for students and tenants. A small donation helps us keep listings verified,
          moderation active, and the community safe for everyone.
        </p>
      </div>

      {/* Donation card */}
      <div className="mx-auto mt-8 max-w-lg rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        {/* Frequency toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(['once', 'monthly'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrequency(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                frequency === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'once' ? 'One-time' : 'Monthly'}
            </button>
          ))}
        </div>

        {/* Amount presets */}
        <div className="mt-5 grid grid-cols-4 gap-2">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => { setAmount(a); setCustom(''); }}
              className={`rounded-xl border px-2 py-3 text-sm font-semibold transition-colors ${
                !custom && amount === a
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-foreground hover:border-primary/50 hover:bg-muted'
              }`}
            >
              ₹{a}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="mt-4">
          <label htmlFor="custom-amount" className="text-xs font-medium text-muted-foreground">
            Or enter a custom amount
          </label>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
            <Input
              id="custom-amount"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Enter amount"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ''))}
              className="pl-7"
            />
          </div>
        </div>

        {/* Donate button */}
        <Button
          size="lg"
          className="mt-6 w-full gap-2"
          onClick={handleDonate}
          disabled={processing}
        >
          {processing ? <Loader2 className="size-4 animate-spin" /> : <HeartHandshake className="size-4" />}
          {processing ? 'Processing...' : `Donate ₹${selected ? selected.toLocaleString('en-IN') : '—'}${frequency === 'monthly' ? ' / month' : ''}`}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Secured by Razorpay · 100% of donations go toward platform running costs.
        </p>
      </div>

      {/* Impact */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {IMPACT.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border bg-card p-5">
            <Icon className="size-5 text-primary" />
            <h3 className="mt-3 text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Having trouble donating?{' '}
        <Link href="/contact" className="font-medium text-primary hover:underline">Contact support</Link>
      </p>
    </div>
  );
}
