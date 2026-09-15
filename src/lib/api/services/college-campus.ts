/**
 * College/campus self-service API.
 *
 * The campus catalog is self-service: a student whose college/campus is missing
 * adds it from their profile, uses it immediately, and an admin verifies (or
 * rejects) the row afterwards from the admin panel. Rejection notifies the
 * student so they add a valid one.
 */

import { apiFetch } from '@/lib/api/client';

/** Catalog row as the API returns it (pending user-added rows included). */
export interface CollegeOption {
  id: string;
  name: string;
  slug: string;
  /** 'verified' | 'pending' (user-added, awaiting admin review) */
  status: 'verified' | 'pending' | 'rejected' | string;
}

export interface CampusOption {
  id: string;
  name: string;
  slug: string;
  status: 'verified' | 'pending' | 'rejected' | string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MyCollegeSelection {
  collegeId: string;
  campusId: string;
  pendingReview: boolean;
}

export interface CollegeRequestResult {
  college: { id: string; name: string; slug: string; status: string };
  campus: { id: string; name: string; slug: string; status: string };
  pendingReview: boolean;
}

function unwrapList<T>(res: T[] | { items?: T[] } | { data?: T[] }): T[] {
  if (Array.isArray(res)) return res;
  if (res && 'items' in res && Array.isArray(res.items)) return res.items;
  if (res && 'data' in res && Array.isArray(res.data)) return res.data;
  return [];
}

/** Colleges, including user-added rows awaiting verification (status field). */
export async function listColleges(): Promise<CollegeOption[]> {
  const res = await apiFetch<CollegeOption[] | { items?: CollegeOption[] } | { data?: CollegeOption[] }>({
    path: '/api/v1/colleges',
    method: 'GET',
  });
  return unwrapList(res);
}

/** Campuses under a college, including pending (user-added) ones. */
export async function listCampuses(collegeId: string): Promise<CampusOption[]> {
  const res = await apiFetch<CampusOption[] | { items?: CampusOption[] } | { data?: CampusOption[] }>({
    path: `/api/v1/colleges/${collegeId}/campuses`,
    method: 'GET',
  });
  return unwrapList(res);
}

/** Select an existing college + campus for the signed-in profile. */
export async function setMyCollege(collegeId: string, campusId: string): Promise<MyCollegeSelection> {
  return await apiFetch<MyCollegeSelection>({
    path: '/api/v1/me/college',
    method: 'PATCH',
    body: { collegeId, campusId },
  });
}

/**
 * Add a missing college/campus and select it right away. No admin approval is
 * needed to use it; the admin reviews it afterwards.
 */
export async function requestCollegeCampus(params: {
  collegeName: string;
  campusName: string;
  latitude?: number;
  longitude?: number;
}): Promise<CollegeRequestResult> {
  return await apiFetch<CollegeRequestResult>({
    path: '/api/v1/colleges/requests',
    method: 'POST',
    body: params,
  });
}
