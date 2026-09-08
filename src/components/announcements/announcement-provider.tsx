'use client';

import * as React from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import {
  acknowledgeAnnouncement,
  dismissAnnouncement,
  fetchAnnouncements,
  markAnnouncementRead,
  markAnnouncementSeen,
  persistDismissedAnnouncement,
  readDismissedAnnouncements,
} from '@/lib/api/services/announcements';
import type { AnnouncementItem } from '@/types';

interface AnnouncementsContextValue {
  items: AnnouncementItem[];
  loaded: boolean;
  dismiss: (id: string) => void;
  acknowledge: (id: string) => void;
  markRead: (id: string) => void;
}

const AnnouncementsContext = React.createContext<AnnouncementsContextValue>({
  items: [],
  loaded: false,
  dismiss: () => {},
  acknowledge: () => {},
  markRead: () => {},
});

export function useAnnouncementsContext() {
  return React.useContext(AnnouncementsContext);
}

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = React.useState<AnnouncementItem[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    fetchAnnouncements().then((list) => {
      if (cancelled) return;
      const locallyDismissed = readDismissedAnnouncements();
      const visible = list.filter((a) => !locallyDismissed.has(a.id));
      setItems(visible);
      setLoaded(true);
      for (const item of visible) {
        void markAnnouncementSeen(item.id);
      }
    });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const dismiss = React.useCallback((id: string) => {
    setItems((prev) => prev.filter((a) => a.id !== id));
    persistDismissedAnnouncement(id);
    void dismissAnnouncement(id);
  }, []);

  const acknowledge = React.useCallback((id: string) => {
    setItems((prev) => prev.map((a) =>
      a.id === id
        ? { ...a, userState: { ...(a.userState ?? { announcementId: id, version: a.currentVersion.version, userId: '' }), acknowledgedAt: new Date().toISOString() } }
        : a
    ));
    void acknowledgeAnnouncement(id);
  }, []);

  const markRead = React.useCallback((id: string) => {
    setItems((prev) => prev.map((a) =>
      a.id === id
        ? { ...a, userState: { ...(a.userState ?? { announcementId: id, version: a.currentVersion.version, userId: '' }), readAt: new Date().toISOString() } }
        : a
    ));
    void markAnnouncementRead(id);
  }, []);

  return (
    <AnnouncementsContext.Provider value={{ items, loaded, dismiss, acknowledge, markRead }}>
      {children}
    </AnnouncementsContext.Provider>
  );
}
