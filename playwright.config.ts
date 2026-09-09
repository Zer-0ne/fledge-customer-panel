import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4200";
const authState = process.env.E2E_AUTH_STATE ?? "/tmp/customer-auth-state.json";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "retain-on-failure",
    storageState: process.env.E2E_NO_AUTH_STATE ? undefined : authState,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--unsafely-treat-insecure-origin-as-secure=http://127.0.0.1:4200"],
        },
      },
    },
  ],
});
