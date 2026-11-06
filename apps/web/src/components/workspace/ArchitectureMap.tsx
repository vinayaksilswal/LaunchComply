"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Globe2, Minus, Plus, RotateCcw, ArrowUpRight } from "lucide-react";
import { CITIES, awsCity, resourceCity, useLiveHosting, type LiveResource } from "@/components/architecture/liveHosting";

export type MapAsset = {
  id: string; name: string; version: string | null; saved_at: string | null;
  region: string | null; secondary_region: string | null; availability: string | null;
  components: number; connections: number; availability_zones: string[];
  source_changed: boolean; runtime_status: "NOT_VERIFIED";
  design_status?: "NO_DESIGN" | "DRAFT" | "READ_ONLY" | "UNSUPPORTED_VERSION";
  connection_preview?: { source: string; target: string; label: string }[]; connections_truncated?: boolean;
};

const PROVIDER = { VERCEL: "Vercel", RENDER: "Render", NEON: "Neon", CLOUDINARY: "Cloudinary" } as const;
const STATUS_COLOR: Record<LiveResource["status"], string> = { HEALTHY: "#10b981", DEPLOYING: "#0ea5e9", DEGRADED: "#f59e0b", FAILED: "#f43f5e", SUSPENDED: "#94a3b8", UNKNOWN: "#cbd5e1" };
const RANK: Record<LiveResource["status"], number> = { FAILED: 0, SUSPENDED: 1, DEGRADED: 2, DEPLOYING: 3, UNKNOWN: 4, HEALTHY: 5 };
const point = (city: string) => { const c = CITIES[city]; return { x: (c[1] + 180) / 360 * 1000, y: (90 - c[2]) / 180 * 500 }; };
const availability = (value: string | null) => ({ SINGLE_AZ: "Single availability zone", MULTI_AZ: "Multiple availability zones", MULTI_REGION: "Multiple regions" }[value || ""] || "Availability not set");
const regionLabel = (r: LiveResource) => r.provider === "NEON" ? (r.region || "").replace(/^aws-/, "") : r.region;

export function ArchitectureMap({ assets }: { assets: MapAsset[] }) {
  const [selected, setSelected] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const live = useLiveHosting(true);
  const hosted = live?.resources ?? [];
  const probes = live?.probes ?? [];

  // One architecture: AWS designs and connected providers share the same locations.
  const designCities = (a: MapAsset) => [awsCity(a.region), awsCity(a.secondary_region)].filter((c): c is string => !!c);
  const hostedAt = (city: string) => hosted.filter(r => resourceCity(r) === city);
  const cities = [...new Set([...assets.flatMap(designCities), ...hosted.map(resourceCity).filter((c): c is string => !!c && c !== "global")])];
  const global = hostedAt("global");
  const unmappedHosted = hosted.filter(r => !resourceCity(r));
  const unmapped = assets.filter(a => !awsCity(a.region));
  const fallback = cities[0] || (global.length ? "global" : unmapped.length || unmappedHosted.length ? "unmapped" : "");
  const active = selected && (cities.includes(selected) || selected === "global" || selected === "unmapped") ? selected : fallback;
  const shownDesigns = active === "unmapped" ? unmapped : active === "global" ? [] : assets.filter(a => designCities(a).includes(active));
  const shownHosted = active === "unmapped" ? unmappedHosted : hostedAt(active);
  const worst = (list: LiveResource[]) => list.length ? list.reduce((a, b) => (RANK[b.status] < RANK[a.status] ? b : a)).status : null;
  const viewX = 500 - 500 / zoom + pan.x, viewY = 250 - 250 / zoom + pan.y;
  const title = active === "unmapped" ? "Location not set" : active === "global" ? "Global edge & CDN" : CITIES[active]?.[0] || "Your architecture";

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Architecture locations">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
      <div className="flex items-center gap-3"><Globe2 className="h-9 w-9 rounded-xl bg-cyan-50 p-2 text-cyan-700" /><div><h2 className="font-semibold text-slate-950">Architecture locations</h2><p className="text-sm text-slate-500">AWS designs and live Vercel, Render, Neon and Cloudinary hosting on one map</p></div></div>
      <label className="text-sm text-slate-600">Location <select aria-label="Map location" value={active} onChange={e => setSelected(e.target.value)} className="ml-2 rounded-lg border border-slate-200 bg-white p-2">
        {!cities.length && !global.length && <option value="">No mapped locations</option>}
        {cities.map(city => <option key={city} value={city}>{CITIES[city][0]} · {assets.filter(a => designCities(a).includes(city)).length} designs · {hostedAt(city).length} live</option>)}
        {!!global.length && <option value="global">Global edge & CDN · {global.length} live</option>}
        {!!(unmapped.length || unmappedHosted.length) && <option value="unmapped">Location not set ({unmapped.length + unmappedHosted.length})</option>}
      </select></label>
    </div>
    <div className="relative overflow-hidden bg-slate-50">
      <svg role="group" aria-label="World map of architecture locations. Select a marker or use the location menu." viewBox={`${viewX} ${viewY} ${1000 / zoom} ${500 / zoom}`} className="h-[360px] w-full touch-none cursor-grab sm:h-[460px]" onPointerDown={e => {
        if ((e.target as Element).closest('[data-marker]')) return;
        e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      }} onPointerMove={e => { if (!drag.current) return; const scale = Math.min(e.currentTarget.clientWidth / 1000, e.currentTarget.clientHeight / 500) * zoom;
        setPan({ x: Math.max(-500, Math.min(500, drag.current.px - (e.clientX - drag.current.x) / scale)), y: Math.max(-250, Math.min(250, drag.current.py - (e.clientY - drag.current.y) / scale)) });
      }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <image href="/maps/world-land.svg" width="1000" height="500" />
        {assets.filter(a => awsCity(a.region) && awsCity(a.secondary_region)).map(a => {
          const from = point(awsCity(a.region)!), to = point(awsCity(a.secondary_region)!);
          return <path key={a.id} d={`M${from.x},${from.y} Q${(from.x + to.x) / 2},${Math.min(from.y, to.y) - 60} ${to.x},${to.y}`} fill="none" stroke="#0891b2" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke"><title>{a.name}: planned secondary-region relationship; connectivity not verified</title></path>;
        })}
        {hosted.flatMap(r => (r.links ?? []).map(l => {
          const target = hosted.find(t => t.id === l.resource_id);
          const from = resourceCity(r), to = target && resourceCity(target);
          if (!from || !to || from === "global" || to === "global" || from === to) return null;
          const a = point(from), b = point(to);
          return <path key={`${r.id}-${l.resource_id}`} d={`M${a.x},${a.y} Q${(a.x + b.x) / 2},${Math.min(a.y, b.y) - 40} ${b.x},${b.y}`} fill="none" stroke="#6366f1" strokeWidth="1.5" vectorEffect="non-scaling-stroke"><title>{r.name} → {target!.name} (live connection)</title></path>;
        }))}
        {cities.map(city => {
          const p = point(city), designs = assets.filter(a => designCities(a).includes(city)).length, here = hostedAt(city), status = worst(here);
          return <g key={city} data-marker="true" role="button" tabIndex={0} aria-label={`${CITIES[city][0]}: ${designs} AWS designs, ${here.length} live resources`} aria-pressed={active === city} onClick={() => setSelected(city)} onKeyDown={e => { if (["Enter", " "].includes(e.key)) { e.preventDefault(); setSelected(city); } }} className="cursor-pointer outline-none focus:stroke-slate-950" transform={`translate(${p.x} ${p.y}) scale(${1 / zoom})`}>
            <circle r="18" fill={active === city ? "#cffafe" : "white"} stroke={designs ? "#0e7490" : "#6366f1"} strokeWidth="2" strokeDasharray={designs ? undefined : "4 3"} />
            <circle r="7" fill={status ? STATUS_COLOR[status] : "#0e7490"} />
            {here.length > 0 && <text x="20" y="-12" fontSize="12" fontWeight="700" fill="#334155">{here.length}</text>}
            <title>{CITIES[city][0]} · {designs} AWS designs · {here.length} live resources</title>
          </g>;
        })}
      </svg>
      <div className="absolute right-4 top-4 flex flex-col rounded-lg border bg-white shadow-sm">
        <button aria-label="Zoom in map" disabled={zoom >= 4} onClick={() => setZoom(v => Math.min(4, v + .5))} className="p-3 disabled:opacity-30"><Plus size={18} /></button>
        <button aria-label="Zoom out map" disabled={zoom <= 1} onClick={() => setZoom(v => Math.max(1, v - .5))} className="border-y p-3 disabled:opacity-30"><Minus size={18} /></button>
        <button aria-label="Reset map view" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-3"><RotateCcw size={16} /></button>
      </div>
      {!!global.length && <button onClick={() => setSelected("global")} className={`absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-semibold shadow-sm ${active === "global" ? "border-cyan-500 text-cyan-800" : "text-slate-700"}`}>
        <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[worst(global)!] }} />Global edge & CDN · {global.length}
      </button>}
      {!cities.length && !global.length && <div className="absolute bottom-5 left-5 right-20 rounded-xl border bg-white/95 p-4 text-sm text-slate-600">Choose a region in architecture settings or connect your hosting providers to place your architecture on the map. <Link href="/dashboard/architecture" className="font-semibold text-cyan-700 underline">Open architecture</Link></div>}
      <span className="absolute bottom-2 right-3 text-[10px] text-slate-500">Natural Earth · approximate region locations</span>
    </div>
    <div className="flex flex-wrap items-center gap-4 border-y bg-slate-50 px-5 py-3 text-xs text-slate-600">
      <span>◯ AWS design location</span><span>◌ Live hosting only</span><span>● Centre colour: live health</span><span>┄ Planned secondary region</span><span className="text-indigo-700">— Live connection</span>
      <span>{live?.last_synced_at ? `Live status updated ${new Date(live.last_synced_at).toLocaleTimeString()}` : "Connect providers in Business architecture → Current hosting for live status"}</span>
      {!!(unmapped.length || unmappedHosted.length) && <button onClick={() => setSelected("unmapped")} className="ml-auto font-semibold text-cyan-700 underline">{unmapped.length + unmappedHosted.length} without a mapped location</button>}
    </div>
    <div className="p-5"><h3 className="mb-4 font-semibold">{title}</h3>
      {!assets.length && !hosted.length && <p className="text-sm text-slate-500">No business assets yet. <Link href="/onboarding" className="text-cyan-700 underline">Connect your first repository</Link>.</p>}
      {shownHosted.length > 0 && <>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Running now</h4>
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shownHosted.map(r => {
          const probe = probes.find(p => p.resource_id === r.id && p.ok);
          const failing = probes.some(p => p.resource_id === r.id && !p.ok && !(p.error ?? "").startsWith("Skipped"));
          return <article key={r.id} className="rounded-xl border border-slate-200 p-3 text-sm">
            <div className="flex items-start justify-between gap-2"><h5 className="font-semibold">{r.name}</h5>
              <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: STATUS_COLOR[r.status] }}><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[r.status] }} />{r.status.toLowerCase()}</span></div>
            <p className="text-xs text-slate-500">{PROVIDER[r.provider]} · {r.kind.replace("_", " ")}{regionLabel(r) ? ` · ${regionLabel(r)}` : ""}</p>
            {r.urls[0] && <p className="mt-1 truncate text-xs text-slate-600">{r.urls[0].replace("https://", "")}</p>}
            {r.repo && <p className="mt-1 truncate text-xs text-slate-500">{r.repo}{r.root_dir ? `/${r.root_dir}` : ""}</p>}
            <p className={`mt-1 text-xs font-medium ${failing ? "text-rose-700" : "text-emerald-700"}`}>{failing ? "Health check failing" : probe ? `Responding · ${probe.latency_ms} ms` : r.status_detail}</p>
          </article>;
        })}</div>
        <Link href="/dashboard/architecture" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-cyan-700">Manage in Current hosting <ArrowUpRight size={16} /></Link>
      </>}
      {shownDesigns.length > 0 && <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">AWS designs</h4>}
      <div className="grid gap-4 lg:grid-cols-2">{shownDesigns.map(a => <article key={a.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex justify-between gap-2"><h4 className="font-semibold">{a.name}</h4><span className="text-xs text-amber-700">{a.version ? `${a.version} · Design` : "No saved design"}</span></div>
        <p className="mt-2 text-sm text-slate-600">{availability(a.availability)} · {a.components} components · {a.connections} designed connections</p>
        <p className="mt-2 text-xs text-slate-500">{a.region || "Region not set"}{a.secondary_region ? ` → ${a.secondary_region} (secondary)` : ""}</p>
        <p className="mt-2 text-xs text-slate-500">AZ configuration: {a.availability_zones.length ? a.availability_zones.join(", ") : "Not configured"}. Access rules and secure traffic paths are in the architecture editor.</p>
        {a.design_status === "READ_ONLY" && <p className="mt-2 text-xs text-cyan-800">New-format design · Read only. Open the architecture to inspect or export it.</p>}
        {a.design_status === "UNSUPPORTED_VERSION" && <p className="mt-2 text-xs text-amber-800">This saved version needs a compatible reader. No older design is substituted.</p>}
        {a.source_changed && <p className="mt-2 text-xs text-amber-700">Source changed since this design. Review the architecture.</p>}
        {!!a.connection_preview?.length && <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium text-slate-700">Inspect designed connections</summary><ul className="mt-2 space-y-2 border-l-2 border-cyan-100 pl-3">{a.connection_preview.map((connection, index) => <li key={index}><span>{connection.source} → {connection.target}</span><span className="block text-xs text-slate-500">{connection.label}</span></li>)}</ul>{a.connections_truncated && <p className="mt-2 text-xs text-slate-500">First 8 connections shown. Open the architecture for all connections.</p>}</details>}
        <div className="mt-4 flex flex-wrap gap-5 text-sm font-semibold text-cyan-700"><Link href={`/dashboard/architecture?application=${encodeURIComponent(a.id)}`} className="inline-flex items-center gap-1">View architecture <ArrowUpRight size={16} /></Link><Link href={`/dashboard/deployments?application=${encodeURIComponent(a.id)}`}>Deploy application →</Link></div>
      </article>)}</div>
    </div>
  </section>;
}
