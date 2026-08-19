'use client';

import * as React from 'react';
import { InfoBanner } from '@/components/ui/info-banner';
import { fetchGuidanceTips } from '@/lib/api/services/guidance';
import { fetchUserSettings } from '@/lib/api/services/user-settings';
import { Lightbulb, X } from 'lucide-react';

export interface GuidanceTipBannerProps {
  route: string;
  /** Locale for the tip copy; falls back to 'en' when unset. */
  locale?: string;
}

/**
 * Renders the first active guidance tip for a route (dismissible).
 * Renders nothing when the backend has no seeded tip for the route.
 * When `locale` is not provided, resolves it from the user's language
 * setting (silently falls back to 'en' on public pages / anonymous users).
 */
export function GuidanceTipBanner({ route, locale }: GuidanceTipBannerProps) {
  const [resolvedLocale, setResolvedLocale] = React.useState(locale ?? 'en');
  const [tip, setTip] = React.useState<{ key: string; title: string; body: string } | null>(null);
  const [dismissedKey, setDismissedKey] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (locale) {
      setResolvedLocale(locale);
      return;
    }
    let cancelled = false;
    fetchUserSettings()
      .then((settings) => {
        if (cancelled) return;
        const lang = settings.find((s) => s.key === 'language');
        if (lang && typeof lang.value === 'string' && (lang.value === 'en' || lang.value === 'hi')) {
          setResolvedLocale(lang.value);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale]);

  React.useEffect(() => {
    let cancelled = false;
    fetchGuidanceTips({ route, locale: resolvedLocale })
      .then((tips) => {
        if (cancelled || tips.length === 0) return;
        const first = tips[0];
        setTip({ key: first.key, title: first.title, body: first.body });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [route, resolvedLocale]);

  if (!tip || tip.key === dismissedKey) return null;

  return (
    <InfoBanner
      tone="info"
      icon={<Lightbulb className="size-4" />}
      title={tip.title}
      description={tip.body}
      className="pr-9 relative"
    >
      <button
        type="button"
        aria-label="Dismiss tip"
        onClick={() => setDismissedKey(tip.key)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-current/60 hover:bg-current/10 hover:text-current transition-colors"
      >
        <X className="size-3.5" />
      </button>
    </InfoBanner>
  );
}