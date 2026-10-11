"use client";
import { useEffect, useRef, useState } from "react";
import { Settings2, X, Plus, Trash2 } from "lucide-react";
import type { ArchitectureGraph } from "./CloudDiagram";
import type { SourceModule } from "./codeArchitecture";
import type { DeploymentRequirements } from "./ProductionDiagram";
import { RequirementsForm } from "./RequirementsForm";
import { SecureTrafficDesign } from "./SecureTrafficDesign";
import { NetworkReview, networkPlacement } from "./networkPlacement";
import { privateStorageProposal, isS3Storage } from "./privateStorage";
import { arrangeBusinessArchitecture } from "./businessArchitecture";
import { isFrontendWorkload } from "./workloadRole";

type Protocol = "https" | "http" | "postgresql" | "mysql" | "redis" | "rediss" | "mongodb" | "mongodb+srv" | "s3" | "unknown";
export interface EnvironmentConnection { name: string; source: string; target: string | null; protocol: Protocol; execution?: "browser" | "server"; references?: { path: string; line: number }[]; }
const protocols: Protocol[] = ["unknown", "https", "http", "postgresql", "mysql", "redis", "rediss", "mongodb", "mongodb+srv", "s3"];

// Values never leave the browser: extract only a key and allowlisted protocol.
function namesFromEnvironment(text: string): Pick<EnvironmentConnection, "name" | "protocol">[] {
  if (text.length > 64000) throw new Error("Paste at most 64 KB of environment settings.");
  const result = new Map<string, Pick<EnvironmentConnection, "name" | "protocol">>();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]{0,79})\s*(?:=\s*(.*))?$/.exec(line.trim());
    if (!match) throw new Error("Use one environment key or KEY=value assignment per line. Multiline values are not supported.");
    const scheme = /^['"]?([a-z+]+):\/\//i.exec(match[2] || "")?.[1]?.toLowerCase();
    const protocol = scheme === "postgres" ? "postgresql" : protocols.includes(scheme as Protocol) ? scheme as Protocol : "unknown";
    result.set(match[1], { name: match[1], protocol });
  }
  if (result.size > 60) throw new Error("Map up to 60 environment keys per business asset.");
  return [...result.values()];
}

export function ArchitectureSettings({ graph, requirements, connections, modules, version, disabled, proposalPending, blockedReason, saving, errorMessage, onRequirements, onConnections, onGraph }: {
  graph: ArchitectureGraph; requirements?: DeploymentRequirements; connections: EnvironmentConnection[]; modules: SourceModule[]; version: string;
  disabled: boolean; proposalPending?: boolean; blockedReason?: string; saving: boolean;
  errorMessage?: string | null;
  onRequirements: (value: DeploymentRequirements) => Promise<boolean>;
  onConnections: (value: EnvironmentConnection[]) => Promise<boolean>;
  onGraph: (value: ArchitectureGraph) => void;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState("traffic");
  const [raw, setRaw] = useState("");
  const [source, setSource] = useState("");
  const [bindings, setBindings] = useState<EnvironmentConnection[]>(connections);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState("");
  const workloads = graph.nodes.filter(node => node.zone === "APPLICATION");
  const allowedDestination = (entry: Pick<EnvironmentConnection, "source" | "execution" | "name">, node: ArchitectureGraph["nodes"][number]) => {
    const workload = workloads.find(item => item.id === entry.source);
    const internal = networkPlacement(node) === "PRIVATE_INGRESS";
    const serverProxy = entry.execution === "server" && !!workload && /proxy/i.test(workload.service) && !/^(?:NEXT_PUBLIC_|VITE_|REACT_APP_|PUBLIC_)/i.test(entry.name);
    return node.id !== entry.source && node.zone !== "SUPPORT" &&
      (!workload || !isFrontendWorkload(workload) ||
        (node.zone === "EDGE" && /application load balancer|api gateway|cloudfront/i.test(node.service) && (!internal || serverProxy)));
  };
  useEffect(() => { setBindings(connections); }, [version, connections]);
  const close = () => { if (saving) return; setRaw(""); modal.current?.close(); };
  const refs = (name: string) => modules.flatMap(module => (module.environment_keys || []).filter(key => key.name === name).map(key => `${module.path}:${key.line}`));
  const update = (index: number, changes: Partial<EnvironmentConnection>) => setBindings(current => current.map((entry, i) => i === index ? { ...entry, ...changes } : entry));
  const add = (entries: Pick<EnvironmentConnection, "name" | "protocol">[]) => {
    if (!source) { setError("Select the workload these keys belong to."); return; }
    const next = [...bindings];
    for (const entry of entries) {
      if (next.some(existing => existing.source === source && existing.name === entry.name)) continue;
      const pattern = entry.protocol === "mysql" ? /mysql|mariadb/i
        : /mongodb/.test(entry.protocol) ? /mongo|documentdb/i
        : /postgres|database|db_url/i.test(entry.name) || entry.protocol === "postgresql" ? /postgres/i
        : /redis|cache/i.test(entry.name) || /redis/.test(entry.protocol) ? /redis/i
        : /s3|bucket/i.test(entry.name) ? /\bs3\b(?!.*endpoint)/i
        : /api.*(?:url|endpoint)|backend.*url/i.test(entry.name) ? /application load balancer|api gateway/i : null;
      const sourceNode = workloads.find(node => node.id === source);
      const execution = sourceNode && isFrontendWorkload(sourceNode) ? "browser" : "server";
      const candidates = pattern ? graph.nodes.filter(node => allowedDestination({ ...entry, source, execution }, node) && pattern.test(node.service) && (!/load balancer/i.test(node.service) || /api/i.test(node.label))) : [];
      next.push({ ...entry, source, execution, target: candidates.length === 1 ? candidates[0].id : null });
    }
    if (next.length > 60) { setError("Map up to 60 keys per business asset."); return; }
    setBindings(next); setRaw(""); setError(""); setReceipt("Names extracted. Review suggested destinations before saving. Values were discarded.");
  };
  return <>
    <button disabled={disabled && !graph.nodes.length} onClick={() => { setError(""); setReceipt(""); modal.current?.showModal(); }} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><Settings2 className="h-4 w-4" />Settings</button>
    <dialog ref={modal} aria-labelledby="architecture-settings-title" onCancel={event => { if (saving) event.preventDefault(); else setRaw(""); }} onClose={() => setRaw("")} className="m-auto w-[calc(100%_-_2rem)] max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40">
      <div className="flex items-start justify-between gap-4"><div><h2 id="architecture-settings-title" className="text-lg font-bold">Architecture settings</h2><p className="mt-1 text-xs text-slate-500">{version} · Plan capacity and map the connections between your business assets.</p></div><button disabled={saving} aria-label="Close architecture settings" onClick={close}><X className="h-5 w-5" /></button></div>
      <div className="my-5 flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1">{[["traffic", "Traffic & availability"], ["environment", "Environment & connections"], ["network", "Network & placement"]].map(([id, label]) => <button key={id} aria-pressed={tab === id} onClick={() => { setTab(id); setError(""); }} className={`rounded-lg px-4 py-2 text-xs font-semibold ${tab === id ? "bg-white shadow-sm" : "text-slate-500"}`}>{label}</button>)}</div>
      <div hidden={tab !== "network"} className="space-y-4"><NetworkReview graph={graph} /><SecureTrafficDesign graph={graph} disabled={disabled || saving || !!proposalPending} onApply={value => { onGraph(value); close(); }} /><p className="text-xs leading-5 text-slate-500">Review secure traffic places selected frontends in AWS public subnets and backend tasks in private subnets, using controlled HTTPS ingress. Per-component placement is also available by selecting its diagram card.</p><button disabled={disabled || saving || !!proposalPending || !graph.nodes.some(node => isS3Storage(node))} onClick={() => { try { onGraph(arrangeBusinessArchitecture(privateStorageProposal(graph, graph.nodes.filter(node => isS3Storage(node)).map(node => node.id)))); close(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to prepare private storage."); } }} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40">Propose private S3 access for existing consumers</button><ul className="divide-y text-xs">{graph.nodes.map(node => <li key={node.id} className="flex flex-wrap justify-between gap-2 py-2"><strong>{node.label}</strong><span className="text-slate-500">{networkPlacement(node).replaceAll("_", " ").toLowerCase()}</span></li>)}</ul></div>
      <div hidden={tab !== "traffic"}><RequirementsForm value={requirements} workloads={workloads} disabled={disabled || saving} saving={saving} saveBlockedReason={blockedReason} onSave={value => { void onRequirements(value).then(ok => { if (ok) setReceipt("Traffic targets and the selected workload’s capacity proposal were saved in a new design version."); }); }} /></div>
      <div hidden={tab !== "environment"} className="space-y-4">
        <p className="text-sm leading-6 text-slate-600">Add environment key names or paste assignments to identify connection types. Only names, protocol and your selected components are saved. Secret values, usernames, URLs and passwords stay in this browser and are discarded after extraction. Configure deployment secrets in your secret manager.</p>
        <label className="block text-xs font-semibold">Workload for these keys<select value={source} disabled={disabled || saving} onChange={event => setSource(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2"><option value="">Choose frontend, backend or worker</option>{workloads.map(node => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
        <label className="block text-xs font-semibold">Environment keys<textarea aria-label="Environment keys" autoComplete="off" spellCheck={false} value={raw} maxLength={64000} disabled={disabled || saving} onChange={event => setRaw(event.target.value)} placeholder={"DATABASE_URL\nREDIS_URL\nNEXT_PUBLIC_API_URL"} rows={4} className="mt-1 w-full rounded-lg border p-3 font-mono text-xs" style={{ WebkitTextSecurity: "disc" } as React.CSSProperties} /></label>
        <div className="flex flex-wrap gap-2"><button disabled={!raw.trim() || !source || disabled || saving} onClick={() => { try { add(namesFromEnvironment(raw)); } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to read keys."); } }} className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Extract names & suggest connections</button><button disabled={!source || disabled || saving} onClick={() => add([...new Map(modules.flatMap(module => (module.environment_keys || []).map(key => [key.name, { name: key.name, protocol: "unknown" as Protocol }] as const))).values()])} className="rounded-lg border px-3 py-2 text-xs">Use keys found in source</button></div>
        <p className="text-xs leading-5 text-slate-500">Detected references come from a bounded static source sample. They can include inactive code. The workload association and destination are your declaration; neither proves a live connection.</p>
        <p className="text-xs leading-5 text-slate-500">Browser keys cannot point to private API ingress. For a frontend server proxy, explicitly select Server only and a server-only key. NEXT_PUBLIC_, VITE_, REACT_APP_ and PUBLIC_ keys stay browser-visible; use a same-origin /api path, not a private address.</p>
        <div className="space-y-3">{bindings.map((entry, index) => <article key={`${entry.source}-${entry.name}`} className="rounded-xl border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2"><strong className="break-all font-mono text-xs">{entry.name}</strong><button disabled={disabled || saving} aria-label={`Remove environment key ${entry.name} from ${entry.source}`} onClick={() => setBindings(current => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-slate-500" /></button></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-slate-500">Source<select aria-label={`Source for ${entry.name}`} value={entry.source} disabled={disabled || saving} onChange={event => update(index, { source: event.target.value, target: null, execution: "browser" })} className="mt-1 w-full rounded-lg border bg-white p-2 text-slate-900">{workloads.map(node => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
            <label className="text-xs text-slate-500">Execution<select aria-label={`Execution for ${entry.name}`} value={entry.execution || "browser"} disabled={disabled || saving} onChange={event => update(index, { execution: event.target.value as "browser" | "server", target: null })} className="mt-1 w-full rounded-lg border bg-white p-2 text-slate-900"><option value="browser">Browser visible</option><option value="server">Server only · implementation required</option></select></label>
            <label className="text-xs text-slate-500">Destination<select aria-label={`Destination for ${entry.name}`} value={entry.target || ""} disabled={disabled || saving} onChange={event => update(index, { target: event.target.value || null })} className="mt-1 w-full rounded-lg border bg-white p-2 text-slate-900"><option value="">Key only · connection unresolved</option>{graph.nodes.filter(node => allowedDestination(entry, node)).map(node => <option key={node.id} value={node.id}>{node.label} · {node.service}</option>)}</select></label>
            <label className="text-xs text-slate-500">Protocol<select aria-label={`Protocol for ${entry.name}`} disabled={disabled || saving} value={entry.protocol} onChange={event => update(index, { protocol: event.target.value as Protocol })} className="mt-1 w-full rounded-lg border bg-white p-2 text-slate-900">{protocols.map(protocol => <option key={protocol} value={protocol}>{protocol}</option>)}</select></label></div>
          <details className="text-xs text-slate-500"><summary className="cursor-pointer">Source references · {refs(entry.name).length}</summary>{refs(entry.name).length ? <ul className="mt-2 space-y-1 break-all">{refs(entry.name).map(ref => <li key={ref}>{ref}</li>)}</ul> : <p className="mt-2">No reference found in the inspected sample. Refresh source findings to inspect current code.</p>}</details>
        </article>)}</div>
        {!bindings.length && <p className="rounded-xl border border-dashed p-4 text-sm text-slate-500"><Plus className="mb-2 h-5 w-5" />Add keys to map dependencies. Unknown connections stay unresolved until you choose a destination.</p>}
        {blockedReason && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{blockedReason}</p>}
        <button disabled={disabled || saving || !!blockedReason} onClick={() => { setError(""); void onConnections(bindings.map(({ name, source, target, protocol, execution }) => ({ name, source, target, protocol, execution: execution || "browser" }))).then(ok => { if (ok) setReceipt("Environment connection metadata saved. Declared edges are mapped in the architecture; secret values were not stored."); }); }} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{saving ? "Saving…" : "Save connection mapping"}</button>
      </div>
      {(error || errorMessage) && <p role="alert" className="mt-4 text-sm text-rose-700">{error || errorMessage}</p>}{receipt && <p role="status" className="mt-4 rounded-lg bg-cyan-50 p-3 text-xs leading-5 text-cyan-800">{receipt}</p>}
      <div className="mt-5 border-t pt-3 text-xs text-slate-500">Saving creates a version and clears its design approval. Mapping changes do not configure runtime credentials or deploy infrastructure.</div>
    </dialog>
  </>;
}
