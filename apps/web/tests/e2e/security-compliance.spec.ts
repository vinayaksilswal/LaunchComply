import { test, expect } from "@playwright/test";

test.describe("Security & Compliance E2E Workflows", () => {
  test("1. Security Hub displays active findings and posture", async ({ page }) => {
    await page.goto("/dashboard/security");
    await expect(page.getByText(/Security Posture & Vulnerability Management/i).first()).toBeVisible();
    await expect(page.getByText(/PostgreSQL Public Accessibility/i).first()).toBeVisible();
    await expect(page.getByText(/CRITICAL/i).first()).toBeVisible();
  });

  test("2. Threat Modeling canvas provides live architecture overlay", async ({ page }) => {
    await page.goto("/dashboard/security/threat-models");
    await expect(page.getByText(/Continuous Threat Modeling/i).first()).toBeVisible();
  });

  test("3. Authorized VAPT Pentesting Project workspace renders", async ({ page }) => {
    await page.goto("/dashboard/vapt");
    await expect(page.getByText(/Vulnerability Assessment & Penetration Testing/i).first()).toBeVisible();
    await expect(page.getByText(/Q3 Production Web & API Scope/i).first()).toBeVisible();
    await expect(page.getByText(/AUTHORIZED/i).first()).toBeVisible();
  });

  test("4. ISO 27001 Workspace displays ISMS controls and readiness", async ({ page }) => {
    await page.goto("/dashboard/compliance/iso27001");
    await expect(page.getByText(/ISO\/IEC 27001:2022 ISMS Workspace/i).first()).toBeVisible();
    await expect(page.getByText(/Statement of Applicability/i).first()).toBeVisible();
    await expect(page.getByText(/Annex A Controls/i).first()).toBeVisible();
  });

  test("5. SOC 2 Workspace displays Trust Services Criteria", async ({ page }) => {
    await page.goto("/dashboard/compliance/soc2");
    await expect(page.getByText(/SOC 2 Type II Workspace/i).first()).toBeVisible();
    await expect(page.getByText(/Security \(Common Criteria\)/i).first()).toBeVisible();
  });

  test("6. Continuous Assurance Hub displays bots, controls, and evidence", async ({ page }) => {
    await page.goto("/dashboard/assurance");
    await expect(page.getByText(/Continuous Assurance Automation/i).first()).toBeVisible();
    await expect(page.getByText(/Audit Bots/i).first()).toBeVisible();
    await expect(page.getByText(/Evidence Vault/i).first()).toBeVisible();
  });

  test("7. Evidence Vault displays tamper-evident hash verification", async ({ page }) => {
    await page.goto("/dashboard/assurance/evidence");
    await expect(page.getByText(/Cryptographic Evidence Vault/i).first()).toBeVisible();
    await expect(page.getByText(/SHA-256 Tamper-Evident Chain/i).first()).toBeVisible();
  });
});
