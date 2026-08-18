'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full rounded-t-2xl bg-background border-t border-border p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 z-10 max-h-[85vh] flex flex-col'
        )}
      >
        {/* Handle bar */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/30" />

        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-border">
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none"
            aria-label="Close drawer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
