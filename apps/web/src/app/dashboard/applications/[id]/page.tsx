"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Github, Boxes, Cloud, ShieldCheck, Network, Activity, GitBranch } from "lucide-react";
import { RepositoryManager } from "@/components/workspace/RepositoryManager";
import type { RepositoryOption } from "@/components/workspace/RepositoryPicker";
import { apiClient, ApiError } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";

interface Workspace {
  repositories?: RepositoryOption[];
  source_archive?: { filename: string; sha256: string; size_bytes: number; file_count: number; created_at: string } | null;
  id: string; name: string; created_at: string; submitted_repository_url: string | null;
  repository: { id: string; full_name: string; url: string; branch: string; visibility: string; last_synced_at: string } | null;
  activity: { id: string; action: string; created_at: string }[];
}
const sections = [
  { id: "overview", label: "Overview", icon: Boxes }, { id: "repository", label: "Source code", icon: Github },
  { id: "architecture", label: "Business architecture", icon: Network }, { id: "cloud", label: "Cloud & deployments", icon: Cloud },
  { id: "security", label: "Security & compliance", icon: ShieldCheck },
];
export default function ApplicationWorkspacePage() {
  const params = useParams<{ id: string }>();
  const { organization, loading: accountLoading } = useAccount();
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState("overview");
  useEffect(() => { if (new URLSearchParams(window.location.search).get("source") === "connected") setSection("repository"); }, []);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!organization || accountLoading) return;
    let active = true;
    setData(null); setError(null);
    apiClient<Workspace>(`/applications/${encodeURIComponent(params.id)}/workspace`).then(result => { if (active) setData(result); })
      .catch(failure => { if (active) setError(failure instanceof ApiError && failure.status === 404 ? "This application does not exist in your business. Choose an application from your workspace list." : failure instanceof Error ? failure.message : "Unable to load the application."); });
    return () => { active = false; };
  }, [organization, accountLoading, params.id, refresh]);
  return <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-7">
    <Link href="/dashboard/applications" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="w-4 h-4" />My business assets</Link>
    {error ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-8 space-y-4"><h1 className="font-bold text-xl text-slate-900">Application unavailable</h1><p className="text-sm text-rose-800">{error}</p><button onClick={() => setRefresh(value => value + 1)} className="text-sm underline">Try again</button></div>
      : !data ? <div role="status" className="rounded-2xl bg-white border p-8 text-slate-500">Loading your application…</div>
      : <><header className="flex flex-wrap justify-between gap-4 items-start"><div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">{organization?.name}</p><h1 className="mt-2 text-3xl font-bold text-slate-950">{data.name}</h1><p className="mt-2 text-sm text-slate-500">Business asset · Created {new Date(data.created_at).toLocaleDateString()}</p></div><Link href={`/dashboard/architecture?application=${data.id}`} className="inline-flex items-center gap-2 bg-slate-900 text-white rounded-lg px-4 py-3 text-sm font-semibold">Business architecture<ArrowUpRight className="w-4 h-4" /></Link></header>
      <nav aria-label="Business asset sections" className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">{sections.map(item => { const Icon = item.icon; return <button key={item.id} onClick={() => setSection(item.id)} aria-pressed={section === item.id} className={`whitespace-nowrap inline-flex gap-2 items-center rounded-lg px-4 py-2.5 text-sm font-medium ${section === item.id ? "bg-cyan-50 text-cyan-800" : "text-slate-500 hover:bg-white"}`}><Icon className="w-4 h-4" />{item.label}</button>; })}</nav>
      {section === "overview" && <><div className="grid sm:grid-cols-3 gap-4">{[{ label: "Source code", value: data.source_archive ? "Code uploaded" : data.repository ? `${data.repositories?.length || 1} repositories linked` : "Not linked", hint: data.source_archive ? "Encrypted ZIP stored for this business asset" : "Authorized repository metadata" }, { label: "Deployment", value: "Not verified", hint: "No verified live deployment" }, { label: "Assessments", value: "Not assessed", hint: "Security and compliance evidence pending" }].map(item => <div key={item.label} className="bg-white rounded-2xl border border-slate-200 p-6"><p className="text-sm text-slate-500">{item.label}</p><p className="text-lg font-bold text-slate-900 mt-3">{item.value}</p><p className="text-xs text-slate-500 mt-2">{item.hint}</p></div>)}</div>
        <div className="grid lg:grid-cols-3 gap-6"><section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-4"><h2 className="font-bold flex items-center gap-2"><Github className="w-5 h-5 text-cyan-700" />Repository</h2>{data.source_archive ? <><p className="font-semibold text-slate-900">{data.source_archive.filename}</p><p className="text-sm text-slate-500">{data.source_archive.file_count} files · {(data.source_archive.size_bytes / 1024).toFixed(1)} KB · encrypted storage</p><p className="text-xs break-all text-slate-500">SHA-256: {data.source_archive.sha256}</p></> : data.repository ? <><p className="font-semibold text-slate-900">{(data.repositories || [data.repository]).map(repo => repo.full_name).join(", ")}</p><p className="text-sm text-slate-500 flex gap-2 items-center"><GitBranch className="w-4 h-4" />{data.repository.branch} · {data.repository.visibility}</p><p className="text-xs text-slate-500">Last synchronized {new Date(data.repository.last_synced_at).toLocaleString()}</p></> : <><p className="text-sm text-slate-500">No authorized GitHub repository is linked to this workspace.</p>{data.submitted_repository_url && <p className="text-xs text-slate-500 break-all">Previously entered URL: {data.submitted_repository_url}</p>}<Link href="/onboarding" className="text-sm font-semibold text-cyan-700">Connect GitHub</Link></>}</section><section className="bg-slate-900 text-white rounded-2xl p-6 space-y-3"><Network className="w-7 h-7 text-cyan-300" /><h2 className="text-lg font-bold">Plan before deploying</h2><p className="text-sm text-slate-300">Configure and review architecture in the dedicated workspace. Cloud access and deployment follow later.</p><Link href={`/dashboard/architecture?application=${data.id}`} className="inline-block text-sm text-cyan-300 font-semibold">Open architecture →</Link></section></div>
        <section className="bg-white border rounded-2xl p-6"><h2 className="font-bold flex gap-2 items-center mb-4"><Activity className="w-4 h-4 text-cyan-700" />Recorded activity</h2>{data.activity.length ? <div className="divide-y">{data.activity.map(item => <div key={item.id} className="py-3 flex flex-wrap justify-between gap-2"><p className="text-sm text-slate-700">{item.action.toLowerCase().replaceAll("_", " ")}</p><time dateTime={item.created_at} className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</time></div>)}</div> : <p className="text-sm text-slate-500">No recorded application activity yet.</p>}</section></>}
      {section === "repository" && (data.source_archive ? <section className="bg-white border rounded-2xl p-8 space-y-4"><h2 className="text-xl font-bold">{data.source_archive.filename}</h2><p className="text-sm text-slate-500">Encrypted ZIP · {data.source_archive.file_count} files. Source findings are available in Business architecture.</p><Link href={`/dashboard/architecture?application=${data.id}`} className="text-cyan-700 text-sm font-semibold">Open business architecture →</Link></section> : <RepositoryManager assetId={data.id} repositories={data.repositories || (data.repository ? [data.repository as RepositoryOption] : [])} linksReady={Array.isArray(data.repositories)} canEdit={["OWNER", "ADMIN"].includes(organization?.role.toUpperCase() || "")} onSaved={() => setRefresh(value => value + 1)} />)}
      {["architecture", "cloud", "security"].includes(section) && <section className="bg-white border border-slate-200 rounded-2xl p-10 space-y-4"><h2 className="text-xl font-bold">{section === "architecture" ? "Architecture assessment pending" : section === "cloud" ? "Cloud deployment not verified" : "Security and compliance not assessed"}</h2><p className="text-sm text-slate-500 max-w-xl">{section === "architecture" ? "Review your architecture in the dedicated workflow. No generated plan or approval is claimed here." : section === "cloud" ? "No verified AWS resources, costs, or deployment execution are available for this application." : "No verified assessment results are available. Organize your authorized security and compliance work in their dedicated workflows."}</p><Link href={section === "architecture" ? `/dashboard/architecture?application=${data.id}` : section === "cloud" ? "/dashboard/deployments" : "/dashboard/security"} className="inline-flex gap-2 items-center text-cyan-700 font-semibold text-sm">Open workflow<ArrowUpRight className="w-4 h-4" /></Link></section>}
      </>}
  </div>;
}
