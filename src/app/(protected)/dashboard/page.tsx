'use client';

import * as React from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { fetchFavorites } from '@/lib/api/services/favorites';
import { fetchListingInterests } from '@/lib/api/services/interests';
import { fetchRoommateInterests } from '@/lib/api/services/roommates';
import { fetchConversations } from '@/lib/api/services/chat';
import { fetchNotifications } from '@/lib/api/services/notifications';
import { AnnouncementCenter } from '@/components/announcements/announcement-center';
import { Button } from '@/components/ui/button';
import { TrustBadge } from '@/components/trust/trust-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
import { TrustCard } from '@/components/trust/trust-card';
import {
  Heart,
  MessageSquare,
  Users,
  Building2,
  LogOut,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  Sliders,
  Bookmark,
  Timer,
  Wrench,
  Settings,
} from 'lucide-react';

interface DashboardCounts {
  favorites: number;
  listingInterests: number;
  roommateInterests: number;
  conversations: number;
  unreadNotifications: number;
}

export default function DashboardPage() {
  const { user, logout, unreadMessageCount, unreadNotificationCount } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [counts, setCounts] = React.useState<DashboardCounts | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function loadCounts() {
      setIsLoadingCounts(true);
      try {
        const [favorites, listingInterests, roommateInterests, conversations, notifications] =
          await Promise.all([
            fetchFavorites(),
            fetchListingInterests(),
            fetchRoommateInterests(user?.id),
            fetchConversations(),
            fetchNotifications(),
          ]);

        if (cancelled) return;

        const listingCount =
          listingInterests.incoming.length + listingInterests.outgoing.length;
        const roommateCount =
          roommateInterests.incoming.length + roommateInterests.outgoing.length;
        const unreadFromList = notifications.items.filter((n) => !n.isRead).length;

        setCounts({
          favorites: favorites.length,
          listingInterests: listingCount,
          roommateInterests: roommateCount,
          conversations: conversations.length,
          unreadNotifications: Math.max(unreadFromList, unreadNotificationCount),
        });
      } catch {
        if (!cancelled) {
          setCounts({
            favorites: 0,
            listingInterests: 0,
            roommateInterests: 0,
            conversations: 0,
            unreadNotifications: unreadNotificationCount,
          });
        }
      } finally {
        if (!cancelled) setIsLoadingCounts(false);
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [unreadNotificationCount]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      showToast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
        variant: 'info',
      });
      // Hard navigate with the loggedOut flag: suppresses Google One Tap
      // auto-sign-in on the login page so the user can't be silently
      // re-authenticated right after logging out.
      window.location.href = '/login?loggedOut=1';
    } catch {
      showToast({
        title: 'Logout Error',
        description: 'Could not complete logout.',
        variant: 'error',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const entryCards = [
    {
      href: '/favorites',
      title: 'Saved flats',
      description: 'Your bookmarked listings',
      icon: Heart,
      count: counts?.favorites,
      countLabel: 'saved',
    },
    {
      href: '/interests',
      title: 'Listing enquiries',
      description: 'Incoming and outgoing flat enquiries',
      icon: Building2,
      count: counts?.listingInterests,
      countLabel: 'active',
    },
    {
      href: '/roommate-interests',
      title: 'Roommate requests',
      description: 'Invitations you sent or received',
      icon: Users,
      count: counts?.roommateInterests,
      countLabel: 'requests',
    },
    {
      href: '/saved-searches',
      title: 'Saved searches',
      description: 'Your filters, with alert delivery',
      icon: Bookmark,
      count: undefined,
      countLabel: '',
    },
    {
      href: '/messages',
      title: 'Messages',
      description:
        unreadMessageCount > 0
          ? `${unreadMessageCount} unread message(s)`
          : 'Chat with hosts and flatmates',
      icon: MessageSquare,
      count: counts?.conversations,
      countLabel: 'chats',
      badge: unreadMessageCount > 0,
    },
    {
      href: '/need-now',
      title: 'Housing requests',
      description: 'Your 24-hour Need Now posts',
      icon: Timer,
      count: undefined,
      countLabel: '',
    },
    {
      href: '/maintenance',
      title: 'Maintenance requests',
      description: 'Issues you reported to a property',
      icon: Wrench,
      count: undefined,
      countLabel: '',
    },
    {
      href: '/settings/profile',
      title: 'Account settings',
      description: 'Profile, verification, sessions, theme',
      icon: Settings,
      count: undefined,
      countLabel: '',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 pb-20 md:pb-8">
      <AnnouncementCenter variant="dashboard" />

      {/* Trust Score Card */}
      <TrustCard />

      <div className="fl-gradient-border relative overflow-hidden rounded-3xl bg-card p-6 text-foreground shadow-sm sm:p-8">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="fl-orb fl-orb-1 -top-32 -right-24 size-72 bg-primary/15" />
          <div className="fl-orb fl-orb-2 -bottom-24 left-1/4 size-64 bg-primary/10" />
        </div>
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
              <Sparkles className="size-3.5" />
              <span>Your dashboard</span>
            </div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Welcome back, {user?.displayName || 'Student'}
              <TrustBadge badge={user?.trustBadge} size={24} />
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Everything waiting on you — saved flats, enquiries, roommate requests and messages —
              in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button render={<Link href="/search" />} nativeButton={false} className="h-11 gap-2 rounded-xl px-5">
              <Building2 className="size-4" />
              <span>Browse flats</span>
            </Button>
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="outline"
              size="lg"
              className="h-11 gap-2 rounded-xl px-5"
            >
              <LogOut className="size-4" />
              <span>{isLoggingOut ? 'Logging out…' : 'Log out'}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group">
              <div className="fl-lift flex h-full items-start gap-4 rounded-2xl border border-border bg-card p-5">
                <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                  {card.badge && (
                    <span className="absolute -top-1 -right-1 flex size-3 rounded-full bg-destructive" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{card.title}</h3>
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
                  <div className="mt-2 text-xs font-medium text-foreground/80">
                    {isLoadingCounts || card.count === undefined ? (
                      card.countLabel ? (
                        <Skeleton className="h-4 w-16 rounded" />
                      ) : null
                    ) : (
                      <span>
                        {card.count} {card.countLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground font-bold text-lg">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">{user?.displayName} <TrustBadge badge={user?.trustBadge} size={18} /></h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                <span>Verified Account</span>
              </div>
            </div>
          </div>
          <Link href="/settings/profile">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl">
              <Sliders className="size-3.5" />
              <span>Settings</span>
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/60 text-xs">
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">Email Address</span>
            <p className="font-semibold text-foreground">{user?.email || 'Not provided'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">Phone Number</span>
            <p className="font-semibold text-foreground">{user?.phone || 'Not provided'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground font-medium">Unread Notifications</span>
            <p className="font-semibold text-foreground">
              {counts?.unreadNotifications ?? unreadNotificationCount}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
