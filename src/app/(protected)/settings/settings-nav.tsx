'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User, MonitorSmartphone, Bell, Trash2, ShieldCheck } from 'lucide-react';

const SETTINGS_NAV = [
  { href: '/settings/profile', label: 'Profile', icon: User },
  { href: '/settings/contact', label: 'Contact Preferences', icon: ShieldCheck },
  { href: '/settings/sessions', label: 'Sessions', icon: MonitorSmartphone },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings/account', label: 'Account', icon: Trash2 },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="md:w-52 shrink-0">
      <ul className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
        {SETTINGS_NAV.map((item) => {
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
    </nav>
  );
}
