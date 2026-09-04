'use client';

import * as React from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/** Reads the GIS `g_csrf_token` cookie — echoed back as `fingerprint` so the
 * backend can tie the ID token to the browser session that requested it. */
function readGcsrfToken(): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith('g_csrf_token='))
    ?.split('=')[1];
}

/** Official multi-color Google "G" mark (brand asset, inline so no icon dep). */
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  /** Where to navigate after a successful sign-in. */
  returnUrl?: string;
  /** Called with the human-readable message when sign-in fails. */
  onError?: (message: string) => void;
}

const GOOGLE_SIGNIN_ERROR =
  'Google sign-in failed to load — check your connection and try again.';

/**
 * "Continue with Google" — Google Identity Services, popup UX (default).
 *
 * Fix 2026-09-04: the previous implementation rendered the GIS button
 * invisibly (opacity-0 + pointer-events-none) and forwarded a programmatic
 * click to it. In FIREFOX the cross-origin iframe click does not propagate
 * user activation, so the popup never opens and the login page just sits
 * there silently (no popup, no toast, no redirect) — while Chrome worked.
 * The REAL GIS button is now layered ON TOP of the decorative shell so real
 * user clicks land on the Google iframe itself, keeping the cross-origin
 * activation intact (popup opens in every browser — incl. installed-PWA
 * windows). The token still goes to `/api/auth/google` (same HttpOnly cookie
 * session).
 */
export function GoogleSignInButton({ returnUrl = '/dashboard', onError }: GoogleSignInButtonProps) {
  const router = useRouter();
  const { googleLogin, isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const [googleReady, setGoogleReady] = React.useState(false);
  const [googleLoadFailed, setGoogleLoadFailed] = React.useState(false);
  const [googleBusy, setGoogleBusy] = React.useState(false);

  const handleGoogleCredential = React.useCallback(
    async (response: GoogleCredentialResponse) => {
      // Cancelled chooser / GIS error → no credential, no state crash.
      if (!response.credential || googleBusy) return;

      setGoogleBusy(true);
      try {
        await googleLogin(response.credential, readGcsrfToken());
        addToast('Success', 'Log in successful!', 'success');
        router.push(returnUrl);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Google sign-in failed. Please try again.';
        onError?.(message);
        addToast('Login Failed', message, 'error');
      } finally {
        setGoogleBusy(false);
      }
    },
    [googleLogin, googleBusy, returnUrl, addToast, onError, router]
  );

  // Redirect-mode return: gsi/client replays the `#credential` fragment into
  // the callback once initialize() has run — make sure the SDK finished
  // loading before we initialize (the SDK buffers the fragment until then).
  React.useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleReady || typeof window === 'undefined') return;
    if (!window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
      // Popup UX — real clicks on the GIS iframe (above) open the chooser.
    });

    const host = document.getElementById('google-signin-button');
    if (host) {
      window.google.accounts.id.renderButton(host, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'continue_with',
        width: 320,
        logo_alignment: 'left',
      });
    }

    // Optional One Tap — Google applies its own frequency capping.
    if (!isAuthenticated) {
      window.google.accounts.id.prompt();
    }
  }, [googleReady, handleGoogleCredential, isAuthenticated]);

  React.useEffect(() => {
    if (googleLoadFailed) onError?.(GOOGLE_SIGNIN_ERROR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleLoadFailed]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGoogleReady(true)}
        onError={() => setGoogleLoadFailed(true)}
      />
      <div className="relative">
        {/* Decorative shell (underlay, visual only — never intercepts clicks). */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <Button
            type="button"
            variant="outline"
            className="h-9 w-full font-medium gap-2.5"
            tabIndex={-1}
          >
            <GoogleG className="size-4" />
            <span>Continue with Google</span>
          </Button>
        </div>
        {/* REAL GIS button on top — real user clicks land on the Google iframe
            itself, so the cross-origin activation is intact in every browser. */}
        <div
          id="google-signin-button"
          className={`relative h-9 w-full overflow-hidden ${
            googleReady && !googleBusy ? 'opacity-0' : 'pointer-events-none opacity-0'
          }`}
          aria-hidden="true"
        />
      </div>
    </>
  );
}