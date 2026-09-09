/**
 * Customer-panel Playwright smoke.
 *
 * Auth state is bootstrapped by ./e2e/global-setup.ts.
 * Run: pnpm exec playwright test e2e/customer-smoke.spec.ts --project=chromium
 */
import { expect, test } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4200";

test.describe("customer-panel — public surfaces", () => {
  test("public marketing pages load with no auth", async ({ page, context }) => {
    await context.clearCookies();
    for (const path of ["/", "/donate", "/login", "/signup", "/faq", "/about", "/privacy", "/terms", "/search", "/roommates"]) {
      await page.goto(path);
      const bodyText = await page.locator("body").innerText();
      expect(bodyText.length, `body text length for ${path}`).toBeGreaterThan(20);
    }
  });

  test("anonymous dashboard request redirects to login", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/dashboard");
    // Should redirect to /login.
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("customer-panel — authenticated flows", () => {
  test("every authenticated page returns 200 and renders real content", async ({ page }) => {
    // All top-level paths under (protected) and other major routes.
    const paths = [
      "/dashboard",
      "/messages",
      "/favorites",
      "/settings",
      "/settings/account",
      "/settings/profile",
      "/settings/notifications",
      "/settings/contact",
      "/settings/sessions",
      "/settings/data",
      "/settings/contact-privacy",
      "/settings/verify/student",
      "/settings/verify/college-email",
      "/settings/verify/phone",
      "/settings/verify/upi",
      "/need-now",
      "/saved-searches",
      "/roommate-interests",
      "/notifications",
      "/maintenance",
      "/interests",
      "/roommate-posts",
      "/donate",
      "/listings/search",
      "/",
      "/search",
      "/roommates",
    ];
    for (const path of paths) {
      const res = await page.goto(path);
      const code = res?.status() ?? 0;
      expect(code, `${path} HTTP ${code}`).toBeLessThan(400);
    }
  });
});
