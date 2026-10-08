import { expect, type Page, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";

// This helper runs only against the isolated local server guarded by playwright.config.ts.
export async function newBusiness(page: Page, request: APIRequestContext) {
  const email = `workspace-${randomUUID()}@example.com`;
  const businessName = `Workflow Business ${randomUUID().slice(0, 8)}`;
  const response = await request.post("/api/backend/auth/register", { data: {
    email, password: "WorkspaceTest123!", full_name: "Case Sensitive Owner", organization_name: businessName,
  } });
  expect(response.ok()).toBe(true);
  const account = await response.json();
  await page.addInitScript(({ token, org }) => {
    localStorage.setItem("lc_access_token", token);
    localStorage.setItem("lc_active_org_id", org);
  }, { token: account.access_token, org: account.organization_id });
  return { email, businessName, headers: { Authorization: `Bearer ${account.access_token}`, "X-Organization-ID": account.organization_id } };
}

export async function operatorHeaders(request: APIRequestContext) {
  const response = await request.post("/api/backend/auth/login", { data: { email: "admin@launchcomply.io", password: "Password123!" } });
  expect(response.ok()).toBe(true);
  const account = await response.json();
  return { Authorization: `Bearer ${account.access_token}`, "X-Organization-ID": account.organization_id };
}
