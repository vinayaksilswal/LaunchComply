import test from "node:test";
import assert from "node:assert/strict";
import { safeDestination } from "../../src/lib/auth-destination.mjs";

test("a service destination survives authentication", () => {
  assert.equal(safeDestination("/dashboard/vapt"), "/dashboard/vapt");
  assert.equal(
    safeDestination("/dashboard/architecture?application=123"),
    "/dashboard/architecture?application=123",
  );
  assert.equal(safeDestination("/onboarding"), "/onboarding");
  assert.equal(safeDestination(null, "/onboarding"), "/onboarding");
});

test("authentication cannot redirect to external, malformed or privileged destinations", () => {
  for (const value of [
    "https://evil.example/dashboard",
    "//evil.example/dashboard",
    "/\\evil.example/dashboard",
    "/%5cevil.example/dashboard",
    "/dashboard/%0a",
    "/dashboard/../../platform-admin",
    "/platform-admin",
    "/signup",
    "/%",
    "javascript:alert(1)",
  ]) {
    assert.equal(safeDestination(value), "/dashboard", value);
  }
});
