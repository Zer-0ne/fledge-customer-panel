'use client';

import * as React from 'react';
import { User, BootstrapResponse } from '@/types';
import {
  createConversationSocket,
  type ConversationSocket,
} from '@/lib/api/services/chat-socket';
import { fetchConversations } from '@/lib/api/services/chat';
import { showToast } from '@/components/ui/toast';

export interface AuthContextType {
  user: User | null;
  permissions: string[];
  unreadNotificationCount: number;
  unreadMessageCount: number;
  /** Post-login onboarding flow state from bootstrap (pending → show questions). */
  onboarding: NonNullable<BootstrapResponse['onboarding']> | null;
  /** True when the user should answer onboarding questions before browsing. */
  isOnboardingPending: boolean;
  setUnreadNotificationCount: React.Dispatch<React.SetStateAction<number>>;
  setUnreadMessageCount: React.Dispatch<React.SetStateAction<number>>;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Permission check — `"*"` (super admin) grants everything. */
  can: (permission: string) => boolean;
  /** Any-of permission check — `"*"` grants everything. */
  canAny: (permissions: string[]) => boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (displayName: string, password: string, email?: string, phone?: string) => Promise<void>;
  otpRequest: (identifier: string) => Promise<void>;
  otpLogin: (identifier: string, code: string) => Promise<void>;
  /** Google Sign-In (web): forwards the GIS ID token to /api/auth/google. */
  googleLogin: (idToken: string, fingerprint?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

/**
 * Pure permission predicate — usable outside React (route guards, utils).
 * `"*"` (super admin wildcard) grants every permission.
 */
export function hasPermission(userPermissions: string[], required: string): boolean {
  if (!required) return true;
  if (userPermissions.includes('*')) return true;
  return userPermissions.includes(required);
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = React.useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = React.useState(0);
  const [onboarding, setOnboarding] = React.useState<NonNullable<BootstrapResponse['onboarding']> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshSession = React.useCallback(async () => {
    try {
      const res = await fetch('/api/auth/bootstrap');
      if (res.ok) {
        const json = await res.json();
        const payload: BootstrapResponse = json.data || json;
        if (payload?.user) {
          setUser(payload.user);
          // Backend bootstrap returns `capabilities` (Phase 6); tolerate the
          // legacy `permissions` alias. Never pass `undefined` — consumers
          // rely on an array.
          setPermissions(payload.capabilities || payload.permissions || []);
          setUnreadNotificationCount(payload.unreadNotificationCount || 0);
          setUnreadMessageCount(payload.unreadMessageCount || 0);
          setOnboarding(payload.onboarding ?? null);
        } else {
          setUser(null);
          setOnboarding(null);
        }
      } else {
        setUser(null);
        setOnboarding(null);
      }
    } catch {
      setUser(null);
      setOnboarding(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshSession();
  }, [refreshSession]);

  // Global socket listener for realtime user events (unread counts, live notifications, conversation updates)
  React.useEffect(() => {
    if (!user?.id) return;

    let socket: ConversationSocket | null = null;
    let conversationIds: string[] = [];
    let heartbeat: number | undefined;
    let stopped = false;

    const announcePresence = async (active: boolean) => {
      if (stopped || !socket) return;
      if (active && !socket.connected) await socket.connect();
      for (const conversationId of conversationIds) {
        if (active) void socket.join(conversationId).catch(() => undefined);
        socket.setPresence(conversationId, active);
      }
    };

    socket = createConversationSocket({
      onStatus: (status) => {
        if (status === 'connected') void announcePresence(true);
      },
      onUserUnreadCounts: (counts) => {
        setUnreadMessageCount(counts.unreadMessages);
        setUnreadNotificationCount(counts.unreadNotifications);
      },
      onNotificationCreated: (notification) => {
        showToast({
          title: notification.title || 'New Notification',
          description: notification.body,
          variant: 'info',
        });
        // Do not increment unreadNotificationCount here: the server also emits
        // `user:unread_counts` with the absolute count, and incrementing here too
        // would double-count. The badge is driven solely by onUserUnreadCounts.
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('app:notification_created', { detail: notification })
          );
        }
      },
      onConversationUpdated: (event) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('app:conversation_updated', { detail: event })
          );
        }
      },
      onConversationCreated: (event) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('app:conversation_created', { detail: event })
          );
        }
      },
    });

    const onVisibilityChange = () => {
      void announcePresence(document.visibilityState === 'visible').catch(
        () => undefined
      );
    };
    const onPageHide = () => void announcePresence(false).catch(() => undefined);

    void (async () => {
      await socket?.connect();
      conversationIds = (await fetchConversations()).map(({ id }) => id);
      await announcePresence(true);
      if (conversationIds.length > 0) {
        heartbeat = window.setInterval(
          () => void announcePresence(true).catch(() => undefined),
          60_000
        );
      }
    })().catch(() => undefined);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      void announcePresence(false);
      stopped = true;
      if (heartbeat !== undefined) window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      socket?.disconnect();
      socket = null;
    };
  }, [user?.id]);

  const login = async (identifier: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Login failed');
    }

    await refreshSession();
  };

  const signup = async (displayName: string, password: string, email?: string, phone?: string) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, password, email, phone }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Registration failed');
    }

    await refreshSession();
  };

  const otpRequest = async (identifier: string) => {
    const res = await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to request OTP');
    }
  };

  const otpLogin = async (identifier: string, code: string) => {
    const res = await fetch('/api/auth/otp/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, code }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'OTP verification failed');
    }

    await refreshSession();
  };

  const googleLogin = async (idToken: string, fingerprint?: string) => {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, fingerprint }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Google sign-in failed');
    }

    await refreshSession();
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      // Push leak fix: deactivate this browser's WEB push installation so the
      // backend push_tokens row is deleted (isActive=false) and the SW
      // IndexedDB firebase-push-config cache is cleared. Without this the
      // orphan token keeps receiving background pushes after cookie-clear/logout.
      try {
        await import('@/lib/push/push-notifications').then((m) => m.deactivateWebPushInstallation());
      } catch {}
      try {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) r.active?.postMessage({ type: 'FIREBASE_CONFIG_CLEAR' });
        }
      } catch {}
      setUser(null);
      setPermissions([]);
      setUnreadNotificationCount(0);
      setUnreadMessageCount(0);
      setOnboarding(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        unreadNotificationCount,
        unreadMessageCount,
        onboarding,
        isOnboardingPending: onboarding?.status === 'pending',
        setUnreadNotificationCount,
        setUnreadMessageCount,
        isLoading,
        isAuthenticated: !!user,
        can: (permission: string) => hasPermission(permissions, permission),
        canAny: (required: string[]) => required.some((p) => hasPermission(permissions, p)),
        login,
        signup,
        otpRequest,
        otpLogin,
        googleLogin,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
