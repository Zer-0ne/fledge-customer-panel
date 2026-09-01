'use client';

import * as React from 'react';
import { Toaster, toast } from 'sonner';
import { useTheme } from '@/components/providers/theme-provider';

export type ToastType = 'success' | 'error' | 'info' | 'default';

export interface ShowToastOptions {
  title?: string;
  description?: string;
  message?: string;
  variant?: ToastType;
  type?: ToastType;
}

/**
 * Global helper — backward-compatible wrapper around sonner.
 * All 247+ call sites that use `showToast({ title, description, type })` keep working.
 */
export function showToast(options: ShowToastOptions | string) {
  if (typeof options === 'string') {
    toast.info(options);
    return;
  }
  const kind = options.variant || options.type || 'info';
  const title = options.title || '';
  const desc = options.description || options.message || '';

  switch (kind) {
    case 'success':
      toast.success(title, { description: desc || undefined });
      break;
    case 'error':
      toast.error(title, { description: desc || undefined });
      break;
    default:
      toast(title, { description: desc || undefined });
      break;
  }
}

/**
 * Drop-in provider — renders sonner's Toaster with theme support.
 * Keeps the same import path so layout.tsx needs zero changes.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  let resolvedTheme: string = 'light';
  try {
    const { resolvedTheme: t } = useTheme();
    resolvedTheme = t;
  } catch {
    // SSR or outside ThemeProvider
  }

  return (
    <>
      {children}
      <Toaster
        theme={resolvedTheme as 'light' | 'dark' | 'system'}
        position="bottom-right"
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          className: 'rounded-2xl border border-white/15 bg-white/70 !backdrop-blur-2xl shadow-xl ring-1 ring-white/10 dark:border-white/10 dark:bg-white/10 dark:ring-white/5',
          classNames: {
            success: 'border-emerald-400/20 bg-emerald-500/10 !backdrop-blur-2xl dark:border-emerald-400/15 dark:bg-emerald-500/10',
            error: 'border-red-400/20 bg-red-500/10 !backdrop-blur-2xl dark:border-red-400/15 dark:bg-red-500/10',
            info: 'border-blue-400/20 bg-blue-500/10 !backdrop-blur-2xl dark:border-blue-400/15 dark:bg-blue-500/10',
            default: 'border-white/15 bg-white/70 !backdrop-blur-2xl dark:border-white/10 dark:bg-white/10',
            closeButton: 'border-white/15 bg-white/50 hover:bg-white/70 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15',
          },
        }}
      />
    </>
  );
}

/* kept for any code that imports useToast() — now a sonner shim */
export function useToast() {
  const addToast = React.useCallback(
    (titleOrOpts: { title?: string; message?: string; type?: ToastType } | string, message?: string, type?: ToastType) => {
      if (typeof titleOrOpts === 'string') {
        showToast({ title: titleOrOpts, description: message, type: type || 'info' });
      } else {
        showToast({ title: titleOrOpts.title, description: titleOrOpts.message, type: titleOrOpts.type });
      }
    },
    [],
  );
  return { addToast, toasts: [], removeToast: () => {} };
}
