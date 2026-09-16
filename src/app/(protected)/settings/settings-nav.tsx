'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Bell,
  BadgeCheck,
  GraduationCap,
  IdCard,
  Mail,
  MonitorSmartphone,
  Palette,
  Phone,
  ShieldCheck,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';

/**
 * Full settings map. The sidebar used to list six items while /settings had
 * thirteen pages — Data & privacy, Contact details and all four verification
 * screens were only reachable from other pages' inline links.
 */
const SETTINGS_SECTIONS = [
  {
    label: 'Account',
    items: [
      { href: '/settings/profile', label: 'Profile', icon: User },
      { href: '/settings/contact', label: 'Contact details', icon: Mail },
      { href: '/settings/contact-privacy', label: 'Contact preferences', icon: ShieldCheck },
      { href: '/settings/notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    label: 'Verification',
    items: [
      { href: '/settings/verify/student', label: 'Student ID', icon: GraduationCap },
      { href: '/settings/verify/college-email', label: 'College email', icon: IdCard },
      { href: '/settings/verify/phone', label: 'Phone number', icon: Phone },
      { href: '/settings/verify/upi', label: 'UPI / payments', icon: Wallet },
    ],
  },
  {
    label: 'Privacy & devices',
    items: [
      { href: '/settings/data', label: 'Data & privacy', icon: BadgeCheck },
      { href: '/settings/sessions', label: 'Sessions', icon: MonitorSmartphone },
      { href: '/settings/appearance', label: 'Appearance & theme', icon: Palette },
    ],
  },
  {
    label: 'Danger zone',
    items: [{ href: '/settings/account', label: 'Account & deletion', icon: Trash2 }],
  },
] as const;

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full shrink-0 md:w-60" aria-label="Settings sections">
      <ul className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:gap-5 md:overflow-visible md:pb-0">
        {SETTINGS_SECTIONS.map((section) => (
          <li key={section.label} className="contents md:block">
            <p className="hidden px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase md:block">
              {section.label}
            </p>
            <ul className="flex gap-1 md:mt-1.5 md:flex-col">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <li key={item.href} className="shrink-0 md:shrink">
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
