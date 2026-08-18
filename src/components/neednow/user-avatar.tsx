import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BadgeCheck } from 'lucide-react';

export interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  verified?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
} as const;

/**
 * Circular avatar with an optional verified badge. Falls back to the first
 * letter of the display name when no avatar URL is available.
 */
export function UserAvatar({
  name,
  avatarUrl,
  verified = false,
  size = 'md',
  className,
}: UserAvatarProps) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={`${name}'s avatar`}
          width={56}
          height={56}
          className={cn(
            'rounded-full object-cover bg-muted ring-1 ring-border',
            SIZES[size]
          )}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            'flex items-center justify-center rounded-full bg-primary/10 font-bold text-primary ring-1 ring-border',
            SIZES[size]
          )}
        >
          {initial}
        </span>
      )}
      {verified && (
        <Badge
          variant="success"
          className="absolute -bottom-0.5 -right-0.5 size-4.5 min-w-0 rounded-full border-2 border-background p-0 text-[10px]"
          aria-label="Verified user"
        >
          <BadgeCheck className="size-3" />
        </Badge>
      )}
    </span>
  );
}
