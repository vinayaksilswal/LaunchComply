"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient, API_BASE_URL } from "@/lib/api";
import { waitForApiReady } from "@/lib/api/readiness.mjs";

export default function GitHubCallbackPage() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [installUrl, setInstallUrl] = useState<string | null>(null);
  const [needsAuthorization, setNeedsAuthorization] = useState(false);
  function authorizationDestination(value: string) {
    const url = new URL(value);
    if (url.origin !== "https://github.com" || url.pathname !== "/login/oauth/authorize") throw new Error("Unable to start GitHub authorization.");
    return url.href;
  }
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const query = new URLSearchParams(window.location.search);
    window.history.replaceState(null, "", window.location.pathname);
    if (query.get("error")) { setError("GitHub authorization was cancelled. You can reconnect from onboarding."); return; }
    if (!query.get("code") || !query.get("state")) { setNeedsAuthorization(true); return; }
    (async () => {
      try {
        await waitForApiReady(API_BASE_URL);
        const result = await apiClient<{ status: string; installation_url?: string }>("/source-control/github/complete", { method: "POST", body: JSON.stringify({ code: query.get("code"), state: query.get("state") }) });
        if (result.status === "CONNECTED") {
          const asset = sessionStorage.getItem("lc_github_return_asset");
          sessionStorage.removeItem("lc_github_return_asset");
          router.replace(asset && /^[a-f0-9-]{36}$/i.test(asset) ? `/dashboard/applications/${asset}?source=connected` : "/onboarding?github=connected");
        }
        else if (result.status === "INSTALLATION_REQUIRED" && result.installation_url) {
          const url = new URL(result.installation_url);
          if (url.origin !== "https://github.com" || !url.pathname.startsWith("/apps/")) throw new Error("Unable to open GitHub App installation.");
          setInstallUrl(url.href);
        } else throw new Error("Unable to confirm the GitHub connection. Please reconnect.");
      } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to connect GitHub."); }
    })();
  }, [router]);
  async function finishAuthorization() {
    setNeedsAuthorization(false);
    try {
      await waitForApiReady(API_BASE_URL);
      const result = await apiClient<{ authorization_url: string }>("/source-control/github/authorize", { method: "POST" });
      window.location.assign(authorizationDestination(result.authorization_url));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to connect GitHub."); }
  }
  return <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6"><div className="max-w-md w-full bg-white rounded-2xl border p-8 space-y-4">
    <h1 className="text-xl font-bold">Connect GitHub</h1>
    {error ? <p role="alert" className="text-rose-700">{error}</p> : installUrl ? <><p>Install the LaunchComply GitHub App and choose the repositories it can access.</p><a href={installUrl} className="block rounded-lg bg-slate-900 text-white text-center px-4 py-3">Choose repositories on GitHub</a></> : needsAuthorization ? <><p>Finish linking your GitHub account to your LaunchComply organization.</p><button onClick={finishAuthorization} className="w-full rounded-lg bg-slate-900 text-white px-4 py-3">Finish connecting GitHub</button></> : <p role="status">Verifying your GitHub connection…</p>}
    <Link href="/onboarding?github=connected" className="block text-sm text-cyan-700 underline">Return to onboarding</Link>
  </div></main>;
}
