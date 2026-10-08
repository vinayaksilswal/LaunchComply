import { test, expect } from "@playwright/test";
import { newBusiness } from "../workspace-fixture";

test("White architecture diagram supports review, edits and the assistant panel", async ({ page, request }) => {
  await newBusiness(page, request);
  const graph = { nodes: [
    { id: "edge", label: "HTTPS entry point", service: "CloudFront / ALB", zone: "EDGE", description: "Local UI fixture proposal", x: 70, y: 110 },
    { id: "api", label: "Application API", service: "ECS Fargate", zone: "APPLICATION", description: "Local UI fixture proposal", x: 420, y: 110 },
    { id: "postgres", label: "Relational database", service: "RDS PostgreSQL", zone: "DATA", description: "Local UI fixture proposal", x: 790, y: 110 },
  ], edges: [{ source: "edge", target: "api", label: "Proposed API traffic" }, { source: "api", target: "postgres", label: "Inferred dependency" }] };
  // Provider fixture for visual/component testing only. Backend tests separately verify actual persistence and isolation.
  let draft = { id: "fixture-v1", version: "v1", graph, created_at: new Date().toISOString(), messages: [], proposal: null,
    evidence: { repository: "local-fixture/app", branch: "main", commit: "a".repeat(40), scope: "Local test dependency evidence", files: [], components: [] } };
  await page.route("**/api/backend/applications/", route => route.fulfill({ json: [{ id: "fixture-app", name: "Local architecture test app" }] }));
  await page.route("**/api/backend/architecture/workspace/fixture-app", route => route.fulfill({ json: {
    application_id: "fixture-app", application_name: "Local architecture test app", architecture: draft, capabilities: { repository_analysis: true, ai_chat: true },
  } }));
  await page.route("**/api/backend/architecture/workspace/fixture-app/save", async route => {
    const payload = route.request().postDataJSON();
    expect(payload.expected_id).toBe("fixture-v1");
    expect(payload.graph.nodes[1].label).toBe("Reviewed API");
    draft = { ...draft, id: "fixture-v2", version: "v2", graph: payload.graph };
    await route.fulfill({ json: draft });
  });
  await page.goto("/dashboard/architecture");
  await expect(page.getByRole("heading", { name: "Architecture workspace" })).toBeVisible();
  await expect(page.getByText("v1 · Draft, not deployed", { exact: true })).toBeVisible();
  await page.getByText("Application API", { exact: true }).click();
  await page.getByLabel("Component name", { exact: true }).fill("Reviewed API");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("v2 · Draft, not deployed", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Message architecture assistant", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/architecture-editor.png", fullPage: true });
});
