import { test, expect } from "@playwright/test";

test("sign in through the configured proxy and retain the authenticated organization", async ({ page }) => {
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
});

test("password recovery cannot issue a usable token to an unauthenticated caller", async ({ request }) => {
  const response = await request.post("/api/backend/commercial/auth/request-password-reset", {
    data: { email: "demo@launchcomply.io" },
  });
  expect(response.status()).toBe(503);
  expect(await response.json()).toEqual({ detail: "Password reset email delivery is unavailable. Contact support." });
});
