import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, mock, test } from "node:test";
import ts from "typescript";

// Exercise the browser client itself without a browser or application fixtures.
const source = readFileSync(new URL("../../src/lib/api/client.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } });
const { apiClient, ApiError } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString("base64")}`);
afterEach(() => mock.restoreAll());

test("HTML 502 is a service error and account creation is never replayed", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => new Response("<html>Gateway failed</html>", { status: 502 }));
  await assert.rejects(apiClient("/auth/register", { method: "POST", body: "{}" }), error => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 502);
    assert.match(error.message, /service is temporarily unavailable/);
    assert.doesNotMatch(error.message, /html|inputs|Body/i);
    return true;
  });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("validation details are readable strings rather than objects", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ detail: [{ msg: "Field required", input: "sensitive" }] }, { status: 422 }));
  await assert.rejects(apiClient("/auth/register", { method: "POST" }), error => {
    assert.equal(error.status, 422);
    assert.equal(error.message, "Field required");
    return true;
  });
});

test("network failure after a signup submission is not automatically retried", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(apiClient("/auth/register", { method: "POST", body: "{}" }), error => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.code, "NETWORK_ERROR");
    return true;
  });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("duplicate email errors remain actionable", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ detail: "A user with this email address already exists" }, { status: 400 }));
  await assert.rejects(apiClient("/auth/register", { method: "POST" }), /email address already exists/);
});
