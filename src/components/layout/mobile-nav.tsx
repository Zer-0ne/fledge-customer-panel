'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Search, Users, Timer, User } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

export interface MobileNavProps {
  /** Kept for API compatibility; messages now live on the header icon. */
  unreadMessagesCount?: number;
}

/**
 * Five thumb-reachable destinations (Material 3 recommends 3–5; this bar had
 * six tabs with 9px labels). Community moved to the Explore hub and the header
 * "More" menu, Chats stays on the header icon.
 */
const NAV_ITEMS = [
  { href: '/', label: 'Explore', icon: Home },
  { href: '/search', label: 'Flats', icon: Search },
  { href: '/roommates', label: 'Roommates', icon: Users },
  { href: '/need-now', label: 'Need Now', icon: Timer },
  { href: '/dashboard', label: 'Account', icon: User },
] as const;

export function MobileNav() {
  let contextUser = null;

  try {
    const auth = useAuth();
    contextUser = auth.user;
  } catch {
    // Rendered outside AuthProvider
  }

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
      className="fixed right-0 bottom-0 left-0 z-50 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex h-16 items-stretch justify-around">
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
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground active:text-foreground'
              )}
            >
              <span
                className={cn(
                  'relative flex size-9 items-center justify-center rounded-xl transition-colors',
                  isActive && 'bg-primary/12'
                )}
              >
                {item.href === '/dashboard' && contextUser?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={contextUser.avatarUrl}
                    alt=""
                    className={cn(
                      'size-6 rounded-full object-cover ring-2',
                      isActive ? 'ring-primary' : 'ring-border'
                    )}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Icon className="size-5" strokeWidth={isActive ? 2.3 : 1.8} />
                )}
              </span>
              <span className="w-full max-w-full truncate text-center leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
