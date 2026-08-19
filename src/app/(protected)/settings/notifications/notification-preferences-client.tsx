'use client';

import * as React from 'react';
import {
  fetchNotificationPreferences,
  updateNotificationPreference,
  preferenceKindLabel,
  preferenceKindDescription,
  fetchQuietHours,
  updateQuietHours,
  type QuietHours,
} from '@/lib/api/services/notifications';
import { NotificationPreference, NotificationPreferenceKind } from '@/types';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { showToast } from '@/components/ui/toast';
import BorderGlow from '@/components/BorderGlow'
import { Bell, MoonStar, BellRing } from 'lucide-react';
import {
  configureWebPush,
  disableWebPush,
  enableWebPush,
  ensureSwConfigured,
  isWebPushActive,
  isWebPushConfigured,
  isWebPushSupported,
} from '@/lib/push/push-notifications';
import type { FirebaseWebConfig } from '@/lib/push/push-notifications';

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'UTC', 'America/New_York', 'Europe/London', 'Australia/Sydney'];

export default function NotificationPreferencesClient({ firebaseConfig }: { firebaseConfig: FirebaseWebConfig | null }) {
  configureWebPush(firebaseConfig);
  const [preferences, setPreferences] = React.useState<NotificationPreference[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [savingKinds, setSavingKinds] = React.useState<Set<NotificationPreferenceKind>>(
    new Set()
  );
  const [quietHours, setQuietHours] = React.useState<QuietHours>({ enabled: false, start: '22:00', end: '08:00', timezone: 'Asia/Kolkata' });
  const [savingQuietHours, setSavingQuietHours] = React.useState(false);
  const [pushActive, setPushActive] = React.useState(false);
  const [pushBusy, setPushBusy] = React.useState(false);
  const pushConfigured = isWebPushConfigured();
  const pushSupported = isWebPushSupported();

  const loadPreferences = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchNotificationPreferences();
      setPreferences(data);
      const qh = await fetchQuietHours();
      setQuietHours(qh);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load preferences.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPreferences();
  }, [loadPreferences]);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPushActive(isWebPushActive());
    // Re-post the config to the SW (keeps the background handler live across
    // reloads — the SW never fetches config from a public endpoint).
    void ensureSwConfigured();
  }, []);

  const handlePushToggle = async (enabled: boolean) => {
    setPushBusy(true);
    try {
      const result = enabled ? await enableWebPush() : await disableWebPush();
      if (result.ok) {
        setPushActive(enabled);
        showToast({ title: enabled ? 'Push notifications enabled' : 'Push notifications disabled', description: enabled ? 'You will receive notifications even when this tab is closed.' : 'Browser notifications are turned off.', variant: 'success' });
      } else {
        showToast({ title: 'Could not enable push', description: result.message ?? 'Please check your browser settings.', variant: 'error' });
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleToggle = async (kind: NotificationPreferenceKind, pushEnabled: boolean) => {
    const previous = preferences;
    setPreferences((prev) =>
      prev.map((p) => (p.kind === kind ? { ...p, pushEnabled } : p))
    );
    setSavingKinds((prev) => new Set(prev).add(kind));

    try {
      const updated = await updateNotificationPreference(kind, pushEnabled);
      setPreferences((prev) =>
        prev.map((p) => (p.kind === kind ? updated : p))
      );
      showToast({
        title: pushEnabled ? 'Notifications enabled' : 'Notifications disabled',
        description: preferenceKindLabel(kind),
        variant: 'success',
      });
    } catch {
      setPreferences(previous);
      showToast({
        title: 'Update failed',
        description: 'Could not save notification preference.',
        variant: 'error',
      });
    } finally {
      setSavingKinds((prev) => {
        const next = new Set(prev);
        next.delete(kind);
        return next;
      });
    }
  };

  const handleSaveQuietHours = async () => {
    setSavingQuietHours(true);
    try {
      await updateQuietHours(quietHours);
      showToast({
        title: 'Quiet hours saved',
        description: 'Promotional push is suppressed during this window.',
        variant: 'success',
      });
    } catch {
      showToast({
        title: 'Save failed',
        description: 'Could not save quiet hours. Use HH:MM (24-hour) format.',
        variant: 'error',
      });
    } finally {
      setSavingQuietHours(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48 rounded-lg" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState title="Preferences unavailable" description={error} onRetry={loadPreferences} />
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Notification preferences</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose which push categories you want to receive. Kinds match the API: listing interest,
          roommate interest, and messages.
        </p>
      </div>

      <ul className="space-y-3">
        {preferences.map((pref) => (
          <BorderGlow key={pref.kind} className='rounded-xl!'>
          <li
            className="rounded-xl border border-border/80 bg-card p-4 flex items-start justify-between gap-4"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bell className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {preferenceKindLabel(pref.kind)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {preferenceKindDescription(pref.kind)}
                </p>
              </div>
            </div>
            <Switch
              checked={pref.pushEnabled}
              disabled={savingKinds.has(pref.kind)}
              onCheckedChange={(checked) => void handleToggle(pref.kind, checked)}
              aria-label={`Toggle ${preferenceKindLabel(pref.kind)}`}
            />
          </li>
          </BorderGlow>
        ))}
      </ul>

      <BorderGlow className='rounded-xl!'>
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BellRing className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Web push notifications</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {pushConfigured
                ? 'Receive notifications in this browser even when the tab is closed. Push is delivered server-side — your browser only registers a token.'
                : 'Push is not configured yet. Ask the team to add the Firebase web config (NEXT_PUBLIC_FIREBASE_*).'}
            </p>
          </div>
          {pushConfigured ? (
            <Switch
              checked={pushActive}
              disabled={pushBusy || !pushSupported}
              onCheckedChange={(checked) => void handlePushToggle(checked)}
              aria-label="Toggle web push notifications"
              className="ml-auto shrink-0"
            />
          ) : (
            <span className="ml-auto shrink-0 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              Not configured
            </span>
          )}
        </div>
        {pushConfigured && !pushSupported && (
          <p className="text-xs text-muted-foreground">
            Your browser does not support push notifications (requires a modern Chrome, Edge or Firefox).
          </p>
        )}
      </div>
      </BorderGlow>

      <BorderGlow className='rounded-xl!'>
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MoonStar className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Quiet hours</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Promotional push notifications are suppressed during this window.
              Critical alerts (security, payments, system) are never suppressed.
            </p>
          </div>
          <Switch
            checked={quietHours.enabled}
            onCheckedChange={(checked) => setQuietHours((prev) => ({ ...prev, enabled: checked }))}
            aria-label="Toggle quiet hours"
            className="ml-auto shrink-0"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Start (HH:MM)</span>
            <Input
              value={quietHours.start}
              placeholder="22:00"
              inputMode="numeric"
              onChange={(e) => setQuietHours((prev) => ({ ...prev, start: e.target.value }))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">End (HH:MM)</span>
            <Input
              value={quietHours.end}
              placeholder="08:00"
              inputMode="numeric"
              onChange={(e) => setQuietHours((prev) => ({ ...prev, end: e.target.value }))}
            />
          </label>
          <label className="space-y-1 col-span-2">
            <span className="text-xs font-medium text-muted-foreground">Timezone</span>
            <select
              value={quietHours.timezone}
              onChange={(e) => setQuietHours((prev) => ({ ...prev, timezone: e.target.value }))}
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </label>
        </div>

        <Button
          size="sm"
          className="rounded-xl gap-2"
          disabled={savingQuietHours}
          onClick={() => void handleSaveQuietHours()}
        >
          <MoonStar className="size-4" />
          Save quiet hours
        </Button>
      </div>
      </BorderGlow>
    </section>
  );
}
