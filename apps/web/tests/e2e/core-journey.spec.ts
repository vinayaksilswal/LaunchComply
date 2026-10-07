import { test, expect } from "@playwright/test";

test.describe("LaunchComply Core Customer Journey @smoke", () => {
  test("1. Visit home page and verify positioning", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/LaunchComply/i);
    // Verify core positioning
    await expect(
      page.getByText(/From Localhost to Real Business/i).first()
    ).toBeVisible();
    await expect(
      page.getByText(/Deploy\. Secure\. Audit\. Comply\./i).first()
    ).toBeVisible();
  });

  test("2. View pricing tiers and commercial plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText(/Transparent Cloud & Compliance Pricing/i).first()).toBeVisible();
    await expect(page.getByText(/Starter/i).first()).toBeVisible();
    await expect(page.getByText(/Growth/i).first()).toBeVisible();
    await expect(page.getByText(/Enterprise/i).first()).toBeVisible();
  });

  test("3. Self-serve signup page renders with validation", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByText(/Create Your Enterprise Account/i).first()).toBeVisible();
    await expect(page.locator("input[type='email']").first()).toBeVisible();
    await expect(page.locator("button[type='submit']").first()).toBeVisible();
  });

  test("4. Onboarding goal launcher tailors first session", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page.getByText(/Welcome to LaunchComply/i).first()).toBeVisible();
    await expect(page.getByText(/Deploy My Application/i).first()).toBeVisible();
    await expect(page.getByText(/Prepare for ISO 27001/i).first()).toBeVisible();

    // Select goal and continue
    await page.getByText(/Deploy My Application/i).first().click();
    await page.getByRole("button", { name: /Continue/i }).click();

    // Step 2: Name Workspace
    await expect(page.getByText(/Name Your Application Workspace/i).first()).toBeVisible();
  });

  test("5. Executive Dashboard renders prioritized Action Center and White UI", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(/AcmeCloud SaaS/i).first()).toBeVisible();
    await expect(page.getByText(/Action Required/i).first()).toBeVisible();
    await expect(page.getByText(/Production Readiness/i).first()).toBeVisible();
    await expect(page.getByText(/Security Posture/i).first()).toBeVisible();
    await expect(page.getByText(/Compliance Score/i).first()).toBeVisible();
  });

  test("6. Command Palette Ctrl+K opens and supports keyboard navigation", async ({ page }) => {
    await page.goto("/dashboard");
    // Trigger keyboard shortcut
    await page.keyboard.press("Control+k");
    await expect(page.getByPlaceholder(/Type a command or search/i)).toBeVisible();
    await page.keyboard.type("Security");
    await expect(page.getByText(/Security Findings & Posture/i).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder(/Type a command or search/i)).not.toBeVisible();
  });

  test("7. Action Center / My Actions renders unified tasks", async ({ page }) => {
    await page.goto("/dashboard/my-actions");
    await expect(page.getByText(/My Actions/i).first()).toBeVisible();
    await expect(page.getByText(/Unified Action Center/i).first()).toBeVisible();
    await expect(page.getByText(/Pending Actions:/i).first()).toBeVisible();
  });
});
