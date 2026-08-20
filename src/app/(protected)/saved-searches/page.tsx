'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchSavedSearches,
  deleteSavedSearch,
  updateSavedSearch,
  runSavedSearch,
} from '@/lib/api/services/saved-searches';
import { SavedSearch } from '@/types';
import { serializeListingFilterParams, savedSearchFiltersToListingFilters } from '@/lib/listings/filters';
import { formatRelativeTime } from '@/lib/formatting';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { showToast } from '@/components/ui/toast';
import BorderGlow from '@/components/BorderGlow'
import { Bookmark, Bell, BellOff, Search, Trash2, Play, Loader2 } from 'lucide-react';

function FiltersSummary(saved: SavedSearch): string {
  const f = saved.filters;
  const parts: string[] = [];
  if (f.query) parts.push(`"${f.query}"`);
  if (f.bedrooms) parts.push(`${f.bedrooms} BHK`);
  if (f.bathrooms) parts.push(`${f.bathrooms} bath`);
  if (f.furnishing) parts.push(f.furnishing.replace(/_/g, ' '));
  if (f.genderPreference) parts.push(f.genderPreference.replace(/_/g, ' '));
  if (f.minRentPaise !== undefined || f.maxRentPaise !== undefined) {
    const min = f.minRentPaise !== undefined ? Math.round(f.minRentPaise / 100) : undefined;
    const max = f.maxRentPaise !== undefined ? Math.round(f.maxRentPaise / 100) : undefined;
    parts.push(min !== undefined && max !== undefined ? `₹${min}–${max}` : max !== undefined ? `≤ ₹${max}` : `≥ ₹${min}`);
  }
  if (f.petFriendly) parts.push('pet friendly');
  if (f.minAreaSqft !== undefined) parts.push(`${f.minAreaSqft}+ sq ft`);
  if (f.moveInFrom) parts.push(`move-in ≥ ${f.moveInFrom.slice(0, 10)}`);
  if (f.amenityIds && f.amenityIds.length > 0) parts.push(`${f.amenityIds.length} amenity${f.amenityIds.length > 1 ? 'ies' : 'y'}`);
  return parts.join(' · ') || 'All listings';
}

export default function SavedSearchesPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<SavedSearch | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [runningId, setRunningId] = React.useState<string | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  const loadInitial = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await fetchSavedSearches());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load saved searches.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitial();
  }, [loadInitial]);

  const applyFilters = (saved: SavedSearch) => {
    const serialized = serializeListingFilterParams(savedSearchFiltersToListingFilters(saved.filters));
    const query = new URLSearchParams(serialized).toString();
    router.push(`/search${query ? `?${query}` : ''}`);
  };

  const handleRun = async (saved: SavedSearch) => {
    setRunningId(saved.id);
    try {
      const result = await runSavedSearch(saved.id);
      const count = result.items.length;
      showToast({
        title: count > 0 ? `${count} matching flat${count > 1 ? 's' : ''} found!` : 'No new matches',
        description: count > 0 ? 'Browse the results from the search page.' : 'Try widening your filters or check back later.',
        variant: count > 0 ? 'success' : 'info',
      });
      applyFilters(saved);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to run search';
      showToast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setRunningId(null);
    }
  };

  const handleToggleAlert = async (saved: SavedSearch) => {
    setTogglingId(saved.id);
    try {
      const updated = await updateSavedSearch(saved.id, { alertEnabled: !saved.alertEnabled });
      setItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast({
        title: updated.alertEnabled ? 'Alerts Enabled' : 'Alerts Disabled',
        description: updated.alertEnabled
          ? 'We will email you when new flats match this search.'
          : 'No more email alerts for this search.',
        variant: 'success',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update search';
      showToast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteSavedSearch(deleteTarget.id);
      setItems((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      showToast({ title: 'Search Deleted', description: 'The saved search was removed.', variant: 'success' });
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete search';
      showToast({ title: 'Error', description: msg, variant: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Bookmark className="size-6 text-primary" />
            Saved Searches
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Re-run your favourite filters and manage match alerts.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/search')} className="gap-1.5">
          <Search className="size-3.5" />
          New Search
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <ErrorState
          title="Could not load saved searches"
          description={error}
          onRetry={loadInitial}
        />
      )}

      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          icon={Bookmark}
          title="No saved searches yet"
          description="Save a search from the search page to track flats that match your filters."
          actionLabel="Browse Listings"
          onAction={() => router.push('/search')}
        />
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((saved) => {
            const isRunning = runningId === saved.id;
            const isToggling = togglingId === saved.id;
            return (
              <BorderGlow key={saved.id} className='rounded-xl!'>
              <div
                className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-foreground truncate">{saved.name}</h2>
                      <Badge variant={saved.alertEnabled ? 'default' : 'outline'} className="gap-1">
                        {saved.alertEnabled ? <Bell className="size-3" /> : <BellOff className="size-3" />}
                        {saved.alertEnabled ? 'Alerts On' : 'Alerts Off'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{FiltersSummary(saved)}</p>
                    {saved.lastMatchedAt && (
                      <p className="text-[11px] text-muted-foreground/70">
                        Last matched {formatRelativeTime(saved.lastMatchedAt)}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap">
                    Saved {formatRelativeTime(saved.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" className="gap-1.5" onClick={() => handleRun(saved)} disabled={isRunning}>
                    {isRunning ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                    Run Now
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => applyFilters(saved)}>
                    <Search className="size-3.5" />
                    Use Filters
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => handleToggleAlert(saved)}
                    disabled={isToggling}
                  >
                    {isToggling ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : saved.alertEnabled ? (
                      <BellOff className="size-3.5" />
                    ) : (
                      <Bell className="size-3.5" />
                    )}
                    {saved.alertEnabled ? 'Disable Alerts' : 'Enable Alerts'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-destructive hover:bg-destructive/10 ml-auto"
                    onClick={() => setDeleteTarget(saved)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
              </BorderGlow>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Saved Search?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" and its alert settings will be removed. You can re-save the search anytime.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  );
}