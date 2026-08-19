/**
 * Maintenance Requests API Service
 * Customer + owner/manager flows for `/api/v1/maintenance-requests`:
 * create, list (mine + owner), detail, status updates, assignment.
 * Reference: backend maintenance-requests module (status transition rules live there).
 */

import { apiFetch } from '@/lib/api/client';
import {
  CreateMaintenanceRequestPayload,
  MaintenanceRequest,
  UpdateMaintenanceRequestPayload,
} from '@/types';

/**
 * Maps a raw maintenance-request row into a MaintenanceRequest.
 */
export function mapRawToMaintenanceRequest(item: unknown): MaintenanceRequest {
  const raw = (item || {}) as Record<string, unknown>;

  return {
    id: String(raw.id || ''),
    listingId: String(raw.listingId || ''),
    requestedBy: String(raw.requestedBy || ''),
    assignedTo: typeof raw.assignedTo === 'string' ? raw.assignedTo : null,
    category: String(raw.category || 'other') as MaintenanceRequest['category'],
    title: String(raw.title || ''),
    description: typeof raw.description === 'string' ? raw.description : null,
    priority: String(raw.priority || 'normal') as MaintenanceRequest['priority'],
    status: String(raw.status || 'open') as MaintenanceRequest['status'],
    slaDueAt: typeof raw.slaDueAt === 'string' ? raw.slaDueAt : null,
    slaBreached: typeof raw.slaBreached === 'boolean' ? raw.slaBreached : undefined,
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || raw.createdAt || new Date().toISOString()),
    resolvedAt: typeof raw.resolvedAt === 'string' ? raw.resolvedAt : null,
    closedAt: typeof raw.closedAt === 'string' ? raw.closedAt : null,
    escalatedAt: typeof raw.escalatedAt === 'string' ? raw.escalatedAt : null,
  };
}

/**
 * Normalizes maintenance-request list payloads (array or envelope).
 */
export function normalizeMaintenanceResponse(res: unknown): MaintenanceRequest[] {
  if (!res) return [];

  let items: unknown[] = [];
  if (Array.isArray(res)) {
    items = res;
  } else if (typeof res === 'object' && res !== null) {
    const obj = res as Record<string, unknown>;
    if (Array.isArray(obj.data)) items = obj.data;
    else if (Array.isArray(obj.items)) items = obj.items;
    else if (Array.isArray(obj.requests)) items = obj.requests;
    else if (Array.isArray(obj.maintenanceRequests)) items = obj.maintenanceRequests;
  }

  return items.map(mapRawToMaintenanceRequest);
}

function unwrap<T>(res: unknown): T {
  if (typeof res === 'object' && res !== null && 'data' in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

/**
 * Creates a maintenance request for a listing the user rents.
 */
export async function createMaintenanceRequest(
  payload: CreateMaintenanceRequestPayload
): Promise<MaintenanceRequest> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/maintenance-requests',
    method: 'POST',
    body: payload,
  });
  return mapRawToMaintenanceRequest(unwrap(res));
}

/**
 * Lists maintenance requests raised by the current user.
 */
export async function fetchMyMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/maintenance-requests',
    method: 'GET',
  });
  return normalizeMaintenanceResponse(res);
}

/**
 * Lists maintenance requests for listings the user owns/manages.
 */
export async function fetchOwnerMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  const res = await apiFetch<unknown>({
    path: '/api/v1/maintenance-requests/owner',
    method: 'GET',
  });
  return normalizeMaintenanceResponse(res);
}

/**
 * Fetches a single maintenance request (requester, owner or manager only).
 */
export async function fetchMaintenanceRequest(id: string): Promise<MaintenanceRequest> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/maintenance-requests/${id}`,
    method: 'GET',
  });
  return mapRawToMaintenanceRequest(unwrap(res));
}

/**
 * Updates a maintenance request status (optionally with a comment).
 * The backend enforces the transition graph (open → in_progress → …).
 */
export async function updateMaintenanceRequest(
  id: string,
  payload: UpdateMaintenanceRequestPayload
): Promise<MaintenanceRequest> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/maintenance-requests/${id}`,
    method: 'PATCH',
    body: payload,
  });
  return mapRawToMaintenanceRequest(unwrap(res));
}

/**
 * Assigns a maintenance request to a user (owner/manager flow).
 */
export async function assignMaintenanceRequest(id: string, userId: string): Promise<MaintenanceRequest> {
  const res = await apiFetch<unknown>({
    path: `/api/v1/maintenance-requests/${id}/assign`,
    method: 'POST',
    body: { userId },
  });
  return mapRawToMaintenanceRequest(unwrap(res));
}
