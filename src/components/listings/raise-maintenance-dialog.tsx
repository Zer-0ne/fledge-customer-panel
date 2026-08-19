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
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { showToast } from '@/components/ui/toast';
import { createMaintenanceRequest } from '@/lib/api/services/maintenance';
import { MaintenanceCategory, MaintenancePriority } from '@/types';
import { Wrench, Loader2 } from 'lucide-react';

const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  appliance: 'Appliance',
  furniture: 'Furniture',
  pest: 'Pest Control',
  cleaning: 'Cleaning',
  other: 'Other',
};

const PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  critical: 'Critical (4h SLA)',
  high: 'High (8h SLA)',
  normal: 'Normal (24h SLA)',
  low: 'Low (72h SLA)',
};

export interface RaiseMaintenanceDialogProps {
  listingId: string;
  listingTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function RaiseMaintenanceDialog({
  listingId,
  listingTitle,
  open,
  onOpenChange,
  onSuccess,
}: RaiseMaintenanceDialogProps) {
  const [category, setCategory] = React.useState<MaintenanceCategory>('other');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState<MaintenancePriority>('normal');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategory('other');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle('');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDescription('');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPriority('normal');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsSubmitting(true);
    try {
      await createMaintenanceRequest({
        listingId,
        category,
        title: trimmedTitle,
        description: description.trim() || undefined,
        priority,
      });
      showToast({
        title: 'Maintenance Request Raised!',
        description: 'The property manager has been notified and will reach out soon.',
        variant: 'success',
      });
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to raise maintenance request';
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Wrench className="size-5 text-primary" />
            Raise Maintenance Request
          </DialogTitle>
          <DialogDescription>
            Report an issue with &quot;{listingTitle}&quot; — the property manager will be notified.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="maintenance-category" className="text-sm font-medium text-foreground">
                Category
              </label>
              <Select
                id="maintenance-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as MaintenanceCategory)}
              >
                {(Object.keys(CATEGORY_LABELS) as MaintenanceCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="maintenance-priority" className="text-sm font-medium text-foreground">
                Priority
              </label>
              <Select
                id="maintenance-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
              >
                {(Object.keys(PRIORITY_LABELS) as MaintenancePriority[]).map((key) => (
                  <option key={key} value={key}>
                    {PRIORITY_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="maintenance-title" className="text-sm font-medium text-foreground">
              Issue Title
            </label>
            <Input
              id="maintenance-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Kitchen sink leaking"
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="maintenance-description" className="text-sm font-medium text-foreground">
              Details
            </label>
            <Textarea
              id="maintenance-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue so the manager can prepare..."
              rows={4}
              maxLength={5000}
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
            <Button type="submit" disabled={isSubmitting || !title.trim()} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Wrench className="size-4" />
                  Submit Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}