import { test, expect } from "@playwright/test";

test.describe("LaunchComply Phase 13 GA Market Launch & First Customers E2E @smoke", () => {
  test("1. Visitor lands on production site and verifies canonical pricing and Book Demo flow", async ({ page }) => {
    // 1. Home page
    await page.goto("/");
    await expect(page).toHaveTitle(/LaunchComply/i);
    await expect(page.getByText(/From Localhost to/i).first()).toBeVisible();
    await expect(page.getByText(/Real Business/i).first()).toBeVisible();

    // 2. Canonical Pricing
    await page.goto("/pricing");
    await expect(page.getByText(/Transparent Pricing for Real Cloud Businesses/i).first()).toBeVisible();
    await expect(page.getByText(/Starter/i).first()).toBeVisible();
    await expect(page.getByText(/Growth/i).first()).toBeVisible();
    await expect(page.getByText(/Business/i).first()).toBeVisible();
    await expect(page.getByText(/Enterprise/i).first()).toBeVisible();

    // 3. Book 20-Min Demo Guided CTA
    const demoButton = page.getByRole("button", { name: /Book a 20-Min Demo/i });
    await expect(demoButton).toBeVisible();
    await demoButton.click();

    // 4. Modal renders
    await expect(page.getByText(/Book a 20-Minute Product Demo/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/Aditya Sharma/i)).toBeVisible();
    await expect(page.getByPlaceholder(/aditya@company.com/i)).toBeVisible();
  });

  test("2. Platform Admin GA Launch Center displays release metadata & verified Reality Matrix", async ({ page }) => {
    await page.goto("/platform-admin/ga");
    await expect(page.getByText(/LaunchComply v1.0 GA Launch Center/i).first()).toBeVisible();
    await expect(page.getByText(/READY_WITH_EXTERNAL_DEPENDENCIES/i).first()).toBeVisible();
    await expect(page.getByText(/Verified External Provider Reality Matrix/i).first()).toBeVisible();

    // Check key external providers in matrix
    await expect(page.getByText(/PostgreSQL Database Engine/i).first()).toBeVisible();
    await expect(page.getByText(/Stripe Payments & Checkout/i).first()).toBeVisible();
    await expect(page.getByText(/Razorpay Payments & Subscriptions/i).first()).toBeVisible();
    await expect(page.getByText(/AWS SES \/ Transactional Email/i).first()).toBeVisible();
    await expect(page.getByText(/AWS STS & ECS Deployment Engine/i).first()).toBeVisible();
    await expect(page.getByText(/Security Scanning & VAPT Engine/i).first()).toBeVisible();
  });

  test("3. First 10 Customers Hub tracks stages, AWS connection and success criteria", async ({ page }) => {
    await page.goto("/platform-admin/customers/first-10");
    await expect(page.getByText(/First 10 Customers Operational Hub/i).first()).toBeVisible();
    await expect(page.getByText(/Canonical Onboarding Stages Progression/i).first()).toBeVisible();
    await expect(page.getByText(/Active Initial Customers/i).first()).toBeVisible();
  });

  test("4. Sales Hub renders standardized proposal templates and pipeline", async ({ page }) => {
    await page.goto("/platform-admin/sales");
    await expect(page.getByText(/Sales Pipeline & Proposals Hub/i).first()).toBeVisible();
    await expect(page.getByText(/Standardized Commercial Proposal Templates/i).first()).toBeVisible();
    await expect(page.getByText(/Total Pipeline Value/i).first()).toBeVisible();
    await expect(page.getByText(/Commercial Pipeline Deals/i).first()).toBeVisible();
  });

  test("5. Business Analytics Hub strictly separates LIVE, TEST, and DEMO revenue", async ({ page }) => {
    await page.goto("/platform-admin/analytics");
    await expect(page.getByText(/Real Revenue & Business Analytics Hub/i).first()).toBeVisible();
    await expect(page.getByText(/Live Monthly Recurring \(MRR\)/i).first()).toBeVisible();
    await expect(page.getByText(/Environment Financial Separation Table/i).first()).toBeVisible();
    await expect(page.getByText(/LIVE/i).first()).toBeVisible();
    await expect(page.getByText(/TEST/i).first()).toBeVisible();
    await expect(page.getByText(/DEMO/i).first()).toBeVisible();
    await expect(page.getByText(/Primary Activation Funnel/i).first()).toBeVisible();
  });

  test("6. Customer Success Hub tracks explainable health score categories", async ({ page }) => {
    await page.goto("/platform-admin/customer-success");
    await expect(page.getByText(/Customer Success Center/i).first()).toBeVisible();
    await expect(page.getByText(/At Risk/i).first()).toBeVisible();
    await expect(page.getByText(/Needs Attention/i).first()).toBeVisible();
    await expect(page.getByText(/Healthy/i).first()).toBeVisible();
    await expect(page.getByText(/Active Customer Success Action Tasks/i).first()).toBeVisible();
  });
});
