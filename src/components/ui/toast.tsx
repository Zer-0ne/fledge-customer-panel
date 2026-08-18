'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'default';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

export interface ShowToastOptions {
  title?: string;
  description?: string;
  message?: string;
  variant?: ToastType;
  type?: ToastType;
}

type ToastListener = (toast: Omit<ToastMessage, 'id'>) => void;
const listeners: ToastListener[] = [];

/**
 * Global helper function to trigger a toast message.
 */
export function showToast(options: ShowToastOptions | string) {
  let toastData: Omit<ToastMessage, 'id'>;

  if (typeof options === 'string') {
    toastData = {
      title: options,
      message: '',
      type: 'info',
    };
  } else {
    toastData = {
      title: options.title,
      message: options.description || options.message || '',
      type: options.variant || options.type || 'info',
    };
  }

  listeners.forEach((listener) => listener(toastData));
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (
    toastOrTitle: Omit<ToastMessage, 'id'> | string,
    message?: string,
    type?: ToastType
  ) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const addToast = React.useCallback(
    (
      toastOrTitle: Omit<ToastMessage, 'id'> | string,
      message?: string,
      type: ToastType = 'info'
    ) => {
      const id = Math.random().toString(36).substring(2, 9);
      let newToast: ToastMessage;

      if (typeof toastOrTitle === 'string') {
        newToast = {
          id,
          title: toastOrTitle,
          message: message || '',
          type: type || 'info',
        };
      } else {
        newToast = { ...toastOrTitle, id };
      }

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  React.useEffect(() => {
    const handleGlobalToast = (toastData: Omit<ToastMessage, 'id'>) => {
      addToast(toastData);
    };
    listeners.push(handleGlobalToast);
    return () => {
      const idx = listeners.indexOf(handleGlobalToast);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, [addToast]);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-16 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all animate-in slide-in-from-right duration-300 bg-background text-foreground',
              toast.type === 'success' && 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-200',
              toast.type === 'error' && 'border-destructive/30 bg-destructive/10 text-destructive',
              (toast.type === 'info' || toast.type === 'default') && 'border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 text-blue-950 dark:text-blue-200'
            )}
          >
            {toast.type === 'success' && <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />}
            {(toast.type === 'info' || toast.type === 'default') && <Info className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />}

            <div className="flex-1 text-sm">
              {toast.title && <div className="font-semibold mb-0.5">{toast.title}</div>}
              {toast.message && <div className="opacity-90">{toast.message}</div>}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              aria-label="Dismiss toast"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
