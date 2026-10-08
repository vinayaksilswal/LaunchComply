import { test, expect } from "@playwright/test";
import { PUBLIC_NAV } from "../../src/lib/public-site";
import { newBusiness } from "../workspace-fixture";

test.use({ storageState: { cookies: [], origins: [] } });

test("Every public navigation destination has its own useful page", async ({
  page,
  request,
}, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "From localhostto real business.",
  );
  if ((page.viewportSize()?.width || 1280) < 1280) {
    await page.getByRole("button", { name: "Open website menu" }).click();
    await expect(
      page.getByRole("dialog", { name: "Website navigation" }),
    ).toBeVisible();
  }
  const nav = page.getByRole("navigation", {
    name: /^(Platform navigation|Mobile platform navigation)$/,
  });
  for (const item of PUBLIC_NAV) {
    await expect(
      nav.getByRole("link", { name: item.label, exact: true }),
    ).toHaveAttribute("href", item.href);
  }
  const menu = page.getByRole("button", { name: "Close website menu" });
  if (await menu.isVisible()) await menu.click();
  await page.screenshot({
    path: `test-results/website-home-${info.project.name}.png`,
    fullPage: true,
  });
  const paths = [
    "/",
    ...PUBLIC_NAV.map((item) => item.href),
    "/services/cloud-operations",
    "/docs",
    "/about",
    "/contact",
    "/status",
  ];
  const links = new Set<string>();
  for (const path of paths) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
    await expect(page.getByRole("main")).not.toContainText("99.98%");
    await expect(page.getByRole("main")).not.toContainText("AcmeCloud");
    for (const href of await page
      .locator('a[href^="/"]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("href")!),
      ))
      links.add(href);
  }
  for (const href of links) {
    const response = await request.get(href);
    expect(response.status(), href).toBeLessThan(400);
  }
});

test("Public guides, metadata and missing pages are valid", async ({
  page,
  request,
}) => {
  for (const slug of [
    "getting-started",
    "github",
    "architecture",
    "service-requests",
    "reports",
    "business-access",
  ]) {
    await page.goto(`/docs/${slug}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page).toHaveTitle(/LaunchComply guides/);
    await expect(
      page
        .getByRole("navigation", { name: "Guides" })
        .locator('[aria-current="page"]'),
    ).toHaveCount(1);
  }
  expect((await request.get("/docs/not-a-guide")).status()).toBe(404);
  expect((await request.get("/docs/toString")).status()).toBe(404);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("/deployment");
  expect(await sitemap.text()).not.toContain("/platform-admin");
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /dashboard",
  );
});

test("A visitor can sign in from a service page and reach that service", async ({
  page,
}) => {
  await page.goto("/vapt");
  await page
    .getByRole("link", { name: "Apply for an assessment", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/signup\?next=%2Fdashboard%2Fvapt$/);
  await page.getByRole("link", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await page.getByLabel("Email", { exact: true }).fill("demo@launchcomply.io");
  await page.getByLabel("Password", { exact: true }).fill("Password123!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard\/vapt$/);
  await expect(
    page.getByRole("heading", { name: "Security assessments", exact: true }),
  ).toBeVisible();
});

test("A new visitor creates an account and reaches the selected service", async ({
  page,
}) => {
  await page.goto("/deployment");
  await page
    .getByRole("link", { name: "Request deployment help", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Full name", { exact: true })
    .fill("New Business Owner");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`public-${crypto.randomUUID()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("PublicJourney123!");
  await page
    .getByLabel("Business name", { exact: true })
    .fill("New Journey Business");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await expect(page).toHaveURL(/dashboard\/deployments$/);
  await expect(
    page.getByRole("button", { name: "Help me deploy", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Help me deploy", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submit request", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Request submitted", exact: true }),
  ).toBeVisible();
});

test("Request dialogs contain keyboard focus and restore it on Escape", async ({
  page,
  request,
}) => {
  await newBusiness(page, request);
  await page.goto("/dashboard/vapt");
  const trigger = page.getByRole("button", {
    name: "Apply for assessment",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Apply for assessment",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        document
          .querySelector("dialog[open]")
          ?.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("An existing user accepts a team invitation in the correct business", async ({
  page,
  request,
}) => {
  const suffix = crypto.randomUUID();
  const password = "InviteJourney123!";
  const businessName = `Inviting Business ${suffix.slice(0, 8)}`;
  const register = async (email: string, name: string) => {
    const response = await request.post("/api/backend/auth/register", {
      data: {
        email,
        password,
        full_name: "Invited User",
        organization_name: name,
      },
    });
    expect(response.ok()).toBe(true);
    return response.json();
  };
  const owner = await register(`inviter-${suffix}@example.com`, businessName);
  const email = `invitee-${suffix}@example.com`;
  await register(email, `Existing Business ${suffix.slice(0, 8)}`);
  const invitationResponse = await request.post(
    "/api/backend/commercial/invitations",
    {
      headers: {
        Authorization: `Bearer ${owner.access_token}`,
        "X-Organization-ID": owner.organization_id,
      },
      data: { email, role: "DEVELOPER" },
    },
  );
  expect(invitationResponse.ok()).toBe(true);
  const invitation = await invitationResponse.json();
  // A different signed-in account cannot consume this invitation.
  const wrongRecipient = await request.post(
    "/api/backend/commercial/invitations/accept",
    {
      headers: { Authorization: `Bearer ${owner.access_token}` },
      data: { token: invitation.invite_token },
    },
  );
  expect(wrongRecipient.status()).toBe(400);
  await page.goto(invitation.invite_link);
  await page.getByRole("link", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/login\?invite_token=/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Welcome, Invited", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("lc_active_org_id")),
  ).toBe(owner.organization_id);
  if ((page.viewportSize()?.width || 1280) < 1024)
    await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(
    page
      .getByText(businessName, { exact: true })
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Help me deploy", exact: true }).first(),
  ).toBeDisabled();
});
