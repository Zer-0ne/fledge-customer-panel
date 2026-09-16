# Push notification testing (customer panel)

How to verify web push end-to-end. A foreground toast alone is **not** proof —
the OS notification with the tab closed is the only accepted evidence.

## Preconditions

- The five Firebase keys are present in `.env` (**not** `.env.local`, no
  `NEXT_PUBLIC_` prefix): `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`,
  `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_VAPID_KEY`.
  Missing any of them → `getFirebaseWebConfig()` returns null and the whole
  push module disables silently (no prompt, no token, no error). Keys are the
  same public client config as the other panels (one Firebase project).
- Next caches env at boot — restart the dev/prod server after editing `.env`.
- Check key names only, never print values:

  ```sh
  grep -oE '^[A-Z0-9_]+' .env | grep FIREBASE
  ```

## Procedure (close-all-tabs)

1. Fresh browser profile → log in → the enable-notifications banner appears →
   click **Turn on**. Allow the browser permission dialog.
2. Confirm the token registered: `POST /api/v1/notifications/devices` returned
   201 in the Network tab and `localStorage.web_push_subscribed === '1'`.
3. **Close every tab of the origin** (this is the important step — a live page
   can render a foreground toast without the service worker working).
4. Reopen the panel, hard-refresh once (the SW must receive the Firebase
   config once per registration; `firebase-messaging-sw.js` persists it in
   IndexedDB).
5. Send a real test push (backend test-push script).
6. The OS notification must appear **with the tab closed**. Tapping it must
   deep-link to the target screen (background `NOTIFICATION_CLICK` handler).

Only after step 6 may anyone claim web push works.

## Foreground listener

`src/components/push/push-foreground-listener.tsx` listens for
`webpush:message` (dispatched by `push-bootstrap`) and renders an in-app
toast, plus handles `NOTIFICATION_CLICK` from the SW. It is mounted in the
authenticated layout.

## Dismissible prompt

`src/components/push/push-prompt-banner.tsx` prompts once per 7 days until
push is active; dismissal is stored in `localStorage.push_prompt_dismissed_at`.
