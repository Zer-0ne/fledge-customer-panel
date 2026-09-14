/**
 * Community bridge — turn a community post (WhatsApp/Telegram text) into a
 * structured draft, and turn a published entity back into a share card the user
 * can paste into the group.
 *
 * The parser is server-side on purpose: it holds the market vocabulary, and the
 * client never needs a phone number to be present in the text at all.
 */
import { apiFetch } from '@/lib/api/client';

export type CommunityIntent = 'SEEK_ROOM' | 'OFFER_ROOM' | 'RESALE' | 'SERVICE' | 'UTILITY' | 'TICKET' | 'OTHER';
export type RoommatePostType = 'NEED_ROOMMATE' | 'LEAVING_FLAT_NEED_REPLACEMENT' | 'ROOM_AVAILABLE_IN_EXISTING_FLAT' | 'LOOKING_TO_JOIN_EXISTING_FLAT';

export interface ParsedCommunityPost {
  intent: CommunityIntent;
  confidence: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rentPaise: number | null;
  rentPerHeadPaise: number | null;
  depositPaise: number | null;
  pricePaise: number | null;
  bedrooms: number | null;
  floor: string | null;
  streetLabel: string | null;
  genderPreference: 'any' | 'male' | 'female' | null;
  furnishing: 'unfurnished' | 'semi-furnished' | 'fully-furnished' | null;
  amenityCodes: string[];
  roommatePostType: RoommatePostType | null;
  serviceCategory: string | null;
  resaleCategory: string | null;
  availabilityHint: string | null;
  fieldsFound: string[];
  warnings: string[];
}

export interface AmenityOption {
  id: string;
  code: string;
  name: string;
  category: string;
}

export interface ShareCard {
  entityType: string;
  entityId: string;
  title: string;
  body: string;
  deepLinkPath: string;
  deepLinkUrl: string | null;
  whatsappUrl: string;
}

/** Public amenity catalog, grouped by the market-facing category. */
export async function fetchAmenities(): Promise<AmenityOption[]> {
  const res = await apiFetch<AmenityOption[] | { items?: AmenityOption[] }>({ path: '/api/v1/amenities' });
  return Array.isArray(res) ? res : res.items ?? [];
}

/** Parse a pasted community post into a reviewable draft. Never persists. */
export async function parseCommunityPost(text: string): Promise<ParsedCommunityPost> {
  return await apiFetch<ParsedCommunityPost>({
    path: '/api/v1/import/whatsapp-post',
    method: 'POST',
    body: { text },
  });
}

/** Build the share-back card for a published entity (listing / roommate post). */
export async function buildShareCard(
  entityType: 'listing' | 'roommate-post',
  entityId: string,
): Promise<ShareCard> {
  return await apiFetch<ShareCard>({
    path: '/api/v1/share/whatsapp-card',
    method: 'POST',
    body: { entityType, entityId },
  });
}

/** Human copy for the parser warnings — shown as guidance, never as an error. */
export const WARNING_COPY: Record<string, string> = {
  NO_PRICE: 'No rent found in the post — add it, an unpriced post is the #1 complaint about group posts.',
  NO_STREET_LABEL: 'No area/street found — add the locality so neighbours can actually find it.',
  NO_MOVE_IN_DATE: 'No move-in date found — add when it is free.',
  CONTACT_REMOVED: 'Contact details were removed from the text. Sharing happens through the app, not by pasting numbers.',
  SHORT_TEXT: 'That looked short — paste the whole post if there was more.',
  INTENT_NOT_HOUSING: 'This does not look like a room post.',
};

export const INTENT_LABEL: Record<CommunityIntent, string> = {
  OFFER_ROOM: 'Room / flatmate available',
  SEEK_ROOM: 'Looking for a room',
  RESALE: 'Selling something',
  SERVICE: 'Local service',
  UTILITY: 'Water / power update',
  TICKET: 'Travel',
  OTHER: 'General message',
};
