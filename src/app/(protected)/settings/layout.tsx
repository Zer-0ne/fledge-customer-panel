import * as React from 'react';
import SettingsNav from './settings-nav';

// Settings pages are per-user; never statically prerender them (a deeper
// static client page under a client layout trips a Next 16.2.12 prerender
// crash: "Cannot read properties of null (reading 'use')" in layout-router).
export const dynamic = 'force-dynamic';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-6 lg:px-8 space-y-6 w-full min-w-0 overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, devices, notification preferences, and account.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 md:gap-8 min-w-0 w-full">
        <SettingsNav />
        <div className="min-w-0 flex-1 w-full overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}
