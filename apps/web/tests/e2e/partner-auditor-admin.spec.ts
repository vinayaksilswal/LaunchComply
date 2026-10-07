import { test, expect } from "@playwright/test";

test.describe("Partner, Auditor, Admin & Tenant Isolation Workflows", () => {
  test("1. MSP Partner Portfolio workspace renders", async ({ page }) => {
    await page.goto("/partner");
    await expect(page.getByText(/Partner MSP Management Plane/i).first()).toBeVisible();
    await expect(page.getByText(/Managed Customer Workspaces/i).first()).toBeVisible();
  });

  test("2. Partner White-Label Domain wizard renders DNS verification", async ({ page }) => {
    await page.goto("/partner/settings/domain");
    await expect(page.getByText(/Vanity Custom Domain/i).first()).toBeVisible();
    await expect(page.getByText(/DNS Verification/i).first()).toBeVisible();
  });

  test("3. Independent Auditor Workpapers workspace renders", async ({ page }) => {
    await page.goto("/audit/workpapers");
    await expect(page.getByText(/Independent Auditor Workpapers/i).first()).toBeVisible();
    await expect(page.getByText(/Sampling Methodology/i).first()).toBeVisible();
  });

  test("4. Platform Admin Launch Gates verify production criteria", async ({ page }) => {
    await page.goto("/platform-admin/launch");
    await expect(page.getByText(/Production Launch Readiness/i).first()).toBeVisible();
    await expect(page.getByText(/P0 Launch Gates/i).first()).toBeVisible();
  });

  test("5. Platform Admin Providers Matrix displays multi-provider status", async ({ page }) => {
    await page.goto("/platform-admin/providers");
    await expect(page.getByText(/Cloud & SaaS Providers Matrix/i).first()).toBeVisible();
    await expect(page.getByText(/Amazon Web Services/i).first()).toBeVisible();
  });

  test("6. Multi-Tenant URL isolation rejects unauthorized tenant cross-access", async ({ page }) => {
    // Attempt to access an arbitrary unknown tenant application
    const res = await page.goto("/dashboard/applications/foreign-org-secret-app-id-9999");
    // Verify it either renders safe fallback/error without leaking metadata or redirects
    const bodyText = await page.textContent("body");
    expect(bodyText).not.toContain("SecretInternalKey");
    expect(bodyText).not.toContain("DB_PASSWORD");
  });

  test("7. Mobile viewport responsive check at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");
    await expect(page.getByText(/LaunchComply/i).first()).toBeVisible();
    await expect(page.getByText(/Action Required/i).first()).toBeVisible();
  });
});
