'use client';

import * as React from 'react';
// import { FallbackContactManager } from '@/components/contact/fallback-contact-manager'; // hidden until OTP SMS live
import { ShieldCheck, PhoneCall, Info } from 'lucide-react';

export default function ContactSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          Contact Sharing & Fallback Settings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage how interested customers contact you, and configure backup representatives when you are unavailable.
        </p>
      </div>

      <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-3">
        <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">How Controlled Contact Fallback Works</p>
          <p className="text-muted-foreground leading-relaxed">
            Your phone number is never publicly exposed. When chatting with interested tenants or roommates, you can choose to share your contact number directly or route requests to a verified backup representative (such as a property manager, roommate, or family member).
          </p>
        </div>
      </div>

      {/* Fallback contacts hidden until OTP SMS delivery is live (CONTACT_DELIVERY_DRIVER). Backend APIs stay, UI returns with verification working. */}
      {/* <FallbackContactManager /> */}
    </div>
  );
}
