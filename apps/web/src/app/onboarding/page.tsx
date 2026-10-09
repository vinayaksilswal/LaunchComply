"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, FileArchive, Github, Loader2, ShieldCheck, Upload, X } from "lucide-react";
import { apiClient, API_BASE_URL, getActiveOrganizationId } from "@/lib/api";
import { RepositoryPicker } from "@/components/workspace/RepositoryPicker";
import { waitForApiReady } from "@/lib/api/readiness.mjs";

interface Repository { id: string; full_name: string; default_branch: string; visibility: string; archived: boolean; }
const primary = "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50";
const maximumZipSize = 3 * 1024 * 1024;

export default function OnboardingPage() {
  const router = useRouter();
  const [source, setSource] = useState<"github" | "upload">("github");
  const [appName, setAppName] = useState("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [busy, setBusy] = useState<"connect" | "create" | null>(null);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("github") !== "connected") return;
    try {
      const pending = JSON.parse(sessionStorage.getItem("lc_onboarding_pending") || "{}");
      if (typeof pending.name === "string") setAppName(pending.name);
      window.history.replaceState(null, "", "/onboarding");
    } catch { setError("Please enter your application name again."); }
  }, []);
  useEffect(() => {
    let active = true;
    setLoadingRepos(true); setRepoError(null);
    (async () => {
      try {
        await waitForApiReady(API_BASE_URL);
        const repos = await apiClient<Repository[]>("/source-control/repositories");
        if (active) setRepositories(repos.filter(repo => !repo.archived));
      } catch (failure) { if (active) setRepoError(failure instanceof Error ? failure.message : "Unable to load repositories."); }
      finally { if (active) setLoadingRepos(false); }
    })();
    return () => { active = false; };
  }, [reload]);
  async function connectGitHub() {
    setBusy("connect"); setError(null);
    try {
      sessionStorage.removeItem("lc_github_return_asset");
      sessionStorage.setItem("lc_onboarding_pending", JSON.stringify({ name: appName }));
      await waitForApiReady(API_BASE_URL);
      const result = await apiClient<{ authorization_url: string }>("/source-control/github/authorize", { method: "POST" });
      const destination = new URL(result.authorization_url);
      if (destination.origin !== "https://github.com" || destination.pathname !== "/login/oauth/authorize") throw new Error("Unable to start GitHub authorization.");
      window.location.assign(destination.href);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to connect GitHub."); setBusy(null); }
  }
  function chooseFile(selected: File | null) {
    setError(null); setFile(null);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".zip") || selected.size === 0 || selected.size > maximumZipSize) {
      setError("Choose a ZIP file no larger than 3 MB."); setFileInputKey(value => value + 1); return;
    }
    setFile(selected);
  }
  async function finish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !appName.trim() || (source === "github" ? !selectedRepos.length : !file)) return;
    setBusy("create"); setError(null);
    try {
      const sourceKey = source === "github" ? [...selectedRepos].sort().join(",") : `${file!.name}:${file!.size}:${file!.lastModified}`;
      const key = `lc_workspace_request:${getActiveOrganizationId()}:${appName.trim()}:${source}:${sourceKey}`;
      let requestId = sessionStorage.getItem(key);
      if (!requestId) { requestId = crypto.randomUUID(); sessionStorage.setItem(key, requestId); }
      await waitForApiReady(API_BASE_URL);
      let result: { id: string };
      if (source === "upload") {
        const body = new FormData();
        body.append("name", appName.trim()); body.append("request_id", requestId); body.append("file", file!);
        result = await apiClient<{ id: string }>("/onboarding/upload", { method: "POST", body, timeout: 60000 });
      } else result = await apiClient<{ id: string }>("/onboarding/workspace", { method: "POST", body: JSON.stringify({ name: appName.trim(), repository_ids: selectedRepos, request_id: requestId }) });
      sessionStorage.removeItem("lc_onboarding_pending"); sessionStorage.removeItem(key);
      router.push(`/dashboard/architecture?application=${encodeURIComponent(result.id)}`);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to create your workspace."); setBusy(null); }
  }
  return <div className="min-h-dvh bg-slate-50 text-slate-900 flex flex-col">
    <header className="bg-white border-b border-slate-200 px-6 py-5"><div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
      <Link href="/dashboard" className="flex items-center gap-3"><ShieldCheck className="w-8 h-8" /><div><span className="font-bold text-lg">LaunchComply</span><span className="text-xs text-slate-500 block">Business asset setup</span></div></Link>
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft className="w-4 h-4" />Back to workspace</Link>
    </div></header>
    <main className="max-w-4xl mx-auto w-full px-5 sm:px-6 py-10 sm:py-12 flex-1">
      <div className="text-center mb-8"><p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">Start with your code</p><h1 className="text-3xl sm:text-4xl font-bold mt-3 tracking-tight">Connect your business asset</h1><p className="text-sm sm:text-base text-slate-600 mt-3 max-w-xl mx-auto">Choose GitHub or upload a code package. Review your business architecture next, then connect your cloud account when you’re ready.</p></div>
      <div className="grid sm:grid-cols-2 gap-4 mb-6" aria-label="Choose your code source">
        {([{ id: "github", title: "Connect GitHub", description: "Choose one or more repositories from GitHub.", detail: "Connect frontend and backend sources together.", icon: Github }, { id: "upload", title: "Upload code", description: "Upload an application saved on your computer.", detail: "A code snapshot, without a GitHub account.", icon: Upload }] as const).map(option => <button key={option.id} type="button" disabled={!!busy} aria-pressed={source === option.id} onClick={() => { setSource(option.id); setError(null); }} className={`relative text-left rounded-2xl border bg-white p-6 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700 focus-visible:ring-offset-2 ${source === option.id ? "border-cyan-600 ring-1 ring-cyan-600" : "border-slate-200 hover:border-slate-400"}`}>
          <span className={`inline-flex p-3 rounded-xl mb-4 ${source === option.id ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-700"}`}><option.icon className="w-6 h-6" /></span>{source === option.id && <Check className="absolute top-6 right-6 w-5 h-5 text-cyan-700" />}<h2 className="text-lg font-bold">{option.title}</h2><p className="text-sm text-slate-600 mt-2">{option.description}</p><p className="text-xs text-slate-500 mt-4">{option.detail}</p>
        </button>)}
      </div>
      <form onSubmit={finish} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6" aria-label="Business asset source setup">
        <div><label htmlFor="application-name" className="block text-sm font-semibold mb-2">Business asset name</label><input id="application-name" required value={appName} onChange={event => setAppName(event.target.value)} disabled={!!busy} maxLength={255} placeholder="e.g. Customer portal" className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-700 disabled:bg-slate-50" /><p className="text-xs text-slate-500 mt-2">Use a name your team will recognize. Cloud details come later.</p></div>
        {source === "github" ? <section aria-label="GitHub source" className="space-y-4 border-t border-slate-100 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold">Link your GitHub account</h2><p className="text-sm text-slate-500 mt-1">You choose which repositories LaunchComply can access.</p></div><button type="button" onClick={connectGitHub} disabled={!!busy} className={primary}>{busy === "connect" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Github className="w-4 h-4" />}{busy === "connect" ? "Connecting…" : repositories.length ? "Connect another account" : "Connect GitHub"}</button></div>
          {loadingRepos ? <p role="status" className="text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Checking your connected repositories…</p> : repoError ? <div role="alert" className="text-sm text-rose-700"><p>{repoError}</p><button type="button" onClick={() => setReload(value => value + 1)} disabled={!!busy} className="mt-2 font-semibold underline">Refresh repositories</button></div> : repositories.length ? <RepositoryPicker repositories={repositories} selected={selectedRepos} onChange={ids => { setSelectedRepos(ids); if (!appName.trim()) setAppName(repositories.find(repo => repo.id === ids[0])?.full_name.split("/").pop() || ""); }} disabled={!!busy} /> : <p className="text-sm text-slate-500">Your repositories will appear here after you connect GitHub.</p>}
        </section> : <section aria-label="Code upload" className="space-y-4 border-t border-slate-100 pt-6">
          <div><h2 className="font-semibold">Upload your application code</h2><p className="text-sm text-slate-500 mt-1">ZIP format · up to 3 MB · include dependency files.</p></div>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6"><label htmlFor="code-package" className="text-sm font-semibold mb-3 flex items-center gap-2"><FileArchive className="w-5 h-5 text-cyan-700" />Choose code package</label><input key={fileInputKey} id="code-package" type="file" accept=".zip,application/zip" onChange={event => chooseFile(event.target.files?.[0] || null)} disabled={!!busy} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-slate-900 file:shadow-sm cursor-pointer" />{file && <div className="flex items-center justify-between gap-3 mt-4 text-sm"><span className="break-all">{file.name} <span className="text-slate-500">({(file.size / 1024).toFixed(0)} KB)</span></span><button type="button" aria-label="Remove selected file" disabled={!!busy} onClick={() => { setFile(null); setFileInputKey(value => value + 1); }} className="p-2 hover:bg-white rounded-lg"><X className="w-4 h-4" /></button></div>}</div>
          <p className="text-xs leading-5 text-slate-500">Include package.json, requirements.txt, or pyproject.toml. Leave out passwords, environment files, private keys, installed dependencies, and Git history. Your package is stored encrypted; code is not executed.</p>
        </section>}
        {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm"><p>{error}</p><Link href="/dashboard/support" className="inline-block mt-2 font-semibold underline">Get workspace help</Link></div>}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 pt-5"><p className="text-xs text-slate-500 max-w-sm">Creating a workspace does not deploy resources or start an assessment.</p><button type="submit" disabled={!!busy || !appName.trim() || (source === "github" ? !selectedRepos.length : !file)} className={primary}>{busy === "create" ? <><Loader2 className="w-4 h-4 animate-spin" />{source === "upload" ? "Uploading & preparing…" : "Creating workspace…"}</> : <>Continue to business architecture<ArrowRight className="w-4 h-4" /></>}</button></div>
      </form>
      <p className="text-center text-sm text-slate-500 mt-6">Looking for security or compliance help? <Link href="/dashboard/services" className="text-cyan-700 font-semibold hover:underline">Explore services</Link></p>
    </main><footer className="p-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">LaunchComply · From Localhost to Real Business.</footer>
  </div>;
}
