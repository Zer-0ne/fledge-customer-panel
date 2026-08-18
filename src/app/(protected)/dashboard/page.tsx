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
import { Skeleton } from '@/components/ui/skeleton';
import { showToast } from '@/components/ui/toast';
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
  Bell,
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
      window.location.href = '/login';
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
      title: 'Saved Flats',
      description: 'View your bookmarked property listings',
      icon: Heart,
      color: 'bg-rose-500/10 text-rose-500',
      count: counts?.favorites,
      countLabel: 'saved',
    },
    {
      href: '/interests',
      title: 'Listing Interests',
      description: 'Track incoming & outgoing flat inquiries',
      icon: Building2,
      color: 'bg-blue-500/10 text-blue-500',
      count: counts?.listingInterests,
      countLabel: 'active',
    },
    {
      href: '/roommate-interests',
      title: 'Roommate Requests',
      description: 'Manage roommate matching invitations',
      icon: Users,
      color: 'bg-amber-500/10 text-amber-500',
      count: counts?.roommateInterests,
      countLabel: 'requests',
    },
    {
      href: '/messages',
      title: 'Messages',
      description:
        unreadMessageCount > 0
          ? `${unreadMessageCount} unread message(s)`
          : 'Chat with potential flatmates',
      icon: MessageSquare,
      color: 'bg-emerald-500/10 text-emerald-500',
      count: counts?.conversations,
      countLabel: 'chats',
      badge: unreadMessageCount > 0,
    },
    {
      href: '/notifications',
      title: 'Notifications',
      description: 'Recent alerts and activity updates',
      icon: Bell,
      color: 'bg-violet-500/10 text-violet-500',
      count: counts?.unreadNotifications,
      countLabel: 'unread',
      badge: (counts?.unreadNotifications || unreadNotificationCount) > 0,
    },
    {
      href: '/settings/profile',
      title: 'Account Settings',
      description: 'Profile, sessions, and preferences',
      icon: Settings,
      color: 'bg-slate-500/10 text-slate-600',
      count: undefined,
      countLabel: '',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <AnnouncementCenter variant="dashboard" />
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 dark:from-indigo-950 dark:via-purple-950 dark:to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-white/10 dark:border-purple-500/20">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-purple-500/20 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide text-white border border-white/20">
              <Sparkles className="size-3.5 text-amber-300" />
              <span>Student Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back, {user?.displayName || 'Student'}!
            </h1>
            <p className="text-sm text-white/85 max-w-xl">
              Jump into saved flats, interest requests, messages, and account settings from one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/search">
              <Button className="font-semibold gap-2 rounded-xl shadow-lg bg-white text-indigo-950 hover:bg-white/90 dark:bg-white dark:text-indigo-950 dark:hover:bg-white/90 border-0">
                <Building2 className="size-4" />
                <span>Explore Flats</span>
              </Button>
            </Link>
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              variant="outline"
              className="font-semibold gap-2 rounded-xl bg-white/10 hover:bg-white/20 border-white/20 text-white"
            >
              <LogOut className="size-4" />
              <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {entryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="group">
              <div className="h-full rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:shadow-md hover:border-primary/50">
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`flex size-10 items-center justify-center rounded-xl relative ${card.color}`}
                  >
                    <Icon className="size-5" />
                    {card.badge && (
                      <span className="absolute -top-1 -right-1 flex size-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <h3 className="font-semibold text-foreground">{card.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
                <div className="mt-3 text-xs font-medium text-foreground/80">
                  {isLoadingCounts || card.count === undefined ? (
                    card.countLabel ? (
                      <Skeleton className="h-4 w-16 rounded" />
                    ) : (
                      <span className="text-muted-foreground">Manage account</span>
                    )
                  ) : (
                    <span>
                      {card.count} {card.countLabel}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground font-bold text-lg">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">{user?.displayName}</h2>
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
