'use client';

import * as React from 'react';
import {
  fetchUserSettings,
  updateUserSettings,
} from '@/lib/api/services/user-settings';
import {
  createDataExport,
  fetchDataExportJobs,
  requestDataErase,
} from '@/lib/api/services/data-export';
import { fetchI18nStrings } from '@/lib/api/services/i18n';
import { DataExportJob, UserSettingKey, UserSettingValue } from '@/types';
import { formatRelativeTime, formatDate } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { showToast } from '@/components/ui/toast';
import BorderGlow from '@/components/BorderGlow'
import {
  Languages,
  Download,
  Archive,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const BOOLEAN_SETTING_LABELS: { key: UserSettingKey; label: string; description: string }[] = [
  {
    key: 'availabilityReminders',
    label: 'Availability reminders',
    description: 'Get reminders when flats you are tracking become available.',
  },
  {
    key: 'contactShareReminders',
    label: 'Contact share reminders',
    description: 'Be reminded to share your contact with interested landlords.',
  },
  {
    key: 'chatNotifications',
    label: 'Chat notifications',
    description: 'Receive notifications for new chat messages.',
  },
  {
    key: 'marketingOptOut',
    label: 'Marketing opt-out',
    description: 'Opt out of promotional emails and offers.',
  },
];

const JOB_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Ready',
  failed: 'Failed',
  expired: 'Expired',
};

export default function DataPrivacySettingsPage() {
  const [settings, setSettings] = React.useState<Record<string, UserSettingValue>>({});
  const [isSettingsLoading, setIsSettingsLoading] = React.useState(true);
  const [settingsError, setSettingsError] = React.useState<string | null>(null);
  const [isSavingSetting, setIsSavingSetting] = React.useState(false);

  const [jobs, setJobs] = React.useState<DataExportJob[]>([]);
  const [isJobsLoading, setIsJobsLoading] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const [supportedLocales, setSupportedLocales] = React.useState<string[]>(['en', 'hi']);
  const [eraseConfirmText, setEraseConfirmText] = React.useState('');
  const [isEraseConfirmOpen, setIsEraseConfirmOpen] = React.useState(false);
  const [isErasing, setIsErasing] = React.useState(false);

  const loadSettings = React.useCallback(async () => {
    setIsSettingsLoading(true);
    setSettingsError(null);
    try {
      const res = await fetchUserSettings();
      const map: Record<string, UserSettingValue> = {};
      res.forEach((s) => {
        map[s.key] = s.value;
      });
      setSettings(map);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load settings.';
      setSettingsError(msg);
    } finally {
      setIsSettingsLoading(false);
    }
  }, []);

  const loadJobs = React.useCallback(async () => {
    setIsJobsLoading(true);
    try {
      const res = await fetchDataExportJobs();
      setJobs(res);
    } catch {
      setJobs([]);
    } finally {
      setIsJobsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadJobs();
    fetchI18nStrings('en')
      .then((res) => {
        if (res.supported?.length) setSupportedLocales(res.supported);
      })
      .catch(() => {});
  }, [loadSettings, loadJobs]);

  const saveSetting = async (key: UserSettingKey, value: UserSettingValue) => {
    const prev = settings[key];
    setSettings((s) => ({ ...s, [key]: value }));
    setIsSavingSetting(true);
    try {
      await updateUserSettings({ settings: [{ key, value }] });
      showToast({ title: 'Setting saved', description: 'Your preference was updated.', variant: 'success' });
    } catch (err: unknown) {
      setSettings((s) => ({ ...s, [key]: prev }));
      const msg = err instanceof Error ? err.message : 'Failed to save setting';
      showToast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setIsSavingSetting(false);
    }
  };

  const handleRequestExport = async () => {
    setIsExporting(true);
    try {
      await createDataExport();
      showToast({
        title: 'Export Requested',
        description: 'We are preparing your data — check back shortly.',
        variant: 'success',
      });
      loadJobs();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to request export';
      showToast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleErase = async () => {
    setIsErasing(true);
    try {
      const res = await requestDataErase();
      showToast({
        title: 'Data Erase Scheduled',
        description: `All your data will be permanently deleted by ${formatDate(res.eraseAt)}.`,
        variant: 'info',
      });
      setIsEraseConfirmOpen(false);
      setEraseConfirmText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule data erase';
      showToast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setIsErasing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Language */}
      <BorderGlow className='rounded-2xl!'>
      <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Languages className="size-4 text-primary shrink-0" />
          <h2 className="font-semibold text-foreground">Language</h2>
        </div>
        {isSettingsLoading ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <div className="max-w-xs space-y-1">
            <Select
              value={String(settings.language ?? 'en')}
              onChange={(e) => saveSetting('language', e.target.value)}
              disabled={isSavingSetting}
            >
              {supportedLocales.map((locale) => (
                <option key={locale} value={locale}>
                  {locale === 'hi' ? 'हिन्दी (Hindi)' : 'English'}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">
              Interface language for tips, notifications, and app copy.
            </p>
          </div>
        )}
      </section>
      </BorderGlow>

      {/* Notification Preferences */}
      <BorderGlow className='rounded-2xl!'>
      <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
        <h2 className="font-semibold text-foreground">Preferences</h2>
        {isSettingsLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : settingsError ? (
          <ErrorState title="Could not load settings" description={settingsError} onRetry={loadSettings} />
        ) : (
          <div className="space-y-4">
            {BOOLEAN_SETTING_LABELS.map((item) => {
              const isOptOut = item.key === 'marketingOptOut';
              const checked = isOptOut ? settings[item.key] === true : settings[item.key] !== false;
              return (
                <div key={item.key} className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {isOptOut && checked ? 'Marketing opted out' : item.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Checkbox
                    checked={checked}
                    onChange={(e) => saveSetting(item.key, e.target.checked)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
      </BorderGlow>

      {/* Data Export */}
      <BorderGlow className='rounded-2xl!'>
      <section className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Download className="size-4 text-primary shrink-0" />
            <div>
              <h2 className="font-semibold text-foreground">Export My Data</h2>
              <p className="text-xs text-muted-foreground">
                Download everything we store about you (listings, interests, messages, settings).
              </p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={handleRequestExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="size-3.5 animate-spin" /> : <Archive className="size-3.5" />}
            Request Export
          </Button>
        </div>

        {isJobsLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : jobs.length > 0 ? (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm">
                <span className="text-muted-foreground">
                  {job.kind === 'erase' ? 'Data erase' : 'Export'} · {formatRelativeTime(job.createdAt)}
                </span>
                <Badge variant={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                  {JOB_STATUS_LABELS[job.status] ?? job.status}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">No exports yet.</p>
        )}
      </section>
      </BorderGlow>

      {/* Data Erase */}
      <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive shrink-0" />
          <h2 className="font-semibold text-foreground">Delete My Data</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Schedule permanent deletion of all your data. This cannot be undone — after deletion
          your account and all associated data (listings, interests, messages, reviews) will be
          permanently removed. Type <span className="font-mono font-semibold text-foreground">PURGE</span> to confirm.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={eraseConfirmText}
            onChange={(e) => setEraseConfirmText(e.target.value)}
            placeholder="Type PURGE to confirm"
            className="max-w-xs font-mono"
            maxLength={10}
          />
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            disabled={eraseConfirmText !== 'PURGE'}
            onClick={() => setIsEraseConfirmOpen(true)}
          >
            <AlertTriangle className="size-3.5" />
            Schedule Data Erase
          </Button>
        </div>
      </section>

      <ConfirmDialog
        isOpen={isEraseConfirmOpen}
        onClose={() => setIsEraseConfirmOpen(false)}
        onConfirm={handleErase}
        title="Permanently Delete All Your Data?"
        description="This schedules permanent deletion of your account and all associated data. You will not be able to log in after deletion."
        confirmLabel="Yes, Delete Everything"
        cancelLabel="Cancel"
        isDestructive
        isLoading={isErasing}
      />

      {/* Success hint */}
      {!isSettingsLoading && settings.language && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-emerald-500" />
          Preferences sync across all your devices.
        </p>
      )}
    </div>
  );
}