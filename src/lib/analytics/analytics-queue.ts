/**
 * IndexedDB-backed analytics event queue.
 * Stores events locally, flushes in batches, retries with exponential backoff.
 */

export type EventPriority = 'critical' | 'normal' | 'low';
export type EventStatus = 'pending' | 'inflight' | 'sent' | 'failed';

export interface QueuedEvent {
  id: string;
  eventId: string;
  eventName: string;
  eventVersion: number;
  sessionId: string;
  anonymousId: string;
  occurredAt: string;
  properties: Record<string, unknown>;
  context: Record<string, unknown>;
  priority: EventPriority;
  status: EventStatus;
  attemptCount: number;
  nextRetryAt: string | null;
  platform: string;
  appVersion: string;
  createdAt: string;
}

const DB_NAME = 'flat_analytics';
const DB_VERSION = 2;
const STORE_NAME = 'events';
/** Ledger of eventIds the backend has already recorded (acknowledged) — the
 * client must never re-send them, even after a retry or page reload. */
const SENT_STORE_NAME = 'sent';
const MAX_EVENTS = 5000;
const MAX_RETENTION_DAYS = 7;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('priority', 'priority', { unique: false });
      }
      if (!db.objectStoreNames.contains(SENT_STORE_NAME)) {
        db.createObjectStore(SENT_STORE_NAME, { keyPath: 'eventId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txPromise<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

function sentPromise<T>(db: IDBDatabase, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SENT_STORE_NAME, mode);
    const store = tx.objectStore(SENT_STORE_NAME);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

function collectByStatus(db: IDBDatabase, status: EventStatus): Promise<QueuedEvent[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.index('status').getAll(IDBKeyRange.only(status));
    req.onsuccess = () => resolve(req.result as QueuedEvent[]);
    req.onerror = () => reject(req.error);
  });
}

function getAllPending(db: IDBDatabase): Promise<QueuedEvent[]> {
  // 'pending' (never attempted) + 'failed' whose backoff window has elapsed.
  // 'inflight'/'sent' must never be re-picked. Previously failed events were
  // only filtered as 'pending', so the whole backoff/retry machinery was dead.
  return Promise.all([collectByStatus(db, 'pending'), collectByStatus(db, 'failed')]).then(([pending, failed]) => {
    const now = Date.now();
    const retryable = failed.filter((e) => e.nextRetryAt && new Date(e.nextRetryAt).getTime() < now);
    return [...pending, ...retryable];
  });
}

export class AnalyticsQueue {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await openDB();
  }

  async insert(event: QueuedEvent): Promise<boolean> {
    if (!this.db) await this.initialize();
    const db = this.db!;

    // Check capacity.
    const count = await txPromise(db, 'readonly', (s) => s.count());
    if (count >= MAX_EVENTS) {
      await this.evictExpired();
      const newCount = await txPromise(db, 'readonly', (s) => s.count());
      if (newCount >= MAX_EVENTS) await this.evictByPriority('low');
      if (newCount >= MAX_EVENTS) await this.evictByPriority('normal');
      const finalCount = await txPromise(db, 'readonly', (s) => s.count());
      if (finalCount >= MAX_EVENTS) return false;
    }

    await txPromise(db, 'readwrite', (s) => s.put(event));
    return true;
  }

  async pending(): Promise<QueuedEvent[]> {
    if (!this.db) await this.initialize();
    return getAllPending(this.db!);
  }

  async markInflight(ids: string[]): Promise<void> {
    if (!this.db) return;
    const db = this.db;
    for (const id of ids) {
      const event = await txPromise(db, 'readonly', (s) => s.get(id));
      if (event) {
        event.status = 'inflight';
        await txPromise(db, 'readwrite', (s) => s.put(event));
      }
    }
  }

  async removeByIds(ids: string[]): Promise<void> {
    if (!this.db) return;
    const db = this.db;
    for (const id of ids) {
      await txPromise(db, 'readwrite', (s) => s.delete(id));
    }
  }

  async markFailed(ids: string[]): Promise<void> {
    if (!this.db) return;
    const db = this.db;
    const backoffs = [30, 120, 480, 1800, 7200];
    for (const id of ids) {
      const event = await txPromise(db, 'readonly', (s) => s.get(id));
      if (event) {
        event.status = 'failed';
        event.attemptCount++;
        const idx = Math.min(event.attemptCount - 1, backoffs.length - 1);
        event.nextRetryAt = new Date(Date.now() + backoffs[idx] * 1000).toISOString();
        await txPromise(db, 'readwrite', (s) => s.put(event));
      }
    }
  }

  async length(): Promise<number> {
    if (!this.db) await this.initialize();
    return txPromise(this.db!, 'readonly', (s) => s.count());
  }

  async clear(): Promise<void> {
    if (!this.db) return;
    await txPromise(this.db, 'readwrite', (s) => s.clear());
  }

  async cleanup(): Promise<number> {
    if (!this.db) return 0;
    const expired = await this.evictExpired();
    const pruned = await this.pruneSent();
    return expired + pruned;
  }

  /** True when the backend already acknowledged this eventId. */
  async isAcknowledged(eventId: string): Promise<boolean> {
    if (!this.db) return false;
    const entry = await sentPromise(this.db, 'readonly', (s) => s.get(eventId));
    return Boolean(entry);
  }

  /** Records eventIds the backend accepted (or reported as duplicates) so the
   * client never posts them again. */
  async acknowledge(eventIds: string[]): Promise<void> {
    if (!this.db) return;
    const db = this.db;
    const sentAt = new Date().toISOString();
    for (const eventId of eventIds) {
      if (!eventId) continue;
      await sentPromise(db, 'readwrite', (s) => s.put({ eventId, sentAt }));
    }
    await this.pruneSent();
  }

  private async pruneSent(): Promise<number> {
    if (!this.db) return 0;
    const db = this.db;
    const cutoff = new Date(Date.now() - MAX_RETENTION_DAYS * 86400000).toISOString();
    const all = await sentPromise(db, 'readonly', (s) => s.getAll());
    const stale = (all as Array<{ eventId: string; sentAt: string }>).filter((e) => e.sentAt < cutoff);
    for (const entry of stale) {
      await sentPromise(db, 'readwrite', (s) => s.delete(entry.eventId));
    }
    return stale.length;
  }

  private async evictExpired(): Promise<number> {
    if (!this.db) return 0;
    const db = this.db;
    const cutoff = new Date(Date.now() - MAX_RETENTION_DAYS * 86400000).toISOString();
    let removed = 0;

    const all = await new Promise<QueuedEvent[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as QueuedEvent[]);
      req.onerror = () => reject(req.error);
    });

    for (const event of all) {
      if (event.createdAt < cutoff) {
        await txPromise(db, 'readwrite', (s) => s.delete(event.id));
        removed++;
      }
    }
    return removed;
  }

  private async evictByPriority(target: EventPriority): Promise<void> {
    if (!this.db) return;
    const db = this.db;
    const all = await new Promise<QueuedEvent[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as QueuedEvent[]);
      req.onerror = () => reject(req.error);
    });

    for (const event of all) {
      if (event.priority === target) {
        await txPromise(db, 'readwrite', (s) => s.delete(event.id));
      }
    }
  }
}
