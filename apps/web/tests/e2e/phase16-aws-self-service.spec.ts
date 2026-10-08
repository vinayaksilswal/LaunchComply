import { test, expect } from "@playwright/test";
import { newBusiness } from "../workspace-fixture";
test("AWS monitoring never claims a connected account or healthy services before verification", async ({ page, request }) => {
  await newBusiness(page, request); await page.goto("/dashboard/operations");
  await expect(page.getByText("Your business has no AWS account connection recorded.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Connect AWS monitoring", exact: true })).toBeVisible();
  await expect(page.locator("#workspace-content")).not.toContainText("99.98%");
  await expect(page.locator("#workspace-content")).not.toContainText("Production System Operating Normally");
});
test("A foreign or fabricated application ID has an explicit unavailable state", async ({ page, request }) => {
  await newBusiness(page, request); await page.goto("/dashboard/applications/app-01");
  await expect(page.getByRole("heading", { name: "Application unavailable", exact: true })).toBeVisible();
  await expect(page.locator("#workspace-content").getByRole("link", { name: "Applications", exact: true })).toBeVisible();
  await expect(page.locator("#workspace-content")).not.toContainText("Acme SaaS");
});
