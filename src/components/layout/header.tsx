'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Search, Users, MessageSquare, Bell, Building2, HeartHandshake, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/components/providers/auth-provider';

export interface HeaderProps {
  appName?: string;
  user?: { displayName: string; avatarUrl?: string | null } | null;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
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
  const unreadNotificationsCount = propUnreadNotifications !== undefined ? propUnreadNotifications : contextUnreadNotifications;
  const unreadMessagesCount = propUnreadMessages !== undefined ? propUnreadMessages : contextUnreadMessages;

  // Phase 6: partner capability gate — partner accounts see a workspace link.
  // Uses the partner-BASE capabilities only. NOTE: `advertising.partner.*`
  // codes are currently mis-granted to the student role (452 users) — see
  // rbac-phase6 report finding; gating on them would expose the workspace to
  // every customer.
  const canAnyPartner = (contextUserPermissions ?? []).some((p: string) =>
    p === '*' ||
    p === 'property.manage_own' ||
    p === 'listing.manage_own' ||
    p === 'advertising.manage'
  );
  const partnerPortalUrl = (process.env.NEXT_PUBLIC_PARTNER_URL || '').trim() || 'http://localhost:3002';

  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Explore', icon: Home },
    { href: '/search', label: 'Flats', icon: Search },
    { href: '/roommates', label: 'Roommates', icon: Users },
    { href: '/need-now', label: 'Need Now', icon: Timer },
    { href: '/donate', label: 'Donate', icon: HeartHandshake },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="size-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {appName}
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-muted text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                <Icon className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Buttons / User Menu */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <>
              {/* Phase 6 mode switch: users holding a partner capability see a
                  Partner Workspace entry point. Presentation-only — the partner
                  portal's own server guard enforces actual access. */}
              {canAnyPartner && (
                <Link href={partnerPortalUrl}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Building2 className="size-4" />
                    <span className="hidden sm:inline">Partner Workspace</span>
                  </Button>
                </Link>
              )}

              <Link href="/messages">
                <Button variant="ghost" size="icon" className="relative" aria-label="Messages">
                  <MessageSquare className="size-5 text-muted-foreground" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  )}
                </Button>
              </Link>

              <Link href="/notifications">
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="size-5 text-muted-foreground" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-destructive" />
                  )}
                </Button>
              </Link>

              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="gap-2 rounded-full pl-2.5 pr-3.5">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="size-6 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline font-medium text-xs">{user.displayName}</span>
                </Button>
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="shadow-xs">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
