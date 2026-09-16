'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { showToast } from '@/components/ui/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bookmark,
  Building2,
  Heart,
  LogOut,
  Settings,
  User as UserIcon,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Account menu for the header.
 *
 * Before this existed the only route to settings / saved items / logout was
 * the dashboard page (which then repeated the same links as cards), so the
 * header had no "where is my stuff" affordance at all.
 */
export function UserMenu() {
  const router = useRouter();
  const { user, permissions, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const canAnyPartner = (permissions ?? []).some(
    (p: string) =>
      p === '*' || p === 'property.manage_own' || p === 'listing.manage_own' || p === 'advertising.manage'
  );
  const partnerPortalUrl =
    (process.env.NEXT_PUBLIC_PARTNER_URL || '').trim() || 'http://localhost:3002';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } catch {
      showToast({
        title: 'Could not log out',
        description: 'Please check your connection and try again.',
        variant: 'error',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) return null;

  const initial = user.displayName?.charAt(0)?.toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className={cn(
              'relative inline-flex size-9 items-center justify-center rounded-full outline-none',
              'ring-offset-background transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          />
        }
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="size-7 rounded-full object-cover ring-2 ring-background"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
            {initial}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5">
          <span className="block truncate text-sm font-semibold text-foreground">
            {user.displayName}
          </span>
          <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          render={<Link href="/settings/profile" />}
          className="min-h-10 cursor-pointer gap-2.5 px-2 text-sm"
        >
          <UserIcon className="size-4 text-muted-foreground" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/favorites" />}
          className="min-h-10 cursor-pointer gap-2.5 px-2 text-sm"
        >
          <Heart className="size-4 text-muted-foreground" />
          Saved flats
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/saved-searches" />}
          className="min-h-10 cursor-pointer gap-2.5 px-2 text-sm"
        >
          <Bookmark className="size-4 text-muted-foreground" />
          Saved searches
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/maintenance" />}
          className="min-h-10 cursor-pointer gap-2.5 px-2 text-sm"
        >
          <Wrench className="size-4 text-muted-foreground" />
          My requests
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/settings" />}
          className="min-h-10 cursor-pointer gap-2.5 px-2 text-sm"
        >
          <Settings className="size-4 text-muted-foreground" />
          Settings
        </DropdownMenuItem>

        {canAnyPartner ? (
          <DropdownMenuItem
            render={<a href={partnerPortalUrl} />}
            className="min-h-10 cursor-pointer gap-2.5 px-2 text-sm"
          >
            <Building2 className="size-4 text-muted-foreground" />
            Partner portal
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={isLoggingOut}
          onClick={handleLogout}
          className="min-h-10 cursor-pointer gap-2.5 px-2 text-sm"
        >
          <LogOut className="size-4" />
          {isLoggingOut ? 'Logging out…' : 'Log out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
