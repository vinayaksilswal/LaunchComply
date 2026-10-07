import { request, type FullConfig } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

export default async function setup(config: FullConfig) {
  const baseURL = String(config.projects[0].use.baseURL);
  const api = await request.newContext({ baseURL });
  // Seeded local test identity, never used by hosted environments.
  const response = await api.post("/api/backend/auth/login", {
    data: { email: "admin@launchcomply.io", password: "Password123!" },
  });
  if (!response.ok()) throw new Error(`Local fixture login failed: HTTP ${response.status()}`);
  const account = await response.json();
  mkdirSync("test-results", { recursive: true });
  writeFileSync("test-results/local-auth.json", JSON.stringify({
    cookies: [],
    origins: [{
      origin: new URL(baseURL).origin,
      localStorage: [
        { name: "lc_access_token", value: account.access_token },
        { name: "lc_active_org_id", value: account.organization_id },
        { name: "launchcomply_token", value: account.access_token },
        { name: "launchcomply_user", value: JSON.stringify(account) },
      ],
    }],
  }));
  await api.dispose();
}
