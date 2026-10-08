import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { waitForApiReady } from "../../src/lib/api/readiness.mjs";

afterEach(() => mock.restoreAll());
const ready = () => Response.json({ status: "READY", database: "CONNECTED" });

test("cold gateway responses are retried as GETs until the database is ready", async () => {
  const replies = [new Response("<html>502</html>", { status: 502 }), Response.json({ status: "NOT_READY" }, { status: 503 }), ready()];
  const fetchMock = mock.method(globalThis, "fetch", async () => replies.shift());
  await waitForApiReady("/api/backend", { retryDelayMs: 1 });
  assert.equal(fetchMock.mock.callCount(), 3);
  for (const call of fetchMock.mock.calls) {
    assert.equal(call.arguments[0], "/api/backend/health/ready");
    assert.equal(call.arguments[1].method, "GET");
    assert.equal(call.arguments[1].cache, "no-store");
    assert.equal(call.arguments[1].body, undefined);
  }
});

test("HTML loading pages and network interruptions do not count as ready", async () => {
  let count = 0;
  mock.method(globalThis, "fetch", async () => {
    if (++count === 1) throw new TypeError("connection failed");
    if (count === 2) return new Response("<html>Starting</html>");
    return ready();
  });
  await waitForApiReady("https://api.example.test/api/v1", { retryDelayMs: 1 });
  assert.equal(count, 3);
});

test("a permanent routing error fails without repeatedly polling", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => new Response("Not found", { status: 404 }));
  await assert.rejects(waitForApiReady("/api/backend"), /service is temporarily unavailable/);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("unavailable database has a bounded wait", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ status: "READY", database: "UNAVAILABLE" }));
  await assert.rejects(waitForApiReady("/api/backend", { timeoutMs: 40, retryDelayMs: 5 }), /service is temporarily unavailable/);
});

test("each stalled read request is aborted and overall wait remains bounded", async () => {
  let aborted = 0;
  mock.method(globalThis, "fetch", (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener("abort", () => { aborted++; reject(new DOMException("Aborted", "AbortError")); });
  }));
  await assert.rejects(waitForApiReady("/api/backend", { timeoutMs: 60, requestTimeoutMs: 10, retryDelayMs: 1 }), /service is temporarily unavailable/);
  assert.ok(aborted > 0);
});
