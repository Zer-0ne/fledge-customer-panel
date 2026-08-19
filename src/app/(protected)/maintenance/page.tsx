'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { fetchMyMaintenanceRequests } from '@/lib/api/services/maintenance';
import { MaintenanceRequest, MaintenanceStatus, MaintenancePriority, MaintenanceCategory } from '@/types';
import { formatRelativeTime, formatDate } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Wrench, AlertTriangle, Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import BorderGlow from '@/components/BorderGlow'

const STATUS_LABELS: Record<MaintenanceStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  escalated: 'Escalated',
};

const STATUS_VARIANTS: Record<MaintenanceStatus, 'default' | 'outline' | 'secondary' | 'success' | 'destructive'> = {
  open: 'secondary',
  in_progress: 'default',
  resolved: 'success',
  closed: 'outline',
  escalated: 'destructive',
};

const PRIORITY_SLA_HOURS: Record<MaintenancePriority, number> = {
  critical: 4,
  high: 8,
  normal: 24,
  low: 72,
};

const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  appliance: 'Appliance',
  furniture: 'Furniture',
  pest: 'Pest Control',
  cleaning: 'Cleaning',
  other: 'Other',
};

export default function MaintenancePage() {
  const router = useRouter();
  const [items, setItems] = React.useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadInitial = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await fetchMyMaintenanceRequests());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load maintenance requests.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitial();
  }, [loadInitial]);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Wrench className="size-6 text-primary" />
            Maintenance Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track issues you have reported for your flat and their resolution status.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/search')} className="gap-1.5">
          <Plus className="size-3.5" />
          Raise From a Listing
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <ErrorState
          title="Could not load maintenance requests"
          description={error}
          onRetry={loadInitial}
        />
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          icon={Wrench}
          title="No maintenance requests"
          description="Found an issue with your flat? Open any listing and raise a maintenance request from there."
          actionLabel="Browse Listings"
          onAction={() => router.push('/search')}
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((req) => {
            const slaHours = PRIORITY_SLA_HOURS[req.priority] ?? 24;
            const isSlaBreached = req.slaBreached === true;
            return (
              <BorderGlow key={req.id} className='rounded-xl!'>
              <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-foreground">{req.title}</h2>
                      <Badge variant={STATUS_VARIANTS[req.status]}>
                        {STATUS_LABELS[req.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_LABELS[req.category] ?? req.category}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
                    Raised {formatRelativeTime(req.createdAt)}
                  </span>
                </div>

                {req.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{req.description}</p>
                )}

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium',
                      req.priority === 'critical' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                      req.priority === 'high' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                      req.priority === 'normal' && 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
                      req.priority === 'low' && 'bg-muted text-muted-foreground'
                    )}
                  >
                    <Clock className="size-3" />
                    {req.priority} · {slaHours}h SLA
                  </span>

                  {isSlaBreached && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                      <AlertTriangle className="size-3" />
                      SLA breached
                    </span>
                  )}

                  {req.updatedAt !== req.createdAt && (
                    <span className="text-muted-foreground/70">
                      Updated {formatRelativeTime(req.updatedAt)}
                    </span>
                  )}
                </div>

                {req.resolvedAt && (
                  <p className="text-xs text-muted-foreground">
                    Resolved on {formatDate(req.resolvedAt)}
                  </p>
                )}
              </div>
              </BorderGlow>
            );
          })}
        </div>
      )}
    </div>
  );
}