'use client';

import * as React from 'react';
import { RoommatePostType } from '@/types';
import { cn } from '@/lib/utils';

export const POST_TYPE_OPTIONS: {
  value: RoommatePostType;
  label: string;
  description: string;
}[] = [
  {
    value: 'NEED_ROOMMATE',
    label: 'I need a roommate',
    description: 'Looking for someone to share your existing room or flat.',
  },
  {
    value: 'LEAVING_FLAT_NEED_REPLACEMENT',
    label: 'Leaving my flat, need a replacement',
    description: 'Moving out and finding a tenant to take over your room.',
  },
  {
    value: 'ROOM_AVAILABLE_IN_EXISTING_FLAT',
    label: 'Room available in my flat',
    description: 'One genuine room available in the flat you already live in.',
  },
  {
    value: 'LOOKING_TO_JOIN_EXISTING_FLAT',
    label: 'Looking to join an existing flat',
    description: 'A student looking for a room in a shared accommodation.',
  },
];

interface PostTypeSelectProps {
  value: RoommatePostType;
  onChange: (value: RoommatePostType) => void;
  disabled?: boolean;
}

/** Post type selector with per-type guidance (Phase 12). */
export function PostTypeSelect({ value, onChange, disabled }: PostTypeSelectProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Post type">
      {POST_TYPE_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-xl border p-3 text-left transition-colors',
              selected
                ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30'
                : 'border-border/60 bg-card hover:border-border',
              disabled && 'opacity-50 pointer-events-none'
            )}
          >
            <span className="block text-sm font-medium text-foreground">
              {option.label}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
