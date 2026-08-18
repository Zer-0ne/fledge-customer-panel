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

export function MobileNav({ unreadMessagesCount: propUnreadMessages }: MobileNavProps) {
  let contextUnreadMessages = 0;

  try {
    const auth = useAuth();
    contextUnreadMessages = auth.unreadMessageCount;
  } catch {
    // Rendered outside AuthProvider
  }

  const unreadMessagesCount = propUnreadMessages !== undefined ? propUnreadMessages : contextUnreadMessages;
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Flats', icon: Search },
    { href: '/roommates', label: 'Roommates', icon: Users },
    { href: '/need-now', label: 'Need Now', icon: Timer },
    { href: '/donate', label: 'Donate', icon: HeartHandshake },
    { href: '/messages', label: 'Messages', icon: MessageSquare, badge: unreadMessagesCount },
    { href: '/dashboard', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur-md pb-safe">
      <div className="flex h-14 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-0.5 w-full py-1 text-xs font-medium transition-colors',
                isActive ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="relative">
                <Icon className="size-5" />
                {Boolean(item.badge && item.badge > 0) && (
                  <span className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {item.badge && item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
