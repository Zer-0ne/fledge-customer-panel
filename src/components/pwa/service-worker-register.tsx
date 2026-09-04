'use client';

import * as React from 'react';

/** Registers the PWA service worker (installability + offline fallback). */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
