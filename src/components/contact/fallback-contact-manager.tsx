'use client';

import * as React from 'react';
import { FallbackContact, FallbackRelationshipType } from '@/types';
import {
  fetchFallbackContacts,
  createFallbackContact,
  requestFallbackVerification,
  confirmFallbackVerification,
  deleteFallbackContact,
  normalizeContactError,
} from '@/lib/api/services/contact';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showToast } from '@/components/ui/toast';
import {
  UserCheck,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Phone,
  User,
} from 'lucide-react';

const RELATIONSHIP_OPTIONS: Array<{ value: FallbackRelationshipType; label: string }> = [
  { value: 'CURRENT_ROOMMATE', label: 'Current Roommate' },
  { value: 'PROPERTY_OWNER', label: 'Property Owner' },
  { value: 'PROPERTY_MANAGER', label: 'Property Manager' },
  { value: 'FAMILY', label: 'Family Member' },
  { value: 'TRUSTED_REPRESENTATIVE', label: 'Trusted Representative' },
];

export function FallbackContactManager() {
  const [contacts, setContacts] = React.useState<FallbackContact[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null);
  const [otpCode, setOtpCode] = React.useState('');

  // Form State
  const [displayName, setDisplayName] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [relationshipType, setRelationshipType] = React.useState<FallbackRelationshipType>('FAMILY');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadContacts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await fetchFallbackContacts();
      setContacts(list);
    } catch (err: unknown) {
      showToast({
        title: 'Failed to load fallback contacts',
        description: normalizeContactError(err),
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      loadContacts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadContacts]);

  const handleAddFallback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !phoneNumber.trim()) {
      showToast({ title: 'Validation Error', description: 'Name and E.164 phone number are required.', variant: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createFallbackContact({
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        relationshipType,
      });
      setContacts((prev) => [...prev, created]);
      setShowAddModal(false);
      setDisplayName('');
      setPhoneNumber('');
      showToast({
        title: 'Fallback Contact Added',
        description: 'Now request OTP verification to activate this contact.',
        variant: 'success',
      });
    } catch (err: unknown) {
      showToast({
        title: 'Failed to Add Fallback',
        description: normalizeContactError(err),
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestVerification = async (id: string) => {
    try {
      await requestFallbackVerification(id);
      setVerifyingId(id);
      setOtpCode('');
      showToast({
        title: 'OTP Code Sent',
        description: 'A 6-digit confirmation code was sent to the fallback number.',
        variant: 'info',
      });
    } catch (err: unknown) {
      showToast({
        title: 'Verification Request Failed',
        description: normalizeContactError(err),
        variant: 'error',
      });
    }
  };

  const handleConfirmVerification = async (id: string) => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      showToast({ title: 'Invalid Code', description: 'Please enter the 6-digit verification code.', variant: 'error' });
      return;
    }

    try {
      await confirmFallbackVerification(id, otpCode.trim());
      setVerifyingId(null);
      setOtpCode('');
      await loadContacts();
      showToast({
        title: 'Fallback Contact Verified!',
        description: 'This backup contact can now be used for fallback contact mode.',
        variant: 'success',
      });
    } catch (err: unknown) {
      showToast({
        title: 'Verification Failed',
        description: normalizeContactError(err),
        variant: 'error',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFallbackContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      showToast({ title: 'Fallback Removed', description: 'Fallback contact removed.', variant: 'info' });
    } catch (err: unknown) {
      showToast({ title: 'Delete Failed', description: normalizeContactError(err), variant: 'error' });
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <UserCheck className="size-4 text-primary" />
            Verified Fallback Contacts
          </h3>
          <p className="text-xs text-muted-foreground">
            Manage trusted emergency contact backups when you are unavailable or move out.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          className="text-xs gap-1.5 bg-primary text-primary-foreground"
        >
          <Plus className="size-3.5" /> Add Contact
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin text-primary" /> Loading fallback contacts...
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground space-y-2">
          <ShieldAlert className="size-8 mx-auto text-muted-foreground/60" />
          <p>No fallback contacts added yet.</p>
          <p className="text-[11px]">Add a property manager, roommate, or family member to use fallback contact sharing.</p>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex flex-col justify-between p-3.5 rounded-xl border border-border bg-muted/20 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="size-3.5 text-muted-foreground" />
                    {contact.displayName}
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    {RELATIONSHIP_OPTIONS.find((r) => r.value === contact.relationshipType)?.label || contact.relationshipType}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className={
                    contact.verificationStatus === 'VERIFIED'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]'
                  }
                >
                  {contact.verificationStatus}
                </Badge>
              </div>

              {verifyingId === contact.id ? (
                <div className="space-y-2 pt-1 border-t border-border">
                  <span className="text-[11px] font-medium text-foreground">Enter 6-digit code:</span>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="h-8 text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleConfirmVerification(contact.id)}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="size-3.5 mr-1" /> Confirm
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                  {contact.verificationStatus !== 'VERIFIED' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRequestVerification(contact.id)}
                      className="h-7 text-[11px] text-amber-600 border-amber-500/30 hover:bg-amber-500/10 gap-1"
                    >
                      <Send className="size-3" /> Request Verification OTP
                    </Button>
                  ) : (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="size-3" /> Ready for fallback use
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(contact.id)}
                    className="size-7 text-muted-foreground hover:text-rose-600"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Plus className="size-4 text-primary" /> Add Fallback Backup Contact
            </h3>

            <form onSubmit={handleAddFallback} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Display Name</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar (Property Manager)"
                  required
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Phone Number (E.164 Format)</label>
                <div className="relative">
                  <Phone className="size-3.5 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+919876543210"
                    className="pl-9 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Relationship</label>
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value as FallbackRelationshipType)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground"
                >
                  {isSubmitting ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
                  Save Contact
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
