'use client';

import * as React from 'react';
import { fetchCollegeRules } from '@/lib/api/services/college-rules';
import { CollegeRule } from '@/types';
import { BookOpen, Loader2 } from 'lucide-react';
import BorderGlow from '@/components/BorderGlow'

export interface CollegeRulesCardProps {
  collegeId?: string | null;
  collegeName?: string | null;
}

/**
 * Renders the college's rulebook for a listing's campus. Renders nothing when
 * no collegeId is available or the college has no public rules.
 */
export function CollegeRulesCard({ collegeId, collegeName }: CollegeRulesCardProps) {
  const [rules, setRules] = React.useState<CollegeRule[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!collegeId) {
      setRules(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchCollegeRules(collegeId)
      .then((res) => {
        if (!cancelled) setRules(res);
      })
      .catch(() => {
        if (!cancelled) setRules([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [collegeId]);

  if (!collegeId || (!isLoading && (!rules || rules.length === 0))) return null;

  return (
    <BorderGlow className='rounded-2xl!'>
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 text-primary shrink-0" />
        <h3 className="font-semibold text-foreground text-base">
          {collegeName || 'College'} Rules
        </h3>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading rules...
        </div>
      ) : (
        <ul className="space-y-2">
          {rules?.map((rule) => (
            <li key={rule.id} className="space-y-0.5">
              <p className="flex items-start gap-2 text-sm font-medium text-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{rule.title}</span>
              </p>
              {rule.body && (
                <p className="text-xs text-muted-foreground pl-3.5">{rule.body}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
    </BorderGlow>
  );
}