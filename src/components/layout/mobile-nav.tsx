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
  { href: '/messages', label: 'Chat', icon: MessageSquare },
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
    <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-white/10 bg-background/60 pb-safe backdrop-blur-2xl dark:border-white/5 md:hidden">
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
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'relative flex size-8 items-center justify-center rounded-xl transition-all duration-200',
                  isActive && 'bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20 backdrop-blur-md scale-105'
                )}
              >
                <Icon className="size-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </span>
              <span className={cn('leading-tight', isActive && 'font-semibold')}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
