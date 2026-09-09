/**
 * global-setup.ts — logs in once via customer-panel BFF (admin account,
 * portal=customer) and persists the storage state for individual tests.
 */
import { request } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4200";
const STATE_PATH = process.env.E2E_AUTH_STATE ?? "/tmp/customer-auth-state.json";

// Customer-panel allows admin@system.local to log in as student when
// portal=customer + allowSwitch=true (the admin user becomes a customer
// for this panel context).
const IDENTIFIER = process.env.E2E_CUSTOMER_EMAIL ?? "admin@system.local";
const PASSWORD = process.env.E2E_CUSTOMER_PASSWORD ?? "Admin#Platform2026!SecureKey99";

export default async function globalSetup() {
  let ctx = await request.newContext({ baseURL: BASE });
  let res = await ctx.post("/api/auth/login", {
    headers: { "content-type": "application/json" },
    data: { identifier: IDENTIFIER, password: PASSWORD, allowSwitch: true },
  });

  for (let attempt = 1; !res.ok() && res.status() === 429 && attempt <= 5; attempt++) {
    console.warn(`[global-setup] 429 rate-limited; retry ${attempt}/5 in 60s`);
    await new Promise((r) => setTimeout(r, 60_000));
    res = await ctx.post("/api/auth/login", {
      headers: { "content-type": "application/json" },
      data: { identifier: IDENTIFIER, password: PASSWORD, allowSwitch: true },
    });
  }

  if (!res.ok()) {
    await ctx.dispose();
    throw new Error(`[global-setup] customer BFF login failed: ${res.status()} ${await res.text()}`);
  }

  const state = await ctx.storageState();
  await ctx.dispose();

  const target = new URL(BASE);
  state.cookies = state.cookies.filter((c: { domain: string }) => {
    const d = c.domain;
    if (!d) return true;
    return d === target.hostname || d.endsWith(`.${target.hostname}`);
  });

  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  console.log(`[global-setup] wrote ${state.cookies.length} cookie(s) to ${STATE_PATH}`);
}
