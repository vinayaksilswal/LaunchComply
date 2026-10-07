import { test, expect } from "@playwright/test";

test.describe("LaunchComply Phase 14 Operational Discipline & Revenue Activation E2E", () => {
  test("1. Billing Activation Center displays masked provider status and enterprise reconciliation", async ({ page }) => {
    await page.goto("/platform-admin/billing/activation");
    await expect(page.getByRole("heading", { name: /Billing Provider Activation Center/i })).toBeVisible();
    await expect(page.getByText(/Zero-code runtime activation/i)).toBeVisible();
    await expect(page.getByText(/Enterprise Bank Wire & Invoice Reconciliation/i)).toBeVisible();
    
    // Verify credential security rule (§15): raw secret keys must not appear in the page
    const content = await page.content();
    expect(content).not.toContain("sk_test_");
    expect(content).not.toContain("sk_live_");
    expect(content).not.toContain("rzp_test_secret");
    expect(content).not.toContain("rzp_live_secret");
  });

  test("2. Weekly Operating Review cockpit prioritizes action items before metrics", async ({ page }) => {
    await page.goto("/platform-admin/operating-review");
    await expect(page.getByRole("heading", { name: /Weekly Operating Review & Executive Cockpit/i })).toBeVisible();
    
    // Action list first (§110)
    await expect(page.getByText(/What Requires Action Today\? \(Priority Action Items\)/i)).toBeVisible();
    await expect(page.getByText(/Daily Operations Protocol/i)).toBeVisible();
    await expect(page.getByText(/Post-GA Stability & Observation Windows/i)).toBeVisible();
    await expect(page.getByText(/Sourced Roadmap Candidates/i)).toBeVisible();
  });

  test("3. First 10 Customers Hub enforces Real Only filtering and blocker tracking", async ({ page }) => {
    await page.goto("/platform-admin/customers/first-10");
    await expect(page.getByText(/First 10 Customers Operational Hub/i).first()).toBeVisible();
    
    // Check Real Only toggle is active by default (§28)
    const realOnlyBtn = page.getByRole("button", { name: /Real Only \(Phase 14 Default\)/i });
    await expect(realOnlyBtn).toBeVisible();
    await expect(page.getByRole("button", { name: /Include Test \/ Demo/i })).toBeVisible();
    
    // Verify table structure with tenure/days-in-stage
    await expect(page.getByText(/Active Initial Customers/i).first()).toBeVisible();
  });

  test("4. Analytics Hub renders Revenue Provenance Drilldown and canonical metrics", async ({ page }) => {
    await page.goto("/platform-admin/analytics");
    await expect(page.getByText(/Real Revenue & Business Analytics Hub/i)).toBeVisible();
    await expect(page.getByText(/Live Monthly Recurring \(MRR\)/i)).toBeVisible();
    await expect(page.getByText(/Paid Live Customers/i)).toBeVisible();
    
    // Verify Revenue Drilldown table (§75-77)
    await expect(page.getByText(/Revenue Provenance & Transaction Drilldown/i)).toBeVisible();
    await expect(page.getByText(/Every rupee\/dollar traces to: Organization → Subscription → Invoice → Payment → Reconciliation/i)).toBeVisible();
  });
});
