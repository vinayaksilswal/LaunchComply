import { test, expect } from "@playwright/test";
import { newBusiness } from "../workspace-fixture";
test("Customer home uses account identity and actual empty business totals @smoke", async ({ page, request }) => {
  const account = await newBusiness(page, request);
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Welcome, Case" })).toBeVisible();
  const mobile = (page.viewportSize()?.width || 1280) < 1024;
  if (mobile) await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.getByText(account.email, { exact: true }).filter({ visible: true })).toBeVisible();
  if (mobile) await page.getByRole("button", { name: "Close navigation overlay" }).click({ position: { x: 350, y: 100 } });
  await expect(page.getByRole("button", { name: "Help me deploy", exact: true })).toBeVisible();
  const main = page.locator("#workspace-content");
  await expect(main.getByText("Build your first workspace", { exact: true })).toBeVisible();
  await expect(main).not.toContainText("AcmeCloud");
  await expect(main).not.toContainText("84%");
  await expect(page.getByText("LIVE", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "test-results/customer-home.png", fullPage: true });
});
test("Find a page reaches the security workspace with the keyboard @smoke", async ({ page, request }) => {
  await newBusiness(page, request); await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Welcome, Case" })).toBeVisible();
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder(/Find a page/).fill("Security findings");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/dashboard\/security$/);
  await expect(page.getByRole("heading", { name: "Security findings", exact: true })).toBeVisible();
});
test("Onboarding asks only for the app name and authorized GitHub connection", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: /^Deploy My Application/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Name Your Application Workspace" })).toBeVisible();
  await expect(page.getByText("Primary Environment", { exact: true })).toHaveCount(0);
  await expect(page.locator("input")).toHaveCount(1);
});
