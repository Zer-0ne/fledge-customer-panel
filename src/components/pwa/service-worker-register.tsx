'use client';

import * as React from 'react';

/** Registers the root-scoped PWA service worker for every application route. */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
