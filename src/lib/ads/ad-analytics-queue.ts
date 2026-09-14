/**
 * IndexedDB-backed ad events queue — local-first, 1-2h bulk flush.
 * Stores signed ad tokens (impression/click/viewable) locally.
 * Separate DB from flat_analytics to keep schemas independent.
 */
export type AdEventType = 'impression' | 'click' | 'viewable';
export type AdEventStatus = 'pending' | 'inflight' | 'failed';

export interface QueuedAdEvent {
  id: string;
  token: string;
  type: AdEventType;
  occurredAt: string;
  status: AdEventStatus;
  attemptCount: number;
  nextRetryAt: string | null;
  createdAt: string;
}

const DB_NAME = 'flat_ads';
const DB_VERSION = 1;
const STORE_NAME = 'ad_events';
const SENT_STORE_NAME = 'ad_sent';
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
      }
      if (!db.objectStoreNames.contains(SENT_STORE_NAME)) {
        db.createObjectStore(SENT_STORE_NAME, { keyPath: 'token' });
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

function collectByStatus(db: IDBDatabase, status: AdEventStatus): Promise<QueuedAdEvent[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.index('status').getAll(IDBKeyRange.only(status));
    req.onsuccess = () => resolve(req.result as QueuedAdEvent[]);
    req.onerror = () => reject(req.error);
  });
}

function getAllPending(db: IDBDatabase): Promise<QueuedAdEvent[]> {
  return Promise.all([collectByStatus(db, 'pending'), collectByStatus(db, 'failed')]).then(([pending, failed]) => {
    const now = Date.now();
    const retryable = failed.filter((e) => e.nextRetryAt && new Date(e.nextRetryAt).getTime() < now);
    return [...pending, ...retryable];
  });
}

export class AdAnalyticsQueue {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await openDB();
  }

  async insert(event: QueuedAdEvent): Promise<boolean> {
    if (!this.db) await this.initialize();
    const db = this.db!;
    if (await this.isAcknowledged(event.token)) return true;
    const count = await txPromise(db, 'readonly', (s) => s.count());
    if (count >= MAX_EVENTS) {
      await this.evictExpired();
      const newCount = await txPromise(db, 'readonly', (s) => s.count());
      if (newCount >= MAX_EVENTS) return false;
    }
    await txPromise(db, 'readwrite', (s) => s.put(event));
    return true;
  }

  async pending(): Promise<QueuedAdEvent[]> {
    if (!this.db) await this.initialize();
    return getAllPending(this.db!);
  }

  async markInflight(ids: string[]): Promise<void> {
    if (!this.db) return;
    const db = this.db;
    for (const id of ids) {
      const event = await txPromise(db, 'readonly', (s) => s.get(id));
      if (event) {
        (event as QueuedAdEvent).status = 'inflight';
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

  async requeue(ids: string[]): Promise<void> {
    if (!this.db) return;
    const db = this.db;
    for (const id of ids) {
      const event = await txPromise(db, 'readonly', (s) => s.get(id)) as QueuedAdEvent | undefined;
      if (event) {
        event.status = 'pending';
        event.nextRetryAt = null;
        await txPromise(db, 'readwrite', (s) => s.put(event));
      }
    }
  }

  async markFailed(ids: string[]): Promise<void> {
    if (!this.db) return;
    const db = this.db;
    const backoffs = [30, 120, 480, 1800, 7200];
    for (const id of ids) {
      const event = await txPromise(db, 'readonly', (s) => s.get(id)) as QueuedAdEvent | undefined;
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

  async isAcknowledged(token: string): Promise<boolean> {
    if (!this.db) return false;
    const entry = await sentPromise(this.db, 'readonly', (s) => s.get(token));
    return Boolean(entry);
  }

  async acknowledge(tokens: string[]): Promise<void> {
    if (!this.db) return;
    const db = this.db;
    const sentAt = new Date().toISOString();
    for (const token of tokens) {
      if (!token) continue;
      await sentPromise(db, 'readwrite', (s) => s.put({ token, sentAt }));
    }
    await this.pruneSent();
  }

  async cleanup(): Promise<number> {
    if (!this.db) return 0;
    const expired = await this.evictExpired();
    const pruned = await this.pruneSent();
    return expired + pruned;
  }

  private async pruneSent(): Promise<number> {
    if (!this.db) return 0;
    const db = this.db;
    const cutoff = new Date(Date.now() - MAX_RETENTION_DAYS * 86400000).toISOString();
    const all = await sentPromise(db, 'readonly', (s) => s.getAll()) as Array<{ token: string; sentAt: string }>;
    const stale = all.filter((e) => e.sentAt < cutoff);
    for (const entry of stale) {
      await sentPromise(db, 'readwrite', (s) => s.delete(entry.token));
    }
    return stale.length;
  }

  private async evictExpired(): Promise<number> {
    if (!this.db) return 0;
    const db = this.db;
    const cutoff = new Date(Date.now() - MAX_RETENTION_DAYS * 86400000).toISOString();
    let removed = 0;
    const all = await new Promise<QueuedAdEvent[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as QueuedAdEvent[]);
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
}
