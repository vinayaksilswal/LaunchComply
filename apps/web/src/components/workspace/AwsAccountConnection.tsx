"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Cloud, Download, RefreshCw, ShieldCheck, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useAccount } from "@/components/auth/AccountProvider";
import { apiClient } from "@/lib/api";

interface Account {
  id: string; account_id: string; region: string; role_arn: string; status: string; last_verified_at: string | null;
  resources: { type: string; id: string; region: string }[];
  observations: { service: string; status: string; count: number | null; truncated: boolean }[];
  scope: string;
}
interface Setup { connection_id: string; external_id: string; template: Record<string, unknown>; recommended_role_arn: string }
export function AwsAccountConnection() {
  const { organization } = useAccount();
  const canEdit = ["OWNER", "ADMIN"].includes(organization?.role.toUpperCase() || "");
  const [data, setData] = useState<{ available: boolean; accounts: Account[] } | null>(null);
  const [apps, setApps] = useState<{ id: string; name: string }[]>([]);
  const [applicationId, setApplicationId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [region, setRegion] = useState("ap-south-1");
  const [roleArn, setRoleArn] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [open, setOpen] = useState(false);
  const [disconnect, setDisconnect] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!organization) return;
    let active = true;
    setData(null); setApps([]); setApplicationId(""); setSetup(null); setOpen(false); setDisconnect(null); setError("");
    Promise.all([apiClient<{ available: boolean; accounts: Account[] }>("/aws-account-connection"), apiClient<{ id: string; name: string }[]>("/applications/")])
      .then(([accounts, applications]) => { if (active) { setData(accounts); setApps(applications); setApplicationId(applications[0]?.id || ""); } })
      .catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [organization, refresh]);
  const verify = async (id: string, arn: string) => {
    setBusy(true); setError("");
    try {
      await apiClient<Account>(`/aws-account-connection/${id}/verify`, { method: "POST", timeout: 65000, body: JSON.stringify({ role_arn: arn }) });
      setOpen(false); setSetup(null); setRefresh((value) => value + 1);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "AWS verification did not complete."); }
    finally { setBusy(false); }
  };
  return <section aria-label="AWS account connection" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
      <div><h2 className="flex items-center gap-2 font-semibold"><Cloud className="h-5 w-5 text-cyan-700" />Your AWS account</h2>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">Connect with a dedicated AWS role. Your access keys stay out of LaunchComply. Review and approve your app design first.</p></div>
      <div className="flex gap-2"><button disabled={busy} aria-label="Refresh AWS account records" onClick={() => setRefresh((value) => value + 1)} className="rounded-lg border p-2"><RefreshCw className="h-4 w-4" /></button>
        <button disabled={!data?.available || !canEdit || busy || !apps.length} onClick={() => { setOpen(true); setSetup(null); setAccountId(""); setRoleArn(""); setError(""); }} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Connect AWS</button></div>
    </header>
    {error && !open && !disconnect && <p role="alert" className="m-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {!data && !error ? <p role="status" className="p-6 text-sm text-slate-500">Loading account records…</p> : data && <div className="p-5 space-y-4">
      {!data.available && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">AWS verification is awaiting platform configuration. Apply for connection help to continue.</p>}
      {!data.accounts.length && <p className="text-sm text-slate-500">No AWS account is connected to this business.</p>}
      {data.accounts.map((account) => <article key={account.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-sm">{account.account_id} <span className="font-normal text-slate-500">· {account.region}</span></h3>
          <p className="mt-2 flex items-center gap-1 text-xs text-slate-600">{account.status === "ACCESS_VERIFIED" && <ShieldCheck className="h-4 w-4 text-emerald-600" />}{account.status === "ACCESS_VERIFIED" ? "Role access verified" : "Setup required"}{account.last_verified_at && ` · Checked ${new Date(account.last_verified_at).toLocaleString()}`}</p></div>
          <div className="flex gap-3 text-xs font-semibold"><button disabled={!canEdit || busy || !data.available || account.status !== "ACCESS_VERIFIED"} onClick={() => verify(account.id, account.role_arn)} className="text-cyan-700 disabled:opacity-40">Check AWS again</button>
            <button disabled={!canEdit || busy || account.status !== "ACCESS_VERIFIED"} onClick={() => setDisconnect(account)} className="text-slate-500 disabled:opacity-40">Disconnect</button></div></div>
        {account.observations.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-4">{account.observations.map((observation) => <div key={observation.service} className="rounded-lg bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">{observation.service}</p><p className="mt-1 text-sm font-semibold">{observation.status === "OBSERVED" ? `${observation.count}${observation.truncated ? "+" : ""} observed` : "Access unavailable"}</p></div>)}</div>}
        {account.resources.length > 0 && <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold">View observed resources</summary><ul className="mt-2 max-h-60 space-y-2 overflow-auto">{account.resources.map((resource) => <li key={`${resource.type}-${resource.id}`} className="break-all rounded bg-slate-50 p-2">{resource.type.replaceAll("_", " ")} · {resource.id}</li>)}</ul></details>}
        <p className="mt-3 text-xs leading-5 text-slate-500">{account.scope} Inventory is a bounded snapshot from the selected region, not a health assessment.</p>
      </article>)}
      {!apps.length && <Link href="/dashboard/applications" className="text-sm font-semibold text-cyan-700">Connect your application first →</Link>}
      <p className="text-xs leading-5 text-slate-500">Cloud usage, latency, costs and logs remain unavailable until their data sources are connected. Deployment access is reviewed separately.</p>
    </div>}
    {open && <Dialog label="Connect your AWS account" busy={busy} onDismiss={() => setOpen(false)}><div className="space-y-4 p-6">
      <header className="flex justify-between"><h2 className="text-lg font-semibold">Connect your AWS account</h2><button disabled={busy} aria-label="Close AWS setup" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></header>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {!setup ? <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault(); setBusy(true); setError("");
        try { const result = await apiClient<Setup>("/aws-account-connection/setup", { method: "POST", timeout: 65000, body: JSON.stringify({ application_id: applicationId, account_id: accountId, region }) }); setSetup(result); setRoleArn(result.recommended_role_arn); }
        catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to prepare AWS setup."); } finally { setBusy(false); }
      }}><label className="block text-sm">Application<select required disabled={busy} value={applicationId} onChange={(event) => setApplicationId(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-3">{apps.map((app) => <option value={app.id} key={app.id}>{app.name}</option>)}</select></label>
        <label className="block text-sm">AWS account ID<input required inputMode="numeric" pattern="[0-9]{12}" maxLength={12} disabled={busy} value={accountId} onChange={(event) => setAccountId(event.target.value)} className="mt-1 w-full rounded-lg border p-3" placeholder="12-digit account ID" /></label>
        <label className="block text-sm">AWS region<input required pattern="[a-z]{2}-[a-z]+-[0-9]" disabled={busy} value={region} onChange={(event) => setRegion(event.target.value)} className="mt-1 w-full rounded-lg border p-3" /></label>
        <p className="text-xs leading-5 text-slate-500">The setup creates one role with limited inventory read access. It does not create or deploy application infrastructure.</p>
        <button disabled={busy} className="w-full rounded-lg bg-slate-900 p-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Preparing…" : "Prepare connection"}</button>
      </form> : <div className="space-y-4">
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-6"><li>Download the setup file and open CloudFormation in your AWS account, in <strong>{region}</strong>.</li><li>Create a stack using this file. Review the role trust and permissions, then acknowledge the named IAM role to create it.</li><li>Return here and verify the role ARN from the stack Outputs tab.</li></ol>
        <button type="button" onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(setup.template, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = "launchcomply-aws-observer.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }} className="flex items-center gap-2 rounded-lg border p-3 text-sm font-semibold"><Download className="h-4 w-4" />Download AWS setup file</button>
        <p className="break-all rounded-lg bg-slate-50 p-3 text-xs leading-5">Connection reference (ExternalId): {setup.external_id}</p>
        <form onSubmit={(event) => { event.preventDefault(); verify(setup.connection_id, roleArn); }} className="space-y-3"><label className="block text-sm">Observer role ARN<input required disabled={busy} value={roleArn} onChange={(event) => setRoleArn(event.target.value)} className="mt-1 w-full rounded-lg border p-3 text-xs" /></label>
          <button disabled={busy} className="w-full rounded-lg bg-slate-900 p-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Verifying with AWS…" : "Verify connection"}</button></form>
      </div>}
    </div></Dialog>}
    {disconnect && <Dialog label="Disconnect AWS account" busy={busy} onDismiss={() => setDisconnect(null)}><div className="space-y-4 p-6"><h2 className="font-semibold">Disconnect {disconnect.account_id}?</h2><p className="text-sm leading-6 text-slate-600">LaunchComply will stop using this connection. Remove the observer IAM role in AWS to revoke access fully. Your application resources remain in AWS.</p>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <div className="flex gap-3"><button disabled={busy} onClick={() => setDisconnect(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await apiClient(`/aws-account-connection/${disconnect.id}/disconnect`, { method: "POST" }); setDisconnect(null); setRefresh((value) => value + 1); } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to disconnect."); } finally { setBusy(false); } }} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Disconnect account</button></div>
    </div></Dialog>}
  </section>;
}
