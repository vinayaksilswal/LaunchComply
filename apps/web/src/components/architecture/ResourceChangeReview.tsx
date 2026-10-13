"use client";
import type { ArchitectureGraph } from "./CloudDiagram";
import type { ResourceConfiguration } from "./ResourcePropertyFields";

export function ResourceChangeReview({ graph, before, after }: { graph: ArchitectureGraph; before: Record<string, ResourceConfiguration>; after: Record<string, ResourceConfiguration> }) {
  const changes = Object.entries(after).flatMap(([id, config]) => Object.entries(config.properties)
    .filter(([key, value]) => JSON.stringify(before[id]?.properties[key]) !== JSON.stringify(value))
    .map(([key, value]) => ({ id, key, value, previous: before[id]?.properties[key] })));
  if (!changes.length) return null;
  return <section aria-label="Proposed resource settings" className="rounded-lg border border-cyan-200 bg-white p-3 space-y-3">
    <p className="text-sm font-semibold text-slate-900">Resource settings · {changes.length} changes</p>
    {changes.map(change => <div key={`${change.id}:${change.key}`} className="text-xs space-y-1 break-words">
      <p className="font-semibold">{graph.nodes.find(node => node.id === change.id)?.label || change.id} · {change.key.replaceAll("_", " ")}</p>
      <p className="text-slate-500">Before: {change.previous === undefined ? "Not configured" : JSON.stringify(change.previous)}</p>
      <p className="text-cyan-800">After: {JSON.stringify(change.value)}</p>
    </div>)}
    <p className="text-xs text-amber-800">Applying saves a new design version. Cloud resources stay unchanged. CIDR, subnet and other identity changes may require replacement; review an AWS change set before deploying.</p>
  </section>;
}
