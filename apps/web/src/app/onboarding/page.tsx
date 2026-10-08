"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Github, ShieldCheck } from "lucide-react";
import { apiClient, API_BASE_URL, getActiveOrganizationId } from "@/lib/api";
import { waitForApiReady } from "@/lib/api/readiness.mjs";

const goals = [
  { id: "DEPLOY", title: "Deploy My Application", description: "Connect your code and prepare your application workspace.", target: "/dashboard/applications" },
  { id: "SECURE", title: "Secure Existing Application", description: "Organize your application security assessment.", target: "/dashboard/security" },
  { id: "ISO27001", title: "Prepare for ISO 27001", description: "Start your information security compliance workflow.", target: "/dashboard/compliance/iso27001" },
  { id: "SOC2", title: "Prepare for SOC 2 Type II", description: "Organize controls, evidence, and audit preparation.", target: "/dashboard/compliance/soc2" },
  { id: "VAPT", title: "Request a security assessment", description: "Prepare the scope for an authorized security assessment.", target: "/dashboard/vapt" },
];
interface Repository { id: string; full_name: string; default_branch: string; visibility: string; archived: boolean; }
const buttonStyle = "px-6 py-3 bg-slate-900 text-white rounded-lg disabled:opacity-50";
const cardStyle = "bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6";

export default function OnboardingPage() {
  const router = useRouter();
  const [goal, setGoal] = useState("DEPLOY");
  const [step, setStep] = useState(1);
  const [appName, setAppName] = useState("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentGoal = goals.find(item => item.id === goal) || goals[0];
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("github") !== "connected") return;
    try {
      const pending = JSON.parse(sessionStorage.getItem("lc_onboarding_pending") || "{}");
      if (typeof pending.name === "string") setAppName(pending.name);
      if (goals.some(item => item.id === pending.goal)) setGoal(pending.goal);
      setStep(3);
      window.history.replaceState(null, "", "/onboarding");
    } catch { setError("Please enter your application name again."); }
  }, []);
  useEffect(() => {
    if (step !== 3) return;
    let active = true;
    setLoadingRepos(true);
    setError(null);
    (async () => {
      try {
        await waitForApiReady(API_BASE_URL);
        const repos = await apiClient<Repository[]>("/source-control/repositories");
        if (active) setRepositories(repos.filter(repo => !repo.archived));
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : "Unable to load repositories.");
      } finally { if (active) setLoadingRepos(false); }
    })();
    return () => { active = false; };
  }, [step]);
  async function connectGitHub() {
    setBusy(true); setError(null);
    try {
      sessionStorage.setItem("lc_onboarding_pending", JSON.stringify({ name: appName, goal }));
      await waitForApiReady(API_BASE_URL);
      const result = await apiClient<{ authorization_url: string }>("/source-control/github/authorize", { method: "POST" });
      const destination = new URL(result.authorization_url);
      if (destination.origin !== "https://github.com" || destination.pathname !== "/login/oauth/authorize") throw new Error("Unable to start GitHub authorization.");
      window.location.assign(destination.href);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to connect GitHub."); setBusy(false); }
  }
  async function finish() {
    if (!appName.trim() || !selectedRepo) return;
    setBusy(true); setError(null);
    try {
      const key = `lc_workspace_request:${getActiveOrganizationId()}:${appName.trim()}:${selectedRepo}`;
      let requestId = sessionStorage.getItem(key);
      if (!requestId) { requestId = crypto.randomUUID(); sessionStorage.setItem(key, requestId); }
      await apiClient("/onboarding/workspace", { method: "POST", body: JSON.stringify({ name: appName.trim(), repository_id: selectedRepo, request_id: requestId }) });
      sessionStorage.removeItem("lc_onboarding_pending");
      sessionStorage.removeItem(key);
      router.push(currentGoal.target);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to create your workspace."); setBusy(false); }
  }
  return <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
    <header className="p-6 bg-white border-b border-slate-200"><div className="max-w-5xl mx-auto flex items-center justify-between">
      <Link href="/dashboard" className="flex items-center gap-3"><ShieldCheck className="w-8 h-8" /><div><span className="font-bold">LaunchComply</span><span className="text-xs text-slate-500 block">Onboarding Wizard</span></div></Link>
      <p className="text-xs text-slate-500">Goal: <strong className="text-slate-900">{currentGoal.title}</strong></p>
    </div></header>
    <main className="max-w-3xl mx-auto w-full px-6 py-10 flex-1">
      {step === 1 && <div className="space-y-6"><div className="text-center"><h1 className="text-3xl font-bold">Welcome to LaunchComply</h1><p className="text-sm text-slate-600 mt-2">Choose what you want to achieve.</p></div>
        <div className="grid md:grid-cols-2 gap-4">{goals.map(item => <button key={item.id} aria-pressed={goal === item.id} onClick={() => setGoal(item.id)} className={`text-left p-5 rounded-xl border bg-white ${goal === item.id ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"}`}><h2 className="text-sm font-bold">{item.title}</h2><p className="text-xs text-slate-500 mt-1">{item.description}</p></button>)}</div>
        <div className="flex justify-end"><button onClick={() => setStep(2)} className={buttonStyle}>Continue</button></div>
      </div>}
      {step === 2 && <div className={cardStyle}>
        <div><p className="text-xs text-slate-500 uppercase">Step 2 of 3</p><h1 className="text-xl font-bold mt-1">Name Your Application Workspace</h1><p className="text-xs text-slate-600 mt-1">Choose a name for your application.</p></div>
        <div><label htmlFor="application-name" className="block text-sm font-semibold mb-2">Application Name</label><input id="application-name" value={appName} onChange={event => setAppName(event.target.value)} maxLength={255} placeholder="Your application name" className="w-full px-4 py-3 border border-slate-300 rounded-lg" /></div>
        <div className="flex justify-between border-t pt-4"><button onClick={() => setStep(1)} className="px-4 py-2 text-sm">Back</button><button disabled={!appName.trim()} onClick={() => setStep(3)} className={buttonStyle}>Connect Source Code</button></div>
      </div>}
      {step === 3 && <div className={cardStyle}>
        <div><p className="text-xs text-slate-500 uppercase">Step 3 of 3</p><h1 className="text-xl font-bold mt-1">Connect GitHub</h1><p className="text-sm text-slate-600 mt-2">Authorize your GitHub account, then choose a repository for {appName || "your application"}.</p></div>
        <button onClick={connectGitHub} disabled={busy || loadingRepos} className={`inline-flex items-center gap-2 ${buttonStyle}`}><Github className="w-5 h-5" />{busy ? "Connecting…" : repositories.length ? "Connect another GitHub account" : "Connect GitHub"}</button>
        {loadingRepos && <p role="status" className="text-sm text-slate-600">Checking your connected repositories…</p>}
        {repositories.length > 0 && <div className="space-y-3"><p className="text-sm font-semibold">Choose a repository</p>{repositories.map(repo => <button key={repo.id} aria-pressed={selectedRepo === repo.id} onClick={() => setSelectedRepo(repo.id)} className={`w-full text-left p-4 rounded-lg border ${selectedRepo === repo.id ? "border-cyan-600 bg-cyan-50" : "border-slate-200"}`}><span className="block font-semibold text-sm">{repo.full_name}</span><span className="text-xs text-slate-500">{repo.visibility} · {repo.default_branch}</span></button>)}</div>}
        <p className="text-xs text-slate-500">You choose which repositories the GitHub App can access. Architecture and cloud setup happen in your workspace after onboarding.</p>
        {error && <p role="alert" className="rounded-lg bg-rose-50 text-rose-700 p-3 text-sm">{error}</p>}
        <div className="flex justify-between border-t pt-4"><button disabled={busy} onClick={() => setStep(2)} className="px-4 py-2 text-sm">Back</button><button disabled={busy || !selectedRepo || !appName.trim()} onClick={finish} className={buttonStyle}>Finish Setup</button></div>
      </div>}
    </main><footer className="p-6 border-t bg-white text-center text-xs text-slate-500">LaunchComply · From Localhost to Real Business.</footer>
  </div>;
}
