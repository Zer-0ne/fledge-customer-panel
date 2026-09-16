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
  Wand2,
  Wrench,
  MoreHorizontal,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { PwaInstallButton } from '@/components/pwa/pwa-install-button';
import { UserMenu } from '@/components/layout/user-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/providers/auth-provider';

export interface HeaderProps {
  appName?: string;
  isBeta?: boolean;
  user?: { displayName: string; avatarUrl?: string | null } | null;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
}

/**
 * Five primary destinations, then everything else behind "More".
 * (Was: seven pill links + four header icons. At md–lg the labels were hidden
 * entirely, so the bar was icon-only — Timer / Wand / Building2 are not
 * guessable. Labels now start at md, with the wordmark yielding instead.)
 */
const NAV_LINKS = [
  { href: '/', label: 'Explore', icon: Home },
  { href: '/search', label: 'Flats', icon: Search },
  { href: '/roommates', label: 'Roommates', icon: Users },
  { href: '/need-now', label: 'Need Now', icon: Timer },
  { href: '/neighbourhood', label: 'Community', icon: Building2 },
] as const;

const MORE_LINKS = [
  { href: '/import', label: 'Post from a group', icon: Wand2 },
  { href: '/services', label: 'Home services', icon: Wrench },
  { href: '/resale', label: 'Resale board', icon: ShoppingBag },
  { href: '/utility', label: 'Utility board', icon: Sparkles },
] as const;

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
  let contextUnreadNotifications = 0;
  let contextUnreadMessages = 0;

  try {
    const auth = useAuth();
    contextUser = auth.user;
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

  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
          aria-label={`${appName} home`}
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Building2 className="size-4.5" />
          </span>
          <span className="hidden items-center gap-1.5 lg:flex">
            <span className="text-base font-bold tracking-tight text-foreground">{appName}</span>
            {isBeta && (
              <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold tracking-wide text-primary ring-1 ring-inset ring-primary/20">
                Beta
              </span>
            )}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-0.5 rounded-full bg-muted/60 p-1 ring-1 ring-border/60 md:flex"
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
                  'relative flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="header-nav-active"
                    className="absolute inset-0 rounded-full bg-background shadow-sm ring-1 ring-border/70"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon className="relative size-4" strokeWidth={active ? 2.3 : 1.9} />
                <span className="relative">{link.label}</span>
              </Link>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="relative flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground"
                  aria-label="More destinations"
                />
              }
            >
              <MoreHorizontal className="size-4" />
              More
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {MORE_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <DropdownMenuItem
                    key={link.href}
                    render={<Link href={link.href} />}
                    className="min-h-10 cursor-pointer gap-2.5 text-sm"
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    {link.label}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link href="/donate" />}
                className="min-h-10 cursor-pointer gap-2.5 text-sm"
              >
                <HeartHandshake className="size-4 text-muted-foreground" />
                Support Fledge
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right side actions */}
        <div className="flex shrink-0 items-center gap-1">
          <PwaInstallButton />
          <ThemeToggle className="size-9 rounded-full" />

          {user ? (
            <>
              <Button
                render={<Link href="/messages" />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                className="relative size-9 rounded-full"
                aria-label={`Messages${unreadMessagesCount > 0 ? ` (${unreadMessagesCount} unread)` : ''}`}
              >
                <MessageSquare className="size-4.5 text-muted-foreground" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute top-1 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </Button>

              <Button
                render={<Link href="/notifications" />}
                nativeButton={false}
                variant="ghost"
                size="icon"
                className="relative size-9 rounded-full"
                aria-label={`Notifications${unreadNotificationsCount > 0 ? ' (unread)' : ''}`}
              >
                <Bell className="size-4.5 text-muted-foreground" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />
                )}
              </Button>

              <UserMenu />
            </>
          ) : (
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              size="lg"
              className="h-10 rounded-full px-4 text-sm font-semibold"
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
