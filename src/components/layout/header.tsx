'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  Home,
  Search,
  Users,
  MessageSquare,
  Bell,
  Building2,
  HeartHandshake,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/components/providers/auth-provider';

export interface HeaderProps {
  appName?: string;
  user?: { displayName: string; avatarUrl?: string | null } | null;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
}

const NAV_LINKS = [
  { href: '/', label: 'Explore', icon: Home },
  { href: '/search', label: 'Flats', icon: Search },
  { href: '/roommates', label: 'Roommates', icon: Users },
  { href: '/need-now', label: 'Need Now', icon: Timer },
  { href: '/donate', label: 'Donate', icon: HeartHandshake },
];

function isNavActive(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href));
}

export function Header({
  appName = 'Flat Finder',
  user: propUser,
  unreadNotificationsCount: propUnreadNotifications,
  unreadMessagesCount: propUnreadMessages,
}: HeaderProps) {
  let contextUser = null;
  let contextUserPermissions: string[] = [];
  let contextUnreadNotifications = 0;
  let contextUnreadMessages = 0;

  try {
    const auth = useAuth();
    contextUser = auth.user;
    contextUserPermissions = auth.permissions;
    contextUnreadNotifications = auth.unreadNotificationCount;
    contextUnreadMessages = auth.unreadMessageCount;
  } catch {
    // Rendered outside AuthProvider
  }

  const user = propUser !== undefined ? propUser : contextUser;
  const unreadNotificationsCount =
    propUnreadNotifications !== undefined ? propUnreadNotifications : contextUnreadNotifications;
  const unreadMessagesCount =
    propUnreadMessages !== undefined ? propUnreadMessages : contextUnreadMessages;

  const canAnyPartner = (contextUserPermissions ?? []).some(
    (p: string) =>
      p === '*' ||
      p === 'property.manage_own' ||
      p === 'listing.manage_own' ||
      p === 'advertising.manage'
  );
  const partnerPortalUrl =
    (process.env.NEXT_PUBLIC_PARTNER_URL || '').trim() || 'http://localhost:3002';

  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="size-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">{appName}</span>
        </Link>

        <nav
          className="hidden items-center rounded-full bg-muted/50 p-1 ring-1 ring-foreground/8 md:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const active = isNavActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="header-nav-active"
                    className="absolute inset-0 rounded-full bg-background shadow-sm ring-1 ring-foreground/10"
                    transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
                  />
                ) : null}
                <Icon className="relative size-3.5" />
                <span className="relative hidden lg:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle className="rounded-full" />

          {user ? (
            <>
              {canAnyPartner ? (
                <Button
                  render={<a href={partnerPortalUrl} />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                  className="hidden rounded-full lg:inline-flex"
                >
                  <Building2 data-icon="inline-start" />
                  Partner
                </Button>
              ) : null}

              <Button
                render={<Link href="/messages" />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                className="relative rounded-full"
                aria-label="Messages"
              >
                <MessageSquare className="size-5 text-muted-foreground" />
                {unreadMessagesCount > 0 ? (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                ) : null}
              </Button>

              <Button
                render={<Link href="/notifications" />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                className="relative rounded-full"
                aria-label="Notifications"
              >
                <Bell className="size-5 text-muted-foreground" />
                {unreadNotificationsCount > 0 ? (
                  <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-destructive" />
                ) : null}
              </Button>

              <Button
                render={<Link href="/dashboard" />}
                nativeButton={false}
                variant="outline"
                size="sm"
                className="gap-2 rounded-full pl-1.5 pr-2.5 sm:pr-3"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="size-6 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="hidden max-w-28 truncate text-xs font-medium sm:inline">
                  {user.displayName}
                </span>
              </Button>
            </>
          ) : (
            <>
              <Button
                render={<Link href="/login" />}
                nativeButton={false}
                variant="ghost"
                size="sm"
                className="rounded-full"
              >
                Log in
              </Button>
              <Button
                render={<Link href="/signup" />}
                nativeButton={false}
                size="sm"
                className="rounded-full"
              >
                Sign up
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
