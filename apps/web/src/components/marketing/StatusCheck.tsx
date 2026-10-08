"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, RefreshCw } from "lucide-react";

export function StatusCheck() {
  const [state, setState] = useState<"checking" | "ready" | "unavailable">(
    "checking",
  );
  const [checkedAt, setCheckedAt] = useState<string>();
  const check = useCallback(async (signal?: AbortSignal) => {
    setState("checking");
    try {
      const response = await fetch("/api/backend/health/ready", {
        cache: "no-store",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
          : AbortSignal.timeout(30000),
      });
      const result = response.ok ? await response.json() : null;
      if (signal?.aborted) return;
      setState(
        result?.status === "READY" && result?.database === "CONNECTED"
          ? "ready"
          : "unavailable",
      );
      setCheckedAt(new Date().toLocaleString());
    } catch {
      if (signal?.aborted) return;
      setState("unavailable");
      setCheckedAt(new Date().toLocaleString());
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void check(controller.signal);
    return () => controller.abort();
  }, [check]);

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-6 py-16">
      <div>
        <p className="mb-2 text-sm font-medium text-blue-600">
          Platform status
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Workspace availability
        </h1>
        <p className="mt-3 text-slate-600">
          A current check of the API and its database connection.
        </p>
      </div>
      <section
        className="rounded-2xl border border-slate-200 p-6"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="font-semibold">API and database</h2>
              <p
                className={`mt-1 text-sm ${state === "ready" ? "text-emerald-700" : "text-slate-600"}`}
              >
                {state === "checking"
                  ? "Checking availability..."
                  : state === "ready"
                    ? "Ready to serve requests"
                    : "Availability could not be confirmed"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void check()}
            disabled={state === "checking"}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Check again
          </button>
        </div>
        {checkedAt && (
          <p className="mt-5 text-xs text-slate-500">
            Last checked: {checkedAt} (your local time)
          </p>
        )}
      </section>
      <p className="text-sm leading-6 text-slate-500">
        This check does not measure historical uptime or the health of customer
        applications. View your connected account records and service requests
        in your workspace.
      </p>
    </section>
  );
}
