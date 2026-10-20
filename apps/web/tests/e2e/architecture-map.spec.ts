import { test, expect } from "@playwright/test";
import { newBusiness, nativeDesignFixture } from "../workspace-fixture";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

test("saved design data exports canonical JSON and separates layout from infrastructure identity", async ({ page, request }) => {
  const { headers } = await newBusiness(page, request);
  const asset = await (await request.post("/api/backend/applications/", { headers, data: { name: "Canonical design workflow" } })).json();
  const workspace = `/api/backend/architecture/workspace/${asset.id}`;
  const initialized = await (await request.post(`${workspace}/initialize`, { headers })).json();
  const graph = { nodes: [{ id: "vpc", label: "Business network", service: "AWS::EC2::VPC", zone: "DATA", description: "Saved intent", x: 100, y: 100 }], edges: [] };
  const saved = await request.post(`${workspace}/save`, { headers, data: { expected_id: initialized.id, graph } });
  expect(saved.ok()).toBeTruthy();
  const configured = await request.post(`${workspace}/resource-configuration`, { headers, data: { expected_id: (await saved.json()).id,
    node_id: "vpc", configuration: { resource_type: "AWS::EC2::VPC", properties: { cidr: "10.10.0.0/16" } } } });
  expect(configured.ok()).toBeTruthy();
  const original = await configured.json();
  const canonical = await (await request.get(`/api/backend/architecture/designs/${asset.id}`, { headers })).json();
  await page.goto(`/dashboard/architecture?application=${asset.id}`);
  await page.mouse.move((page.viewportSize()?.width || 1280) - 24, 200);
  await page.getByRole("button", { name: "Services & sizing", exact: true }).click();
  await page.getByRole("button", { name: "Inspect saved design data", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Saved design data", exact: true });
  await expect(dialog.getByLabel("Infrastructure intent fingerprint")).toHaveText(canonical.fingerprints.semantic_hash);
  const downloading = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download design JSON", exact: true }).click();
  const downloaded = await downloading;
  const file = await downloaded.path();
  expect(file).toBeTruthy();
  const exported = JSON.parse(await readFile(file!, "utf8"));
  expect(exported.format).toBe("launchcomply-design");
  expect(exported.schema_version).toBe(2);
  expect(exported.revision_id).toBe(original.id);
  expect(exported.resources_by_id.vpc.configuration.properties.cidr).toBe("10.10.0.0/16");
  await dialog.getByRole("button", { name: "Close saved design data" }).click();
  const moved = { ...graph, nodes: [{ ...graph.nodes[0], x: 700, y: 500, label: "Renamed network" }] };
  const updated = await request.post(`${workspace}/save`, { headers, data: { expected_id: original.id, graph: moved } });
  expect(updated.ok()).toBeTruthy();
  await page.reload();
  await page.getByRole("button", { name: "Services & sizing", exact: true }).click();
  await page.getByRole("button", { name: "Inspect saved design data", exact: true }).click();
  await expect(dialog.getByLabel("Infrastructure intent fingerprint")).toHaveText(canonical.fingerprints.semantic_hash);
  await expect(dialog.getByLabel("Diagram layout fingerprint")).not.toHaveText(canonical.fingerprints.layout_hash);
  await dialog.getByRole("button", { name: "Close saved design data" }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  const history = page.getByRole("dialog", { name: "Saved architecture history" });
  await history.getByRole("button").filter({ has: page.locator("strong", { hasText: new RegExp(`^${original.version}$`) }) }).click();
  await history.getByRole("button", { name: "Inspect saved design data", exact: true }).click();
  await expect(dialog.getByText(/Historical version/)).toBeVisible();
  await expect(dialog.getByLabel("Diagram layout fingerprint")).toHaveText(canonical.fingerprints.layout_hash);
});

test("source refresh can be reviewed, discarded and applied without losing manual settings", async ({ page, request }) => {
  const { headers } = await newBusiness(page, request);
  // Minimal ZIP containing only package.json with a React dependency. No source/network mock.
  const buffer = Buffer.from("UEsDBBQAAAAAACtbUF2q/LNKHwAAAB8AAAAMAAAAcGFja2FnZS5qc29ueyJkZXBlbmRlbmNpZXMiOnsicmVhY3QiOiIxOSJ9fVBLAQIUABQAAAAAACtbUF2q/LNKHwAAAB8AAAAMAAAAAAAAAAAAAACAAQAAAABwYWNrYWdlLmpzb25QSwUGAAAAAAEAAQA6AAAASQAAAAAA", "base64");
  const uploaded = await request.post("/api/backend/onboarding/upload", { headers, multipart: {
    name: "Reviewed source workflow", request_id: randomUUID(), file: { name: "source.zip", mimeType: "application/zip", buffer },
  } });
  expect(uploaded.ok()).toBeTruthy();
  const asset = await uploaded.json();
  const path = `/api/backend/architecture/workspace/${asset.id}`;
  const initial = (await (await request.get(path, { headers })).json()).architecture;
  const graph = { ...initial.graph, nodes: [...initial.graph.nodes, { id: "manual_bucket", label: "Keep private storage", service: "AWS::S3::Bucket", zone: "DATA", description: "Manual choice", x: 1234, y: 678 }] };
  const saved = await request.post(`${path}/save`, { headers, data: { expected_id: initial.id, graph } });
  expect(saved.ok()).toBeTruthy();
  const configured = await request.post(`${path}/resource-configuration`, { headers, data: { expected_id: (await saved.json()).id,
    node_id: "manual_bucket", configuration: { resource_type: "AWS::S3::Bucket", properties: { versioning: true } } } });
  expect(configured.ok()).toBeTruthy();
  const original = await configured.json();
  await page.goto(`/dashboard/architecture?application=${asset.id}`);
  await page.mouse.move((page.viewportSize()?.width || 1280) - 24, 200);
  await page.getByRole("button", { name: "Refresh code findings", exact: true }).click();
  await expect(page.getByText("Review source update", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Discard proposal · keep saved design", exact: true }).click();
  await expect(page.getByText("Review source update", { exact: true })).not.toBeVisible();
  expect((await (await request.get(path, { headers })).json()).architecture.id).toBe(original.id);
  await page.getByRole("button", { name: "Refresh code findings", exact: true }).click();
  await expect(page.getByText("Review source update", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Apply to draft", exact: true }).click();
  await expect(page.getByText("Review source update", { exact: true })).not.toBeVisible();
  const current = (await (await request.get(path, { headers })).json()).architecture;
  expect(current.id).not.toBe(original.id);
  expect(current.graph).toEqual(original.graph);
  expect(current.resource_configurations).toEqual(original.resource_configurations);
  const historical = await (await request.get(`${path}/versions/${original.id}`, { headers })).json();
  expect(historical.graph).toEqual(original.graph);
});

test("design approval survives reload and restoring history requires a new approval", async ({ page, request }) => {
  const { headers } = await newBusiness(page, request);
  const created = await request.post("/api/backend/applications/", { headers, data: { name: "Version activity workflow" } });
  expect(created.ok()).toBeTruthy();
  const asset = await created.json();
  const path = `/api/backend/architecture/workspace/${asset.id}`;
  const initialized = await (await request.post(`${path}/initialize`, { headers })).json();
  const saved = await request.post(`${path}/save`, { headers, data: { expected_id: initialized.id,
    graph: { nodes: [{ id: "logs", label: "Retained logs", service: "Amazon CloudWatch", zone: "SUPPORT", description: "Manual design", x: 120, y: 180 }], edges: [] } } });
  expect(saved.ok()).toBeTruthy();
  const design = await saved.json();
  const planned = await request.post(`${path}/requirements`, { headers, data: { expected_id: design.id,
    region: "ap-south-1", availability: "MULTI_AZ", peak_requests_per_minute: 500, concurrent_users: 100 } });
  expect(planned.ok()).toBeTruthy();
  const original = await planned.json();
  await page.goto(`/dashboard/architecture?application=${asset.id}`);
  await page.mouse.move((page.viewportSize()?.width || 1280) - 24, 200);
  await page.getByRole("button", { name: "Services & sizing", exact: true }).click();
  await page.getByRole("button", { name: "Review design approval", exact: true }).click();
  await page.getByRole("button", { name: "Confirm design approval", exact: true }).click();
  await expect(page.getByText(new RegExp(`Design ${original.version} approved`))).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Services & sizing", exact: true }).click();
  await expect(page.getByText(new RegExp(`Design ${original.version} approved`))).toBeVisible();
  const edited = await request.post(`${path}/save`, { headers, data: { expected_id: original.id,
    graph: { ...original.graph, nodes: original.graph.nodes.map((node: { id: string }) => ({ ...node, label: "Changed logs" })) } } });
  expect(edited.ok()).toBeTruthy();
  await page.reload();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await page.getByRole("button").filter({ has: page.locator("strong", { hasText: new RegExp(`^${original.version}$`) }) }).click();
  await page.getByRole("button", { name: "Restore this architecture", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Saved architecture history" })).not.toBeVisible();
  const current = await (await request.get(path, { headers })).json();
  expect(current.architecture.graph).toEqual(original.graph);
  expect(current.architecture.design_approval).toBeUndefined();
  const historical = await (await request.get(`${path}/versions/${original.id}`, { headers })).json();
  expect(historical.design_approval.architecture_id).toBe(original.id);
});

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


test("native saved designs remain visible, exportable and protected in the real workspace", async ({ page, request }) => {
  const { headers } = await newBusiness(page, request);
  const asset = await (await request.post("/api/backend/applications/", { headers, data: { name: "Native history business" } })).json();
  const workspace = `/api/backend/architecture/workspace/${asset.id}`;
  const initial = await (await request.post(`${workspace}/initialize`, { headers })).json();
  const graph = { nodes: [{ id: "vpc", label: "Original network", service: "AWS::EC2::VPC", zone: "DATA", description: "Saved design", x: 120, y: 120 }], edges: [] };
  const saved = await request.post(`${workspace}/save`, { headers, data: { expected_id: initial.id, graph } });
  expect(saved.ok()).toBeTruthy();
  const original = await saved.json();
  await nativeDesignFixture(original.id);
  const currentResponse = await request.get(workspace, { headers });
  expect(currentResponse.ok()).toBeTruthy();
  const current = (await currentResponse.json()).architecture;
  expect(current.id).not.toBe(original.id);
  expect(current.read_only).toBe(true);
  await page.goto(`/dashboard/architecture?application=${asset.id}`);
  await page.mouse.move((page.viewportSize()?.width || 1280) - 24, 200);
  await expect(page.getByText(/This design uses the new saved format/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Add component", exact: true })).toBeDisabled();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export draft JSON", exact: true }).click();
  const download = await downloading;
  const content = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(content.format).toBe("launchcomply-design");
  expect(content.revision_id).toBe(current.id);
  expect(content.view_state.node_positions.vpc.pinned).toBe(true);
  expect(content.extensions["customer.notes"].version).toBe(7);
  await page.getByRole("button", { name: "History", exact: true }).click();
  const history = page.getByRole("dialog", { name: "Saved architecture history" });
  await expect(history.getByRole("button", { name: "Restore this architecture", exact: true })).toBeDisabled();
  await history.getByRole("button").filter({ has: page.locator("strong", { hasText: new RegExp(`^${original.version}$`) }) }).click();
  await expect(history.getByRole("heading", { name: original.version, exact: true })).toBeVisible();
  await history.getByRole("button", { name: "Inspect saved design data", exact: true }).click();
  const inspector = page.getByRole("dialog", { name: "Saved design data", exact: true });
  await expect(inspector.getByText(/Historical version/)).toBeVisible();
  await inspector.getByRole("button", { name: "Close saved design data" }).click();
  await history.getByRole("button", { name: "Close architecture history" }).click();
  await page.goto("/dashboard");
  await expect(page.getByText("New-format design · Read only. Open the architecture to inspect or export it.")).toBeVisible();
  const unchanged = (await (await request.get(`/api/backend/architecture/designs/${asset.id}`, { headers })).json()).design;
  expect(unchanged).toEqual(content);
});


test("unsupported future heads offer history without replacing the current design", async ({ page, request }) => {
  const { headers } = await newBusiness(page, request);
  const asset = await (await request.post("/api/backend/applications/", { headers, data: { name: "Future version business" } })).json();
  const workspace = `/api/backend/architecture/workspace/${asset.id}`;
  const initial = await (await request.post(`${workspace}/initialize`, { headers })).json();
  const graph = { nodes: [{ id: "vpc", label: "Original safe network", service: "AWS::EC2::VPC", zone: "DATA", description: "Preserve history", x: 120, y: 120 }], edges: [] };
  const saved = await request.post(`${workspace}/save`, { headers, data: { expected_id: initial.id, graph } });
  expect(saved.ok()).toBeTruthy();
  const original = await saved.json();
  await nativeDesignFixture(original.id, true);
  await page.goto(`/dashboard/architecture?application=${asset.id}`);
  await expect(page.getByRole("alert").filter({ hasText: "This design needs a compatible reader" })).toBeVisible();
  await page.getByRole("button", { name: "History", exact: true }).click();
  const history = page.getByRole("dialog", { name: "Saved architecture history" });
  await expect(history.getByText(/Preview unavailable/)).toBeVisible();
  await history.getByRole("button").filter({ has: page.locator("strong", { hasText: new RegExp(`^${original.version}$`) }) }).click();
  await expect(history.getByRole("heading", { name: original.version, exact: true })).toBeVisible();
  await expect(history.getByRole("button", { name: "Restore this architecture", exact: true })).toBeDisabled();
  expect((await request.get(workspace, { headers })).status()).toBe(409);
  const unchanged = (await (await request.get(`${workspace}/versions/${original.id}`, { headers })).json()).graph;
  expect(unchanged).toEqual(graph);
});
