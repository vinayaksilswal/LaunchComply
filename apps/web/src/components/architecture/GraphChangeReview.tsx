import type { ArchitectureGraph } from "./CloudDiagram";

export function GraphChangeReview({ before, after }: { before: ArchitectureGraph; after: ArchitectureGraph }) {
  const added = after.nodes.filter(node => !before.nodes.some(old => old.id === node.id));
  const removed = before.nodes.filter(node => !after.nodes.some(next => next.id === node.id));
  const changed = after.nodes.flatMap(node => {
    const old = before.nodes.find(item => item.id === node.id);
    if (!old) return [];
    return (["label", "service", "zone", "description", "x", "y"] as const).filter(key => old[key] !== node[key]).map(key => ({ id: `${node.id}-${key}`, name: node.label, field: key, old: String(old[key]), next: String(node[key]) }));
  });
  const edgeKey = (edge: ArchitectureGraph["edges"][number]) => JSON.stringify(edge);
  const edgeDiff = (from: ArchitectureGraph, to: ArchitectureGraph) => {
    const remaining = to.edges.map(edgeKey);
    return from.edges.filter(edge => { const index = remaining.indexOf(edgeKey(edge)); if (index < 0) return true; remaining.splice(index, 1); return false; });
  };
  const addedEdges = edgeDiff(after, before), removedEdges = edgeDiff(before, after);
  const name = (id: string) => after.nodes.find(node => node.id === id)?.label || before.nodes.find(node => node.id === id)?.label || id;
  return <details className="text-xs rounded-lg border border-cyan-200 bg-white p-3" open>
    <summary className="cursor-pointer font-semibold">Exact changes · {added.length} added · {removed.length} removed · {changed.length} fields · {addedEdges.length + removedEdges.length} flow changes</summary>
    <ul className="mt-2 max-h-64 overflow-y-auto space-y-2 break-words">
      {added.map(node => <li key={`add-${node.id}`}><strong className="text-emerald-700">Add {node.label}</strong><p>{node.service} · {node.zone}</p></li>)}
      {removed.map(node => <li key={`remove-${node.id}`} className="text-red-700">Remove {node.label}</li>)}
      {changed.map(change => <li key={change.id}><strong>{change.name} · {change.field}</strong><p className="text-slate-500">Before: {change.old}</p><p>After: {change.next}</p></li>)}
      {removedEdges.map((edge, index) => <li key={`remove-edge-${index}`} className="text-red-700">Remove flow: {name(edge.source)} → {name(edge.target)} · {edge.label}</li>)}
      {addedEdges.map((edge, index) => <li key={`add-edge-${index}`} className="text-emerald-700">Add flow: {name(edge.source)} → {name(edge.target)} · {edge.label}</li>)}
    </ul>
  </details>;
}
