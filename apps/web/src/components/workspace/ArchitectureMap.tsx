"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Globe2, Minus, Plus, RotateCcw, ArrowUpRight } from "lucide-react";

export type MapAsset = {
  id: string; name: string; version: string | null; saved_at: string | null;
  region: string | null; secondary_region: string | null; availability: string | null;
  components: number; connections: number; availability_zones: string[];
  source_changed: boolean; runtime_status: "NOT_VERIFIED";
  design_status?: "NO_DESIGN" | "DRAFT" | "READ_ONLY" | "UNSUPPORTED_VERSION";
  connection_preview?: { source: string; target: string; label: string }[]; connections_truncated?: boolean;
};

const regions: Record<string, [string, number, number]> = {
  "ap-south-1": ["Mumbai", 72.88, 19.08], "ap-south-2": ["Hyderabad", 78.49, 17.39],
  "us-east-1": ["N. Virginia", -77.49, 38.75], "us-east-2": ["Ohio", -82.99, 39.96],
  "us-west-2": ["Oregon", -122.68, 45.52], "eu-west-1": ["Ireland", -6.26, 53.35],
  "eu-west-2": ["London", -0.13, 51.51], "eu-central-1": ["Frankfurt", 8.68, 50.11],
  "ap-southeast-1": ["Singapore", 103.82, 1.35], "ap-southeast-2": ["Sydney", 151.21, -33.87],
  "ap-northeast-1": ["Tokyo", 139.69, 35.68], "ca-central-1": ["Canada Central", -73.57, 45.5],
  "sa-east-1": ["São Paulo", -46.63, -23.55],
};
const point = (code: string) => { const r = regions[code]; return { x: (r[1] + 180) / 360 * 1000, y: (90 - r[2]) / 180 * 500 }; };
const availability = (value: string | null) => ({ SINGLE_AZ: "Single availability zone", MULTI_AZ: "Multiple availability zones", MULTI_REGION: "Multiple regions" }[value || ""] || "Availability not set");

export function ArchitectureMap({ assets }: { assets: MapAsset[] }) {
  const [selected, setSelected] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const codes = [...new Set(assets.flatMap(a => [a.region, a.secondary_region]).filter((r): r is string => !!r && !!regions[r]))];
  const region = codes.includes(selected) ? selected : codes[0] || "";
  const visible = assets.filter(a => region === "unmapped" ? !a.region || !regions[a.region] : a.region === region || a.secondary_region === region);
  const unmapped = assets.filter(a => !a.region || !regions[a.region]);
  const activeRegion = selected === "unmapped" || (!region && unmapped.length) ? "unmapped" : region;
  const shown = activeRegion === "unmapped" ? unmapped : visible;
  const viewX = 500 - 500 / zoom + pan.x, viewY = 250 - 250 / zoom + pan.y;
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Architecture locations">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5">
      <div className="flex items-center gap-3"><Globe2 className="h-9 w-9 rounded-xl bg-cyan-50 p-2 text-cyan-700" /><div><h2 className="font-semibold text-slate-950">Architecture locations</h2><p className="text-sm text-slate-500">Saved AWS designs, availability and connections</p></div></div>
      <label className="text-sm text-slate-600">Region <select aria-label="Map region" value={activeRegion} onChange={e => setSelected(e.target.value)} className="ml-2 rounded-lg border border-slate-200 bg-white p-2">
        {!codes.length && <option value="">No mapped regions</option>}
        {codes.map(code => <option key={code} value={code}>{regions[code][0]} · {code}</option>)}
        {!!unmapped.length && <option value="unmapped">Region not set / unmapped ({unmapped.length})</option>}
      </select></label>
    </div>
    <div className="relative overflow-hidden bg-slate-50">
      <svg role="group" aria-label="World map of saved architecture regions. Select a marker or use the region menu." viewBox={`${viewX} ${viewY} ${1000 / zoom} ${500 / zoom}`} className="h-[360px] w-full touch-none cursor-grab sm:h-[460px]" onPointerDown={e => {
        if ((e.target as Element).closest('[data-marker]')) return;
        e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      }} onPointerMove={e => { if (!drag.current) return; const scale = Math.min(e.currentTarget.clientWidth / 1000, e.currentTarget.clientHeight / 500) * zoom;
        setPan({ x: Math.max(-500, Math.min(500, drag.current.px - (e.clientX - drag.current.x) / scale)), y: Math.max(-250, Math.min(250, drag.current.py - (e.clientY - drag.current.y) / scale)) });
      }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <image href="/maps/world-land.svg" width="1000" height="500" />
        {assets.filter(a => a.region && a.secondary_region && regions[a.region] && regions[a.secondary_region]).map(a => {
          const from = point(a.region!), to = point(a.secondary_region!);
          return <path key={a.id} d={`M${from.x},${from.y} Q${(from.x + to.x) / 2},${Math.min(from.y, to.y) - 60} ${to.x},${to.y}`} fill="none" stroke="#0891b2" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke"><title>{a.name}: planned secondary-region relationship; connectivity not verified</title></path>;
        })}
        {codes.map(code => { const p = point(code), count = assets.filter(a => a.region === code || a.secondary_region === code).length;
          return <g key={code} data-marker="true" role="button" tabIndex={0} aria-label={`${regions[code][0]}: ${count} saved designs`} aria-pressed={activeRegion === code} onClick={() => setSelected(code)} onKeyDown={e => { if (["Enter", " "].includes(e.key)) { e.preventDefault(); setSelected(code); } }} className="cursor-pointer outline-none focus:stroke-slate-950" transform={`translate(${p.x} ${p.y}) scale(${1 / zoom})`}>
            <circle r="18" fill={activeRegion === code ? "#cffafe" : "white"} stroke="#0e7490" strokeWidth="2" /><circle r="6" fill="#0e7490" />
            <title>{regions[code][0]} · {count} saved designs</title>
          </g>;
        })}
      </svg>
      <div className="absolute right-4 top-4 flex flex-col rounded-lg border bg-white shadow-sm">
        <button aria-label="Zoom in map" disabled={zoom >= 4} onClick={() => setZoom(v => Math.min(4, v + .5))} className="p-3 disabled:opacity-30"><Plus size={18} /></button>
        <button aria-label="Zoom out map" disabled={zoom <= 1} onClick={() => setZoom(v => Math.max(1, v - .5))} className="border-y p-3 disabled:opacity-30"><Minus size={18} /></button>
        <button aria-label="Reset map view" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="p-3"><RotateCcw size={16} /></button>
      </div>
      {!codes.length && <div className="absolute bottom-5 left-5 right-20 rounded-xl border bg-white/95 p-4 text-sm text-slate-600">Choose a region in architecture settings to place your design on the map. <Link href="/dashboard/architecture" className="font-semibold text-cyan-700 underline">Open architecture</Link></div>}
      <span className="absolute bottom-2 right-3 text-[10px] text-slate-500">Natural Earth · approximate region locations</span>
    </div>
    <div className="flex flex-wrap items-center gap-4 border-y bg-slate-50 px-5 py-3 text-xs text-slate-600"><span>● Saved design location</span><span>┄ Planned secondary region</span><span>Live availability and reachability: not verified</span>{!!unmapped.length && <button onClick={() => setSelected("unmapped")} className="ml-auto font-semibold text-cyan-700 underline">{unmapped.length} without a mapped region</button>}</div>
    <div className="p-5"><h3 className="mb-4 font-semibold">{activeRegion === "unmapped" ? "Region not set / unmapped" : regions[region]?.[0] || "Your architectures"}</h3>
      {!assets.length && <p className="text-sm text-slate-500">No business assets yet. <Link href="/onboarding" className="text-cyan-700 underline">Connect your first repository</Link>.</p>}
      <div className="grid gap-4 lg:grid-cols-2">{shown.map(a => <article key={a.id} className="rounded-xl border border-slate-200 p-4">
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
