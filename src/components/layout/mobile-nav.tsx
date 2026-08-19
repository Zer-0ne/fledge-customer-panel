'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Search, Users, MessageSquare, User, HeartHandshake, Timer } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

export interface MobileNavProps {
  unreadMessagesCount?: number;
}

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Flats', icon: Search },
  { href: '/roommates', label: 'Roommates', icon: Users },
  { href: '/need-now', label: 'Need Now', icon: Timer },
  { href: '/donate', label: 'Donate', icon: HeartHandshake },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/dashboard', label: 'Profile', icon: User },
] as const;

export function MobileNav({ unreadMessagesCount: propUnreadMessages }: MobileNavProps) {
  let contextUnreadMessages = 0;

  try {
    const auth = useAuth();
    contextUnreadMessages = auth.unreadMessageCount;
  } catch {
    // Rendered outside AuthProvider
  }

  const unreadMessagesCount =
    propUnreadMessages !== undefined ? propUnreadMessages : contextUnreadMessages;
  const pathname = usePathname();

  return (
    <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-border bg-background/95 pb-safe backdrop-blur-md md:hidden">
      <div className="flex h-14 items-center justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const badge = item.href === '/messages' ? unreadMessagesCount : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex w-full flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'relative flex size-8 items-center justify-center rounded-full transition-colors',
                  isActive && 'bg-primary/12 text-primary'
                )}
              >
                <Icon className="size-5" />
                {badge > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </span>
              <span className="leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
