/**
 * Data Export / Erase API Service
 * GDPR-style data portability for the customer:
 * `POST/GET /api/v1/me/data-export`, `GET /api/v1/me/data-export/:id`,
 * `POST /api/v1/me/data-erase` (purge confirmation is `'PURGE'`).
 * Reference: backend data-export module.
 */

import { apiFetch } from '@/lib/api/client';
import { DataEraseResponse, DataExportJob } from '@/types';

/**
 * Maps a raw data-export job row into a DataExportJob.
 */
export function mapRawToDataExportJob(item: unknown): DataExportJob {
  const raw = (item || {}) as Record<string, unknown>;

  return {
    id: String(raw.id || ''),
    kind: String(raw.kind || 'export') as DataExportJob['kind'],
    status: String(raw.status || 'pending'),
    sizeBytes: typeof raw.sizeBytes === 'number' ? raw.sizeBytes : null,
    // Only the single-job response carries the payload — keep it lazy.
    payload: raw.payload !== undefined ? raw.payload : undefined,
    expiresAt: typeof raw.expiresAt === 'string' ? raw.expiresAt : null,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : null,
  };
}

/**
 * Normalizes data-export job list payloads (array or envelope).
 */
export function normalizeDataExportResponse(res: unknown): DataExportJob[] {
  if (!res) return [];

  let items: unknown[] = [];
  if (Array.isArray(res)) {
    items = res;
  } else if (typeof res === 'object' && res !== null) {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) items = obj.data;
    else if (Array.isArray(obj.items)) items = obj.items;
    else if (Array.isArray(obj.jobs)) items = obj.jobs;
    else if (Array.isArray(obj.exports)) items = obj.exports;
  }

  return items.map(mapRawToDataExportJob);
}

function unwrap<T>(res: unknown): T {
  if (typeof res === 'object' && res !== null && 'data' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

/**
 * Requests a full data export (`POST /me/data-export`).
 */
export async function createDataExport(): Promise<DataExportJob> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/me/data-export',
    method: 'POST',
  });
  return mapRawToDataExportJob(unwrap(res));
}

/**
 * Lists previous data-export jobs (`GET /me/data-export`).
 */
export async function fetchDataExportJobs(): Promise<DataExportJob[]> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/me/data-export',
    method: 'GET',
  });
  return normalizeDataExportResponse(res);
}

/**
 * Fetches a single data-export job including its payload (`GET /me/data-export/:id`).
 */
export async function fetchDataExportJob(id: string): Promise<DataExportJob> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/me/data-export/${id}`,
    method: 'GET',
  });
  return mapRawToDataExportJob(unwrap(res));
}

/**
 * Requests account erasure (`POST /me/data-erase`) — schedule confirmation.
 */
export async function requestDataErase(): Promise<DataEraseResponse> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/me/data-erase',
    method: 'POST',
  });

  const raw = unwrap<Record<string, unknown>>(res);

  return {
    requestedAt: String(raw.requestedAt || new Date().toISOString()),
    eraseAt: String(raw.eraseAt || ''),
    jobId: String(raw.jobId || ''),
  };
}
