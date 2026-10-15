import { test, expect } from "@playwright/test";
import { newBusiness } from "../workspace-fixture";
import { randomUUID } from "node:crypto";

test("removing a source preserves saved history and warns in the architecture workspace", async ({ page, request }) => {
  const { headers } = await newBusiness(page, request);
  // Isolated test server's explicit fixture adapter; no live GitHub authorization claim.
  const connected = await request.post("/api/backend/source-control/github/callback", { headers,
    data: { installation_id: `history-${randomUUID()}` } });
  expect(connected.ok()).toBeTruthy();
  const repositories = await (await request.get("/api/backend/source-control/repositories", { headers })).json();
  const created = await request.post("/api/backend/applications/", { headers, data: { name: "Preserved source design" } });
  expect(created.ok()).toBeTruthy();
  const asset = await created.json();
  const path = `/api/backend/architecture/workspace/${asset.id}`;
  const linked = await request.put(`/api/backend/applications/${asset.id}/repositories`, { headers,
    data: { repository_ids: [repositories[0].id], expected_repository_ids: [] } });
  expect(linked.ok()).toBeTruthy();
  const initialized = await request.post(`${path}/initialize`, { headers });
  expect(initialized.ok()).toBeTruthy();
  const draft = await initialized.json();
  const saved = await request.post(`${path}/save`, { headers, data: { expected_id: draft.id,
    graph: { nodes: [{ id: "manual", label: "Keep this component", service: "Amazon CloudWatch", zone: "SUPPORT", description: "Manual", x: 321, y: 456 }], edges: [] } } });
  expect(saved.ok()).toBeTruthy();
  const original = await saved.json();
  await page.goto(`/dashboard/applications/${asset.id}`);
  // A fresh Chromium cursor starts over the hover-expanding sidebar. Leave it
  // as a user would before interacting with content beneath the overlay.
  await page.mouse.move((page.viewportSize()?.width || 1280) - 24, 200);
  if ((page.viewportSize()?.width || 1280) >= 1024) {
    await expect(page.getByRole("complementary", { name: "Workspace navigation" })).toHaveCSS("width", "64px");
  }
  await page.getByRole("button", { name: "Source code", exact: true }).click();
  await page.getByRole("button", { name: `Remove repository ${repositories[0].full_name}`, exact: true }).click();
  await expect(page.getByText("No repositories linked. Add your frontend and backend repositories to start.")).toBeVisible();
  await page.getByRole("link", { name: "Open business architecture", exact: false }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Repository links changed" })).toBeVisible();
  const current = await (await request.get(path, { headers })).json();
  expect(current.architecture.source_changed).toBe(true);
  expect(current.architecture.graph).toEqual(original.graph);
  const historical = await (await request.get(`${path}/versions/${original.id}`, { headers })).json();
  expect(historical.graph).toEqual(original.graph);
  expect(historical.source_changed).not.toBe(true);
});

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
