import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("sign in through the configured proxy and retain the authenticated organization", async ({ page }) => {
  let readinessChecks = 0;
  await page.route("**/api/backend/health/ready", async route => {
    if (++readinessChecks === 1) await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ status: "NOT_READY" }) });
    else await route.continue();
  });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("demo@launchcomply.io");
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const identity = await page.evaluate(async () => {
    const token = localStorage.getItem("lc_access_token");
    const orgId = localStorage.getItem("lc_active_org_id");
    const response = await fetch("/api/backend/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    return { status: response.status, user: await response.json(), orgId };
  });
  expect(identity.status).toBe(200);
  expect(identity.user.email).toBe("demo@launchcomply.io");
  expect(identity.user.organizations.some((org: { id: string }) => org.id === identity.orgId)).toBe(true);
  expect(readinessChecks).toBeGreaterThanOrEqual(2);
});

test("signup waits for a cold API and creates one account with a usable identity", async ({ page }) => {
  let checks = 0;
  let submissions = 0;
  await page.route("**/api/backend/health/ready", async route => {
    if (++checks === 1) await route.fulfill({ status: 502, contentType: "text/html", body: "<html>Starting</html>" });
    else await route.continue();
  });
  await page.route("**/api/backend/auth/register", async route => { submissions++; await route.continue(); });
  await page.goto("/signup");
  const email = `signup-${Date.now()}@example.com`;
  await page.getByPlaceholder("Alex Mercer").fill("Signup Test Owner");
  await page.getByPlaceholder("alex@acmecloud.io").fill(email);
  await page.locator('input[type="password"]').fill("SignupTestPassword123!");
  await page.getByPlaceholder("AcmeCloud Technologies").fill("Signup Test Organization");
  await expect(page.getByRole("link", { name: "Sign In", exact: true })).toHaveAttribute("href", "/login");
  await page.getByRole("button", { name: "Start 14-Day Free Trial" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  const identity = await page.evaluate(async () => {
    const token = localStorage.getItem("lc_access_token");
    const orgId = localStorage.getItem("lc_active_org_id");
    const response = await fetch("/api/backend/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    return { status: response.status, user: await response.json(), orgId };
  });
  expect(identity.status).toBe(200);
  expect(identity.user.email).toBe(email);
  expect(identity.user.organizations.some((org: { id: string }) => org.id === identity.orgId)).toBe(true);
  expect(submissions).toBe(1);
  expect(checks).toBe(2);
});

test("signup gateway failure stays visible and does not replay account creation", async ({ page }) => {
  let submissions = 0;
  await page.route("**/api/backend/auth/register", async route => {
    submissions++;
    await route.fulfill({ status: 502, contentType: "text/html", body: "<html>Gateway failure</html>" });
  });
  await page.goto("/signup");
  await page.getByPlaceholder("Alex Mercer").fill("Signup Test Owner");
  await page.getByPlaceholder("alex@acmecloud.io").fill("gateway-test@example.com");
  await page.locator('input[type="password"]').fill("SignupTestPassword123!");
  await page.getByPlaceholder("AcmeCloud Technologies").fill("Signup Test Organization");
  await page.getByRole("button", { name: "Start 14-Day Free Trial" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "We could not confirm account creation" })).toHaveText("We could not confirm account creation. Please try signing in before submitting again.");
  await expect(page.getByRole("button", { name: "Start 14-Day Free Trial" })).toBeEnabled();
  expect(submissions).toBe(1);
});

test("password recovery cannot issue a usable token to an unauthenticated caller", async ({ request }) => {
  const response = await request.post("/api/backend/commercial/auth/request-password-reset", {
    data: { email: "demo@launchcomply.io" },
  });
  expect(response.status()).toBe(503);
  expect(await response.json()).toEqual({ detail: "Password reset email delivery is unavailable. Contact support." });
});
