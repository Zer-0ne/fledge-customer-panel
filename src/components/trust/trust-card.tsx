'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchTrustScore, fetchTrustBadges } from '@/lib/api/services/trust';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, Award, TrendingUp } from 'lucide-react';
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

const TONE = {
  good: '#10b981',
  mid: '#f59e0b',
  low: '#f43f5e',
} as const;

function scoreTone(score: number): string {
  if (score >= 75) return 'text-emerald-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-rose-500';
}

function scoreColor(score: number): string {
  if (score >= 75) return TONE.good;
  if (score >= 50) return TONE.mid;
  return TONE.low;
}

/** 'phone-verified' → 'Phone Verified' */
function badgeLabel(badge: string): string {
  return badge
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Trust score card — radial gauge (recharts) + contribution breakdown bars.
 * Data is computed and returned live by the backend
 * (`GET /api/v1/trust/me[/badges]`).
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
    return <Skeleton className="h-56 w-full rounded-2xl" />;
  }

  if (score === null) return null;

  const rows = breakdown
    ? BREAKDOWN_LABELS.map(({ key, label }) => {
        const value = breakdown[key] ?? 0;
        return {
          key,
          label,
          value,
          abs: Math.abs(value),
          display: value > 0 ? `+${value}` : String(value),
          penalty: value < 0,
        };
      }).filter((row) => row.value !== 0)
    : [];

  const ceiling = Math.max(20, ...rows.map((r) => r.abs));
  const gaugeData = [{ name: 'score', value: score, fill: scoreColor(score) }];

  return (
    <BorderGlow className="rounded-2xl!">
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary shrink-0" />
          <h2 className="font-semibold text-foreground">Trust Score</h2>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <TrendingUp className="size-3" />
            out of 100
          </span>
        </div>

        {/* Radial gauge */}
        <div className="relative mx-auto h-[132px] w-full max-w-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              data={gaugeData}
              innerRadius="74%"
              outerRadius="100%"
              startAngle={210}
              endAngle={-30}
              barSize={13}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar
                dataKey="value"
                cornerRadius={8}
                background={{ fill: 'var(--muted)' }}
                isAnimationActive={false}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-3">
            <span className={cn('text-4xl font-extrabold tabular-nums leading-none', scoreTone(score))}>
              {score}
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Trust score
            </span>
          </div>
        </div>

        {/* Contribution breakdown */}
        {rows.length > 0 && (
          <div>
            <ResponsiveContainer width="100%" height={rows.length * 26 + 6}>
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 0, right: 30, bottom: 0, left: 0 }}
                barCategoryGap={5}
              >
                <XAxis type="number" domain={[0, ceiling]} hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={104}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                />
                <Bar dataKey="abs" barSize={8} radius={[4, 4, 4, 4]} isAnimationActive={false}>
                  {rows.map((row) => (
                    <Cell
                      key={row.key}
                      fill={row.penalty ? TONE.low : 'var(--primary)'}
                      fillOpacity={row.penalty ? 1 : 0.85}
                    />
                  ))}
                  <LabelList
                    dataKey="display"
                    position="right"
                    formatter={(value: React.ReactNode) => String(value)}
                    style={{ fontSize: 11, fontWeight: 600, fill: 'var(--foreground)' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Badges */}
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
