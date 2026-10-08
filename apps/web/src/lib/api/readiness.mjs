const unavailableMessage = "The service is temporarily unavailable. Please try again shortly.";

/** Wait using read-only requests; never replay a signup or login submission. */
export async function waitForApiReady(apiBase, {
  timeoutMs = 90000,
  requestTimeoutMs = 10000,
  retryDelayMs = 2000,
} = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(requestTimeoutMs, deadline - Date.now()));
    let terminalFailure = false;
    try {
      const response = await fetch(`${apiBase}/health/ready`, {
        method: "GET", cache: "no-store", signal: controller.signal,
      });
      if (response.ok) {
        const payload = await response.json().catch(() => null);
        if (payload?.status === "READY" && payload?.database === "CONNECTED") return;
      } else if (![502, 503, 504].includes(response.status)) {
        terminalFailure = true;
      }
    } catch {
      // A cold or restarting service can fail before returning an HTTP response.
    } finally {
      clearTimeout(timer);
    }
    if (terminalFailure) throw new Error(unavailableMessage);
    const remaining = deadline - Date.now();
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, Math.min(retryDelayMs, remaining)));
  }
  throw new Error(unavailableMessage);
}
