import { describe, it, expect } from 'vitest';
import { mapRawToNotification } from './notifications';

// Regression: ISSUE-001 — notifications page/dashboard showed phantom "New"
// badges and an unread count equal to the full list length because the client
// mapped read state from `isRead`/`read` while the API sends `readAt` (ISO
// timestamp). Every row loaded as unread.
// Found by /qa on 2026-08-08
// Report: backend/.gstack/qa-reports/qa-report-localhost-notifications-2026-08-08.md
describe('mapRawToNotification readAt mapping (regression)', () => {
  it('marks a row with a readAt timestamp as read', () => {
    const n = mapRawToNotification({
      id: 'n1',
      kind: 'message',
      title: 'New message',
      body: 'Hello',
      readAt: '2026-08-08T07:23:27.822Z',
      createdAt: '2026-08-08T07:22:02.877Z',
    });
    expect(n.isRead).toBe(true);
  });

  it('keeps a row with null readAt unread', () => {
    const n = mapRawToNotification({
      id: 'n2',
      kind: 'message',
      title: 'New message',
      body: 'Hello',
      readAt: null,
      createdAt: '2026-08-08T07:22:02.877Z',
    });
    expect(n.isRead).toBe(false);
  });

  it('still honours explicit isRead/read booleans from other backends', () => {
    expect(mapRawToNotification({ id: 'a', read: true }).isRead).toBe(true);
    expect(mapRawToNotification({ id: 'b', isRead: true }).isRead).toBe(true);
    expect(mapRawToNotification({ id: 'c' }).isRead).toBe(false);
  });
});
