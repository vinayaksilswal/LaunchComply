import { test, expect } from "@playwright/test";

test.describe("LaunchComply Phase 15 Customer Operations & AWS Onboarding E2E", () => {
  test("1. AWS Connection Wizard V2: Diagnoses STS error, requests assistance, and verifies clean connection (§133)", async ({ page }) => {
    // Navigate to application details page
    await page.goto("/dashboard/applications/app-demo-finscale");
    await expect(page.getByText("Acme SaaS Platform").first()).toBeVisible();

    // Open AWS Connection Wizard modal
    const awsBtn = page.getByRole("button", { name: /AWS Account/i });
    await expect(awsBtn).toBeVisible();
    await awsBtn.click();

    // Verify Wizard V2 header and options (§24-26)
    await expect(page.getByText(/AWS Connection Wizard V2/i)).toBeVisible();
    await expect(page.getByText(/Option A: CloudFormation Quick Setup/i)).toBeVisible();
    await expect(page.getByText(/Option B: Manual IAM Role/i)).toBeVisible();

    // Test Option B Manual IAM Role view
    await page.getByText(/Option B: Manual IAM Role/i).click();
    await expect(page.getByText(/Manual IAM Role & Trust Policy/i)).toBeVisible();
    await expect(page.getByText(/LaunchComplyProvisioningRole/i)).toBeVisible();

    // Test copy trust policy button
    const copyTrustBtn = page.getByRole("button", { name: /Copy Trust Policy/i });
    await expect(copyTrustBtn).toBeVisible();
    await copyTrustBtn.click();
    await expect(page.getByText(/Copied!/i)).toBeVisible();

    // Simulate INVALID_PRINCIPAL STS AssumeRole failure (§30, §31, §133)
    await page.selectOption("#aws-error-simulation-select", "INVALID_PRINCIPAL");
    await page.click("#verify-aws-connection-btn");

    // Verify human-friendly diagnostic explanation (§31)
    await expect(page.getByText(/LaunchComply can see the role, but the Trust Policy does not allow our AWS account to assume it/i)).toBeVisible();
    await expect(page.getByText(/STS Diagnostics: INVALID_PRINCIPAL/i)).toBeVisible();

    // Verify Assistance CTA (§37, §38)
    const helpBtn = page.getByRole("button", { name: /Request Setup Help/i });
    await expect(helpBtn).toBeVisible();
    await helpBtn.click();
    await expect(page.getByText(/assistance dispatched/i)).toBeVisible();

    // Switch back to Clean probe and reverify (§133)
    await page.selectOption("#aws-error-simulation-select", "NONE");
    await page.click("#verify-aws-connection-btn");

    // Verify success & Least-Privilege Permission Audit (§33, §34)
    await expect(page.getByText(/AWS Account Connected & Permissions Audited/i)).toBeVisible();
    await expect(page.getByText(/Least-Privilege Enforcement/i)).toBeVisible();
    await expect(page.getByText(/STS AssumeRole/i).first()).toBeVisible();
    await expect(page.getByText(/No broad AdministratorAccess requested/i)).toBeVisible();
  });

  test("2. Customer Operating Board renders Pilot Customer without marking Paid (§134)", async ({ page }) => {
    await page.goto("/platform-admin/customers/first-10");
    await expect(page.getByText(/Customer Operating Board/i).first()).toBeVisible();

    // Verify First 10 capacity shows real program count (§61, §62)
    await expect(page.getByText(/Real Customer Program/i)).toBeVisible();

    // Verify FinScale pilot row and attributes (§5, §8, §134)
    await expect(page.getByText(/FinScale Technologies/i)).toBeVisible();
    await expect(page.getByText(/PILOT_CUSTOMER/i).first()).toBeVisible();
    await expect(page.getByText(/AWS_ONBOARDING/i).first()).toBeVisible();
    
    // Desired Outcome is prominently displayed (§8)
    await expect(page.getByText(/Deploy our fintech SaaS securely to AWS and demonstrate ISO 27001 readiness/i)).toBeVisible();

    // Blocker is explicitly tracked (§22)
    await expect(page.getByText(/AWS IAM AssumeRole \/ STS Trust Policy Principal Mismatch/i)).toBeVisible();

    // Payment state must be UNPAID / TEST — NOT marked Paid (§9, §134)
    await expect(page.getByText(/UNPAID \/ TEST/i).first()).toBeVisible();
    const content = await page.content();
    expect(content).not.toContain("FinScale: PAID_RETAINED");
  });

  test("3. Operating Review cockpit leads with TODAY'S ACTIONS first (§4, §131)", async ({ page }) => {
    await page.goto("/platform-admin/operating-review");
    await expect(page.getByRole("heading", { name: /Operating Review & Executive Cockpit/i })).toBeVisible();

    // TODAY'S ACTIONS is the first primary section before charts (§4)
    await expect(page.getByText(/TODAY'S ACTIONS/i).first()).toBeVisible();
    await expect(page.getByText(/FinScale: AWS STS role trust validation pending/i)).toBeVisible();
    await expect(page.getByText(/Stripe: Live credentials missing/i)).toBeVisible();
    await expect(page.getByText(/Razorpay: Merchant onboarding pending/i)).toBeVisible();
    await expect(page.getByText(/Bank Wire: INR 1,49,000 UTR pending reconciliation/i)).toBeVisible();

    // Verify sample size n is displayed on commercial metrics (§55, §99)
    await expect(page.getByText(/Revenue Reality/i).first()).toBeVisible();
    await expect(page.getByText(/Live MRR/i).first()).toBeVisible();
    await expect(page.getByText(/n = 0/i).first()).toBeVisible();
  });

  test("4. Finance Reconciliation Queue displays UTR verification and strict operator gate (§18, §19, §135)", async ({ page }) => {
    await page.goto("/platform-admin/billing/activation");
    await expect(page.getByRole("heading", { name: /Billing Provider Activation Center/i })).toBeVisible();

    // Bank Transfer reconciliation section (§14, §18)
    await expect(page.getByText(/Enterprise Bank Wire & Invoice Reconciliation/i)).toBeVisible();
    await expect(page.getByText(/Payment Reality Status: UNVERIFIED \/ AWAITING_CREDENTIALS/i)).toBeVisible();

    // Verify Safe Reconciliation protocol explanation (§19, §128)
    await expect(page.getByText(/Zero False Green Policy/i)).toBeVisible();
    await expect(page.getByText(/No live money charged in CI/i)).toBeVisible();
  });
});
