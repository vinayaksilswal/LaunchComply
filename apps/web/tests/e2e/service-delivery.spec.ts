import { test, expect } from "@playwright/test";
import { newBusiness } from "../workspace-fixture";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

test("Apply in two clicks, operator publishes, customer reads the actual report @smoke", async ({
  page,
  request,
  browser,
}) => {
  const customer = await newBusiness(page, request);
  await page.goto("/dashboard/vapt");
  await expect(
    page.getByRole("heading", { name: "Apply to get started", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Apply for assessment", exact: true })
    .click();
  const createdResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/business-requests") &&
      response.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  const created = await (await createdResponse).json();
  await expect(
    page.getByRole("heading", { name: "Request submitted" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close request" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Vulnerability assessment application",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Report available after the operations team publishes it.", {
      exact: true,
    }),
  ).toBeVisible();

  const admin = await browser.newPage({
    storageState: "./test-results/local-auth.json",
  });
  try {
    await admin.goto("/platform-admin");
    await expect(
      admin.getByRole("heading", {
        name: "Business service queue",
        exact: true,
      }),
    ).toBeVisible();
    await admin
      .getByRole("button")
      .filter({
        has: admin.getByRole("heading", {
          name: "Vulnerability assessment application",
          exact: true,
        }),
      })
      .filter({ hasText: customer.businessName })
      .click();
    await admin
      .getByRole("button", { name: "Publish service report", exact: true })
      .click();
    await admin
      .getByLabel("Report title", { exact: true })
      .fill("Workspace release review");
    await admin
      .getByLabel("Report content", { exact: true })
      .fill(
        "Actual saved report from the local operations workflow. This fixture records a scope review, without claiming a penetration test was executed.",
      );
    await admin
      .getByRole("button", { name: "Publish to customer", exact: true })
      .click();
    await expect(
      admin.getByRole("dialog", { name: "Manage business request" }),
    ).toHaveCount(0);
    await admin.screenshot({
      path: "test-results/operations-queue.png",
      fullPage: true,
    });
  } finally {
    await admin.close();
  }

  await page
    .getByRole("button", { name: "Refresh service applications" })
    .click();
  await page
    .getByRole("button", { name: "View Workspace release review", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Published service report" }),
  ).toContainText("Actual saved report from the local operations workflow.");
  await expect(
    page.getByRole("button", { name: "Download report", exact: true }),
  ).toBeVisible();
  const saved = await request.get(`/api/backend/business-requests`, {
    headers: customer.headers,
  });
  const item = (await saved.json()).requests.find(
    (row: { id: string }) => row.id === created.id,
  );
  expect(item.status).toBe("DELIVERED");
  expect(item.reports).toHaveLength(1);
  const reportResponse = await request.get(
    `/api/backend/business-requests/reports/${item.reports[0].id}`,
    {
      headers: customer.headers,
    },
  );
  expect(reportResponse.ok()).toBe(true);
  const report = await reportResponse.json();
  expect(report.sha256).toBe(
    createHash("sha256").update(report.content).digest("hex"),
  );
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download report", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("service-report.txt");
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const downloadedContent = await readFile(downloadedPath!, "utf8");
  expect(downloadedContent).toContain(report.content);
  expect(downloadedContent).toContain(`Content SHA-256: ${report.sha256}`);
  await page.screenshot({
    path: "test-results/customer-report.png",
    fullPage: true,
  });
});

test("An unauthenticated dashboard goes to sign-in", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem("lc_access_token");
  });
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
});
