import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const configUrl = new URL("../../next.config.mjs", import.meta.url).href;

function loadConfig(overrides = {}) {
  const env = { ...process.env };
  for (const name of ["VERCEL", "VERCEL_ENV", "BACKEND_URL"]) delete env[name];
  Object.assign(env, overrides);
  const source = `const { default: config } = await import(${JSON.stringify(configUrl)}); console.log(JSON.stringify(await config.rewrites()));`;
  return spawnSync(process.execPath, ["--input-type=module", "--eval", source], {
    env, encoding: "utf8", timeout: 10000,
  });
}

function assertRewrites(result, origin) {
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [
    { source: "/api/backend/:path*", destination: `${origin}/api/v1/:path*` },
    { source: "/api/v1/:path*", destination: `${origin}/api/v1/:path*` },
  ]);
}

test("production Vercel build uses the owner's configured Render API", () => {
  assertRewrites(loadConfig({ VERCEL: "1", VERCEL_ENV: "production", BACKEND_URL: "https://launchcomply.onrender.com" }), "https://launchcomply.onrender.com");
});

test("explicit backend override supports the eventual AWS move", () => {
  assertRewrites(loadConfig({ VERCEL: "1", BACKEND_URL: "https://api.example.test" }), "https://api.example.test");
});

test("local development keeps the local API destination", () => {
  assertRewrites(loadConfig(), "http://127.0.0.1:8000");
});

test("hosted builds without a configured API fail before generating rewrites", () => {
  const result = loadConfig({ VERCEL: "1", VERCEL_ENV: "preview" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Set BACKEND_URL/);
});

test("preview accepts an explicitly selected staging API", () => {
  assertRewrites(loadConfig({ VERCEL: "1", VERCEL_ENV: "preview", BACKEND_URL: "https://staging.example.test" }), "https://staging.example.test");
});

for (const origin of [
  "http://api.example.test", "https://localhost", "https://127.0.0.1", "https://[::1]",
  "https://api.example.test/api/v1", "https://user:pass@api.example.test",
  "https://api.example.test?token=test", "https://api.example.test#test",
]) {
  test(`Vercel rejects an unsafe backend origin: ${origin}`, () => {
    assert.notEqual(loadConfig({ VERCEL: "1", BACKEND_URL: origin }).status, 0);
  });
}
