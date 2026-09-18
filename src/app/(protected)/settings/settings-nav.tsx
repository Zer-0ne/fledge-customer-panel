'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User, MonitorSmartphone, Bell, Trash2, ShieldCheck, Palette, GraduationCap, AtSign, Phone, Wallet, Database } from 'lucide-react';

/** Grouped so Verification (the trust system) is discoverable — it used to be
 *  reachable only from deep links, which buried the product's core promise. */
const SETTINGS_GROUPS: Array<{
  title: string;
  items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>;
}> = [
  {
    title: 'Account',
    items: [
      { href: '/settings/profile', label: 'Profile', icon: User },
      { href: '/settings/contact', label: 'Contact details', icon: AtSign },
      { href: '/settings/contact-privacy', label: 'Contact preferences', icon: ShieldCheck },
      { href: '/settings/appearance', label: 'Appearance & theme', icon: Palette },
      { href: '/settings/notifications', label: 'Notifications', icon: Bell },
      { href: '/settings/sessions', label: 'Sessions & devices', icon: MonitorSmartphone },
    ],
  },
  {
    title: 'Verification',
    items: [
      { href: '/settings/verify/student', label: 'Student & faculty', icon: GraduationCap },
      { href: '/settings/verify/college-email', label: 'College email', icon: AtSign },
      { href: '/settings/verify/phone', label: 'Phone number', icon: Phone },
      { href: '/settings/verify/upi', label: 'UPI payout', icon: Wallet },
    ],
  },
  {
    title: 'Data',
    items: [
      { href: '/settings/data', label: 'Your data & export', icon: Database },
      { href: '/settings/account', label: 'Account & deletion', icon: Trash2 },
    ],
  },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="md:w-56 shrink-0">
      <div className="flex md:flex-col gap-4 overflow-x-auto pb-1 md:pb-0">
        {SETTINGS_GROUPS.map((group) => (
          <div key={group.title} className="flex md:flex-col gap-1">
            <p className="hidden md:block px-3 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.title}
            </p>
            <ul className="flex md:flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                        isActive
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
