import { test, expect } from "@playwright/test";
import { newBusiness } from "../workspace-fixture";

test("dashboard maps a real saved design and opens its architecture", async ({ page, request }) => {
  const { headers } = await newBusiness(page, request);
  const create = await request.post("/api/backend/applications/", { headers, data: { name: "India SaaS" } });
  expect(create.ok()).toBeTruthy();
  const asset = await create.json();
  const path = `/api/backend/architecture/workspace/${asset.id}`;
  const initialized = await request.post(`${path}/initialize`, { headers });
  expect(initialized.ok()).toBeTruthy();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Architecture locations" })).toBeVisible();
  await page.getByRole("button", { name: "1 without a mapped region" }).click();
  await expect(page.getByRole("heading", { name: "India SaaS", exact: true })).toBeVisible();
  const saved = await initialized.json();
  const planned = await request.post(`${path}/requirements`, { headers, data: { expected_id: saved.id,
    region: "ap-south-1", availability: "MULTI_AZ", peak_requests_per_minute: 500, concurrent_users: 100 } });
  expect(planned.ok()).toBeTruthy();
  await page.reload();
  await expect(page.getByRole("button", { name: "Mumbai: 1 saved designs" })).toBeVisible();
  await expect(page.getByText(/Multiple availability zones ·/)).toBeVisible();
  await page.getByRole("link", { name: "View architecture", exact: false }).click();
  await expect(page).toHaveURL(new RegExp(`architecture\\?application=${asset.id}`));
  await expect(page.getByRole("heading", { name: "Business architecture", exact: true })).toBeVisible();
});

test("map regions, zoom and deployment links work for a multi-region design", async ({ page, request }) => {
  const { headers } = await newBusiness(page, request);
  const create = await request.post("/api/backend/applications/", { headers, data: { name: "India production design" } });
  expect(create.ok()).toBeTruthy();
  const asset = await create.json();
  const path = `/api/backend/architecture/workspace/${asset.id}`;
  const initialized = await request.post(`${path}/initialize`, { headers });
  expect(initialized.ok()).toBeTruthy();
  const saved = await initialized.json();
  const graph = { nodes: [
    { id: "web", label: "Frontend", service: "ECS Fargate", zone: "APPLICATION", description: "Synthetic browser fixture", x: 0, y: 0 },
    { id: "api", label: "Private API", service: "ECS Fargate", zone: "APPLICATION", description: "Synthetic browser fixture", x: 300, y: 0 },
  ], edges: [{ source: "web", target: "api", label: "Planned HTTPS" }] };
  const edited = await request.post(`${path}/save`, { headers, data: { expected_id: saved.id, graph } });
  expect(edited.ok()).toBeTruthy();
  const design = await edited.json();
  const planned = await request.post(`${path}/requirements`, { headers, data: { expected_id: design.id,
    region: "ap-south-1", secondary_region: "ap-south-2", availability: "MULTI_REGION", peak_requests_per_minute: 500, concurrent_users: 100 } });
  expect(planned.ok()).toBeTruthy();
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Hyderabad: 1 saved designs" }).click();
  await expect(page.getByLabel("Map region")).toHaveValue("ap-south-2");
  await expect(page.getByText("Multiple regions · 2 components · 1 designed connections")).toBeVisible();
  await page.getByRole("button", { name: "Zoom in map" }).click();
  await page.getByRole("button", { name: "Reset map view" }).click();
  await expect(page.getByRole("button", { name: "Zoom out map" })).toBeDisabled();
  await expect(page.locator(`a[href="/dashboard/deployments?application=${asset.id}"]`)).toBeVisible();
  await page.getByText("Inspect designed connections").click();
  await expect(page.getByText("Frontend → Private API")).toBeVisible();
  await page.screenshot({ path: `test-results/architecture-map-${test.info().project.name}.png`, fullPage: true });
});
