'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Search, Users, Timer, User } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

export interface MobileNavProps {
  unreadMessagesCount?: number;
}

const NAV_ITEMS = [
  { href: '/', label: 'Explore', icon: Home },
  { href: '/search', label: 'Flats', icon: Search },
  { href: '/roommates', label: 'Roommates', icon: Users },
  { href: '/need-now', label: 'Need Now', icon: Timer },
  { href: '/dashboard', label: 'Account', icon: User },
] as const;

export function MobileNav({ unreadMessagesCount: propUnreadMessages }: MobileNavProps) {
  let contextUnreadMessages = 0;
  let contextUser = null;

  try {
    const auth = useAuth();
    contextUnreadMessages = auth.unreadMessageCount;
    contextUser = auth.user;
  } catch {
    // Rendered outside AuthProvider
  }

  const unreadMessagesCount =
    propUnreadMessages !== undefined ? propUnreadMessages : contextUnreadMessages;
  const pathname = usePathname();

  // Hide on active chat threads and auth pages to preserve keyboard / viewport space
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/otp');
  const isChatThread = pathname.startsWith('/messages/') && pathname !== '/messages';

  if (isAuthPage || isChatThread) {
    return null;
  }

  return (
    <nav
      className="fixed right-0 bottom-0 left-0 z-50 border-t border-border/70 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/70 dark:border-white/10 md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex h-14 items-center justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-medium transition-colors',
                isActive ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'relative flex size-8 items-center justify-center rounded-xl transition-all duration-200',
                  isActive &&
                    'bg-primary/15 text-primary shadow-xs ring-1 ring-primary/25 backdrop-blur-md scale-105'
                )}
              >
                {item.href === '/dashboard' && contextUser?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={contextUser.avatarUrl}
                    alt=""
                    className={cn(
                      'size-5 rounded-full object-cover ring-1',
                      isActive ? 'ring-primary' : 'ring-muted'
                    )}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Icon className="size-[18px]" strokeWidth={isActive ? 2.3 : 1.8} />
                )}
              </span>
              <span className="leading-tight mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

