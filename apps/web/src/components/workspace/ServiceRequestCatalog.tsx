"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Cloud, FileCheck2, Fingerprint, LifeBuoy, RefreshCw, Rocket, Search, ShieldCheck, ShieldAlert, DatabaseBackup, Coins, ClipboardCheck } from "lucide-react";
import { useAccount } from "@/components/auth/AccountProvider";
import { apiClient } from "@/lib/api";
import { RequestHelp } from "./RequestHelp";

const SERVICES = [
  { code: "DEPLOYMENT_HELP", name: "Deployment review", icon: Rocket, scope: "Review a saved design and plan an assisted AWS deployment.", includes: ["Saved architecture, source snapshot and deployment requirements review", "Agree on release steps, access, rollback and acceptance checks"], requirements: "Choose a business asset and describe your launch requirements. Its current saved design is attached when available." },
  { code: "AWS_CONNECTION", name: "AWS connection & monitoring", icon: Cloud, scope: "Connect an AWS role and define the monitoring data sources.", includes: ["Review AWS role access and connection requirements", "Define resource visibility, logs, metrics and alert ownership"], requirements: "Describe the AWS account, regions and monitoring sources you need connected. Do not include access keys or credentials." },
  { code: "SECURITY_ASSESSMENT", name: "Security assessment", icon: ShieldCheck, scope: "Define the systems, risks and authorization for a security review.", includes: ["Agree on systems and security review scope", "Review findings, priorities and remediation evidence"], requirements: "Identify the assets and risks to review. Any testing requires agreed targets and written authorization." },
  { code: "VAPT_ASSESSMENT", name: "Vulnerability assessment & penetration testing", icon: ShieldAlert, scope: "Agree on targets and written testing authorization.", includes: ["Define owned targets, permitted methods and testing boundaries", "Agree on findings delivery and remediation review"], requirements: "List the systems you own, testing objectives and constraints. Applying does not authorize or start testing." },
  { code: "COMPLIANCE_HELP", name: "Compliance scope & preparation", icon: ClipboardCheck, scope: "Choose any framework or describe a custom compliance requirement.", includes: ["Select a framework and define the business scope", "Plan applicable controls, evidence and preparation gaps"], requirements: "Choose a framework or type a custom requirement in the application. Preparation is available before final-review readiness reaches 100%." },
  { code: "ISO27001_HELP", name: "ISO 27001 preparation", icon: FileCheck2, scope: "Define the ISMS scope, controls and evidence requirements.", includes: ["Plan ISMS scope, risks, policies and control evidence", "Identify preparation gaps before independent certification review"], requirements: "Describe the business processes, systems and intended certification scope. Preparation does not itself provide certification." },
  { code: "SOC2_HELP", name: "SOC 2 preparation", icon: FileCheck2, scope: "Plan the controls, evidence and independent auditor review.", includes: ["Define the system boundary and relevant Trust Services Criteria", "Plan evidence collection and independent auditor readiness"], requirements: "Describe your system, intended report type and audit timing. A preparation request is not an auditor attestation." },
  { code: "PRIVACY_HELP", name: "Privacy review", icon: Fingerprint, scope: "Review data handling, subprocessors and privacy requirements.", includes: ["Scope personal-data handling, retention and subprocessors", "Identify privacy records and actions requiring review"], requirements: "Describe the types of data, business processes and jurisdictions involved. Do not include personal records in this form." },
  { code: "BACKUP_REVIEW", name: "Backup & recovery review", icon: DatabaseBackup, scope: "Review backup records and plan a verified recovery exercise.", includes: ["Review backup coverage, retention and recovery objectives", "Plan restore checks and capture recovery evidence"], requirements: "Identify the databases, storage and recovery targets. Describe existing backups and any restore results." },
  { code: "COST_REVIEW", name: "Cloud cost review", icon: Coins, scope: "Review billing access, usage records and cost decisions.", includes: ["Define billing and usage data available for review", "Review cost drivers and proposed optimization decisions"], requirements: "Describe the AWS accounts, services and spending concerns. Actual savings require billing and usage evidence." },
  { code: "SUPPORT", name: "Workspace support", icon: LifeBuoy, scope: "Get help with your business workspace and integrations.", includes: ["Review workspace or integration issues", "Agree on next steps and track the resolution in your request"], requirements: "Describe the issue, affected business asset and steps that reproduce it. Leave passwords and secret keys out." },
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
      <div><h2 className="text-lg font-semibold">Request a service</h2><p className="mt-1 text-sm text-slate-500">Select a service to view its details and apply.</p></div>
      <div className="flex flex-wrap items-center gap-3"><a href="#request-history" className="text-sm font-semibold text-cyan-700">Request history</a><label className="flex items-center gap-2 rounded-lg border px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input aria-label="Find a service" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a service…" className="w-44 bg-transparent text-sm outline-none" /></label></div>
    </header>
    {!["OWNER", "ADMIN"].includes(organization?.role.toUpperCase() || "") && <p className="border-b bg-slate-50 px-5 py-3 text-sm text-slate-600">Business owners and administrators can submit requests. You can view your business’s request history below.</p>}
    <ul className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
      {services.map(item => <li key={item.code}>
        <RequestHelp code={item.code} label={`Apply for ${item.name}`} applicationId={applicationId} compliancePicker={item.code === "COMPLIANCE_HELP"}
          details={{ title: item.name, description: item.scope, includes: item.includes, requirements: item.requirements }}
          triggerClassName={`group flex h-full w-full flex-col items-start rounded-xl border p-5 text-left transition hover:border-cyan-300 hover:bg-cyan-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 ${selectedCode === item.code ? "border-cyan-300 bg-cyan-50/60" : "border-slate-200 bg-slate-50/40"}`}
          trigger={<><span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-100 bg-cyan-50 text-cyan-700"><item.icon className="h-5 w-5" /></span><span className="text-base font-semibold text-slate-900">{item.name}</span><span className="mt-2 text-sm leading-6 text-slate-500">{item.scope}</span><span className="mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-cyan-700">View details<ArrowUpRight className="h-4 w-4" /></span></>} />
      </li>)}
      {!services.length && <li className="text-sm text-slate-500 sm:col-span-2 xl:col-span-3">No services match. <button onClick={() => setQuery("")} className="font-semibold text-cyan-700">Show all services</button></li>}
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
