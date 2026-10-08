import { test, expect } from "@playwright/test";
import { newBusiness } from "../workspace-fixture";
import { MODULES, modulePath } from "../../src/lib/workspaces";
const keys = ["security", "threat-models", "vapt", "compliance", "iso27001", "soc2", "privacy", "assurance", "evidence", "exceptions", "risks", "policies"];
test("Business pages load real records without sample results", async ({ page, request }) => {
  test.setTimeout(120000);
  const account = await newBusiness(page, request);
  for (const key of keys) {
    const module = MODULES.find(item => item.key === key)!;
    await page.goto(modulePath(key));
    await expect(page.getByRole("heading", { name: module.title, exact: true })).toBeVisible();
    await expect(page.locator("#workspace-content").getByRole("status")).toHaveCount(0);
    await expect(page.locator("#workspace-content").getByRole("alert")).toHaveCount(0);
    await expect(page.locator("#workspace-content")).not.toContainText("AcmeCloud");
    if (key === "team") await expect(page.locator("#workspace-content")).toContainText(account.email);
    else if (!["logs", "services", "operations", "incidents", "backups", "cost", "deployments", "security", "vapt", "compliance", "iso27001", "soc2", "privacy", "support"].includes(key)) await expect(page.getByText("0 total", { exact: true })).toBeVisible();
  }
});
