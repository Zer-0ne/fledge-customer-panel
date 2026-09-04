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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { showToast } from '@/components/ui/toast';
import { Loader2 } from 'lucide-react';
import { updateRequest, friendlyNeedNowError } from '@/lib/api/services/neednow';
import {
  NEED_NOW_INTENT_LABELS,
  STAY_DURATION_LABELS,
} from '@/lib/api/services/neednow';
import {
  NeedNowRequest,
  NeedNowIntentType,
  NeedNowVisibility,
  StayDurationType,
  PreferredRoomType,
} from '@/types';

export interface EditRequestDialogProps {
  request: NeedNowRequest;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (updated: NeedNowRequest) => void;
}

const ROOM_TYPE_OPTIONS: Array<{ value: PreferredRoomType; label: string }> = [
  { value: 'PRIVATE', label: 'Private' },
  { value: 'SHARED_2', label: 'Shared (2)' },
  { value: 'SHARED_3_PLUS', label: 'Shared (3+)' },
  { value: 'FULL_FLAT', label: 'Full flat' },
];

const RADIUS_OPTIONS = [
  { value: 500, label: 'Within 500 m' },
  { value: 1000, label: 'Within 1 km' },
  { value: 2000, label: 'Within 2 km' },
  { value: 5000, label: 'Within 5 km' },
  { value: 10000, label: 'Within 10 km' },
  { value: 20000, label: 'Within 20 km' },
];

export function EditRequestDialog({ request, open, onOpenChange, onSaved }: EditRequestDialogProps) {
  const [intentType, setIntentType] = React.useState<NeedNowIntentType>(request.intentType);
  const [budgetMinINR, setBudgetMinINR] = React.useState(
    String(Math.round(request.budget.minimumPaise / 100))
  );
  const [budgetMaxINR, setBudgetMaxINR] = React.useState(
    String(Math.round(request.budget.maximumPaise / 100))
  );
  const [moveInDate, setMoveInDate] = React.useState(request.moveInDate || '');
  const [stayDurationType, setStayDurationType] = React.useState<StayDurationType>(
    request.stayDurationType
  );
  const [radiusMeters, setRadiusMeters] = React.useState<number>(request.radiusMeters || 5000);
  const [roomTypes, setRoomTypes] = React.useState<PreferredRoomType[]>(
    request.preferredRoomTypes?.length ? request.preferredRoomTypes : []
  );
  const [visibility, setVisibility] = React.useState<NeedNowVisibility>(request.visibility);
  const [allowVerifiedPartners, setAllowVerifiedPartners] = React.useState(
    request.allowVerifiedPartners
  );
  const [description, setDescription] = React.useState(request.description);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIntentType(request.intentType);
    setBudgetMinINR(String(Math.round(request.budget.minimumPaise / 100)));
    setBudgetMaxINR(String(Math.round(request.budget.maximumPaise / 100)));
    setMoveInDate(request.moveInDate || '');
    setStayDurationType(request.stayDurationType);
    setRadiusMeters(request.radiusMeters || 5000);
    setRoomTypes(request.preferredRoomTypes?.length ? request.preferredRoomTypes : []);
    setVisibility(request.visibility);
    setAllowVerifiedPartners(request.allowVerifiedPartners);
    setDescription(request.description);
  }, [open, request]);

  const toggleRoomType = (type: PreferredRoomType) => {
    setRoomTypes((prev) => {
      const without = prev.filter((t) => t !== type);
      if (without.length === prev.length) {
        return [...without, type];
      }
      return without.length > 0 ? without : [];
    });
  };

  const handleSave = async () => {
    const min = parseFloat(budgetMinINR);
    const max = parseFloat(budgetMaxINR);
    if (Number.isNaN(min) || min < 0 || Number.isNaN(max) || max <= 0) {
      showToast({ title: 'Invalid budget', description: 'Enter a valid minimum and maximum budget.', variant: 'error' });
      return;
    }
    if (max < min) {
      showToast({ title: 'Invalid budget', description: 'Maximum budget cannot be less than the minimum.', variant: 'error' });
      return;
    }
    if (!moveInDate) {
      showToast({ title: 'Missing move-in date', description: 'Choose when you want to move in.', variant: 'error' });
      return;
    }
    // Reject past dates (compare as YYYY-MM-DD strings to avoid timezone issues)
    const today = new Date().toISOString().split('T')[0];
    if (moveInDate < today) {
      showToast({ title: 'Invalid move-in date', description: 'Move-in date cannot be in the past.', variant: 'error' });
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      showToast({ title: 'Short description', description: 'Description must be at least 10 characters.', variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const updated = await updateRequest(request.id, {
        intentType,
        budgetMinPaise: Math.round(min * 100),
        budgetMaxPaise: Math.round(max * 100),
        moveInDate: moveInDate || null,
        stayDurationType,
        radiusMeters,
        preferredRoomTypes: roomTypes,
        visibility,
        allowVerifiedPartners,
        description: description.trim(),
      });
      showToast({ title: 'Requirement updated', description: 'Your changes were saved.', variant: 'success' });
      onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      showToast({ title: 'Could not save changes', description: friendlyNeedNowError(err), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onOpenChange(false)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit requirement</DialogTitle>
          <DialogDescription>
            Changes apply immediately. Expired, fulfilled, or removed requirements cannot be edited.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">What are you looking for?</label>
            <Select value={intentType} onChange={(e) => setIntentType(e.target.value as NeedNowIntentType)} className="rounded-xl">
              {(Object.keys(NEED_NOW_INTENT_LABELS) as NeedNowIntentType[]).map((key) => (
                <option key={key} value={key}>
                  {NEED_NOW_INTENT_LABELS[key]}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Min budget (₹/mo)</label>
              <Input
                type="number"
                min={0}
                value={budgetMinINR}
                onChange={(e) => setBudgetMinINR(e.target.value)}
                className="rounded-xl"
                aria-label="Minimum monthly budget in rupees"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Max budget (₹/mo)</label>
              <Input
                type="number"
                min={0}
                value={budgetMaxINR}
                onChange={(e) => setBudgetMaxINR(e.target.value)}
                className="rounded-xl"
                aria-label="Maximum monthly budget in rupees"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Move-in date</label>
              <Input type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Stay duration</label>
              <Select value={stayDurationType} onChange={(e) => setStayDurationType(e.target.value as StayDurationType)} className="rounded-xl">
                {(Object.keys(STAY_DURATION_LABELS) as StayDurationType[]).map((key) => (
                  <option key={key} value={key}>
                    {STAY_DURATION_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Search radius</label>
            <Select
              value={String(radiusMeters)}
              onChange={(e) => setRadiusMeters(Number(e.target.value))}
              className="rounded-xl"
            >
              {RADIUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-xs font-medium text-foreground">Preferred room types</legend>
            <div className="flex flex-wrap gap-3">
              {ROOM_TYPE_OPTIONS.map((option) => (
                <Checkbox
                  key={option.value}
                  id={`edit-room-${option.value}`}
                  checked={roomTypes.includes(option.value)}
                  onChange={() => toggleRoomType(option.value)}
                  label={option.label}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-foreground">Who can see this requirement?</legend>
            <div className="space-y-1.5" role="radiogroup" aria-label="Visibility">
              {([
                ['EVERYONE_NEARBY', 'Everyone nearby'],
                ['SAME_CAMPUS', 'Same campus'],
                ['VERIFIED_USERS_ONLY', 'Verified users only'],
              ] as Array<[NeedNowVisibility, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={visibility === value}
                  onClick={() => setVisibility(value)}
                  className="flex w-full items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-border aria-checked:border-primary/60 aria-checked:bg-primary/5"
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between rounded-xl border border-border/50 p-3">
            <span className="text-xs font-medium text-foreground">Allow offers from verified partners</span>
            <Switch checked={allowVerifiedPartners} onCheckedChange={setAllowVerifiedPartners} />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Description <span className="text-muted-foreground">({description.length}/2000)</span>
            </label>
            <Textarea
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl resize-none text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
