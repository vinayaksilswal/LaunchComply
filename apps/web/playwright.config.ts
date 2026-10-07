import { defineConfig, devices } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)) {
  throw new Error("This fixture suite writes test data and may only target a local isolated server.");
}
const apiDirectory = resolve(__dirname, "../api");
const testDirectory = resolve(apiDirectory, ".test_tmp");
mkdirSync(testDirectory, { recursive: true });
const testDatabase = resolve(testDirectory, `playwright-${randomUUID()}.db`).replaceAll("\\", "/");
const python = resolve(apiDirectory, process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/setup.ts",
  use: {
    baseURL,
    storageState: "./test-results/local-auth.json",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: [{
    command: `"${python}" -m uvicorn app.main:app --host 127.0.0.1 --port 8000`,
    cwd: apiDirectory,
    env: { ENVIRONMENT: "test", DATABASE_URL: `sqlite+aiosqlite:///${testDatabase}`, DEMO_MODE: "true", DEBUG: "false" },
    url: "http://127.0.0.1:8000/health/ready",
    reuseExistingServer: false,
    timeout: 120000,
  }, {
    command: "npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120000,
  }],
});
