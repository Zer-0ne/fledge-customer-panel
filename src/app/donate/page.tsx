'use client';

import * as React from 'react';
import Link from 'next/link';
import { HeartHandshake, ShieldCheck, Sparkles, Users, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { showToast } from '@/components/ui/toast';
import { createDonationOrder } from '@/lib/api/donations';
import { openDonationCheckout } from '@/lib/donations/checkout';
import {
  fetchDonationConfig,
  fetchSupporters,
  setDonorPreferences,
  type DonationConfigSummary,
  type SupporterEntry,
} from '@/lib/api/donations-transparency';

const IMPACT = [
  { icon: Sparkles, title: 'Better listings', text: 'Helps us keep the platform free for students and tenants.' },
  { icon: ShieldCheck, title: 'Safer community', text: 'Funds moderation, verification, and fraud prevention.' },
  { icon: Users, title: 'More reach', text: 'Supports housing drives for students across campuses.' },
];

function inr(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

export default function DonatePage() {
  const [config, setConfig] = React.useState<DonationConfigSummary | null>(null);
  const [supporters, setSupporters] = React.useState<SupporterEntry[]>([]);
  const [amount, setAmount] = React.useState<number | null>(null);
  const [custom, setCustom] = React.useState('');
  const [frequency, setFrequency] = React.useState<'once' | 'monthly'>('once');
  const [processing, setProcessing] = React.useState(false);
  const customInputRef = React.useRef<HTMLInputElement | null>(null);

  // Consent modal state
  const [consentDonationId, setConsentDonationId] = React.useState<string | null>(null);
  const [consentPublic, setConsentPublic] = React.useState(false);
  const [consentShowAmount, setConsentShowAmount] = React.useState(false);
  const [consentUseProfile, setConsentUseProfile] = React.useState(true);
  const [consentCustomName, setConsentCustomName] = React.useState('');
  const [consentSaving, setConsentSaving] = React.useState(false);

  const loadConfig = React.useCallback(async () => {
    try {
      const cfg = await fetchDonationConfig();
      setConfig(cfg);
      setAmount((prev) => prev ?? (cfg.suggestedAmountsPaise.length > 1 ? cfg.suggestedAmountsPaise[1]! / 100 : null));
      if (cfg.supporterWallEnabled) {
        try {
          setSupporters((await fetchSupporters()).items.slice(0, 5));
        } catch {
          /* wall is optional */
        }
      }
    } catch {
      setConfig(null);
    }
  }, []);

  React.useEffect(() => { void loadConfig(); }, [loadConfig]);

  const presets = config?.suggestedAmountsPaise ?? [];
  const allowCustom = config?.allowCustomAmount ?? true;
  const selected = custom ? Math.max(1, Number(custom) || 0) : amount;

  const handleDonate = async () => {
    if (!config?.donationsEnabled) {
      showToast({ type: 'error', title: 'Contributions paused', description: 'Donations are currently disabled. Please check back later.' });
      return;
    }
    if (!selected || selected < config.minimumDonationPaise / 100) {
      showToast({ type: 'error', title: 'Enter an amount', description: 'Please pick or enter a donation amount.' });
      return;
    }
    if (!allowCustom && !presets.includes(selected * 100)) {
      showToast({ type: 'error', title: 'Custom amounts disabled', description: 'Please pick one of the suggested amounts.' });
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
        const donationId = state.id;
        showToast({
          type: 'success',
          title: 'Thank you for your support!',
          description: `${frequency === 'monthly' ? 'Monthly' : 'One-time'} contribution of ₹${selected.toLocaleString('en-IN')} received.`,
        });
        await loadConfig();
        // Show consent modal so user can opt-in to the supporters wall
        if (donationId) {
          setConsentDonationId(donationId);
          setConsentPublic(true);
          setConsentShowAmount(false);
          setConsentUseProfile(true);
          setConsentCustomName('');
        }
      } else if (state.phase === 'failed') {
        // The webhook may still land — the server decides the final state.
        showToast({ type: 'info', title: 'Payment not completed', description: `${state.message} If money was deducted, it will be confirmed or refunded automatically.` });
      } else if (state.phase === 'unavailable') {
        showToast({ type: 'error', title: 'Payment unavailable', description: state.message });
      }
    } catch (error) {
      showToast({ type: 'error', title: 'Donation failed', description: error instanceof Error ? error.message : 'Something went wrong.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleConsentSubmit = async () => {
    if (!consentDonationId) return;
    setConsentSaving(true);
    try {
      const ok = await setDonorPreferences({
        donationId: consentDonationId,
        isPublic: consentPublic,
        showAmount: consentPublic && consentShowAmount,
        ...(consentPublic && !consentUseProfile && consentCustomName.trim()
          ? { customDisplayName: consentCustomName.trim() }
          : {}),
        ...(consentPublic ? { useProfileName: consentUseProfile } : {}),
      });
      if (ok) {
        showToast({
          type: 'success',
          title: consentPublic ? 'You\'re on the wall!' : 'Thanks for your privacy choice.',
          description: consentPublic
            ? 'Your name will appear on the Recent Supporters wall.'
            : 'Your donation is private. You can change this anytime.',
        });
        await loadConfig();
        setConsentDonationId(null);
      } else {
        showToast({ type: 'error', title: 'Could not save preferences', description: 'Please try again or check your connection.' });
      }
    } catch {
      showToast({ type: 'error', title: 'Could not save preferences', description: 'Please try again or check your connection.' });
    } finally {
      setConsentSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <HeartHandshake className="size-7" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Keep Fledge Free</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          Fledge helps students find flats and roommates without making core features paid.
          Completely optional — every feature stays free either way.
        </p>
      </div>

      {/* Monthly goal — truthful server numbers */}
      {config && config.monthlyGoalPaise > 0 && (
        <div className="mx-auto mt-8 max-w-lg rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">This month&apos;s goal</h2>
            {config.currentMonth && (
              <span className="text-xs text-muted-foreground">{config.currentMonth}</span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{inr(config.amountRaisedPaise)}</span>
            <span className="text-sm text-muted-foreground">/ {inr(config.monthlyGoalPaise)}</span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={config.monthlyGoalPaise}
            aria-valuenow={config.amountRaisedPaise}
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${Math.min(100, Math.round((config.amountRaisedPaise / config.monthlyGoalPaise) * 100))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {config.supporterCount === 0
              ? 'No contributions yet this month — Fledge is still free for everyone.'
              : `${config.supporterCount} supporter${config.supporterCount === 1 ? '' : 's'} helped this month`}
          </p>
        </div>
      )}

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

        {/* Amount presets + Custom — server-configured */}
        {(presets.length > 0 || allowCustom) && (
          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Donation amount">
            {presets.map((paise) => (
              <button
                key={paise}
                type="button"
                aria-pressed={!custom && amount === paise / 100}
                onClick={() => { setAmount(paise / 100); setCustom(''); }}
                className={`min-w-[4.5rem] flex-1 rounded-xl border px-2 py-3 text-sm font-semibold transition-colors ${
                  !custom && amount === paise / 100
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:border-primary/50 hover:bg-muted'
                }`}
              >
                ₹{Math.round(paise / 100).toLocaleString('en-IN')}
              </button>
            ))}
            {allowCustom && (
              <button
                type="button"
                aria-pressed={custom !== ''}
                onClick={() => {
                  setAmount(null);
                  setCustom((c) => c);
                  requestAnimationFrame(() => customInputRef.current?.focus());
                }}
                className={`min-w-[4.5rem] flex-1 rounded-xl border border-dashed px-2 py-3 text-sm font-semibold transition-colors ${
                  custom !== ''
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted hover:text-foreground'
                }`}
              >
                Custom
              </button>
            )}
          </div>
        )}

        {/* Custom amount input — revealed/focused by the Custom chip */}
        {allowCustom && (
          <div className={`mt-4 transition-opacity ${custom === '' && amount !== null ? 'opacity-60' : ''}`}>
            <label htmlFor="custom-amount" className="text-xs font-medium text-muted-foreground">
              Or enter a custom amount
            </label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <Input
                id="custom-amount"
                ref={customInputRef}
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="Enter amount"
                value={custom}
                onChange={(e) => { setCustom(e.target.value.replace(/[^\d]/g, '')); if (e.target.value) setAmount(null); }}
                className="pl-7"
              />
            </div>
          </div>
        )}

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

      {/* Recent Supporters wall — only opt-in entries, projected server-side */}
      {config?.supporterWallEnabled && (
        <div className="mx-auto mt-10 max-w-lg">
          <h2 className="text-center text-sm font-semibold">Recent Supporters ❤️</h2>
          {supporters.length === 0 ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              No public supporters yet this month — be the first, or stay private. Both are perfectly fine.
            </p>
          ) : (
            <ul className="mt-3 divide-y rounded-xl border bg-card">
              {supporters.map((entry, i) => (
                <li key={`${entry.paidAt}-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="font-medium">
                    {entry.displayName}
                    {entry.isFoundingSupporter && <span className="ml-1.5 text-xs text-primary">Founding ❤️</span>}
                  </span>
                  <span className="text-muted-foreground">
                    {entry.amountPaise != null ? inr(entry.amountPaise) : 'Supporter ❤️'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-center text-xs text-muted-foreground">Only donors who chose to appear publicly are listed.</p>
        </div>
      )}

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

      {/* Consent modal — after successful payment */}
      <Dialog open={consentDonationId !== null} onOpenChange={(open) => { if (!open) setConsentDonationId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {consentPublic ? <Eye className="size-5" /> : <EyeOff className="size-5" />}
              Appear on the Supporters wall?
            </DialogTitle>
            <DialogDescription>
              Choose whether your name shows up in the Recent Supporters section. You can change this later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Switch
              checked={consentPublic}
              onCheckedChange={setConsentPublic}
              label="Show my name on the supporters wall"
            />

            {consentPublic && (
              <>
                <Switch
                  checked={consentShowAmount}
                  onCheckedChange={setConsentShowAmount}
                  label="Show my donation amount"
                />

                <div className="space-y-2">
                  <p className="text-sm font-medium">Display name</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setConsentUseProfile(true)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        consentUseProfile
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      Use profile name
                    </button>
                    <button
                      type="button"
                      onClick={() => setConsentUseProfile(false)}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        !consentUseProfile
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      Custom name
                    </button>
                  </div>
                  {!consentUseProfile && (
                    <Input
                      placeholder="e.g. Rahul S."
                      value={consentCustomName}
                      onChange={(e) => setConsentCustomName(e.target.value)}
                      maxLength={40}
                    />
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConsentDonationId(null)}
            >
              Stay private
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleConsentSubmit}
              disabled={consentSaving || (consentPublic && !consentUseProfile && !consentCustomName.trim())}
            >
              {consentSaving && <Loader2 className="size-4 animate-spin" />}
              {consentPublic ? 'Save preferences' : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
