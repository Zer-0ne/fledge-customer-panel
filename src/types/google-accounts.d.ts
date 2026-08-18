/**
 * Ambient type declarations for Google Identity Services (GIS).
 *
 * The library loads at runtime via
 * `<script src="https://accounts.google.com/gsi/client" async defer>` —
 * there is NO npm package. Keep this surface in sync with the API actually
 * used in the login page (initialize / renderButton / prompt).
 */

interface GoogleCredentialResponse {
  /** Google ID token (JWT) — present when the user successfully signs in. */
  credential?: string;
  /** How the credential was obtained (e.g. "gsi_button", "one_tap"). */
  select_by?: string;
  /** Present instead of `credential` when sign-in was cancelled / failed. */
  error?: string;
  /** Machine-readable error code (e.g. "popup_closed_by_user"). */
  error_code?: string;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  ux_mode?: 'popup' | 'redirect';
  login_uri?: string;
  cancel_on_tap_outside?: boolean;
  allowed_parent_origin?: string | string[];
  use_fedcm_for_prompt?: boolean;
}

interface GoogleIdButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black' | 'filled_white';
  size?: 'large' | 'medium' | 'small';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

interface GooglePromptNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
  getDismissedReason: () => string;
  getMomentType: () => string;
}

interface GoogleIdentityServices {
  id: {
    initialize(config: GoogleIdConfiguration): void;
    renderButton(parent: HTMLElement, options: GoogleIdButtonOptions): void;
    prompt(listener?: (notification: GooglePromptNotification) => void): void;
    disableAutoSelect(): void;
  };
}

interface Window {
  google?: {
    accounts?: GoogleIdentityServices;
  };
}
