'use client';

import * as React from 'react';
import Link from 'next/link';
import { fetchTrustScore, fetchTrustBadges } from '@/lib/api/services/trust';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import BorderGlow from '@/components/BorderGlow'

const BREAKDOWN_LABELS: { key: string; label: string }[] = [
  { key: 'phoneVerified', label: 'Phone verified' },
  { key: 'emailVerified', label: 'Email verified' },
  { key: 'profileComplete', label: 'Profile complete' },
  { key: 'tenantVerified', label: 'Tenant verified' },
  { key: 'studentVerified', label: 'Student verified' },
  { key: 'accountAge', label: 'Account age' },
];

function scoreTone(score: number): string {
  if (score >= 75) return 'text-emerald-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-rose-500';
}

/**
 * Trust score summary card for the dashboard — score ring, breakdown, badges.
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

  return (
    <BorderGlow className='rounded-2xl!'>
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary shrink-0" />
          <h2 className="font-semibold text-foreground">Trust Score</h2>
        </div>
        <span className={cn('text-3xl font-extrabold', scoreTone(score))}>{score}</span>
      </div>

      {breakdown && (
        <div className="space-y-2">
          {BREAKDOWN_LABELS.map(({ key, label }) => {
            const value = breakdown[key] ?? 0;
            if (value <= 0) return null;
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(value, 100)}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium text-foreground">{value}</span>
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
              {badge.replace(/_/g, ' ')}
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