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
import { PwaInstallButton } from '@/components/pwa/pwa-install-button';
import { useAuth } from '@/components/providers/auth-provider';

export interface HeaderProps {
  appName?: string;
  isBeta?: boolean;
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
  appName = 'Fledge',
  isBeta: propIsBeta,
  user: propUser,
  unreadNotificationsCount: propUnreadNotifications,
  unreadMessagesCount: propUnreadMessages,
}: HeaderProps) {
  const isBeta =
    propIsBeta !== undefined
      ? propIsBeta
      : (process.env.NEXT_PUBLIC_IS_BETA ??
         process.env.NEXT_PUBLIC_SHOW_BETA_TAG ??
         'true') !== 'false' &&
        (process.env.NEXT_PUBLIC_IS_BETA ??
         process.env.NEXT_PUBLIC_SHOW_BETA_TAG ??
         'true') !== '0';
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
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/40 dark:border-white/5">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-1.5 px-3 sm:gap-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2 transition-opacity hover:opacity-80">
          <div className="flex size-7.5 sm:size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <Building2 className="size-4" />
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="text-sm sm:text-base font-bold tracking-tight text-foreground">{appName}</span>
            {isBeta && (
              <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold tracking-wide text-primary ring-1 ring-inset ring-primary/20">
                Beta
              </span>
            )}
          </div>
        </Link>

        {/* Desktop nav — pill bar */}
        <nav
          className="hidden items-center gap-0.5 rounded-full bg-white/10 p-0.5 ring-1 ring-white/10 backdrop-blur-md dark:bg-white/5 dark:ring-white/5 md:flex"
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
                  'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="header-nav-active"
                    className="absolute inset-0 rounded-full bg-white/80 shadow-sm ring-1 ring-white/20 backdrop-blur-md dark:bg-white/10 dark:ring-white/10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon className="relative size-3.5" />
                <span className="relative hidden lg:inline">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <PwaInstallButton />
          <ThemeToggle className="size-8 sm:size-9 rounded-full" />

          {user ? (
            <>
              {canAnyPartner ? (
                <Button
                  render={<a href={partnerPortalUrl} />}
                  nativeButton={false}
                  variant="ghost"
                  size="icon"
                  className="hidden size-8 sm:size-9 rounded-full lg:inline-flex"
                  aria-label="Partner portal"
                >
                  <Building2 className="size-4 sm:size-[18px] text-muted-foreground" />
                </Button>
              ) : null}

              <Button
                render={<Link href="/messages" />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                className="relative size-8 sm:size-9 rounded-full"
                aria-label="Messages"
              >
                <MessageSquare className="size-4 sm:size-[18px] text-muted-foreground" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 sm:right-1 sm:top-1 flex h-3.5 sm:h-4 min-w-3.5 sm:min-w-4 items-center justify-center rounded-full bg-primary px-0.5 sm:px-1 text-[9px] sm:text-[10px] font-bold text-primary-foreground">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </Button>

              <Button
                render={<Link href="/notifications" />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                className="relative size-8 sm:size-9 rounded-full"
                aria-label="Notifications"
              >
                <Bell className="size-4 sm:size-[18px] text-muted-foreground" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute right-1 top-1 sm:right-1.5 sm:top-1.5 size-2 rounded-full bg-destructive" />
                )}
              </Button>

              <Button
                render={<Link href="/dashboard" />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                className="ml-0.5 hidden size-8 sm:size-9 rounded-full sm:inline-flex"
                aria-label="Profile"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="size-6 sm:size-7 rounded-full object-cover ring-2 ring-background"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex size-6 sm:size-7 items-center justify-center rounded-full bg-primary/10 text-[11px] sm:text-xs font-semibold text-primary">
                    {user.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </Button>
            </>
          ) : (
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              size="sm"
              className="h-8 text-xs px-2.5 sm:h-9 sm:text-sm sm:px-3 rounded-full"
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
