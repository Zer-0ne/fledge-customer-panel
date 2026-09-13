'use client';

import * as React from 'react';
import Link from 'next/link';
import { fetchTrustScore, fetchTrustBadges } from '@/lib/api/services/trust';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import BorderGlow from '@/components/BorderGlow';

const BREAKDOWN_LABELS: { key: string; label: string }[] = [
  { key: 'base', label: 'Base score' },
  { key: 'phoneVerified', label: 'Phone verified' },
  { key: 'emailVerified', label: 'Email verified' },
  { key: 'profileComplete', label: 'Profile complete' },
  { key: 'tenantVerified', label: 'Tenant verified' },
  { key: 'studentVerified', label: 'Student verified' },
  { key: 'accountAge', label: 'Account age' },
  { key: 'spamStrikes', label: 'Spam penalties' },
];

function scoreTone(score: number): string {
  if (score >= 75) return 'text-emerald-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-rose-500';
}

function ringTone(score: number): string {
  if (score >= 75) return 'stroke-emerald-500';
  if (score >= 50) return 'stroke-amber-500';
  return 'stroke-rose-500';
}

/** Lightweight SVG score ring (no chart dependency). */
function ScoreRing({ score }: { score: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 48 48" className="size-16 -rotate-90">
        <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="4" className="stroke-muted" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className={ringTone(score)}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
        />
      </svg>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center text-lg font-extrabold',
          scoreTone(score)
        )}
      >
        {score}
      </span>
    </div>
  );
}

/** 'phone-verified' → 'Phone Verified' */
function badgeLabel(badge: string): string {
  return badge
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Trust score summary card for the dashboard — score ring, contribution
 * breakdown (incl. spam penalties) and earned badges. Data is computed and
 * returned live by the backend (`GET /api/v1/trust/me[/badges]`).
 */
export function TrustCard() {
  const [score, setScore] = React.useState<number | null>(null);
  const [breakdown, setBreakdown] = React.useState<Record<string, number> | null>(null);
  const [badges, setBadges] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTrustScore(), fetchTrustBadges()])
      .then(([trust, badgesRes]) => {
        if (cancelled) return;
        setScore(trust.score);
        setBreakdown(trust.breakdown);
        setBadges(badgesRes.badges);
      })
      .catch(() => {
        if (cancelled) return;
        setScore(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return <Skeleton className="h-52 w-full rounded-2xl" />;
  }

  if (score === null) return null;

  const rows = breakdown
    ? BREAKDOWN_LABELS.map(({ key, label }) => ({ key, label, value: breakdown[key] ?? 0 })).filter(
        (row) => row.value !== 0
      )
    : [];

  return (
    <BorderGlow className="rounded-2xl!">
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <h2 className="font-semibold text-foreground">Trust Score</h2>
          </div>
          <ScoreRing score={score} />
        </div>

        {rows.length > 0 && (
          <div className="space-y-2">
            {rows.map(({ key, label, value }) => {
              const isPenalty = value < 0;
              return (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', isPenalty ? 'bg-rose-500' : 'bg-primary')}
                      style={{ width: `${Math.min(Math.abs(value), 100)}%` }}
                    />
                  </div>
                  <span
                    className={cn(
                      'w-9 text-right font-medium tabular-nums',
                      isPenalty ? 'text-rose-500' : 'text-foreground'
                    )}
                  >
                    {value > 0 ? `+${value}` : value}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/60">
            {badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                <Award className="size-3" />
                {badgeLabel(badge)}
              </span>
            ))}
          </div>
        )}

        <Link href="/settings/profile" className="block text-xs font-medium text-primary hover:underline">
          Improve your score →
        </Link>
      </div>
    </BorderGlow>
  );
}
