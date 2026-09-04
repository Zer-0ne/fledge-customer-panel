/**
 * Customer Panel Core Domain Types
 * Derived from OpenAPI specification (`docs/openai.json`) and customer implementation plan.
 */

// User & Auth Types
export interface User {
  id: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  collegeId?: string | null;
  campusId?: string | null;
  phoneVerifiedAt?: string | null;
  emailVerifiedAt?: string | null;
  trustBadge?: 'bronze' | 'silver' | 'gold' | 'diamond' | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  bio?: string | null;
  collegeId?: string | null;
  trustBadge?: 'bronze' | 'silver' | 'gold' | 'diamond' | null;
  createdAt: string;
}

export interface AuthSession {
  id: string;
  deviceLabel: string;
  ipAddress?: string | null;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface BootstrapResponse {
  user: User;
  /** Backend capability codes (e.g. `["*"]` for super admin, `["listing.manage_own"]` for customers). */
  capabilities?: string[];
  /** Legacy alias — some API versions expose permissions under this key. */
  permissions?: string[];
  unreadNotificationCount?: number;
  unreadMessageCount?: number;
  /** Post-login onboarding flow state (backend auth/bootstrap since migration 0059). */
  onboarding?: {
    status: 'pending' | 'skipped' | 'completed';
    completedAt?: string | null;
    skippedAt?: string | null;
  };
}

// Onboarding (post-login question flow)
export type OnboardingQuestionType = 'single' | 'multi' | 'boolean' | 'text';
export type OnboardingAnswerValue = string | string[] | boolean;

export interface OnboardingOption {
  value: string;
  label: string;
}

export interface OnboardingQuestion {
  id: string;
  code: string;
  question: string;
  hint?: string | null;
  type: OnboardingQuestionType;
  options: OnboardingOption[];
  required: boolean;
  sortOrder?: number;
  /** Current user's saved answer for this question, if any. */
  answered?: OnboardingAnswerValue | null;
}

export interface OnboardingProgress {
  total: number;
  answered: number;
  requiredTotal: number;
  requiredAnswered: number;
}

export interface OnboardingStatus {
  status: 'pending' | 'skipped' | 'completed';
  completedAt?: string | null;
  skippedAt?: string | null;
  progress?: OnboardingProgress;
}

// College & Campus
export interface College {
  id: string;
  name: string;
  shortName?: string;
  city: string;
  state: string;
  logoUrl?: string;
}

export interface Campus {
  id: string;
  collegeId: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

// Property & Listing Types
export interface PropertyAddress {
  line1: string;
  line2?: string;
  area?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

export interface PropertyUnit {
  id: string;
  propertyId: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  capacity: number;
}

export interface Property {
  id: string;
  name: string;
  type: 'apartment' | 'house' | 'hostel' | 'pg' | string;
  collegeId?: string;
  campusId?: string;
  city: string;
  state: string;
  amenities: string[];
  description?: string;
  images: string[];
  approximateLocation?: {
    latitude?: number;
    longitude?: number;
  };
  address?: PropertyAddress;
  exactAddress?: PropertyAddress;
  createdAt: string;
}

export interface Listing {
  id: string;
  propertyId: string;
  property?: Property;
  unit?: PropertyUnit;
  title: string;
  description: string;
  monthlyRentPaise: number;
  depositPaise: number;
  bedrooms: number;
  bathrooms: number;
  furnishing: 'unfurnished' | 'semi-furnished' | 'fully-furnished';
  availableFrom: string;
  genderPreference?: 'any' | 'male' | 'female';
  petFriendly?: boolean;
  images: string[];
  status: 'draft' | 'published' | 'paused' | 'rented' | 'expired' | 'removed';
  isFavorited?: boolean;
  collegeName?: string;
  campusName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListingFilterParams {
  collegeId?: string;
  campusId?: string;
  minRentPaise?: number;
  maxRentPaise?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnishing?: string;
  genderPreference?: string;
  petFriendly?: boolean;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  query?: string;
  cursor?: string;
  limit?: number;
}

// Favorites & Interests
export interface Favorite {
  id: string;
  userId: string;
  listingId: string;
  listing: Listing;
  createdAt: string;
}

export interface ListingInterest {
  id: string;
  listingId: string;
  listing?: Listing;
  userId: string;
  user?: PublicUser;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  direction?: 'incoming' | 'outgoing';
  createdAt: string;
  updatedAt: string;
}

// Roommates & Posts
export interface RoommatePreferences {
  vegetarian?: boolean;
  vegetarianOnly?: boolean;
  nonSmokerOnly?: boolean;
  studentOnly?: boolean;
  gender?: 'any' | 'male' | 'female';
  budgetMaxPaise?: number;
  [key: string]: unknown;
}

export interface RoommatePost {
  id: string;
  userId: string;
  user?: PublicUser;
  collegeId?: string;
  collegeName?: string;
  campusId?: string;
  campusName?: string;
  title: string;
  description: string;
  body?: string;
  budgetPaise?: number;
  targetMoveInDate?: string;
  moveInFrom?: string;
  moveInTo?: string;
  moveOutAt?: string;
  expiresAt?: string;
  locationPreference?: string;
  locality?: string;
  preferences?: RoommatePreferences;
  status?: 'active' | 'fulfilled' | 'expired';
  /** Community Feed Integrity (Phase 12) */
  postType?: RoommatePostType;
  publicationStatus?: PublicationStatus;
  moderationStatus?: ModerationStatus;
  /** True when post is PENDING moderation but shown to the author as "live". */
  shadowPublished?: boolean;
  mediaIds?: string[];
  decision?: RoommatePostDecision | null;
  requiredAction?: RequiredAction | null;
  createdAt: string;
  updatedAt?: string;
}

// ─── Community Feed Integrity (Phase 12) ────────────────────────────────────

export type RoommatePostType =
  | 'NEED_ROOMMATE'
  | 'LEAVING_FLAT_NEED_REPLACEMENT'
  | 'ROOM_AVAILABLE_IN_EXISTING_FLAT'
  | 'LOOKING_TO_JOIN_EXISTING_FLAT';

export type PublicationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'PUBLISHED'
  | 'LIMITED_REACH'
  | 'HIDDEN'
  | 'ARCHIVED';

export type ModerationStatus =
  | 'APPROVED'
  | 'APPROVED_LIMITED_REACH'
  | 'PENDING_AUTOMATED_REVIEW'
  | 'PENDING_MANUAL_REVIEW'
  | 'CHANGES_REQUIRED'
  | 'REJECTED_PROMOTIONAL_CONTENT'
  | 'REJECTED_CONTACT_INFORMATION'
  | 'REJECTED_DUPLICATE_ABUSE'
  | 'REJECTED_INVALID_CONTEXT'
  | 'REJECTED_POLICY_VIOLATION'
  | 'ARCHIVED';

export type RedirectTarget =
  | 'PROPERTY_LISTING'
  | 'PARTNER_ADVERTISING'
  | 'EDIT_PERSONAL_POST'
  | 'APPEAL';

export type RequiredAction =
  | { type: 'TENANT_VERIFICATION'; verificationId: string }
  | { type: 'CHANGES_REQUIRED'; hints: string[] }
  | null;

export interface RoommatePostDecision {
  safeReason: string | null;
  redirectTarget: RedirectTarget | null;
  changeHints: string[] | null;
}

export type CommunityReportReason =
  | 'BROKER_OR_COMMERCIAL_PROMOTION'
  | 'PROMOTIONAL_IMAGE'
  | 'CONTACT_DETAILS_IN_IMAGE'
  | 'FAKE_ROOMMATE_POST'
  | 'MULTIPLE_UNRELATED_PROPERTIES'
  | 'MISLEADING_INFORMATION'
  | 'REPOSTED_REJECTED_CONTENT';

export type VerificationMethod =
  | 'LIVE_ROOM_PHOTO_WITH_CODE'
  | 'EXISTING_ROOMMATE_CONFIRMATION'
  | 'PROPERTY_OWNER_CONFIRMATION'
  | 'PROPERTY_MANAGER_CONFIRMATION'
  | 'REDACTED_RENT_RECEIPT'
  | 'REDACTED_RENTAL_AGREEMENT'
  | 'MANUAL_VIDEO_REVIEW';

export type AppealTargetType =
  | 'ROOMMATE_POST'
  | 'TENANT_VERIFICATION'
  | 'CAPABILITY_RESTRICTION'
  | 'COMMERCIAL_CLASSIFICATION';

export interface CapabilityRestriction {
  id: string;
  capability: string;
  restriction: string;
  reason: string | null;
  appliedAt: string;
  expiresAt: string | null;
  source: string | null;
  appealAvailable?: boolean;
}

export interface Appeal {
  id: string;
  targetType: AppealTargetType;
  targetId: string;
  status: string;
  reason: string;
  createdAt: string;
  decidedAt?: string | null;
  moderatorNote?: string | null;
}

export interface TenantVerification {
  id: string;
  postId: string;
  method: VerificationMethod;
  status: string;
  requestedAt: string;
  verifiedAt?: string | null;
  expiresAt?: string | null;
  rejectionReason?: string | null;
  hasEvidence?: boolean;
}

export type MediaPurpose =
  | 'community'
  | 'advertising'
  | 'listing'
  | 'profile'
  | 'general'
  | 'verification';

export type AllowedMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface PresignedUploadResponse {
  id: string;
  uploadUrl: string;
  method: string;
  headers?: Record<string, string>;
}

export interface MediaDownloadResponse {
  url: string;
  expiresAt?: string;
}

export type MediaRejectionReason =
  | 'contact_in_image'
  | 'qr_code_detected'
  | 'promotional_layout'
  | 'reposted_rejected_media'
  | 'technical_validation_failed'
  | null;

export interface MediaStatusResponse {
  id: string;
  status: 'pending' | 'processing' | 'ready' | 'rejected' | 'deleted';
  moderationStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason: MediaRejectionReason;
}

export interface RoommatePostResult {
  id: string;
  postId: string;
  status: string;
  publicationStatus: PublicationStatus;
  moderationStatus: ModerationStatus;
  requiredAction: RequiredAction;
}

export interface RoommateInterest {
  id: string;
  postId: string;
  post?: RoommatePost;
  requesterUserId?: string;
  receiverUserId?: string;
  postOwnerUserId?: string;
  userId: string;
  user?: PublicUser;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  direction?: 'incoming' | 'outgoing' | 'sent' | 'received';
  canWithdraw?: boolean;
  canAccept?: boolean;
  canReject?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Conversations & Chat
export type MessageReceiptStatus = 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  /** Compat: true when status==='read' or readAt is set */
  isRead: boolean;
  deliveredAt?: string | null;
  readAt?: string | null;
  status?: MessageReceiptStatus;
  createdAt: string;
}

export interface Conversation {
  id: string;
  contextType: 'listing_interest' | 'roommate_interest' | 'housing_request_response';
  contextId: string;
  /**
   * Chat expiry lifecycle: 'expired' when the source listing / roommate post /
   * NeedNow request was removed or expired — the chat is read-only then.
   */
  contextState?: 'active' | 'expired';
  listingId?: string;
  listingTitle?: string;
  listing?: {
    id?: string;
    title?: string;
  };
  roommatePostId?: string;
  roommatePostTitle?: string;
  roommatePost?: RoommatePost;
  participants: PublicUser[];
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactShare {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  phone?: string;
  email?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
}

// Notifications
export type NotificationKind =
  | 'interest_received'
  | 'interest_accepted'
  | 'interest_rejected'
  | 'message_received'
  | 'contact_share_requested'
  | 'contact_share_accepted'
  | 'system_alert'
  | string;

/** Preference categories from OpenAPI `/notification-preferences/{kind}` */
export type NotificationPreferenceKind =
  | 'listing_interest'
  | 'roommate_interest'
  | 'message'
  | 'housing_offer'
  | 'housing_join'
  | 'housing_response'
  | 'housing_match'
  | 'housing_expiry';

export interface Notification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** @deprecated Prefer `body` — kept for older callers */
  message?: string;
  targetUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreference {
  kind: NotificationPreferenceKind;
  pushEnabled: boolean;
}

// Ads — placements match OpenAPI `POST /api/v1/ads/select`
export type AdPlacement = 'home' | 'search' | 'listing';

export interface AdCreative {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  /** May be present on select; click endpoint is source of truth for redirect */
  destinationUrl?: string | null;
  /** Contact action (wa.me → WHATSAPP, tel: → PHONE) — drives the card CTA label */
  contactType?: 'WEBSITE' | 'WHATSAPP' | 'PHONE' | null;
  sponsorName?: string | null;
  /** Priority tier — BOOST/PREMIUM slides hold longer in carousels */
  priorityTier?: string | null;
  /** Feature chips shown on MAXIMUM cards (partner-selected amenity tags) */
  featureChips?: string[];
  /** Signed token for impression/click events */
  token: string;
  /** @deprecated Prefer `token` */
  selectionToken?: string;
  /** Signed token for the CLICK event — the click endpoint rejects the
   * impression token (type mismatch), so clicks MUST use this one. */
  clickToken?: string;
  /** Signed token for the VIEWABLE event (50%+ visible for 1s) — present
   * once the backend issues viewable tokens alongside select. */
  viewableToken?: string;
}

export interface AdSelectionResponse {
  creative?: AdCreative;
  ad?: AdCreative;
  destinationUrl?: string | null;
  destination?: string | null;
}

// Announcements — matches OpenAPI `GET /api/v1/announcements`
export type AnnouncementType = 'INFORMATION' | 'MAINTENANCE' | 'POLICY_UPDATE' | 'URGENT' | 'PROMOTIONAL' | 'PAYMENT_NOTICE' | 'PARTNER_NOTICE' | 'SAFETY_ALERT';
export type AnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'UNPUBLISHED' | 'EXPIRED';
export type AnnouncementMode = 'NOTICE_CENTER' | 'TOP_BANNER' | 'MODAL' | 'DASHBOARD_CARD' | 'PUSH_NOTIFICATION';

export interface AnnouncementVersion {
  version: number;
  title: string;
  body: string;
  deepLink?: string | null;
  isMaterialChange?: boolean;
  publishedAt?: string | null;
}

export interface AnnouncementReceipt {
  announcementId: string;
  version: number;
  userId: string;
  firstSeenAt?: string | null;
  lastDeliveredAt?: string | null;
  readAt?: string | null;
  acknowledgedAt?: string | null;
  dismissedAt?: string | null;
}

export interface AnnouncementItem {
  id: string;
  type: AnnouncementType;
  displayModes: AnnouncementMode[];
  requireAcknowledgement: boolean;
  publishedAt?: string | null;
  expiresAt?: string | null;
  currentVersion: AnnouncementVersion;
  userState?: AnnouncementReceipt | null;
}

// Pagination & Generic Envelope
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string | null;
  totalCount?: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    field?: string;
  };
}

// Controlled Contact Fallback & Preference Types
export type ContactMode =
  | 'CHAT_ONLY'
  | 'REQUEST_REQUIRED'
  | 'VERIFIED_USERS_AFTER_DELAY'
  | 'FALLBACK_CONTACT';

export interface ContactPreferenceOptions {
  contactMode: ContactMode;
  label: string;
  requiredInput?: string;
}

export interface ContactPreference {
  contactMode: ContactMode;
  requirePhoneVerified?: boolean;
  consentConfirmed?: boolean;
  autoRevealAfterMinutes?: number;
  revealDurationMinutes?: number;
  dailyRevealLimit?: number;
  fallbackContactId?: string;
  availableOptions?: ContactPreferenceOptions[];
  updatedAt?: string;
}

export interface UpdateContactPreferencePayload {
  contactMode: ContactMode;
  requirePhoneVerified?: boolean;
  consentConfirmed?: boolean;
  autoRevealAfterMinutes?: number;
  revealDurationMinutes?: number;
  dailyRevealLimit?: number;
  fallbackContactId?: string;
}

// Contact Share Requests & Access Grants
export type ContactShareRequestStatus = 'pending' | 'approved' | 'rejected' | 'revoked' | 'expired';

export interface ContactShareRequest {
  id: string;
  status: ContactShareRequestStatus;
  requesterId: string;
  recipientId: string;
  conversationId?: string;
  listingInterestId?: string;
  roommateInterestId?: string;
  housingResponseId?: string;
  listingId?: string;
  roommatePostId?: string;
  requestedAt: string;
  resolvedAt?: string | null;
  accessGrant?: ContactAccessGrantSummary;
}

export interface CreateContactShareRequestPayload {
  listingInterestId?: string;
  roommateInterestId?: string;
  housingResponseId?: string;
}

export type ContactSource = 'OWNER' | 'FALLBACK_CONTACT';

export interface ContactAccessGrantSummary {
  id: string;
  status: 'approved' | 'revoked' | 'expired';
  contactSource: ContactSource;
  expiresAt: string;
  maximumViewCount: number;
  remainingViews?: number;
}

export interface RevealedContact {
  grantId: string;
  contactType: 'PHONE';
  phoneNumber: string;
  expiresAt: string;
  remainingViews: number;
}

// Fallback Contacts
export type FallbackRelationshipType =
  | 'CURRENT_ROOMMATE'
  | 'PROPERTY_OWNER'
  | 'PROPERTY_MANAGER'
  | 'FAMILY'
  | 'TRUSTED_REPRESENTATIVE';

export type FallbackVerificationStatus = 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'REVOKED';

export interface FallbackContact {
  id: string;
  relationshipType: FallbackRelationshipType;
  displayName: string;
  verificationStatus: FallbackVerificationStatus;
  verificationRequestedAt?: string;
  verifiedAt?: string | null;
  consentedAt?: string | null;
  revokedAt?: string | null;
}

export interface CreateFallbackContactPayload {
  relationshipType: FallbackRelationshipType;
  displayName: string;
  phoneNumber: string; // E.164 format e.g. +919876543210
}

// Availability Confirmation & Closure
export type AvailabilityConfirmationChoice =
  | 'STILL_AVAILABLE'
  | 'DETAILS_CHANGED'
  | 'NO_LONGER_AVAILABLE'
  | 'MOVED_OUT_USE_FALLBACK';

export interface AvailabilityConfirmationResponse {
  status: 'active' | 'archived' | 'expired' | string;
  expiresAt?: string;
  nextConfirmationAt?: string;
  detailsNeedUpdate?: boolean;
}

// Contact Approval Token Context (Public)
export interface ContactApprovalContext {
  requesterDisplayName: string;
  entityTitle: string;
  requestedAt: string;
  tokenExpiresAt: string;
  explanation: string;
}

// ─── Need Now (24-hour housing requirements) ────────────────────────────────
// Mirrors the `/api/v1/housing-requests` contract. Statuses and enums are
// UPPER_SNAKE exactly as the backend emits them.

export type NeedNowIntentType =
  | 'SEEKING_PRIVATE_ROOM'
  | 'SEEKING_SHARED_ROOM'
  | 'SEEKING_FULL_FLAT'
  | 'SEEKING_PG'
  | 'SEEKING_FLATMATES_TO_RENT_TOGETHER'
  | 'FLEXIBLE';

export type NeedNowVisibility =
  | 'EVERYONE_NEARBY'
  | 'SAME_CAMPUS'
  | 'VERIFIED_USERS_ONLY';

export type NeedNowStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'FULFILLED'
  | 'EXPIRED'
  | 'REMOVED';

export type NeedNowResponseType = 'OFFER_LISTING' | 'JOIN_SEARCH';

export type NeedNowResponseStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'REMOVED';

export type StayDurationType =
  | 'LESS_THAN_3_MONTHS'
  | '3_TO_6_MONTHS'
  | '6_TO_12_MONTHS'
  | 'OVER_12_MONTHS'
  | 'FLEXIBLE';

export type PreferredRoomType = 'PRIVATE' | 'SHARED_2' | 'SHARED_3_PLUS' | 'FULL_FLAT';

export type NeedNowFurnishing = 'UNFURNISHED' | 'SEMI_FURNISHED' | 'FULLY_FURNISHED' | 'ANY';
export type NeedNowOccupancy = 'SINGLE' | 'DOUBLE' | 'TRIPLE_PLUS' | 'ANY';
export type NeedNowStudentOrProfessional = 'STUDENT' | 'WORKING_PROFESSIONAL' | 'ANY';
export type NeedNowFoodPreference = 'VEG' | 'NON_VEG' | 'EGGETARIAN' | 'ANY';
export type NeedNowSleepSchedule = 'EARLY_BIRD' | 'NIGHT_OWL' | 'FLEXIBLE';
export type NeedNowCleanliness = 'RELAXED' | 'MODERATE' | 'TIDY';

export interface NeedNowPreferences {
  furnishing?: NeedNowFurnishing;
  occupancy?: NeedNowOccupancy;
  studentOrProfessional?: NeedNowStudentOrProfessional;
  foodPreference?: NeedNowFoodPreference;
  smokingOk?: boolean;
  petsOk?: boolean;
  sleepSchedule?: NeedNowSleepSchedule;
  cleanliness?: NeedNowCleanliness;
  visitorsOk?: boolean;
}

export interface NeedNowLocationInfo {
  name: string;
  distanceMeters: number | null;
}

export interface NeedNowBudget {
  minimumPaise: number;
  maximumPaise: number;
}

export interface NeedNowOwner {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
}

export interface NeedNowArea {
  id: string;
  locationName: string;
  radiusMeters: number;
  priority?: number;
}

export interface NeedNowViewerRelationship {
  isOwner: boolean;
  isBlocked: boolean;
  canRespond: boolean;
  canOfferListing: boolean;
  canJoinSearch: boolean;
  existingResponseId: string | null;
  existingResponseDirection: 'sent' | 'received' | null;
  isSaved: boolean;
}

/** Full housing-request view (detail / my-requests / feed items). */
export interface NeedNowRequest {
  id: string;
  intentType: NeedNowIntentType;
  campusId: string | null;
  location: NeedNowLocationInfo;
  radiusMeters: number;
  budget: NeedNowBudget;
  moveInDate: string;
  stayDurationType: StayDurationType;
  preferredRoomTypes: PreferredRoomType[];
  description: string;
  visibility: NeedNowVisibility;
  allowVerifiedPartners: boolean;
  status: NeedNowStatus;
  expiresAt: string | null;
  remainingSeconds: number | null;
  createdAt: string;
  owner: NeedNowOwner;
  viewerRelationship: NeedNowViewerRelationship;
  areas: NeedNowArea[];
  preferences: NeedNowPreferences | null;
}

export interface NeedNowResponseListing {
  id: string;
  title: string;
  rentPaise: number;
  status: string;
}

/** Housing-request response view. `direction` is computed by the backend. */
export interface NeedNowResponse {
  id: string;
  housingRequestId: string;
  responderId: string;
  listingId: string | null;
  roommatePostId?: string | null;
  responseType: NeedNowResponseType;
  message: string | null;
  status: NeedNowResponseStatus;
  acceptedAt: string | null;
  declinedAt: string | null;
  withdrawnAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  direction: 'sent' | 'received';
  canAccept: boolean;
  canDecline: boolean;
  canWithdraw: boolean;
  /** Chat thread opened on accept. Null until accepted. */
  conversationId?: string | null;
  request: {
    id: string;
    intentType: NeedNowIntentType;
    location: NeedNowLocationInfo;
    budget: NeedNowBudget;
    moveInDate: string;
    status: NeedNowStatus;
    expiresAt: string | null;
    remainingSeconds: number | null;
  };
  responder: NeedNowOwner;
  listing: NeedNowResponseListing | null;
  roommatePost?: { id: string; title: string } | null;
}

export interface NeedNowFeedPage {
  items: NeedNowRequest[];
  nextCursor: string | null;
}

export interface NeedNowGeoPoint {
  longitude: number;
  latitude: number;
}

export interface NeedNowAreaInput {
  locationName: string;
  locationPoint: NeedNowGeoPoint;
  radiusMeters: number;
  priority?: number;
}

export interface CreateNeedNowDraftParams {
  intentType: NeedNowIntentType;
  primaryLocationName: string;
  primaryLocationPoint: NeedNowGeoPoint;
  radiusMeters: number;
  budgetMinPaise: number;
  budgetMaxPaise: number;
  moveInDate: string;
  stayDurationType: StayDurationType;
  preferredRoomTypes: PreferredRoomType[];
  description: string;
  campusId?: string;
  visibility?: NeedNowVisibility;
  allowVerifiedPartners?: boolean;
  areas?: NeedNowAreaInput[];
  preferences?: NeedNowPreferences | null;
}

export interface UpdateNeedNowParams {
  intentType?: NeedNowIntentType;
  primaryLocationName?: string;
  primaryLocationPoint?: NeedNowGeoPoint;
  radiusMeters?: number;
  budgetMinPaise?: number;
  budgetMaxPaise?: number;
  moveInDate?: string | null;
  stayDurationType?: StayDurationType;
  preferredRoomTypes?: PreferredRoomType[];
  description?: string;
  campusId?: string | null;
  visibility?: NeedNowVisibility;
  allowVerifiedPartners?: boolean;
  preferences?: NeedNowPreferences | null;
}

export interface CreateNeedNowResponseParams {
  responseType: NeedNowResponseType;
  listingId?: string;
  roommatePostId?: string;
  message?: string;
}

// ─── Saved Searches (customer-facing search alerts) ──────────────────────────
export interface SavedSearchFilters {
  query?: string;
  campusId?: string;
  collegeId?: string;
  minRentPaise?: number;
  maxRentPaise?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnishing?: string;
  genderPreference?: string;
  petFriendly?: boolean;
  minAreaSqft?: number;
  maxRentPerSqftPaise?: number;
  availableBy?: string;
  moveInFrom?: string;
  moveInTo?: string;
  amenityIds?: string[];
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: SavedSearchFilters;
  alertEnabled: boolean;
  lastMatchedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedSearchPayload {
  name: string;
  filters: SavedSearchFilters;
  alertEnabled?: boolean;
}

export interface UpdateSavedSearchPayload {
  name?: string;
  filters?: SavedSearchFilters;
  alertEnabled?: boolean;
}

export interface SavedSearchRunResult {
  items: Listing[];
  nextCursor: string | null;
  totalCount?: number;
  lastMatchedAt: string | null;
}

// ─── Maintenance Requests ────────────────────────────────────────────────────
export type MaintenanceStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';
export type MaintenancePriority = 'critical' | 'high' | 'normal' | 'low';
export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'appliance'
  | 'furniture'
  | 'pest'
  | 'cleaning'
  | 'other';

export interface MaintenanceRequest {
  id: string;
  listingId: string;
  requestedBy: string;
  assignedTo: string | null;
  category: MaintenanceCategory;
  title: string;
  description: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  slaDueAt: string | null;
  slaBreached?: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  escalatedAt: string | null;
}

export interface CreateMaintenanceRequestPayload {
  listingId: string;
  category: MaintenanceCategory;
  title: string;
  description?: string;
  priority?: MaintenancePriority;
}

export interface UpdateMaintenanceRequestPayload {
  title?: string;
  description?: string;
  category?: MaintenanceCategory;
  priority?: MaintenancePriority;
  status?: MaintenanceStatus;
  comment?: string;
}

// ─── Data Export / Erase (GDPR portability) ─────────────────────────────────
export interface DataExportJob {
  id: string;
  kind: string;
  status: string;
  sizeBytes: number | null;
  payload?: unknown;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface DataEraseResponse {
  requestedAt: string;
  eraseAt: string;
  jobId: string;
}

// ─── College Rules ───────────────────────────────────────────────────────────
export interface CollegeRule {
  id: string;
  collegeId: string;
  category: string;
  title: string;
  body: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Guidance Tips ───────────────────────────────────────────────────────────
export interface GuidanceTip {
  id: string;
  key: string;
  route: string | null;
  audience: 'all' | 'customer' | 'partner';
  title: string;
  body: string;
  locale: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── i18n ────────────────────────────────────────────────────────────────────
export interface I18nStrings {
  locale: string;
  supported: string[];
  strings: Record<string, string>;
}

// ─── Trust Score ─────────────────────────────────────────────────────────────
export interface TrustScore {
  userId: string;
  score: number;
  breakdown: {
    base: number;
    phoneVerified: number;
    emailVerified: number;
    profileComplete: number;
    tenantVerified: number;
    studentVerified: number;
    accountAge: number;
  };
  recomputedAt: string;
}

export interface TrustBadgesResponse {
  userId: string;
  score: number;
  badges: string[];
  recomputedAt: string;
}

// ─── User Settings ───────────────────────────────────────────────────────────
export type UserSettingKey =
  | 'language'
  | 'theme'
  | 'marketingOptOut'
  | 'availabilityReminders'
  | 'contactShareReminders'
  | 'chatNotifications'
  | 'compactMode';

export type UserSettingValue = string | number | boolean;

export interface UserSetting {
  key: UserSettingKey;
  value: UserSettingValue;
  updatedAt?: string;
}

export type UpdateUserSettingsPayload = Partial<Record<UserSettingKey, UserSettingValue>>;

