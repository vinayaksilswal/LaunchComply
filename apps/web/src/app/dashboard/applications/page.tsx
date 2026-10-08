"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Boxes, Github, ArrowUpRight, Plus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";

interface Application { id: string; name: string; repo_url: string | null; repo_branch: string; created_at: string; }
export default function ApplicationsPage() {
  const { organization, loading: accountLoading } = useAccount();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!organization || accountLoading) return;
    let active = true;
    setLoading(true); setApps([]); setError(null);
    apiClient<Application[]>("/applications/").then(data => { if (active) setApps(data); })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Unable to load applications."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [organization, accountLoading, retry]);
  return <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-7">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold text-cyan-700 uppercase tracking-wider">{organization?.name || "Your workspace"}</p><h1 className="text-2xl font-bold text-slate-950 mt-2">Applications & Workspaces</h1><p className="text-sm text-slate-500 mt-2">Manage your applications and connected source code.</p></div><Link href="/onboarding" className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-900 text-white text-sm font-semibold"><Plus className="w-4 h-4" />New application</Link></div>
    {error ? <div role="alert" className="p-6 bg-rose-50 text-rose-800 rounded-xl"><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="mt-3 underline">Try again</button></div>
      : loading ? <p role="status" className="text-slate-500">Loading your applications…</p>
      : apps.length === 0 ? <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-4"><Boxes className="w-12 h-12 mx-auto text-cyan-700" /><h2 className="text-xl font-bold">Your first application starts here</h2><p className="text-sm text-slate-500 max-w-md mx-auto">Name your application and connect a GitHub repository. Configure architecture and cloud access when you are ready.</p><Link href="/onboarding" className="inline-flex gap-2 items-center rounded-lg bg-cyan-700 text-white px-5 py-3 text-sm font-semibold"><Github className="w-4 h-4" />Connect GitHub and create a workspace</Link></div>
      : <div className="grid gap-4">{apps.map(app => <article key={app.id} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"><div className="flex flex-wrap justify-between items-start gap-3"><div><h2 className="text-lg font-bold text-slate-900">{app.name}</h2><p className="mt-1 text-sm text-slate-500">Created {new Date(app.created_at).toLocaleDateString()}</p></div><Link href={`/dashboard/applications/${app.id}`} className="inline-flex gap-1 items-center text-cyan-700 font-semibold text-sm">Open workspace<ArrowUpRight className="w-4 h-4" /></Link></div><div className="p-4 rounded-xl bg-slate-50 text-sm text-slate-600"><p className="flex gap-2 items-center"><Github className="w-4 h-4 shrink-0" /><span className="break-all">{app.repo_url || "No repository linked"}</span></p>{app.repo_url && <p className="text-xs mt-2">Branch: {app.repo_branch}</p>}</div><p className="text-xs text-slate-500">Deployment, security, and compliance assessments are managed in their respective workflows.</p></article>)}</div>}
  </div>;
}
