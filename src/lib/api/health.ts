/**
 * Health check utilities for API server liveness and readiness probes.
 */

import { apiFetch } from './client';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  message?: string;
  timestamp?: string;
}

/**
 * Liveness Probe: Returns true if API server process is live.
 */
export async function checkLiveness(baseUrl?: string): Promise<boolean> {
  try {
    await apiFetch<{ status?: string }>({
      path: '/api/v1/health/live',
      method: 'GET',
      baseUrl,
      timeoutMs: 3000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Readiness Probe: Checks connectivity to Database (Postgres) and Redis.
 */
export async function checkReadiness(baseUrl?: string): Promise<{ isReady: boolean; status: number }> {
  try {
    await apiFetch<{ status?: string }>({
      path: '/api/v1/health/ready',
      method: 'GET',
      baseUrl,
      timeoutMs: 5000,
    });
    return { isReady: true, status: 200 };
  } catch (error: unknown) {
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status: number }).status
      : 530;
    return { isReady: false, status };
  }
}
