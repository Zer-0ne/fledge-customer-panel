'use client';

/**
 * Contact Privacy Education page — mirrors Flutter's `contact_privacy_screen.dart`.
 *
 * Tappable rows with explainer sheets for each contact privacy feature.
 * "Fallback contacts" navigates to the existing /settings/contact page.
 */

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Users,
  EyeOff,
  Clock,
  Timer,
  UserCheck,
  ChevronRight,
  Info,
} from 'lucide-react';

interface PrivacyRow {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  href?: string;
}

const DEFAULT_MODE_ROWS: PrivacyRow[] = [
  {
    icon: CheckCircle2,
    title: 'Approval required',
    description:
      'People must ask for your contact details; you approve each request before anything is shared. No one gets your number without your explicit approval.',
  },
  {
    icon: Users,
    title: 'Verified users only',
    description:
      'Only verified users can see your contact details — everyone else stays inside app chat. Unverified users can message you but cannot access your phone number.',
  },
  {
    icon: EyeOff,
    title: 'Never reveal automatically',
    description:
      'Your number is never revealed automatically. Contact happens inside the app and stays hidden. Even after a conversation ends, your number remains private.',
  },
];

const SAFETY_ROWS: PrivacyRow[] = [
  {
    icon: Timer,
    title: 'Daily reveal limit',
    description:
      'Caps how many contact reveals are allowed per day so your number can\'t be shared around. Once the limit is reached, further requests are blocked until the next day.',
  },
  {
    icon: Clock,
    title: 'Auto-reveal delay',
    description:
      'For delay-reveal mode: verified users see your details only after the configured waiting period. This gives you time to respond before your number is shared.',
  },
  {
    icon: UserCheck,
    title: 'Fallback contacts',
    description: 'Manage backup representatives who can receive contact requests when you\'re unavailable.',
    href: '/settings/contact',
  },
];

function PrivacyRowItem({ row }: { row: PrivacyRow }) {
  const [showDetail, setShowDetail] = React.useState(false);
  const content = (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="flex items-center gap-3 min-w-0">
        <row.icon className="size-4.5 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground">{row.title}</span>
      </div>
      {row.href ? (
        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
      ) : (
        <button
          type="button"
          onClick={() => setShowDetail(!showDetail)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showDetail ? 'Less' : 'More'}
        </button>
      )}
    </div>
  );

  return (
    <div>
      {row.href ? (
        <Link href={row.href} className="block hover:bg-muted/30 transition-colors rounded-lg">
          {content}
        </Link>
      ) : (
        <button type="button" onClick={() => setShowDetail(!showDetail)} className="w-full text-left hover:bg-muted/30 transition-colors rounded-lg">
          {content}
        </button>
      )}
      {showDetail && !row.href && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-xs text-muted-foreground leading-relaxed pl-7.5">{row.description}</p>
        </div>
      )}
    </div>
  );
}

export default function ContactPrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="rounded-xl text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            <ShieldCheck className="size-3" />
            Contact Privacy
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">
            Contact privacy
          </h1>
          <p className="text-sm text-muted-foreground">
            Control how others reach you
          </p>
        </div>

        {/* Default Mode section */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
            Default Mode
          </p>
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
            {DEFAULT_MODE_ROWS.map((row) => (
              <PrivacyRowItem key={row.title} row={row} />
            ))}
          </div>
        </div>

        {/* Safety section */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">
            Safety
          </p>
          <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
            {SAFETY_ROWS.map((row) => (
              <PrivacyRowItem key={row.title} row={row} />
            ))}
          </div>
        </div>

        {/* Info note */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 flex items-start gap-3">
          <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Every listing and roommate post has its own contact mode — set it from the post
            screen (Contact settings) when you own the post.
          </p>
        </div>
      </div>
    </div>
  );
}
