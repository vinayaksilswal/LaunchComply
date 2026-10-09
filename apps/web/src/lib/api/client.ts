/**
 * LaunchComply Enterprise API Client
 * Robust, typed, and resilient HTTP client for all LaunchComply operations.
 */

// Only known service codes receive specific messages; raw server errors stay private.
const serviceMessages: Record<string, string> = {
  GITHUB_APP_NOT_CONFIGURED: "GitHub connection needs to be configured by the platform administrator. Contact workspace support to continue.",
  ARCHITECTURE_AI_NOT_CONFIGURED: "The architecture assistant is not enabled. Ask your platform administrator to configure it.",
  ARCHITECTURE_AI_MODEL_CONFIG: "The architecture model configuration needs attention. Ask your platform administrator to check the configured free models.",
  ARCHITECTURE_AI_AUTH_FAILED: "The AI provider could not authorize this request. Ask your platform administrator to check its backend credentials.",
  ARCHITECTURE_AI_UNAVAILABLE: "The configured models are unavailable or could not return a valid proposal. Your saved design is unchanged. Try again shortly.",
  ARCHITECTURE_AI_INVALID_PROPOSAL: "The assistant returned an incomplete proposal. Your saved design is unchanged. Please try again.",
  ARCHITECTURE_AI_TIMEOUT: "The architecture assistant took too long. Your saved design is unchanged. Please try again.",
  ARCHITECTURE_AI_RATE_LIMIT: "The free model allowance is currently exhausted or rate limited. Your design is unchanged. Try again later.",
  ARCHITECTURE_AI_FREE_ALLOWANCE_EXHAUSTED: "The AI provider's daily free allowance is exhausted. Your design is unchanged. Try again after the allowance resets.",
  ARCHITECTURE_AI_CREDIT_LIMIT: "The AI account has reached its allowance or credit limit. Ask your platform administrator to check the provider account.",
  ARCHITECTURE_AI_NO_ENDPOINT: "No endpoint is currently available for the configured models. Ask your platform administrator to review the model routing.",
  ARCHITECTURE_AI_PRIVACY_FILTER: "No configured model endpoint meets the business data privacy policy. Ask your platform administrator to select a compatible provider.",
  ARCHITECTURE_AI_CONTEXT_LIMIT: "The model cannot process this design's context size. Ask your platform administrator to review the model configuration.",
  ARCHITECTURE_AI_REQUEST_REJECTED: "The model provider rejected the request configuration. Ask your platform administrator to review the routing diagnostics.",
  ARCHITECTURE_AI_ACCESS_DENIED: "The provider denied access to the configured models. Your saved design is unchanged. Ask your platform administrator to review provider access and routing.",
  ARCHITECTURE_AI_POLICY_BLOCKED: "The provider's content or account policy blocked this request. Your saved design is unchanged. Ask your platform administrator to review the recorded policy outcome.",
};

export interface ApiErrorDetails {
  code: string;
  message: string;
  requestId?: string;
  details?: Record<string, any>;
  status: number;
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public requestId?: string;
  public details?: Record<string, any>;

  constructor(error: ApiErrorDetails) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.status = error.status;
    this.requestId = error.requestId;
    this.details = error.details;
  }
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  params?: Record<string, string | number | boolean | undefined>;
  organizationId?: string;
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "/api/backend";

/**
 * Get current authenticated access token
 */
export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("lc_access_token") ||
    sessionStorage.getItem("lc_access_token") ||
    null
  );
}

/**
 * Set current authenticated access token
 */
export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("lc_access_token", token);
  } else {
    localStorage.removeItem("lc_access_token");
    sessionStorage.removeItem("lc_access_token");
  }
}

/**
 * Get current organization ID context
 */
export function getActiveOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("lc_active_org_id") ||
    sessionStorage.getItem("lc_active_org_id") ||
    null
  );
}

/**
 * Set active organization ID context
 */
export function setActiveOrganizationId(orgId: string | null): void {
  if (typeof window === "undefined") return;
  if (orgId) {
    localStorage.setItem("lc_active_org_id", orgId);
  } else {
    localStorage.removeItem("lc_active_org_id");
  }
}

/**
 * Core resilient HTTP client
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    timeout = 15000,
    retries = options.method && options.method !== "GET" ? 0 : 2,
    params,
    organizationId,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  let url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  }

  const token = getAuthToken();
  const activeOrgId = organizationId || getActiveOrganizationId();

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeOrgId ? { "X-Organization-ID": activeOrgId } : {}),
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let attempt = 0;
  while (true) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: fetchOptions.signal || controller.signal,
      });

      clearTimeout(timer);
      const requestId =
        response.headers.get("x-request-id") ||
        response.headers.get("x-correlation-id") ||
        undefined;

      if (!response.ok) {
        let errorPayload: any = null;
        const errorText = await response.text();
        try {
          errorPayload = JSON.parse(errorText);
        } catch {
          // Gateways can return HTML. Do not expose it or read the consumed body again.
          errorPayload = null;
        }

        const code =
          errorPayload?.error?.code ||
          errorPayload?.code ||
          errorPayload?.detail?.code ||
          `HTTP_${response.status}`;
        const detail = errorPayload?.detail;
        const validationMessage = Array.isArray(detail)
          ? detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join("; ")
          : typeof detail === "string" ? detail : undefined;
        const message = response.status >= 500
          ? serviceMessages[code] || "The service is temporarily unavailable. Please try again shortly."
          :
          errorPayload?.error?.message ||
          validationMessage ||
          errorPayload?.message ||
          `Request failed with status ${response.status}`;

        // Global Event triggers for auth & boundary
        if (response.status === 401 && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("launchcomply:unauthorized", {
              detail: { url, message },
            })
          );
        } else if (response.status === 403 && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("launchcomply:forbidden", {
              detail: { url, code, message },
            })
          );
        }

        throw new ApiError({
          code,
          message,
          status: response.status,
            requestId: errorPayload?.detail?.request_id || requestId,
          details: errorPayload?.error?.details || errorPayload?.details,
        });
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (err: any) {
      clearTimeout(timer);

      // Handle Abort / Timeout
      if (err.name === "AbortError") {
        throw new ApiError({
          code: "REQUEST_TIMEOUT",
          message: `Request timed out after ${timeout}ms`,
          status: 408,
        });
      }

      // Safe GET Retry logic
      const isGet = !fetchOptions.method || fetchOptions.method === "GET";
      const isNetworkError = !(err instanceof ApiError);
      if (isGet && isNetworkError && attempt <= retries) {
        const backoffMs = Math.pow(2, attempt) * 250;
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }

      if (err instanceof ApiError) throw err;
      throw new ApiError({
        code: "NETWORK_ERROR",
        message: "Unable to reach the service. Please try again shortly.",
        status: 0,
      });
    }
  }
}
