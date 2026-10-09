"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";

interface Snapshot {
  checked_at: string; scope: string;
  sources: { provider: string; status: string; count: number | null; truncated: boolean }[];
  findings: { id: string; provider: string; title: string; severity: string; status: string; updated_at: string; resource: string }[];
}
interface Feed { available: boolean; required_read_actions: string[]; accounts: { id: string; account_id: string; region: string; snapshot: Snapshot | null }[]; scope: string }
const readable = (value: string) => value.toLowerCase().replaceAll("_", " ");
export function CloudSecurity() {
  const { organization } = useAccount();
  const [data, setData] = useState<Feed | null>(null);
  const [error, setError] = useState("");
  const [accountId, setAccountId] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  const [auto, setAuto] = useState(false);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [reload, setReload] = useState(0);
  const canRefresh = ["OWNER", "ADMIN"].includes(organization?.role.toUpperCase() || "");
  useEffect(() => {
    let active = true; setError(""); setData(null); setAuto(false); setBusy(false);
    apiClient<Feed>("/aws-account-connection/security").then(result => {
      if (active) { setData(result); setAccountId(current => result.accounts.some(item => item.id === current) ? current : result.accounts[0]?.id || ""); }
    }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [organization, reload]);
  const account = data?.accounts.find(item => item.id === accountId);
  useEffect(() => {
    if (!auto || !canRefresh || !data?.available || !accountId) return;
    let stopped = false;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible" || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const result = await apiClient<{ snapshot: Snapshot }>(`/aws-account-connection/${accountId}/security/refresh`, { method: "POST", timeout: 65000 });
        if (!stopped) { setData(current => current && { ...current, accounts: current.accounts.map(item => item.id === accountId ? { ...item, snapshot: result.snapshot } : item) }); setError(""); }
      } catch (failure) { if (!stopped) { setError(failure instanceof Error ? failure.message : "Unable to refresh AWS security."); setAuto(false); } }
      finally { if (!stopped) setBusy(false); }
    }, 60000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [auto, accountId, canRefresh, data?.available]);
  const snapshot = account?.snapshot;
  const findings = snapshot?.findings.filter(item => (!severity || item.severity === severity) && `${item.title} ${item.resource} ${item.provider}`.toLowerCase().includes(query.toLowerCase())) || [];
  return <section aria-label="Connected cloud security" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
    <header className="flex flex-wrap justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-cyan-700" />Connected cloud security</h2><p className="mt-2 text-sm leading-6 text-slate-500">Read existing AWS findings. Application testing and compliance preparation are separate services.</p></div>
      <button type="button" disabled={busy} onClick={() => setReload(value => value + 1)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><RefreshCw className="h-4 w-4" />Reload saved observations</button></header>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {!data && !error && <p role="status" className="text-sm text-slate-500">Loading cloud security connections…</p>}
    {data && <>
      {(!data.available || !data.accounts.length) && <div className="rounded-xl bg-slate-50 p-5"><h3 className="text-sm font-semibold">{!data.available ? "Cloud security is awaiting platform setup" : "Connect your AWS account to read findings"}</h3><p className="mt-2 text-sm leading-6 text-slate-600">No live cloud security result is available. Connect a verified observer role and grant the listed read permissions. Services also need to be enabled in your AWS account.</p><Link href="/dashboard/operations#aws-account-connection" className="mt-3 inline-block text-sm font-semibold text-cyan-700">Open AWS connection</Link></div>}
      {!!data.accounts.length && <div className="flex flex-wrap items-end gap-3"><label className="text-xs font-medium">AWS account & region<select disabled={busy} value={accountId} onChange={event => { setAccountId(event.target.value); setAuto(false); setQuery(""); }} className="mt-1 block rounded-lg border bg-white p-2.5 text-sm">{data.accounts.map(item => <option key={item.id} value={item.id}>{item.account_id} · {item.region}</option>)}</select></label>
        <button disabled={busy || !canRefresh || !data.available} onClick={async () => {
          setBusy(true); setError("");
          try { const result = await apiClient<{ snapshot: Snapshot }>(`/aws-account-connection/${accountId}/security/refresh`, { method: "POST", timeout: 65000 }); setData(current => current && { ...current, accounts: current.accounts.map(item => item.id === accountId ? { ...item, snapshot: result.snapshot } : item) }); }
          catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to refresh AWS security."); }
          finally { setBusy(false); }
        }} className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Reading AWS…" : "Refresh from AWS"}</button>
        <label className="flex items-center gap-2 py-2 text-xs"><input type="checkbox" checked={auto} disabled={!canRefresh || !data.available || busy} onChange={event => setAuto(event.target.checked)} />Refresh every minute while this page is visible</label>
      </div>}
      {account && !snapshot && <p className="text-sm text-slate-500">No security observation has been recorded for this account. Refresh from AWS to check provider access.</p>}
      {snapshot && <>
        <p className="text-xs text-slate-500">Last observed {new Date(snapshot.checked_at).toLocaleString()} · {account?.region}. This is a snapshot, not a live event stream.</p>
        <div className="grid gap-3 sm:grid-cols-2">{snapshot.sources.map(source => <div key={source.provider} className="rounded-xl border p-4"><p className="text-xs font-semibold uppercase">{readable(source.provider)}</p><p className="mt-2 text-sm capitalize">{source.status === "OBSERVED" ? `${source.count}${source.truncated ? "+" : ""} active findings in this sample` : readable(source.status)}</p>{source.status !== "OBSERVED" && <p className="mt-2 text-xs text-slate-500">No finding count can be established. Review service configuration and observer permissions.</p>}</div>)}</div>
        <div className="flex flex-wrap gap-3"><input aria-label="Search cloud findings" placeholder="Search cloud findings…" value={query} onChange={event => setQuery(event.target.value)} className="rounded-lg border p-2.5 text-sm" /><select aria-label="Cloud finding severity" value={severity} onChange={event => setSeverity(event.target.value)} className="rounded-lg border bg-white p-2.5 text-sm"><option value="">All severities</option>{["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFORMATIONAL", "UNKNOWN"].map(value => <option key={value}>{value}</option>)}</select></div>
        <div className="max-h-96 space-y-3 overflow-auto">{findings.map(item => <details key={`${item.provider}-${item.id}`} className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">{item.title || "AWS finding"} · {item.severity}</summary><dl className="mt-3 space-y-2 break-words text-xs text-slate-600"><div>Source: {item.provider} · {item.status}</div><div>Updated: {item.updated_at ? new Date(item.updated_at).toLocaleString() : "Not reported"}</div><div>Resource / type: {item.resource || "Not reported"}</div><div>Provider reference: {item.id}</div></dl></details>)}{!findings.length && <p className="p-4 text-sm text-slate-500">No findings match this view. This does not establish that your business is secure.</p>}</div>
        <p className="text-xs leading-5 text-slate-500">{snapshot.scope}</p>
      </>}
      <details className="text-xs text-slate-500"><summary className="cursor-pointer font-semibold">Required observer permissions</summary><ul className="mt-2 space-y-1">{data.required_read_actions.map(action => <li key={action}>{action}</li>)}</ul><p className="mt-2 leading-5">Your AWS administrator must approve role changes in AWS. This page never enables a service, launches a penetration test or changes a resource.</p></details>
    </>}
  </section>;
}
