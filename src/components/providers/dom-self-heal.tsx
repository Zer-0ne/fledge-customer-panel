'use client';
/**
 * DOM self-heal guard.
 *
 * React 19 + Next hydrate the WHOLE document, so any foreign DOM mutation —
 * a stray Node removal, a browser extension, translation tooling, injected
 * pickup/autofill UI — can desync React's tree. The failure signature is:
 *
 *   Uncaught TypeError: can't access property "removeChild",
 *     n.stateNode.parentNode is null
 *
 * After that error React's render loop is dead: the page still LOOKS fine, but
 * every subsequent router update (i.e. every navigation click) silently does
 * nothing until the user reloads. That is the "I have to click twice / nothing
 * happens" report.
 *
 * This guard watches for that exact failure and performs ONE guarded reload so
 * the user never lands in a dead app. A sessionStorage brake (one reload per
 * 30s) prevents any reload loop.
 */
import * as React from 'react';

const BRAKE_KEY = 'cp:dom-self-heal-at';
const BRAKE_MS = 30_000;

const FATAL_DOM_PATTERNS = [
  /removeChild/i,
  /parentNode is null/i,
  /The node to be removed is not a child/i,
  /Failed to execute 'removeChild'/i,
];

export function DomSelfHeal() {
  React.useEffect(() => {
    const heal = (message: string) => {
      if (!message || !FATAL_DOM_PATTERNS.some((pattern) => pattern.test(message))) return;
      try {
        const last = Number(window.sessionStorage.getItem(BRAKE_KEY) ?? '0');
        if (Number.isFinite(last) && Date.now() - last < BRAKE_MS) return;
        window.sessionStorage.setItem(BRAKE_KEY, String(Date.now()));
      } catch {
        // sessionStorage unavailable (private mode) — still heal once.
      }
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      heal(String(event.message ?? ''));
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: string } | string | undefined;
      heal(typeof reason === 'string' ? reason : String(reason?.message ?? ''));
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
