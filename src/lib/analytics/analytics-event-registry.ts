/**
 * Central analytics event registry — allowlist of valid event names.
 * Shared with Flutter and backend. Only events listed here are accepted.
 */

export type EventOwner = 'BACKEND' | 'FLUTTER' | 'NEXT_WEB' | 'ADMIN_WEB' | 'WORKER';
export type RetentionClass = 'behavioral' | 'business' | 'performance' | 'acquisition';

export interface EventSpec {
  owner: EventOwner;
  version: number;
  requiredProperties: readonly string[];
  optionalProperties: readonly string[];
  backendAuthoritative: boolean;
  retentionClass: RetentionClass;
}

export const FORBIDDEN_PROPERTIES = new Set([
  'password', 'otp', 'token', 'accessToken', 'refreshToken', 'refreshTokenHash',
  'phone', 'phoneNumber', 'email', 'emailAddr', 'name', 'displayName', 'bio',
  'description', 'address', 'addressLine', 'creditCard', 'cardNumber',
  'cvv', 'upiId', 'bankAccount', 'ifsc', 'aadhaar', 'pan', 'passport',
  'latitude', 'longitude', 'gps', 'location', 'exactLocation',
  'messageText', 'messageBody', 'chatContent', 'contactValue', 'contactInfo',
  'documentContent', 'ocrResult', 'qrData', 'selfieUrl', 'idDocumentUrl',
  'secret', 'privateKey', 'apiKey', 'secretKey',
]);

export const EVENT_REGISTRY: Record<string, EventSpec> = {
  signup_started: { owner: 'FLUTTER', version: 1, requiredProperties: ['method'], optionalProperties: ['referrerDomain'], backendAuthoritative: false, retentionClass: 'behavioral' },
  signup_completed: { owner: 'BACKEND', version: 1, requiredProperties: ['userId'], optionalProperties: ['method', 'campusId'], backendAuthoritative: true, retentionClass: 'business' },
  login_completed: { owner: 'BACKEND', version: 1, requiredProperties: ['userId'], optionalProperties: ['method', 'platform'], backendAuthoritative: true, retentionClass: 'business' },
  logout_completed: { owner: 'FLUTTER', version: 1, requiredProperties: [], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  profile_completion_started: { owner: 'FLUTTER', version: 1, requiredProperties: [], optionalProperties: ['completionPercent'], backendAuthoritative: false, retentionClass: 'behavioral' },
  profile_completed: { owner: 'BACKEND', version: 1, requiredProperties: ['userId'], optionalProperties: ['campusId'], backendAuthoritative: true, retentionClass: 'business' },
  listing_card_viewed: { owner: 'FLUTTER', version: 1, requiredProperties: ['listingId', 'source'], optionalProperties: ['campusId', 'position'], backendAuthoritative: false, retentionClass: 'behavioral' },
  listing_details_viewed: { owner: 'FLUTTER', version: 1, requiredProperties: ['listingId', 'source'], optionalProperties: ['campusId'], backendAuthoritative: false, retentionClass: 'behavioral' },
  listing_search_performed: { owner: 'FLUTTER', version: 1, requiredProperties: ['resultCount'], optionalProperties: ['campusId', 'filters'], backendAuthoritative: false, retentionClass: 'behavioral' },
  listing_filter_applied: { owner: 'FLUTTER', version: 1, requiredProperties: ['filterType', 'filterValue'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  listing_form_started: { owner: 'FLUTTER', version: 1, requiredProperties: [], optionalProperties: ['propertyId'], backendAuthoritative: false, retentionClass: 'behavioral' },
  listing_form_step_completed: { owner: 'FLUTTER', version: 1, requiredProperties: ['step'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  listing_form_abandoned: { owner: 'FLUTTER', version: 1, requiredProperties: ['lastStep'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  listing_created: { owner: 'BACKEND', version: 1, requiredProperties: ['listingId', 'userId'], optionalProperties: ['campusId', 'rentPaise'], backendAuthoritative: true, retentionClass: 'business' },
  listing_published: { owner: 'BACKEND', version: 1, requiredProperties: ['listingId', 'userId'], optionalProperties: ['campusId'], backendAuthoritative: true, retentionClass: 'business' },
  listing_interest_started: { owner: 'FLUTTER', version: 1, requiredProperties: ['listingId'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  listing_interest_created: { owner: 'BACKEND', version: 1, requiredProperties: ['listingId', 'userId', 'requestId'], optionalProperties: [], backendAuthoritative: true, retentionClass: 'business' },
  listing_interest_failed: { owner: 'FLUTTER', version: 1, requiredProperties: ['listingId', 'errorType'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  listing_interest_accepted: { owner: 'BACKEND', version: 1, requiredProperties: ['listingId', 'requesterId', 'accepterId'], optionalProperties: [], backendAuthoritative: true, retentionClass: 'business' },
  roommate_post_viewed: { owner: 'FLUTTER', version: 1, requiredProperties: ['postId', 'source'], optionalProperties: ['campusId'], backendAuthoritative: false, retentionClass: 'behavioral' },
  roommate_post_created: { owner: 'BACKEND', version: 1, requiredProperties: ['postId', 'userId'], optionalProperties: ['campusId'], backendAuthoritative: true, retentionClass: 'business' },
  roommate_interest_created: { owner: 'BACKEND', version: 1, requiredProperties: ['postId', 'userId'], optionalProperties: [], backendAuthoritative: true, retentionClass: 'business' },
  roommate_interest_accepted: { owner: 'BACKEND', version: 1, requiredProperties: ['postId', 'userId'], optionalProperties: [], backendAuthoritative: true, retentionClass: 'business' },
  housing_request_cta_viewed: { owner: 'FLUTTER', version: 1, requiredProperties: ['source'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  housing_request_form_started: { owner: 'FLUTTER', version: 1, requiredProperties: [], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  housing_request_step_completed: { owner: 'FLUTTER', version: 1, requiredProperties: ['step'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  housing_request_form_abandoned: { owner: 'FLUTTER', version: 1, requiredProperties: ['lastStep'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  housing_request_published: { owner: 'BACKEND', version: 1, requiredProperties: ['requestId', 'userId'], optionalProperties: ['campusId', 'intentType'], backendAuthoritative: true, retentionClass: 'business' },
  housing_request_viewed: { owner: 'FLUTTER', version: 1, requiredProperties: ['requestId', 'source'], optionalProperties: ['campusId'], backendAuthoritative: false, retentionClass: 'behavioral' },
  housing_request_response_created: { owner: 'BACKEND', version: 1, requiredProperties: ['responseId', 'requestId', 'responderId'], optionalProperties: [], backendAuthoritative: true, retentionClass: 'business' },
  housing_request_response_accepted: { owner: 'BACKEND', version: 1, requiredProperties: ['responseId', 'requestId'], optionalProperties: [], backendAuthoritative: true, retentionClass: 'business' },
  housing_request_fulfilled: { owner: 'BACKEND', version: 1, requiredProperties: ['requestId', 'userId'], optionalProperties: [], backendAuthoritative: true, retentionClass: 'business' },
  housing_request_expired: { owner: 'BACKEND', version: 1, requiredProperties: ['requestId'], optionalProperties: [], backendAuthoritative: true, retentionClass: 'business' },
  search_performed: { owner: 'FLUTTER', version: 1, requiredProperties: ['resultCount'], optionalProperties: ['campusId', 'queryType'], backendAuthoritative: false, retentionClass: 'behavioral' },
  search_zero_results: { owner: 'FLUTTER', version: 1, requiredProperties: ['queryType'], optionalProperties: ['campusId'], backendAuthoritative: false, retentionClass: 'behavioral' },
  search_result_opened: { owner: 'FLUTTER', version: 1, requiredProperties: ['resultType', 'resultId'], optionalProperties: ['position'], backendAuthoritative: false, retentionClass: 'behavioral' },
  search_filter_applied: { owner: 'FLUTTER', version: 1, requiredProperties: ['filterType', 'filterValue'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  search_location_selected: { owner: 'FLUTTER', version: 1, requiredProperties: ['locationType'], optionalProperties: ['campusId', 'cityId'], backendAuthoritative: false, retentionClass: 'behavioral' },
  conversation_created: { owner: 'BACKEND', version: 1, requiredProperties: ['conversationId', 'userId', 'contextType'], optionalProperties: [], backendAuthoritative: true, retentionClass: 'business' },
  conversation_opened: { owner: 'FLUTTER', version: 1, requiredProperties: ['conversationId'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  contact_share_requested: { owner: 'BACKEND', version: 1, requiredProperties: ['requestId', 'conversationId'], optionalProperties: [], backendAuthoritative: true, retentionClass: 'business' },
  contact_share_approved: { owner: 'BACKEND', version: 1, requiredProperties: ['requestId', 'conversationId'], optionalProperties: [], backendAuthoritative: true, retentionClass: 'business' },
  notification_received: { owner: 'BACKEND', version: 1, requiredProperties: ['notificationId', 'userId', 'kind'], optionalProperties: [], backendAuthoritative: true, retentionClass: 'business' },
  notification_opened: { owner: 'FLUTTER', version: 1, requiredProperties: ['notificationId', 'kind'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  notification_dismissed: { owner: 'FLUTTER', version: 1, requiredProperties: ['notificationId'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  session_started: { owner: 'FLUTTER', version: 1, requiredProperties: [], optionalProperties: ['platform', 'appVersion'], backendAuthoritative: false, retentionClass: 'behavioral' },
  session_resumed: { owner: 'FLUTTER', version: 1, requiredProperties: ['inactiveDurationMs'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  session_paused: { owner: 'FLUTTER', version: 1, requiredProperties: ['activeDurationMs'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  session_ended: { owner: 'FLUTTER', version: 1, requiredProperties: ['totalDurationMs', 'activeDurationMs'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  screen_viewed: { owner: 'FLUTTER', version: 1, requiredProperties: ['screenName'], optionalProperties: ['previousScreen', 'entrySource'], backendAuthoritative: false, retentionClass: 'behavioral' },
  screen_engagement_recorded: { owner: 'FLUTTER', version: 1, requiredProperties: ['screenName', 'activeSeconds'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'behavioral' },
  app_start_performance: { owner: 'FLUTTER', version: 1, requiredProperties: ['durationMs', 'startType'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'performance' },
  screen_render_performance: { owner: 'FLUTTER', version: 1, requiredProperties: ['screenName', 'durationMs'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'performance' },
  api_request_performance: { owner: 'FLUTTER', version: 1, requiredProperties: ['endpoint', 'method', 'statusCode', 'durationMs'], optionalProperties: [], backendAuthoritative: false, retentionClass: 'performance' },
  web_vital_recorded: { owner: 'NEXT_WEB', version: 1, requiredProperties: ['vitalName', 'value'], optionalProperties: ['rating'], backendAuthoritative: false, retentionClass: 'performance' },
  client_error_recorded: { owner: 'FLUTTER', version: 1, requiredProperties: ['errorType', 'screenName'], optionalProperties: ['stackFingerprint'], backendAuthoritative: false, retentionClass: 'performance' },
  app_crash_recorded: { owner: 'FLUTTER', version: 1, requiredProperties: ['errorType', 'screenName'], optionalProperties: ['stackFingerprint'], backendAuthoritative: false, retentionClass: 'performance' },
  acquisition_attributed: { owner: 'FLUTTER', version: 1, requiredProperties: ['source'], optionalProperties: ['utmSource', 'utmMedium', 'utmCampaign', 'referrerDomain', 'deepLinkId'], backendAuthoritative: false, retentionClass: 'acquisition' },
};

export const VALID_PLATFORMS = new Set(['flutter_android', 'flutter_ios', 'next_web', 'admin_web']);

export function isKnownEvent(eventName: string): boolean {
  return eventName in EVENT_REGISTRY;
}

export function getEventSpec(eventName: string): EventSpec | undefined {
  return EVENT_REGISTRY[eventName];
}
