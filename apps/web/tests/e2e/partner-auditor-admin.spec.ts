import { test, expect } from "@playwright/test";
import { newBusiness } from "../workspace-fixture";
test("Regular business accounts cannot enter internal operations", async ({ page, request }) => {
  await newBusiness(page, request); await page.goto("/platform-admin");
  await expect(page.getByRole("heading", { name: "This is an internal workspace", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Business service queue", exact: true })).toHaveCount(0);
});
test("An operator sees the queue and legacy internal pages lead to the same workspace", async ({ page }) => {
  await page.goto("/platform-admin/ga");
  await expect(page).toHaveURL(/platform-admin$/);
  await expect(page.getByRole("heading", { name: "Business service queue", exact: true })).toBeVisible();
});
test("Mobile navigation reaches account and stays within the viewport", async ({ page, request }) => {
  await newBusiness(page, request); await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Welcome, Case" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/customer-mobile.png", fullPage: true });
});
