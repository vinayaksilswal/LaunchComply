"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, RefreshCw, ArrowRight } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";
import { RequestHelp } from "./RequestHelp";

interface Asset { id: string; name: string; repo_url?: string }
interface Preparation {
  application_id: string; architecture_id: string | null; version: string | null;
  source_commit: string | null; evaluated_at: string;
  checks: { id: string; title: string; complete: boolean; detail: string; href: string }[];
  accounts: { id: string; account_id: string; region: string; checked_at: string }[];
}

export function DeploymentPreparation() {
  const { organization } = useAccount();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState("");
  const [data, setData] = useState<Preparation | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [assetsRefresh, setAssetsRefresh] = useState(0);
  useEffect(() => {
    if (!organization) return;
    let active = true;
    setAssets([]); setAssetId(""); setData(null); setError(""); setLoading(true);
    apiClient<Asset[]>("/applications/").then(items => {
      if (!active) return;
      setAssets(items);
      const requested = new URLSearchParams(window.location.search).get("application");
      setAssetId(items.some(item => item.id === requested) ? requested! : items[0]?.id || "");
      if (!items.length) setLoading(false);
    }).catch(failure => { if (active) { setError(failure.message); setLoading(false); } });
    return () => { active = false; };
  }, [organization, assetsRefresh]);
  useEffect(() => {
    if (!assetId) return;
    let active = true;
    setData(null); setError(""); setLoading(true);
    apiClient<Preparation>(`/deployments/preparation/${assetId}`).then(result => {
      if (active) setData(result);
    }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [assetId, refresh]);
  const next = data?.checks.find(check => !check.complete);
  return <section aria-label="Deployment preparation" className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
    <header className="p-5 border-b flex flex-wrap gap-4 justify-between items-start">
      <div><h2 className="font-semibold">Prepare your business for deployment</h2>
        <p className="mt-2 text-sm text-slate-500">Follow the next step for your saved design.</p></div>
      <div className="flex flex-wrap gap-2 items-center">
        {!!assets.length && <select aria-label="Business asset to prepare" value={assetId} onChange={event => setAssetId(event.target.value)} className="rounded-lg border px-3 py-2 text-sm max-w-full bg-white">
          {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name}{asset.repo_url ? ` · ${asset.repo_url.replace(/\/$/, "").split("/").at(-1)}` : ""}</option>)}
        </select>}
        <button aria-label="Refresh deployment preparation" disabled={loading} onClick={() => assets.length ? setRefresh(value => value + 1) : setAssetsRefresh(value => value + 1)} className="rounded-lg border p-2 disabled:opacity-40"><RefreshCw className="w-4 h-4" /></button>
      </div>
    </header>
    <div className="p-5 space-y-4">
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading && <p role="status" className="text-sm text-slate-500">Checking your saved design and account records…</p>}
      {!loading && !error && !assets.length && <Link href="/onboarding" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">Connect your business source code <ArrowRight className="w-4 h-4" /></Link>}
      {data && <>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
          <span>{data.version ? `Saved design ${data.version}` : "No saved design"}</span>
          {data.source_commit && <span>Source snapshot {data.source_commit.slice(0, 8)}</span>}
          <span>Checked {new Date(data.evaluated_at).toLocaleString()}</span>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.checks.map((check, index) => <li key={check.id} className={`rounded-xl border p-4 ${check.complete ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200"}`}>
            <p className="flex items-start gap-2 text-sm font-semibold">{check.complete ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" /> : <Circle className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />}{index + 1}. {check.title}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{check.detail}</p>
            <span className={`mt-3 inline-block text-xs font-medium ${check.complete ? "text-emerald-700" : "text-slate-500"}`}>{check.complete ? "Recorded" : "Action needed"}</span>
          </li>)}
        </ol>
        {!!data.accounts.length && <p className="text-xs text-slate-500">Verified account records: {data.accounts.map(account => `${account.account_id} · ${account.region}`).join(", ")}</p>}
        <div className="flex flex-wrap gap-3 items-center">
          {next && next.id !== "plan" && <Link href={next.href} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold">{next.title} <ArrowRight className="w-4 h-4" /></Link>}
          <RequestHelp key={`${assetId}:${data.architecture_id}`} code="DEPLOYMENT_HELP" label="Request deployment review" applicationId={assetId} architectureId={data.architecture_id || undefined} architectureVersion={data.version || undefined} />
        </div>
      </>}
      <p className="text-xs leading-5 text-slate-500">Automatic provisioning is not available. Design approval and payment do not create AWS resources. The operations team reviews the deployment plan and scope with you.</p>
    </div>
  </section>;
}
