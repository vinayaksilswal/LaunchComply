"use client";
import { useRef } from "react";
import { X } from "lucide-react";
import type { ArchitectureGraph } from "./CloudDiagram";
import { routingLabels, type ResourceTopology } from "./resourceTopology";

export function ResourceTopologyMap({ graph, topology, onSelect }: { graph: ArchitectureGraph; topology: ResourceTopology; onSelect: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const labels = new Map(graph.nodes.map(n => [n.id, n.label]));
  const inspect = (id: string) => { dialog.current?.close(); onSelect(id); };
  return <>
    <button onClick={() => dialog.current?.showModal()} className="rounded-lg border px-2 py-1.5 text-xs">Network map</button>
    <dialog ref={dialog} aria-labelledby="resource-topology-title" className="m-auto w-[min(960px,94vw)] max-h-[85vh] rounded-xl border bg-white p-5 backdrop:bg-slate-950/30">
      <div className="flex items-center justify-between gap-4"><h2 id="resource-topology-title" className="font-semibold text-lg">Configured network map</h2><button aria-label="Close network map" onClick={() => dialog.current?.close()}><X className="w-5 h-5" /></button></div>
      <p className="my-3 text-sm text-slate-600">VPC, subnet and relationship identities come from saved resource settings. Dashed links describe configuration references, not HTTP traffic. Workload attachment, TLS, IAM and deployed reachability need separate verification.</p>
      {!!topology.issues.length && <ul className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm space-y-2">{topology.issues.map((issue, i) => <li key={i}>{labels.get(issue.node_id) || "Settings"}: {issue.message}</li>)}</ul>}
      <div className="overflow-x-auto"><table className="w-full text-sm text-left my-4"><caption className="text-left text-slate-600 mb-2">{topology.placements.length} configured components · {topology.relations.length} explicit references · AWS state unverified</caption><thead><tr className="border-b"><th className="p-2">Resource</th><th className="p-2">VPC / subnet</th><th className="p-2">AZ / routing</th></tr></thead><tbody>{topology.placements.map(p => <tr key={p.node_id} className="border-b"><td className="p-2"><button className="text-cyan-800 underline" onClick={() => inspect(p.node_id)}>{labels.get(p.node_id) || p.node_id}</button><div className="text-xs text-slate-500">{p.resource_type}</div></td><td className="p-2">{p.vpc_node_id ? labels.get(p.vpc_node_id) || p.vpc_node_id : "Outside VPC / assignment not set"}{p.subnet_node_id && <div>{labels.get(p.subnet_node_id) || p.subnet_node_id}</div>}</td><td className="p-2">{p.availability_zone || "Regional / assignment not set"}{p.routing && <div>{routingLabels[p.routing]} · {p.cidr}</div>}</td></tr>)}</tbody></table></div>
      <details><summary className="cursor-pointer font-semibold text-sm">Inspect explicit relationships</summary><ul className="text-sm mt-3 space-y-2">{topology.relations.map((r, i) => <li key={i}><button onClick={() => inspect(r.source)} className="text-cyan-800 underline">{labels.get(r.source) || r.source}</button> → <button onClick={() => inspect(r.target)} className="text-cyan-800 underline">{labels.get(r.target) || r.target}</button> · {r.label} <span className="text-xs text-slate-500">({r.kind.toLowerCase()})</span></li>)}</ul></details>
    </dialog>
  </>;
}
