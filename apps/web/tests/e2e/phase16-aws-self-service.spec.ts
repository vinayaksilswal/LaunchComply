import { test, expect } from "@playwright/test";

test.describe("LaunchComply Phase 16 AWS Onboarding Automation & Zero-Friction STS E2E", () => {
  test("1. Happy Path: CloudFormation Quick Setup, Stack Observation, Discovery to CONNECTED (§127)", async ({ page }) => {
    // Navigate to application details page
    await page.goto("/dashboard/applications/app-demo-finscale");
    await expect(page.getByText("Acme SaaS Platform").first()).toBeVisible();

    // Open AWS Connection Wizard modal
    const awsBtn = page.getByRole("button", { name: /AWS Account/i });
    await expect(awsBtn).toBeVisible();
    await awsBtn.click();

    // Verify Wizard V3 header, 11-step progress checklist, and security guarantees (§5, §138)
    await expect(page.getByText(/AWS Connection Wizard V3/i)).toBeVisible();
    await expect(page.getByText(/No Root Keys/i)).toBeVisible();
    await expect(page.getByText(/Short STS Sessions/i)).toBeVisible();
    await expect(page.getByText(/1\. Env/i)).toBeVisible();
    await expect(page.getByText(/11\. Connected/i)).toBeVisible();

    // Select Option A: CloudFormation Quick Setup
    await page.getByText(/Option A: CloudFormation Quick Setup/i).click();
    await expect(page.getByText(/Automated 1-Click AWS Setup/i)).toBeVisible();
    await expect(page.getByText(/Open AWS CloudFormation Setup/i)).toBeVisible();

    // Test Stack Live Observation (§18, §19)
    const observeBtn = page.getByRole("button", { name: /Observe Stack Events/i });
    await expect(observeBtn).toBeVisible();
    await observeBtn.click();
    await expect(page.getByText(/CREATE_COMPLETE/i).first()).toBeVisible();

    // Perform STS verification
    await page.selectOption("#aws-error-simulation-select", "NONE");
    await page.click("#verify-aws-connection-btn");

    // Verify Clean Connected Box (§34, §52)
    await expect(page.getByText(/AWS Account Connected & Permissions Audited/i)).toBeVisible();

    // Verify Least-Privilege Permission Profiles (§34, §37)
    await expect(page.getByText(/DEPLOYMENT/i).first()).toBeVisible();
    await expect(page.getByText(/SECURITY_READ/i).first()).toBeVisible();

    // Verify Read-Only Resource Discovery Preview (§48, §49)
    await expect(page.getByText(/Discovered Existing AWS Infrastructure/i)).toBeVisible();
    await expect(page.getByText(/VPCs/i).first()).toBeVisible();
  });

  test("2. Trust Policy Diff Inspector & Principal Mismatch Resolution (§128)", async ({ page }) => {
    await page.goto("/dashboard/applications/app-demo-finscale");
    await page.getByRole("button", { name: /AWS Account/i }).click();

    // Simulate INVALID_PRINCIPAL STS AssumeRole failure
    await page.selectOption("#aws-error-simulation-select", "INVALID_PRINCIPAL");
    await page.click("#verify-aws-connection-btn");

    // Verify human-friendly diagnostic explanation and confidence score (§28, §30)
    await expect(page.getByText(/STS Diagnostics: INVALID_PRINCIPAL/i)).toBeVisible();
    await expect(page.getByText(/Confidence: CONFIRMED/i)).toBeVisible();

    // Verify Trust Policy Diff Inspector (§29, §30)
    await expect(page.getByText(/Trust Policy Diff Inspector/i)).toBeVisible();
    await expect(page.getByText(/Mismatched In Role/i)).toBeVisible();

    // Test Copy Corrected Trust Policy button (§31)
    const copyCorrectedBtn = page.getByRole("button", { name: /Copy Corrected Trust Policy/i });
    await expect(copyCorrectedBtn).toBeVisible();
    await copyCorrectedBtn.click();
    await expect(page.getByText(/Copied!/i)).toBeVisible();

    // Switch back to Clean probe and reverify
    await page.selectOption("#aws-error-simulation-select", "NONE");
    await page.click("#verify-aws-connection-btn");
    await expect(page.getByText(/AWS Account Connected & Permissions Audited/i)).toBeVisible();
  });

  test("3. Wrong External ID Diagnosis & Assistance CTA (§129)", async ({ page }) => {
    await page.goto("/dashboard/applications/app-demo-finscale");
    await page.getByRole("button", { name: /AWS Account/i }).click();

    // Simulate WRONG_EXTERNAL_ID
    await page.selectOption("#aws-error-simulation-select", "WRONG_EXTERNAL_ID");
    await page.click("#verify-aws-connection-btn");

    // Verify diagnostic explanation for confused-deputy protection (§33)
    await expect(page.getByText(/STS Diagnostics: WRONG_EXTERNAL_ID/i)).toBeVisible();
    await expect(page.getByText(/confused deputy/i)).toBeVisible();

    // Verify Request Setup Help CTA (§37, §38)
    const helpBtn = page.getByRole("button", { name: /Request Setup Help/i });
    await expect(helpBtn).toBeVisible();
    await helpBtn.click();
    await expect(page.getByText(/assistance dispatched/i)).toBeVisible();
  });

  test("4. Session-Safe Wizard Resume on Navigation (§131)", async ({ page }) => {
    await page.goto("/dashboard/applications/app-demo-finscale");
    await page.getByRole("button", { name: /AWS Account/i }).click();

    // Enter custom Role ARN
    const customArn = "arn:aws:iam::778899001122:role/CustomLaunchComplyRole";
    await page.fill("#aws-role-arn-input", customArn);

    // Close modal by clicking ✕
    await page.getByRole("button", { name: "✕" }).click();
    await expect(page.getByText(/AWS Connection Wizard V3/i)).not.toBeVisible();

    // Reopen modal -> state should be restored
    await page.getByRole("button", { name: /AWS Account/i }).click();
    await expect(page.locator("#aws-role-arn-input")).toHaveValue(customArn);
  });

  test("5. Safe Disconnect: Revokes Access While Preserving Infrastructure (§132)", async ({ page }) => {
    await page.goto("/dashboard/applications/app-demo-finscale");
    await page.getByRole("button", { name: /AWS Account/i }).click();

    // Complete connection first
    await page.selectOption("#aws-error-simulation-select", "NONE");
    await page.click("#verify-aws-connection-btn");
    await expect(page.getByText(/AWS Account Connected & Permissions Audited/i)).toBeVisible();

    // Click Disconnect AWS (§101, §102)
    const disconnectBtn = page.getByRole("button", { name: /Disconnect AWS/i });
    await expect(disconnectBtn).toBeVisible();
    await disconnectBtn.click();

    // Verify infrastructure preservation message
    await expect(page.getByText(/infrastructure remains intact and running untouched/i)).toBeVisible();
  });

  test("6. Platform Admin AWS Onboarding Dashboard (§65, §139)", async ({ page }) => {
    // Navigate to /platform-admin/aws-onboarding
    await page.goto("/platform-admin/aws-onboarding");
    await expect(page.getByText(/AWS Onboarding Automation & Diagnostics/i)).toBeVisible();

    // Verify top metrics
    await expect(page.getByText(/TIME TO AWS CONNECTED/i)).toBeVisible();
    await expect(page.getByText(/OPERATOR TIME BASELINE/i)).toBeVisible();
    await expect(page.getByText(/18\.5 hrs/i)).toBeVisible();

    // Verify Stuck Customer Alert for FinScale Technologies (§66)
    await expect(page.getByText(/Stuck Customer Detected/i)).toBeVisible();
    await expect(page.getByText(/FinScale Technologies Pvt Ltd/i)).toBeVisible();
    await expect(page.getByText(/AWS IAM AssumeRole \/ STS Trust Policy Principal Mismatch/i)).toBeVisible();

    // Verify Funnel Drop-Off Steps (§68, §69)
    await expect(page.getByText(/AWS Onboarding Funnel & Drop-Off Analytics/i)).toBeVisible();
    await expect(page.getByText(/CloudFormation Opened/i)).toBeVisible();
    await expect(page.getByText(/STS Connected/i)).toBeVisible();
  });
});
