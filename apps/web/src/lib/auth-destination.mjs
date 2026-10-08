export function safeDestination(value, fallback = "/dashboard") {
  if (typeof value !== "string" || /[\\\u0000-\u001f]/.test(value))
    return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (
      /[\\\u0000-\u001f]/.test(decoded) ||
      !decoded.startsWith("/") ||
      decoded.startsWith("//")
    )
      return fallback;
    const url = new URL(value, "https://launchcomply.invalid");
    if (url.origin !== "https://launchcomply.invalid") return fallback;
    if (
      url.pathname === "/dashboard" ||
      url.pathname.startsWith("/dashboard/") ||
      url.pathname === "/onboarding"
    ) {
      return url.pathname + url.search;
    }
  } catch {
    /* A malformed return path goes to the default workspace. */
  }
  return fallback;
}
