'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { showToast } from '@/components/ui/toast';
import { createSavedSearch } from '@/lib/api/services/saved-searches';
import { listingFiltersToSavedSearchFilters } from '@/lib/listings/filters';
import { ListingFilterParams } from '@/types';
import { Bookmark, Loader2 } from 'lucide-react';

export interface SaveSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ListingFilterParams;
  onSaved?: () => void;
}

function summarizeFilters(filters: ListingFilterParams): string {
  const parts: string[] = [];
  if (filters.query) parts.push(filters.query);
  if (filters.bedrooms) parts.push(`${filters.bedrooms} BHK`);
  if (filters.collegeId && filters.campusId) parts.push('My campus');
  else if (filters.campusId) parts.push('Campus');
  else if (filters.collegeId) parts.push('My college');
  if (filters.minRentPaise !== undefined || filters.maxRentPaise !== undefined) {
    parts.push('Rent range');
  }
  return parts.join(' · ') || 'My search';
}

export function SaveSearchDialog({
  open,
  onOpenChange,
  filters,
  onSaved,
}: SaveSearchDialogProps) {
  const [name, setName] = React.useState('');
  const [alertEnabled, setAlertEnabled] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(summarizeFilters(filters));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAlertEnabled(true);
    }
  }, [open, filters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      await createSavedSearch({
        name: trimmed,
        filters: listingFiltersToSavedSearchFilters(filters),
        alertEnabled,
      });
      showToast({
        title: 'Search Saved!',
        description: alertEnabled
          ? 'We will email you when new matching flats appear.'
          : 'Saved to your saved searches.',
        variant: 'success',
      });
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save search';
      showToast({
        title: 'Error',
        description: errorMsg,
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Save This Search</DialogTitle>
          <DialogDescription>
            Keep these filters and get notified when new flats match.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="saved-search-name" className="text-sm font-medium text-foreground">
              Search Name
            </label>
            <Input
              id="saved-search-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2 BHK near my campus"
              maxLength={100}
              required
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <Checkbox
              label="Email me when new flats match"
              checked={alertEnabled}
              onChange={(e) => setAlertEnabled(e.target.checked)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Bookmark className="size-4" />
                  Save Search
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}