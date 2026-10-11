"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import { useAccount } from "@/components/auth/AccountProvider";
import { apiClient } from "@/lib/api";
import { RequestHelp } from "./RequestHelp";

const SERVICES = [
  { code: "DEPLOYMENT_HELP", name: "Deployment review", scope: "Review a saved design and plan an assisted AWS deployment." },
  { code: "AWS_CONNECTION", name: "AWS connection & monitoring", scope: "Connect an AWS role and define the monitoring data sources." },
  { code: "SECURITY_ASSESSMENT", name: "Security assessment", scope: "Define the systems, risks and authorization for a security review." },
  { code: "VAPT_ASSESSMENT", name: "Vulnerability assessment & penetration testing", scope: "Agree on targets and written testing authorization." },
  { code: "COMPLIANCE_HELP", name: "Compliance scope & preparation", scope: "Choose any framework or describe a custom compliance requirement." },
  { code: "ISO27001_HELP", name: "ISO 27001 preparation", scope: "Define the ISMS scope, controls and evidence requirements." },
  { code: "SOC2_HELP", name: "SOC 2 preparation", scope: "Plan the controls, evidence and independent auditor review." },
  { code: "PRIVACY_HELP", name: "Privacy review", scope: "Review data handling, subprocessors and privacy requirements." },
  { code: "BACKUP_REVIEW", name: "Backup & recovery review", scope: "Review backup records and plan a verified recovery exercise." },
  { code: "COST_REVIEW", name: "Cloud cost review", scope: "Review billing access, usage records and cost decisions." },
  { code: "SUPPORT", name: "Workspace support", scope: "Get help with your business workspace and integrations." },
] as const;
interface Program { framework_code: string; framework_name: string; percentage: number | null; ready_to_apply: boolean; total: number }
export function ServiceRequestCatalog({ applicationId, refresh = 0 }: { applicationId?: string; refresh?: number }) {
  const { organization } = useAccount();
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [frameworkCode, setFrameworkCode] = useState("");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [readinessRefresh, setReadinessRefresh] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSelectedCode(params.get("service") || "");
    setFrameworkCode(params.get("framework") || "");
  }, []);
  useEffect(() => {
    if (!organization) return;
    let active = true, inflight = false;
    setPrograms([]); setLoading(true); setError("");
    async function load() {
      if (inflight) return;
      inflight = true;
      try {
        const result = await apiClient<{ frameworks: Program[] }>("/compliance/workspace-readiness");
        if (active) {
          setPrograms(result.frameworks); setError("");
          setFrameworkCode(value => result.frameworks.some(item => item.framework_code === value) ? value : result.frameworks[0]?.framework_code || "");
        }
      } catch (failure) { if (active) setError(failure instanceof Error ? failure.message : "Unable to check readiness."); }
      finally { inflight = false; if (active) setLoading(false); }
    }
    void load();
    const update = () => { if (document.visibilityState === "visible") void load(); };
    const interval = window.setInterval(update, 30000);
    document.addEventListener("visibilitychange", update);
    return () => { active = false; clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, [organization, readinessRefresh, refresh]);
  const program = programs.find(item => item.framework_code === frameworkCode);
  const services = SERVICES.filter(item => `${item.name} ${item.scope}`.toLowerCase().includes(query.toLowerCase()));
  return <section aria-label="Available services" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
      <div><h2 className="text-lg font-semibold">Request a service</h2><p className="mt-1 text-sm text-slate-500">Choose a service, add the scope and submit it for review.</p></div>
      <div className="flex flex-wrap items-center gap-3"><a href="#request-history" className="text-sm font-semibold text-cyan-700">Request history</a><label className="flex items-center gap-2 rounded-lg border px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input aria-label="Find a service" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a service…" className="w-44 bg-transparent text-sm outline-none" /></label></div>
    </header>
    {!["OWNER", "ADMIN"].includes(organization?.role.toUpperCase() || "") && <p className="border-b bg-slate-50 px-5 py-3 text-sm text-slate-600">Business owners and administrators can submit requests. You can view your business’s request history below.</p>}
    <ul className="divide-y divide-slate-100">
      {services.map(item => <li key={item.code} className={`flex flex-wrap items-center justify-between gap-3 p-5 ${selectedCode === item.code ? "bg-cyan-50/60" : ""}`}>
        <div className="max-w-2xl"><h3 className="text-sm font-semibold">{item.name}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{item.scope}</p></div>
        <RequestHelp code={item.code} label={`Request ${item.name.toLowerCase()}`} applicationId={applicationId} compliancePicker={item.code === "COMPLIANCE_HELP"} />
      </li>)}
      {!services.length && <li className="p-5 text-sm text-slate-500">No services match. <button onClick={() => setQuery("")} className="font-semibold text-cyan-700">Show all services</button></li>}
    </ul>
    <div className="space-y-3 border-t bg-slate-50/50 p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Final compliance review</h3><button aria-label="Refresh review eligibility" disabled={loading} onClick={() => setReadinessRefresh(value => value + 1)} className="rounded-lg border bg-white p-2 disabled:opacity-40"><RefreshCw className="h-4 w-4" /></button></div>
      <p className="text-sm text-slate-500">Available after all mapped controls reach 100% tracked readiness. Scope and preparation requests above remain available earlier.</p>
      {loading && <p role="status" className="text-sm text-slate-500">Checking review eligibility…</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error} Final review is unavailable until readiness can be checked.</p>}
      {!!programs.length && <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm font-medium">Review framework<select aria-label="Review framework" value={frameworkCode} onChange={event => setFrameworkCode(event.target.value)} className="mt-2 block rounded-lg border bg-white px-3 py-2.5">{programs.map(item => <option key={item.framework_code} value={item.framework_code}>{item.framework_name} · {item.percentage === null ? "Not mapped" : `${item.percentage}%`}</option>)}</select></label>
        {program && <RequestHelp key={program.framework_code} code="COMPLIANCE_HELP" label="Request final compliance review" applicationId={applicationId} readinessFramework={{ code: program.framework_code, name: program.framework_name }} disabled={loading || !!error || !program.total || !program.ready_to_apply} />}
      </div>}
      <Link href={`/dashboard/compliance${applicationId ? `?application=${encodeURIComponent(applicationId)}` : ""}`} className="inline-block text-sm font-semibold text-cyan-700">View readiness & remaining requirements</Link>
    </div>
  </section>;
}
