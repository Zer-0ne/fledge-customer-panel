'use client';

import * as React from 'react';
import {
  ContactMode,
  ContactPreference,
  UpdateContactPreferencePayload,
  FallbackContact,
} from '@/types';
import {
  fetchListingContactPreference,
  updateListingContactPreference,
  fetchRoommatePostContactPreference,
  updateRoommatePostContactPreference,
  fetchFallbackContacts,
  normalizeContactError,
} from '@/lib/api/services/contact';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { showToast } from '@/components/ui/toast';
import {
  ShieldCheck,
  Clock,
  UserCheck,
  MessageSquare,
  Lock,
  Loader2,
  CheckCircle,
} from 'lucide-react';

export interface ContactPreferenceFormProps {
  entityType: 'listing' | 'roommate_post';
  entityId: string;
  onSaved?: () => void;
}

export function ContactPreferenceForm({ entityType, entityId, onSaved }: ContactPreferenceFormProps) {
  const [preference, setPreference] = React.useState<ContactPreference | null>(null);
  const [fallbacks, setFallbacks] = React.useState<FallbackContact[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // Mode & field states
  const [contactMode, setContactMode] = React.useState<ContactMode>('CHAT_ONLY');
  const [requirePhoneVerified, setRequirePhoneVerified] = React.useState(false);
  const [consentConfirmed, setConsentConfirmed] = React.useState(false);
  const [autoRevealAfterMinutes, setAutoRevealAfterMinutes] = React.useState<number>(60);
  const [revealDurationMinutes, setRevealDurationMinutes] = React.useState<number>(120);
  const [dailyRevealLimit, setDailyRevealLimit] = React.useState<number>(2);
  const [fallbackContactId, setFallbackContactId] = React.useState<string>('');

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [pref, fallbackList] = await Promise.all([
        entityType === 'listing'
          ? fetchListingContactPreference(entityId)
          : fetchRoommatePostContactPreference(entityId),
        fetchFallbackContacts(),
      ]);

      setPreference(pref);
      setContactMode(pref.contactMode || 'CHAT_ONLY');
      setRequirePhoneVerified(Boolean(pref.requirePhoneVerified));
      setConsentConfirmed(Boolean(pref.consentConfirmed));
      if (pref.autoRevealAfterMinutes) setAutoRevealAfterMinutes(pref.autoRevealAfterMinutes);
      if (pref.revealDurationMinutes) setRevealDurationMinutes(pref.revealDurationMinutes);
      if (pref.dailyRevealLimit) setDailyRevealLimit(pref.dailyRevealLimit);
      if (pref.fallbackContactId) setFallbackContactId(pref.fallbackContactId);

      const verifiedFallbacks = fallbackList.filter((f) => f.verificationStatus === 'VERIFIED');
      setFallbacks(verifiedFallbacks);
      if (verifiedFallbacks.length > 0 && !pref.fallbackContactId) {
        setFallbackContactId(verifiedFallbacks[0].id);
      }
    } catch (err: unknown) {
      showToast({
        title: 'Failed to Load Contact Settings',
        description: normalizeContactError(err),
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [entityId, entityType]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client bounds validation matching backend specs (delay 1..20160, duration 1..43200, daily 1..100)
    if (contactMode === 'VERIFIED_USERS_AFTER_DELAY') {
      if (!consentConfirmed) {
        showToast({ title: 'Consent Required', description: 'You must explicitly confirm consent for automated delay reveal.', variant: 'error' });
        return;
      }
      if (autoRevealAfterMinutes < 1 || autoRevealAfterMinutes > 20160) {
        showToast({ title: 'Invalid Delay', description: 'Delay minutes must be between 1 and 20160.', variant: 'error' });
        return;
      }
      if (revealDurationMinutes < 1 || revealDurationMinutes > 43200) {
        showToast({ title: 'Invalid Duration', description: 'Reveal duration minutes must be between 1 and 43200.', variant: 'error' });
        return;
      }
      if (dailyRevealLimit < 1 || dailyRevealLimit > 100) {
        showToast({ title: 'Invalid Daily Limit', description: 'Daily reveal limit must be between 1 and 100.', variant: 'error' });
        return;
      }
    }

    if (contactMode === 'FALLBACK_CONTACT') {
      if (!consentConfirmed) {
        showToast({ title: 'Consent Required', description: 'You must explicitly confirm consent to use a fallback contact.', variant: 'error' });
        return;
      }
      if (!fallbackContactId) {
        showToast({ title: 'Fallback Contact Required', description: 'Select a verified fallback contact from your list.', variant: 'error' });
        return;
      }
      if (revealDurationMinutes < 1 || revealDurationMinutes > 43200) {
        showToast({ title: 'Invalid Duration', description: 'Reveal duration minutes must be between 1 and 43200.', variant: 'error' });
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: UpdateContactPreferencePayload = {
        contactMode,
        ...(contactMode === 'REQUEST_REQUIRED' ? { requirePhoneVerified } : {}),
        ...(contactMode === 'VERIFIED_USERS_AFTER_DELAY'
          ? {
              consentConfirmed: true,
              autoRevealAfterMinutes,
              revealDurationMinutes,
              dailyRevealLimit,
            }
          : {}),
        ...(contactMode === 'FALLBACK_CONTACT'
          ? {
              consentConfirmed: true,
              fallbackContactId,
              revealDurationMinutes,
            }
          : {}),
      };

      const updated =
        entityType === 'listing'
          ? await updateListingContactPreference(entityId, payload)
          : await updateRoommatePostContactPreference(entityId, payload);

      setPreference(updated);
      showToast({
        title: 'Contact Preference Saved',
        description: 'Your contact reveal rules have been updated.',
        variant: 'success',
      });
      if (onSaved) onSaved();
    } catch (err: unknown) {
      showToast({
        title: 'Failed to Save Preference',
        description: normalizeContactError(err),
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin text-primary" /> Loading contact preferences...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div className="border-b border-border pb-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          Contact Sharing & Fallback Preferences
        </h3>
        <p className="text-xs text-muted-foreground">
          Configure how interested customers can reach your phone number for this {entityType === 'listing' ? 'listing' : 'roommate post'}.
        </p>
      </div>

      {/* Contact Mode Options */}
      <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
        {/* CHAT_ONLY */}
        <label
          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
            contactMode === 'CHAT_ONLY'
              ? 'border-primary bg-primary/5 dark:bg-primary/10'
              : 'border-border bg-muted/10 hover:bg-muted/20'
          }`}
        >
          <input
            type="radio"
            name="contactMode"
            value="CHAT_ONLY"
            checked={contactMode === 'CHAT_ONLY'}
            onChange={() => setContactMode('CHAT_ONLY')}
            className="mt-0.5"
          />
          <div>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="size-3.5 text-primary" /> In-App Chat Only
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Keep communication strictly within the secure chat platform. Phone numbers are never revealed.
            </p>
          </div>
        </label>

        {/* REQUEST_REQUIRED */}
        <label
          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
            contactMode === 'REQUEST_REQUIRED'
              ? 'border-primary bg-primary/5 dark:bg-primary/10'
              : 'border-border bg-muted/10 hover:bg-muted/20'
          }`}
        >
          <input
            type="radio"
            name="contactMode"
            value="REQUEST_REQUIRED"
            checked={contactMode === 'REQUEST_REQUIRED'}
            onChange={() => setContactMode('REQUEST_REQUIRED')}
            className="mt-0.5"
          />
          <div>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Lock className="size-3.5 text-primary" /> Request Required
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Requesters must ask before revealing your number. You manually approve or decline each request.
            </p>
          </div>
        </label>

        {/* VERIFIED_USERS_AFTER_DELAY */}
        <label
          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
            contactMode === 'VERIFIED_USERS_AFTER_DELAY'
              ? 'border-primary bg-primary/5 dark:bg-primary/10'
              : 'border-border bg-muted/10 hover:bg-muted/20'
          }`}
        >
          <input
            type="radio"
            name="contactMode"
            value="VERIFIED_USERS_AFTER_DELAY"
            checked={contactMode === 'VERIFIED_USERS_AFTER_DELAY'}
            onChange={() => setContactMode('VERIFIED_USERS_AFTER_DELAY')}
            className="mt-0.5"
          />
          <div>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary" /> Verified Users After Delay
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Automatically grant bounded contact access to verified users after a specified conversation delay.
            </p>
          </div>
        </label>

        {/* FALLBACK_CONTACT */}
        <label
          className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
            contactMode === 'FALLBACK_CONTACT'
              ? 'border-primary bg-primary/5 dark:bg-primary/10'
              : 'border-border bg-muted/10 hover:bg-muted/20'
          }`}
        >
          <input
            type="radio"
            name="contactMode"
            value="FALLBACK_CONTACT"
            checked={contactMode === 'FALLBACK_CONTACT'}
            onChange={() => setContactMode('FALLBACK_CONTACT')}
            className="mt-0.5"
          />
          <div>
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <UserCheck className="size-3.5 text-primary" /> Use Verified Backup Contact
            </span>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Direct contact requests to a verified backup contact (property manager, roommate, or family).
            </p>
          </div>
        </label>
      </div>

      {/* Mode Specific Inputs */}
      {contactMode === 'REQUEST_REQUIRED' && (
        <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-2 text-xs">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <Checkbox
              checked={requirePhoneVerified}
              onChange={(e) => setRequirePhoneVerified(e.target.checked)}
            />
            <span className="font-medium text-foreground">Require requester to have a verified phone number</span>
          </label>
        </div>
      )}

      {contactMode === 'VERIFIED_USERS_AFTER_DELAY' && (
        <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3 text-xs">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold block mb-1">Delay (Minutes)</label>
              <Input
                type="number"
                min={1}
                max={20160}
                value={autoRevealAfterMinutes}
                onChange={(e) => setAutoRevealAfterMinutes(Number(e.target.value))}
              />
              <span className="text-[10px] text-muted-foreground">Range: 1 to 20160 min</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Grant Duration (Minutes)</label>
              <Input
                type="number"
                min={1}
                max={43200}
                value={revealDurationMinutes}
                onChange={(e) => setRevealDurationMinutes(Number(e.target.value))}
              />
              <span className="text-[10px] text-muted-foreground">Range: 1 to 43200 min</span>
            </div>
            <div>
              <label className="font-semibold block mb-1">Daily Reveal Limit</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={dailyRevealLimit}
                onChange={(e) => setDailyRevealLimit(Number(e.target.value))}
              />
              <span className="text-[10px] text-muted-foreground">Range: 1 to 100 per day</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-[11px] text-muted-foreground">
                I explicitly confirm consent to automatically reveal my phone number after the specified delay to eligible verified users.
              </span>
            </label>
          </div>
        </div>
      )}

      {contactMode === 'FALLBACK_CONTACT' && (
        <div className="p-3.5 rounded-xl border border-border bg-muted/20 space-y-3 text-xs">
          {fallbacks.length === 0 ? (
            <p className="text-amber-600 dark:text-amber-400 font-medium">
              No verified fallback contacts available. Please add and verify a fallback contact first in your settings.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Select Fallback Contact</label>
                <select
                  value={fallbackContactId}
                  onChange={(e) => setFallbackContactId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  {fallbacks.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.displayName} ({f.relationshipType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Grant Duration (Minutes)</label>
                <Input
                  type="number"
                  min={1}
                  max={43200}
                  value={revealDurationMinutes}
                  onChange={(e) => setRevealDurationMinutes(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border/60">
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-[11px] text-muted-foreground">
                I explicitly activate and consent to using the selected verified backup contact for contact fallback.
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Save Action */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          size="sm"
          disabled={isSaving}
          className="bg-primary text-primary-foreground text-xs gap-1.5"
        >
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
          Save Contact Settings
        </Button>
      </div>
    </form>
  );
}
