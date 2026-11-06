"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, ExternalLink, KeyRound, Loader2, Plug, RefreshCw, Trash2, X } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";

type Provider = "VERCEL" | "RENDER" | "NEON" | "CLOUDINARY";
type Status = "HEALTHY" | "DEPLOYING" | "DEGRADED" | "FAILED" | "SUSPENDED" | "UNKNOWN";

interface Deployment { id: string; state: string; target: string; created_at?: string | null; url?: string | null; commit?: string; message?: string; branch?: string | null }
interface Link { provider: Provider; resource_id: string; via: string; evidence: "ENV_HOST_MATCH" | "ENV_NAME_ONLY" }
interface Resource {
  id: string; connection_id: string; provider: Provider; kind: string; name: string; framework?: string | null;
  status: Status; status_detail?: string; urls: string[]; domains?: string[]; repo?: string | null; branch?: string | null;
  region?: string | null; plan?: string | null; instances?: number | null; deployments: Deployment[]; env_keys: string[];
  links?: Link[]; dashboard_url?: string | null; metrics?: Record<string, any>;
  branches?: { id: string; name: string; default: boolean; state?: string; logical_size?: number }[];
  endpoints?: { id: string; branch_id: string; type: string; state: string; host: string; min_cu: number; max_cu: number; suspend_timeout_seconds?: number; disabled: boolean }[];
  presets?: { id: string; name: string; unsigned: boolean; folder?: string | null }[];
  folders?: { id: string; name: string; path: string }[];
}
interface Connection { id: string; provider: Provider; label: string; account_name?: string | null; account_ref: string; credential_hint: string; status: string; last_error?: string | null; last_synced_at?: string | null; resource_count: number }
interface Alert { severity: "critical" | "warning" | "info"; provider: Provider; resource_id: string | null; resource: string; message: string }
interface Probe { url: string; ok: boolean; status_code: number | null; latency_ms: number | null; error: string | null; resource_id: string; checked_at: string }
interface Overview { connections: Connection[]; resources: Resource[]; alerts: Alert[]; probes: Probe[]; last_synced_at: string | null; summary: Record<Status, number>; scope: string }
interface ActionSpec { name: string; label: string; risk: "LOW" | "MEDIUM" | "HIGH"; kinds: string[]; description: string; params: Record<string, string>; may_change_bill: boolean }
interface Catalog { providers: { provider: Provider; label: string; credential_fields: Record<string, string>; actions: ActionSpec[] }[]; scope: string }

const LABEL: Record<Provider, string> = { VERCEL: "Vercel", RENDER: "Render", NEON: "Neon", CLOUDINARY: "Cloudinary" };
const LANES: { id: string; title: string; match: (r: Resource) => boolean }[] = [
  { id: "edge", title: "Frontends · Vercel", match: r => r.kind === "frontend" || r.kind === "static_site" },
  { id: "app", title: "Services · Render", match: r => ["web_service", "private_service", "worker", "cron"].includes(r.kind) },
  { id: "data", title: "Data & media · Neon, Cloudinary", match: r => r.kind === "database" || r.kind === "media" },
];
const STATUS_STYLE: Record<Status, string> = {
  HEALTHY: "bg-emerald-50 text-emerald-700 border-emerald-200", DEPLOYING: "bg-sky-50 text-sky-700 border-sky-200",
  DEGRADED: "bg-amber-50 text-amber-800 border-amber-200", FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  SUSPENDED: "bg-slate-100 text-slate-600 border-slate-300", UNKNOWN: "bg-slate-50 text-slate-500 border-slate-200",
};
const DOT: Record<Status, string> = { HEALTHY: "bg-emerald-500", DEPLOYING: "bg-sky-500", DEGRADED: "bg-amber-500", FAILED: "bg-rose-500", SUSPENDED: "bg-slate-400", UNKNOWN: "bg-slate-300" };
const CREDENTIAL_LABEL: Record<string, string> = { token: "Access token", team_id: "Team ID (optional)", api_key: "API key", owner_id: "Workspace ID (optional)", org_id: "Organization ID (optional)", cloud_name: "Cloud name", api_secret: "API secret" };
const CU = [0.25, 0.5, 1, 2, 3, 4, 6, 8];

function message(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : "Request failed."; }
function when(value?: string | null) { if (!value) return "never"; const d = new Date(value); return isNaN(+d) ? value : d.toLocaleString(); }
function bytes(value?: number | null) { if (value == null) return "—"; const units = ["B", "KB", "MB", "GB", "TB"]; let n = value, i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; } return `${n.toFixed(n < 10 && i ? 1 : 0)} ${units[i]}`; }

export function HostingWorkspace({ active }: { active: boolean }) {
  const { organization } = useAccount();
  const canManage = ["OWNER", "ADMIN"].includes(organization?.role?.toUpperCase() ?? "");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = useCallback(async () => {
    try {
      const [data, actions] = await Promise.all([apiClient<Overview>("/hosting/overview"), catalog ? Promise.resolve(catalog) : apiClient<Catalog>("/hosting/providers")]);
      setOverview(data); setCatalog(actions); setError(null);
    } catch (e) { setError(message(e)); }
  }, [catalog]);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setBusy("refresh");
    try {
      const result = await apiClient<{ refreshed: boolean; errors?: { message: string }[] }>("/hosting/refresh", { method: "POST", timeout: 180000 });
      if (!quiet && result.errors?.length) setError(result.errors.map(e => e.message).join(" · "));
      await load();
    } catch (e) { if (!quiet) setError(message(e)); }
    finally { if (!quiet) setBusy(null); }
  }, [load]);

  useEffect(() => { if (active && !overview) void load(); }, [active, overview, load]);
  useEffect(() => {
    if (!active || !autoRefresh || !overview?.connections.length) return;
    const timer = window.setInterval(() => void refresh(true), 60000);
    return () => window.clearInterval(timer);
  }, [active, autoRefresh, overview?.connections.length, refresh]);

  const resources = overview?.resources ?? [];
  const selected = resources.find(r => r.id === selectedId) ?? null;
  const probesFor = (id: string) => (overview?.probes ?? []).filter(p => p.resource_id === id);

  if (!overview) {
    return <div className="flex-1 grid place-items-center text-sm text-slate-500">{error ? <span role="alert" className="text-rose-700">{error}</span> : <span className="inline-flex gap-2 items-center"><Loader2 className="h-4 w-4 animate-spin" />Loading current hosting…</span>}</div>;
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-100 text-xs">
        {(["HEALTHY", "DEPLOYING", "DEGRADED", "FAILED", "SUSPENDED"] as Status[]).filter(s => overview.summary[s]).map(s => (
          <span key={s} className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold ${STATUS_STYLE[s]}`}><span className={`h-1.5 w-1.5 rounded-full ${DOT[s]}`} />{overview.summary[s]} {s.toLowerCase()}</span>
        ))}
        <span className="text-slate-500">Last refresh: {when(overview.last_synced_at)}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-slate-600"><input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} disabled={!overview.connections.length} />Auto-refresh every minute</label>
          <button onClick={() => void refresh()} disabled={!!busy || !overview.connections.length} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 disabled:opacity-40">
            <RefreshCw className={`h-3.5 w-3.5 ${busy === "refresh" ? "animate-spin" : ""}`} />{busy === "refresh" ? "Checking providers…" : "Refresh & health-check"}
          </button>
          <button onClick={() => setConnectOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-2.5 py-1.5 font-semibold text-white"><Plug className="h-3.5 w-3.5" />Providers ({overview.connections.length})</button>
        </div>
      </div>
      {error && <div role="alert" className="flex items-center gap-2 px-3 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs">{error}<button aria-label="Dismiss" className="ml-auto" onClick={() => setError(null)}><X className="h-4 w-4" /></button></div>}
      {overview.alerts.length > 0 && (
        <ul aria-label="Hosting alerts" className="max-h-24 overflow-auto px-3 py-1.5 border-b border-slate-100 space-y-1 text-xs">
          {overview.alerts.map((a, i) => (
            <li key={i}><button disabled={!a.resource_id} onClick={() => a.resource_id && setSelectedId(a.resource_id)} className="inline-flex items-center gap-1.5 text-left disabled:cursor-default">
              <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${a.severity === "critical" ? "text-rose-600" : a.severity === "warning" ? "text-amber-600" : "text-slate-400"}`} />
              <span className="font-semibold">{LABEL[a.provider]} · {a.resource}</span><span className="text-slate-600">{a.message}</span>
            </button></li>
          ))}
        </ul>
      )}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 overflow-auto">
          {resources.length ? <Topology resources={resources} selectedId={selectedId} onSelect={setSelectedId} probesFor={probesFor} />
            : <EmptyState hasConnections={!!overview.connections.length} canManage={canManage} onConnect={() => setConnectOpen(true)} onRefresh={() => void refresh()} />}
          <p className="px-4 pb-4 text-[11px] text-slate-500">{overview.scope} Solid lines: env var value points at that service. Dashed: inferred from the variable name only.</p>
        </div>
        {selected && catalog && (
          <ResourcePanel key={selected.id} resource={selected} resources={resources} probes={probesFor(selected.id)} canManage={canManage}
            actions={catalog.providers.find(p => p.provider === selected.provider)?.actions.filter(a => a.kinds.includes(selected.kind)) ?? []}
            onClose={() => setSelectedId(null)} onDone={() => void refresh(true)} />
        )}
      </div>
      {connectOpen && catalog && <ProvidersDialog catalog={catalog} connections={overview.connections} canManage={canManage} onClose={() => setConnectOpen(false)} onChanged={() => void load()} />}
    </div>
  );
}

function EmptyState({ hasConnections, canManage, onConnect, onRefresh }: { hasConnections: boolean; canManage: boolean; onConnect: () => void; onRefresh: () => void }) {
  return (
    <div className="m-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
      <CircleDashed className="mx-auto mb-3 h-6 w-6 text-slate-400" />
      {hasConnections ? <>Providers are connected. <button onClick={onRefresh} className="font-semibold text-cyan-700 underline">Refresh</button> to read your projects, services, databases and media.</>
        : <>Connect Vercel, Render, Neon and Cloudinary to see the infrastructure your apps actually run on, monitor it and manage it here.{" "}
          {canManage ? <button onClick={onConnect} className="font-semibold text-cyan-700 underline">Connect a provider</button> : "Ask an owner or administrator to connect providers."}</>}
    </div>
  );
}

function Topology({ resources, selectedId, onSelect, probesFor }: { resources: Resource[]; selectedId: string | null; onSelect: (id: string) => void; probesFor: (id: string) => Probe[] }) {
  const box = useRef<HTMLDivElement>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const [paths, setPaths] = useState<{ d: string; dashed: boolean; key: string; active: boolean }[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const links = useMemo(() => resources.flatMap(r => (r.links ?? []).map(l => ({ from: r.id, to: l.resource_id, dashed: l.evidence === "ENV_NAME_ONLY", via: l.via }))), [resources]);

  const measure = useCallback(() => {
    const root = box.current?.getBoundingClientRect();
    if (!root) return;
    setSize({ w: box.current!.scrollWidth, h: box.current!.scrollHeight });
    setPaths(links.flatMap(link => {
      const a = cards.current.get(link.from)?.getBoundingClientRect(), b = cards.current.get(link.to)?.getBoundingClientRect();
      if (!a || !b) return [];
      const forward = b.left >= a.right - 4;
      const x1 = (forward ? a.right : a.left) - root.left, y1 = a.top + a.height / 2 - root.top;
      const x2 = (forward ? b.left : b.right) - root.left, y2 = b.top + b.height / 2 - root.top;
      const bend = Math.max(40, Math.abs(x2 - x1) / 2) * (forward ? 1 : -1);
      return [{ d: `M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}`, dashed: link.dashed, key: `${link.from}-${link.to}-${link.via}`, active: link.from === selectedId || link.to === selectedId }];
    }));
  }, [links, selectedId]);

  useLayoutEffect(() => { measure(); }, [measure, resources]);
  useEffect(() => {
    const observer = new ResizeObserver(() => measure());
    if (box.current) observer.observe(box.current);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div ref={box} className="relative grid min-w-[760px] grid-cols-3 gap-14 p-6">
      <svg aria-hidden className="pointer-events-none absolute inset-0" width={size.w} height={size.h}>
        <defs><marker id="hosting-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#64748b" /></marker></defs>
        {paths.map(p => <path key={p.key} d={p.d} fill="none" stroke={p.active ? "#0891b2" : "#94a3b8"} strokeWidth={p.active ? 2 : 1.25} strokeDasharray={p.dashed ? "5 4" : undefined} markerEnd="url(#hosting-arrow)" />)}
      </svg>
      {LANES.map(lane => (
        <section key={lane.id} aria-label={lane.title} className="relative flex flex-col gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{lane.title}</h3>
          {resources.filter(lane.match).map(r => {
            const probes = probesFor(r.id), failing = probes.some(p => !p.ok && !(p.error ?? "").startsWith("Skipped"));
            const latency = probes.find(p => p.ok)?.latency_ms;
            return (
              <button key={r.id} ref={el => { if (el) cards.current.set(r.id, el); else cards.current.delete(r.id); }} onClick={() => onSelect(r.id)} aria-pressed={selectedId === r.id}
                className={`relative z-10 rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-cyan-400 ${selectedId === r.id ? "border-cyan-500 ring-2 ring-cyan-100" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{r.name}</p><p className="truncate text-[11px] text-slate-500">{LABEL[r.provider]} · {r.kind.replace("_", " ")}{r.framework ? ` · ${r.framework}` : ""}</p></div>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[r.status]}`}>{r.status.toLowerCase()}</span>
                </div>
                <p className="mt-1.5 truncate text-[11px] text-slate-600">{r.urls[0]?.replace("https://", "") ?? r.region ?? r.status_detail}</p>
                {probes.length > 0 && <p className={`mt-1 text-[11px] font-medium ${failing ? "text-rose-700" : "text-emerald-700"}`}>{failing ? "Health check failing" : `Responding${latency != null ? ` · ${latency} ms` : ""}`}</p>}
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function ResourcePanel({ resource, resources, probes, actions, canManage, onClose, onDone }: { resource: Resource; resources: Resource[]; probes: Probe[]; actions: ActionSpec[]; canManage: boolean; onClose: () => void; onDone: () => void }) {
  const names = new Map(resources.map(r => [r.id, r.name]));
  const inbound = resources.flatMap(r => (r.links ?? []).filter(l => l.resource_id === resource.id).map(l => ({ from: r.name, via: l.via })));
  const meters = resource.metrics?.meters as Record<string, { usage: number; limit: number; used_percent: number }> | undefined;
  return (
    <aside aria-label={`${resource.name} details`} className="w-[380px] shrink-0 overflow-auto border-l border-slate-200 bg-white p-4 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div><h2 className="text-base font-bold text-slate-900">{resource.name}</h2><p className="text-slate-500">{LABEL[resource.provider]} · {resource.kind.replace("_", " ")}{resource.region ? ` · ${resource.region}` : ""}</p></div>
        <button aria-label="Close details" onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      <p className={`mt-2 inline-flex rounded-full border px-2 py-0.5 font-semibold ${STATUS_STYLE[resource.status]}`}>{resource.status_detail ?? resource.status}</p>
      <dl className="mt-3 grid grid-cols-[96px_1fr] gap-x-2 gap-y-1">
        {resource.repo && <><dt className="text-slate-500">Repository</dt><dd className="truncate">{resource.repo}{resource.branch ? ` @ ${resource.branch}` : ""}</dd></>}
        {resource.plan && <><dt className="text-slate-500">Plan</dt><dd>{resource.plan}{resource.instances ? ` · ${resource.instances} instance(s)` : ""}</dd></>}
        {resource.urls.map(u => <Fragment key={u}><dt className="text-slate-500">URL</dt><dd className="truncate"><a className="text-cyan-700 underline" href={u} target="_blank" rel="noreferrer">{u.replace("https://", "")}</a></dd></Fragment>)}
        {resource.metrics?.storage_bytes != null && <><dt className="text-slate-500">Storage</dt><dd>{bytes(resource.metrics.storage_bytes)}</dd></>}
        {resource.dashboard_url && <><dt className="text-slate-500">Console</dt><dd><a className="inline-flex items-center gap-1 text-cyan-700 underline" href={resource.dashboard_url} target="_blank" rel="noreferrer">Open <ExternalLink className="h-3 w-3" /></a></dd></>}
      </dl>
      {(resource.links?.length || inbound.length) ? (
        <section className="mt-3"><h3 className="font-semibold text-slate-700">Connections</h3>
          <ul className="mt-1 space-y-0.5 text-slate-600">
            {resource.links?.map(l => <li key={l.resource_id + l.via}>→ {names.get(l.resource_id) ?? l.resource_id} <span className="text-slate-400">via {l.via}{l.evidence === "ENV_NAME_ONLY" ? " (name only)" : ""}</span></li>)}
            {inbound.map(l => <li key={l.from + l.via}>← {l.from} <span className="text-slate-400">via {l.via}</span></li>)}
          </ul></section>) : null}
      {probes.length > 0 && <section className="mt-3"><h3 className="font-semibold text-slate-700">Health checks</h3>
        <ul className="mt-1 space-y-0.5">{probes.map(p => <li key={p.url} className="flex gap-1.5">{p.ok ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />}<span className="truncate">{p.url.replace("https://", "")}</span><span className="ml-auto text-slate-500">{p.status_code ?? p.error}{p.latency_ms != null ? ` · ${p.latency_ms} ms` : ""}</span></li>)}</ul></section>}
      {meters && <section className="mt-3"><h3 className="font-semibold text-slate-700">Plan usage</h3>
        {Object.entries(meters).map(([name, m]) => <div key={name} className="mt-1"><div className="flex justify-between"><span className="capitalize">{name}</span><span>{m.used_percent != null ? `${m.used_percent.toFixed(0)}%` : m.usage}</span></div>
          {m.used_percent != null && <div className="h-1.5 rounded bg-slate-100"><div className={`h-1.5 rounded ${m.used_percent >= 80 ? "bg-amber-500" : "bg-cyan-600"}`} style={{ width: `${Math.min(100, m.used_percent)}%` }} /></div>}</div>)}</section>}
      {resource.endpoints?.length ? <section className="mt-3"><h3 className="font-semibold text-slate-700">Compute</h3>
        <ul className="mt-1 space-y-0.5">{resource.endpoints.map(e => <li key={e.id}>{e.id} · {resource.branches?.find(b => b.id === e.branch_id)?.name ?? e.branch_id} · {e.state}{e.disabled ? " (disabled)" : ""} · {e.min_cu}–{e.max_cu} CU</li>)}</ul></section> : null}
      {resource.branches?.length ? <section className="mt-3"><h3 className="font-semibold text-slate-700">Branches</h3>
        <ul className="mt-1 space-y-0.5">{resource.branches.map(b => <li key={b.id}>{b.name}{b.default ? " (default)" : ""} · {bytes(b.logical_size)}</li>)}</ul></section> : null}
      {resource.presets?.length ? <section className="mt-3"><h3 className="font-semibold text-slate-700">Upload presets</h3>
        <ul className="mt-1 space-y-0.5">{resource.presets.map(p => <li key={p.id}>{p.name} · {p.unsigned ? "unsigned" : "signed"}{p.folder ? ` · ${p.folder}` : ""}</li>)}</ul></section> : null}
      {resource.deployments.length > 0 && <section className="mt-3"><h3 className="font-semibold text-slate-700">Recent deployments</h3>
        <ul className="mt-1 space-y-1">{resource.deployments.slice(0, 6).map(d => <li key={d.id} className="rounded border border-slate-100 px-2 py-1"><div className="flex justify-between gap-2"><span className="font-medium">{d.state.toLowerCase().replace(/_/g, " ")}</span><span className="text-slate-500">{d.target} · {when(d.created_at)}</span></div>{(d.commit || d.message) && <p className="truncate text-slate-500">{d.commit} {d.message}</p>}</li>)}</ul></section>}
      {resource.env_keys.length > 0 && <section className="mt-3"><h3 className="font-semibold text-slate-700">Environment variables <span className="font-normal text-slate-400">(names only)</span></h3>
        <p className="mt-1 break-words font-mono text-[11px] text-slate-600">{resource.env_keys.join(" · ")}</p></section>}
      {actions.length > 0 && <ActionForm resource={resource} actions={actions} canManage={canManage} onDone={onDone} />}
    </aside>
  );
}

function ActionForm({ resource, actions, canManage, onDone }: { resource: Resource; actions: ActionSpec[]; canManage: boolean; onDone: () => void }) {
  const [name, setName] = useState(actions[0].name);
  const [params, setParams] = useState<Record<string, any>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [typed, setTyped] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const action = actions.find(a => a.name === name) ?? actions[0];
  useEffect(() => { setParams({}); setConfirmed(false); setTyped(""); setResult(null); }, [name]);
  const set = (key: string, value: any) => setParams(p => ({ ...p, [key]: value }));

  const options = (param: string): { value: string; label: string }[] | null => {
    if (param === "deployment_id") return resource.deployments.filter(d => d.target === "production" && d.state === "READY").map(d => ({ value: d.id, label: `${when(d.created_at)} · ${d.commit || d.id}` }));
    if (param === "deploy_id") return resource.deployments.filter(d => ["live", "deactivated"].includes(d.state)).map(d => ({ value: d.id, label: `${d.state} · ${d.commit || d.id} ${d.message ?? ""}` }));
    if (param === "endpoint_id") return (resource.endpoints ?? []).map(e => ({ value: e.id, label: `${e.id} (${e.state})` }));
    if (param === "branch_id") return (resource.branches ?? []).filter(b => !b.default).map(b => ({ value: b.id, label: b.name }));
    if (param === "parent_id") return (resource.branches ?? []).map(b => ({ value: b.id, label: b.name + (b.default ? " (default)" : "") }));
    if (param === "domain" && action.name === "remove_domain") return (resource.domains ?? []).map(d => ({ value: d, label: d }));
    if (param === "name" && action.name === "delete_upload_preset") return (resource.presets ?? []).map(p => ({ value: p.name, label: p.name }));
    if (param === "key" && action.name === "delete_env") return resource.env_keys.map(k => ({ value: k, label: k }));
    return null;
  };

  const run = async () => {
    setRunning(true); setResult(null);
    try {
      const body = { resource_id: resource.id, action: action.name, params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined)), confirm: confirmed, confirm_name: action.risk === "HIGH" ? typed : undefined };
      const response = await apiClient<{ message: string }>(`/hosting/connections/${resource.connection_id}/actions`, { method: "POST", body: JSON.stringify(body), timeout: 90000 });
      setResult({ ok: true, text: response.message }); setConfirmed(false); setTyped(""); setParams(p => ({ ...p, value: "" }));
      window.setTimeout(onDone, 1500);
    } catch (e) { setResult({ ok: false, text: message(e) }); }
    finally { setRunning(false); }
  };

  const ready = confirmed && (action.risk !== "HIGH" || typed === resource.name) && Object.entries(action.params).every(([k, spec]) => spec.endsWith("?") || (params[k] !== undefined && params[k] !== ""));
  return (
    <section className="mt-4 rounded-lg border border-slate-200 p-3">
      <h3 className="font-semibold text-slate-800">Manage</h3>
      {!canManage ? <p className="mt-1 text-slate-500">Only owners and administrators can run provider actions.</p> : <>
        <select aria-label="Action" className="mt-2 w-full rounded border border-slate-300 px-2 py-1.5" value={name} onChange={e => setName(e.target.value)}>
          {actions.map(a => <option key={a.name} value={a.name}>{a.label}{a.risk === "HIGH" ? " (high risk)" : ""}</option>)}
        </select>
        <p className="mt-1 text-slate-500">{action.description}{action.may_change_bill ? " May change your provider bill." : ""}</p>
        {Object.entries(action.params).map(([param, rawSpec]) => {
          const spec = rawSpec.replace("?", ""), list = options(param), label = param.replace(/_/g, " ") + (rawSpec.endsWith("?") ? " (optional)" : "");
          if (spec === "bool") return <label key={param} className="mt-2 flex items-center gap-2"><input type="checkbox" checked={!!params[param]} onChange={e => set(param, e.target.checked)} />{label}</label>;
          if (spec === "targets") return <fieldset key={param} className="mt-2"><legend className="text-slate-600">Targets</legend>{["production", "preview", "development"].map(t => <label key={t} className="mr-3 inline-flex items-center gap-1"><input type="checkbox" checked={(params.targets ?? ["production", "preview"]).includes(t)} onChange={e => { const cur: string[] = params.targets ?? ["production", "preview"]; set("targets", e.target.checked ? [...cur, t] : cur.filter(x => x !== t)); }} />{t}</label>)}</fieldset>;
          if (spec === "cu") return <label key={param} className="mt-2 block text-slate-600">{label}<select className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1" value={params[param] ?? ""} onChange={e => set(param, e.target.value === "" ? undefined : Number(e.target.value))}><option value="">Choose…</option>{CU.map(c => <option key={c} value={c}>{c} CU</option>)}</select></label>;
          if (list) return <label key={param} className="mt-2 block text-slate-600">{label}<select className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1" value={params[param] ?? ""} onChange={e => set(param, e.target.value || undefined)}><option value="">Choose…</option>{list.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{!list.length && <span className="text-amber-700">Nothing eligible. Refresh first.</span>}</label>;
          const numeric = spec === "instances" || spec === "suspend";
          return <label key={param} className="mt-2 block text-slate-600">{label}<input className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 font-mono" type={spec === "secret" ? "password" : numeric ? "number" : "text"} autoComplete="off" value={params[param] ?? ""} onChange={e => set(param, numeric ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value)} /></label>;
        })}
        <label className="mt-3 flex items-start gap-2 text-slate-700"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I want LaunchComply to run “{action.label}” on {LABEL[resource.provider]} now.</label>
        {action.risk === "HIGH" && <label className="mt-2 block text-rose-700">Type <span className="font-mono font-semibold">{resource.name}</span> to confirm<input aria-label="Type resource name to confirm" className="mt-0.5 w-full rounded border border-rose-300 px-2 py-1 font-mono" value={typed} onChange={e => setTyped(e.target.value)} /></label>}
        <button disabled={!ready || running} onClick={() => void run()} className={`mt-3 w-full rounded-lg px-3 py-2 font-semibold text-white disabled:opacity-40 ${action.risk === "HIGH" ? "bg-rose-700" : "bg-slate-950"}`}>{running ? "Sending to provider…" : action.label}</button>
        {result && <p role="status" className={`mt-2 ${result.ok ? "text-emerald-700" : "text-rose-700"}`}>{result.text}</p>}
      </>}
    </section>
  );
}

function ProvidersDialog({ catalog, connections, canManage, onClose, onChanged }: { catalog: Catalog; connections: Connection[]; canManage: boolean; onClose: () => void; onChanged: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [provider, setProvider] = useState<Provider>("VERCEL");
  const [label, setLabel] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [rotating, setRotating] = useState<Connection | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const fields = catalog.providers.find(p => p.provider === (rotating?.provider ?? provider))?.credential_fields ?? {};

  const submit = async () => {
    setBusy(true); setNotice(null);
    try {
      const credentials = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim()));
      if (rotating) await apiClient(`/hosting/connections/${rotating.id}/credentials`, { method: "PUT", body: JSON.stringify({ credentials }), timeout: 45000 });
      else await apiClient("/hosting/connections", { method: "POST", body: JSON.stringify({ provider, label: label || LABEL[provider], credentials }), timeout: 45000 });
      setNotice({ ok: true, text: rotating ? "Credential verified and replaced." : `${LABEL[provider]} verified and connected. Refresh to read resources.` });
      setValues({}); setLabel(""); setRotating(null); onChanged();
    } catch (e) { setNotice({ ok: false, text: message(e) }); }
    finally { setBusy(false); }
  };
  const disconnect = async (c: Connection) => {
    if (!window.confirm(`Disconnect ${c.label}? LaunchComply deletes its stored credential. Nothing changes at ${LABEL[c.provider]}.`)) return;
    try { await apiClient(`/hosting/connections/${c.id}`, { method: "DELETE" }); onChanged(); setNotice({ ok: true, text: `${c.label} disconnected. Revoke the token at ${LABEL[c.provider]} too.` }); }
    catch (e) { setNotice({ ok: false, text: message(e) }); }
  };

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="hosting-providers-title" className="w-[min(560px,calc(100vw-32px))] rounded-xl p-0 backdrop:bg-slate-900/40">
      <div className="p-5 text-sm">
        <div className="flex justify-between"><h2 id="hosting-providers-title" className="text-lg font-bold">Hosting providers</h2><button aria-label="Close" onClick={() => dialog.current?.close()}><X className="h-5 w-5" /></button></div>
        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {connections.length === 0 && <li className="p-3 text-slate-500">No providers connected yet.</li>}
          {connections.map(c => (
            <li key={c.id} className="flex items-center gap-2 p-3">
              <span className={`h-2 w-2 rounded-full ${c.status === "CONNECTED" ? "bg-emerald-500" : "bg-rose-500"}`} />
              <div className="min-w-0"><p className="font-semibold">{c.label} <span className="font-normal text-slate-500">· {LABEL[c.provider]} · {c.account_name ?? c.account_ref} · key {c.credential_hint}</span></p>
                <p className="text-xs text-slate-500">{c.last_error ?? `${c.resource_count} resources · refreshed ${when(c.last_synced_at)}`}</p></div>
              {canManage && <div className="ml-auto flex gap-1"><button title="Rotate credential" aria-label={`Rotate ${c.label} credential`} onClick={() => { setRotating(c); setValues({}); }} className="p-1.5 text-slate-600"><KeyRound className="h-4 w-4" /></button>
                <button title="Disconnect" aria-label={`Disconnect ${c.label}`} onClick={() => void disconnect(c)} className="p-1.5 text-rose-600"><Trash2 className="h-4 w-4" /></button></div>}
            </li>
          ))}
        </ul>
        {canManage ? (
          <form className="mt-4 space-y-2" onSubmit={e => { e.preventDefault(); void submit(); }}>
            <h3 className="font-semibold">{rotating ? `Rotate credential for ${rotating.label}` : "Connect a provider"}</h3>
            {!rotating && <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-600">Provider<select className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" value={provider} onChange={e => { setProvider(e.target.value as Provider); setValues({}); }}>{catalog.providers.map(p => <option key={p.provider} value={p.provider}>{p.label}</option>)}</select></label>
              <label className="text-xs text-slate-600">Label<input className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm" placeholder={`e.g. Tech Invenso ${LABEL[provider]}`} value={label} onChange={e => setLabel(e.target.value)} /></label>
            </div>}
            {Object.entries(fields).map(([field, kind]) => (
              <label key={field} className="block text-xs text-slate-600">{CREDENTIAL_LABEL[field] ?? field}
                <input className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-sm" type={kind === "secret" ? "password" : "text"} autoComplete="off" required={kind !== "optional"} value={values[field] ?? ""} onChange={e => setValues(v => ({ ...v, [field]: e.target.value }))} />
              </label>
            ))}
            <p className="text-xs text-slate-500">The credential is verified with {LABEL[rotating?.provider ?? provider]}, encrypted at rest and never shown again. Use a token scoped to the Tech Invenso team or workspace where the provider supports it.</p>
            <div className="flex gap-2"><button disabled={busy} className="rounded-lg bg-slate-950 px-3 py-2 font-semibold text-white disabled:opacity-40">{busy ? "Verifying…" : rotating ? "Verify and replace" : "Verify and connect"}</button>{rotating && <button type="button" onClick={() => setRotating(null)} className="px-3 py-2 text-slate-600">Cancel</button>}</div>
          </form>
        ) : <p className="mt-4 text-slate-500">Only owners and administrators can connect providers.</p>}
        {notice && <p role="status" className={`mt-3 ${notice.ok ? "text-emerald-700" : "text-rose-700"}`}>{notice.text}</p>}
      </div>
    </dialog>
  );
}
