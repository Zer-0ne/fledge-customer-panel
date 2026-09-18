import { describe, it, expect, vi } from 'vitest';
import {
  formatRemainingTime,
  friendlyNeedNowError,
  createDraft,
  mapRawToNeedNowRequest,
  mapRawToNeedNowResponse,
} from './neednow';
import { ApiError } from '@/lib/api/errors';
import * as clientModule from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiFetch: vi.fn(),
}));

describe('formatRemainingTime', () => {
  it('formats whole hours as "23h left"', () => {
    expect(formatRemainingTime(23 * 3600, 'ACTIVE')).toBe('23h left');
  });

  it('formats hours and minutes as "4h 20m left"', () => {
    expect(formatRemainingTime(4 * 3600 + 20 * 60, 'ACTIVE')).toBe('4h 20m left');
  });

  it('formats minutes only as "45m left"', () => {
    expect(formatRemainingTime(45 * 60, 'ACTIVE')).toBe('45m left');
  });

  it('returns "Expired" when remaining seconds are zero or negative', () => {
    expect(formatRemainingTime(0, 'ACTIVE')).toBe('Expired');
    expect(formatRemainingTime(-5, 'ACTIVE')).toBe('Expired');
  });

  it('returns "Expired" for the EXPIRED status', () => {
    expect(formatRemainingTime(1000, 'EXPIRED')).toBe('Expired');
  });

  it('returns "Fulfilled" for the FULFILLED status', () => {
    expect(formatRemainingTime(1000, 'FULFILLED')).toBe('Fulfilled');
  });

  it('shows the status label for non-running statuses', () => {
    expect(formatRemainingTime(3600, 'PAUSED')).toBe('Paused');
    expect(formatRemainingTime(3600, 'DRAFT')).toBe('Draft');
    expect(formatRemainingTime(null, 'REMOVED')).toBe('Removed');
  });

  it('returns empty string when nothing is provided', () => {
    expect(formatRemainingTime(null)).toBe('');
    expect(formatRemainingTime(undefined)).toBe('');
  });
});

describe('friendlyNeedNowError', () => {
  it('maps known error codes to friendly messages', () => {
    const cases: Array<[string, string]> = [
      ['PROFILE_INCOMPLETE', 'Complete your profile before publishing a requirement.'],
      ['VERIFICATION_REQUIRED', 'Verify your account before doing this.'],
      ['CONTENT_REJECTED', 'Remove phone, email, or WhatsApp details from your description.'],
      ['INVALID_TRANSITION', 'This action is not allowed for the current state.'],
      ['HOUSING_REQUEST_RATE_LIMITED', 'Too many attempts — please try again later.'],
      ['RESPONSE_DUPLICATE', 'You have already responded to this requirement.'],
      ['LISTING_INVALID', 'This listing is not valid for an offer.'],
    ];
    for (const [code, expected] of cases) {
      const error = new ApiError({ status: 400, message: 'raw', code });
      expect(friendlyNeedNowError(error)).toBe(expected);
    }
  });

  it('falls back to the raw message for unknown codes', () => {
    const error = new ApiError({ status: 400, message: 'Something else broke', code: 'MYSTERY_CODE' });
    expect(friendlyNeedNowError(error)).toBe('Something else broke');
  });

  it('falls back to a generic message for non-errors', () => {
    expect(friendlyNeedNowError(undefined)).toBe('Something went wrong. Please try again.');
  });
});

describe('mapRawToNeedNowRequest', () => {
  it('maps a raw backend view into the domain model', () => {
    const raw = {
      id: 'hr_1',
      intentType: 'SEEKING_PRIVATE_ROOM',
      location: { name: 'Kamla Nagar', distanceMeters: 1200 },
      radiusMeters: 5000,
      budget: { minimumPaise: 500000, maximumPaise: 1200000 },
      moveInDate: '2026-09-01',
      stayDurationType: '3_TO_6_MONTHS',
      preferredRoomTypes: ['PRIVATE', 'SHARED_2'],
      description: 'Looking for a quiet room.',
      visibility: 'EVERYONE_NEARBY',
      allowVerifiedPartners: false,
      status: 'ACTIVE',
      expiresAt: '2026-08-05T10:00:00.000Z',
      remainingSeconds: 43200,
      createdAt: '2026-08-04T10:00:00.000Z',
      owner: { id: 'usr_1', displayName: 'Aisha', avatarUrl: null, verified: true },
      viewerRelationship: {
        isOwner: true,
        isBlocked: false,
        canRespond: false,
        canOfferListing: false,
        canJoinSearch: false,
        existingResponseId: null,
        existingResponseDirection: null,
        isSaved: false,
      },
      areas: [],
      preferences: null,
    };

    const request = mapRawToNeedNowRequest(raw);
    expect(request.id).toBe('hr_1');
    expect(request.intentType).toBe('SEEKING_PRIVATE_ROOM');
    expect(request.location.name).toBe('Kamla Nagar');
    expect(request.location.distanceMeters).toBe(1200);
    expect(request.budget.maximumPaise).toBe(1200000);
    expect(request.status).toBe('ACTIVE');
    expect(request.owner.verified).toBe(true);
    expect(request.viewerRelationship.isOwner).toBe(true);
  });
});

describe('mapRawToNeedNowResponse', () => {
  it('keeps the backend-computed direction', () => {
    const raw = {
      id: 'hrr_1',
      housingRequestId: 'hr_1',
      responderId: 'usr_2',
      responseType: 'JOIN_SEARCH',
      status: 'PENDING',
      direction: 'received',
      canAccept: true,
      canDecline: true,
      canWithdraw: false,
      request: {
        id: 'hr_1',
        intentType: 'SEEKING_FLATMATES_TO_RENT_TOGETHER',
        location: { name: 'GTB Nagar', distanceMeters: null },
        budget: { minimumPaise: 400000, maximumPaise: 800000 },
        moveInDate: '2026-09-15',
        status: 'ACTIVE',
        expiresAt: null,
        remainingSeconds: 7200,
      },
      responder: { id: 'usr_2', displayName: 'Rohan', avatarUrl: null, verified: false },
      listing: null,
    };

    const response = mapRawToNeedNowResponse(raw);
    expect(response.direction).toBe('received');
    expect(response.canAccept).toBe(true);
    expect(response.responseType).toBe('JOIN_SEARCH');
    expect(response.request.intentType).toBe('SEEKING_FLATMATES_TO_RENT_TOGETHER');
  });
});

describe('createDraft', () => {
  it('calls POST /api/v1/housing-requests with the draft payload', async () => {
    vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({
      data: {
        id: 'hr_new',
        intentType: 'SEEKING_PG',
        location: { name: 'Hudson Lane', distanceMeters: null },
        radiusMeters: 2000,
        budget: { minimumPaise: 600000, maximumPaise: 900000 },
        moveInDate: '2026-09-01',
        stayDurationType: 'LESS_THAN_3_MONTHS',
        preferredRoomTypes: ['FULL_FLAT'],
        description: 'Looking for a PG near campus.',
        visibility: 'EVERYONE_NEARBY',
        allowVerifiedPartners: true,
        status: 'DRAFT',
        expiresAt: null,
        remainingSeconds: null,
        createdAt: '2026-08-04T10:00:00.000Z',
        owner: { id: 'usr_1', displayName: 'Aisha', avatarUrl: null, verified: true },
        viewerRelationship: {
          isOwner: true,
          isBlocked: false,
          canRespond: false,
          canOfferListing: false,
          canJoinSearch: false,
          existingResponseId: null,
          existingResponseDirection: null,
          isSaved: false,
        },
        areas: [],
        preferences: null,
      },
    });

    const draft = await createDraft({
      intentType: 'SEEKING_PG',
      primaryLocationName: 'Hudson Lane',
      primaryLocationPoint: { longitude: 77.209, latitude: 28.6139 },
      radiusMeters: 2000,
      budgetMinPaise: 600000,
      budgetMaxPaise: 900000,
      moveInDate: '2026-09-01',
      stayDurationType: 'LESS_THAN_3_MONTHS',
      preferredRoomTypes: ['FULL_FLAT'],
      description: 'Looking for a PG near campus.',
      visibility: 'EVERYONE_NEARBY',
      allowVerifiedPartners: true,
    });

    expect(clientModule.apiFetch).toHaveBeenCalledWith({
      path: '/api/v1/housing-requests',
      method: 'POST',
      body: expect.objectContaining({
        intentType: 'SEEKING_PG',
        primaryLocationName: 'Hudson Lane',
        primaryLocationPoint: { longitude: 77.209, latitude: 28.6139 },
        radiusMeters: 2000,
        budgetMinPaise: 600000,
        budgetMaxPaise: 900000,
        moveInDate: '2026-09-01',
        stayDurationType: 'LESS_THAN_3_MONTHS',
        preferredRoomTypes: ['FULL_FLAT'],
        visibility: 'EVERYONE_NEARBY',
        allowVerifiedPartners: true,
      }),
    });
    expect(draft.id).toBe('hr_new');
    expect(draft.status).toBe('DRAFT');
  });
});

describe('seen-by: formatViewerSeenAt', () => {
  it('returns just now for <45s', async () => {
    const { formatViewerSeenAt } = await import('./neednow');
    expect(formatViewerSeenAt(new Date(Date.now() - 20_000).toISOString())).toBe('just now');
  });
  it('returns minutes ago', async () => {
    const { formatViewerSeenAt } = await import('./neednow');
    expect(formatViewerSeenAt(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5m ago');
  });
  it('returns hours ago', async () => {
    const { formatViewerSeenAt } = await import('./neednow');
    expect(formatViewerSeenAt(new Date(Date.now() - 3 * 3600_000).toISOString())).toBe('3h ago');
  });
});

describe('seen-by: getNeedNowViewers', () => {
  it('maps viewers + sorts DESC + returns totalViewers', async () => {
    const { getNeedNowViewers } = await import('./neednow');
    const now = new Date().toISOString();
    const earlier = new Date(Date.now() - 3600_000).toISOString();
    vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({
      viewers: [
        { viewerId: 'u1', displayName: 'A', avatarUrl: null, firstSeenAt: earlier, lastSeenAt: earlier, distance: { state: 'unavailable', label: 'Location unavailable', bucketMeters: null } },
        { viewerId: 'u2', displayName: 'B', avatarUrl: null, firstSeenAt: earlier, lastSeenAt: now, distance: { state: 'available', label: '1.0 km', bucketMeters: 1000 } },
      ],
      totalViewers: 2,
    });
    const res = await getNeedNowViewers('hr_1');
    expect(res.totalViewers).toBe(2);
    expect(res.viewers[0].viewerId).toBe('u2'); // most recent first
    expect(res.viewers[1].distance.label).toBe('Location unavailable');
    expect(clientModule.apiFetch).toHaveBeenCalledWith(expect.objectContaining({ path: '/api/v1/housing-requests/hr_1/views', method: 'GET' }));
  });

  it('unwraps data envelope', async () => {
    const { getNeedNowViewers } = await import('./neednow');
    vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({
      data: { viewers: [], totalViewers: 0 },
    });
    const res = await getNeedNowViewers('hr_2');
    expect(res.totalViewers).toBe(0);
    expect(res.viewers).toEqual([]);
  });

  it('never uses polling — single fetch', async () => {
    const { getNeedNowViewers } = await import('./neednow');
    vi.clearAllMocks();
    vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({ viewers: [], totalViewers: 0 });
    await getNeedNowViewers('hr_x');
    expect(vi.mocked(clientModule.apiFetch)).toHaveBeenCalledWith(expect.objectContaining({ path: '/api/v1/housing-requests/hr_x/views' }));
    // ensure no setInterval in the service module source (static check is in lint, runtime check here)
    expect(String(getNeedNowViewers)).not.toContain('setInterval');
  });
});

describe('seen-by: recordNeedNowView', () => {
  it('calls POST /view with empty body when no coords', async () => {
    const { recordNeedNowView } = await import('./neednow');
    vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({});
    await recordNeedNowView('hr_1');
    expect(clientModule.apiFetch).toHaveBeenCalledWith(expect.objectContaining({ path: '/api/v1/housing-requests/hr_1/view', method: 'POST' }));
  });
  it('sends coords when provided', async () => {
    const { recordNeedNowView } = await import('./neednow');
    vi.mocked(clientModule.apiFetch).mockResolvedValueOnce({});
    await recordNeedNowView('hr_1', { viewerLon: 77.2, viewerLat: 28.6 });
    expect(clientModule.apiFetch).toHaveBeenCalledWith(expect.objectContaining({ body: { viewerLon: 77.2, viewerLat: 28.6 } }));
  });
});
