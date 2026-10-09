import type { ArchitectureGraph, ArchitectureZone, DiagramBoundary } from "./CloudDiagram";

export interface SourceModule {
  id: string;
  path: string;
  language: string;
  status: string;
  area?: string;
  repository_id?: string;
  imports: string[];
  entry_points: string[];
}

export const sourceAreas: { id: string; name: string; color: string; zone: ArchitectureZone }[] = [
  { id: "ENTRY", name: "Entry files", color: "#0891b2", zone: "EDGE" },
  { id: "ROUTES", name: "Routes & screens", color: "#6366f1", zone: "APPLICATION" },
  { id: "SERVICES", name: "Services & components", color: "#6366f1", zone: "APPLICATION" },
  { id: "DATA", name: "Data definitions", color: "#059669", zone: "DATA" },
  { id: "SUPPORT", name: "Supporting files", color: "#d97706", zone: "SUPPORT" },
];

/** File groups describe inspected source organization, never running infrastructure. */
export function codeArchitecture(modules: SourceModule[], edges: ArchitectureGraph["edges"], repositories: { id: string; full_name: string }[] = []) {
  const graph: ArchitectureGraph = { nodes: [], edges: [] };
  const boundaries: DiagramBoundary[] = [];
  const repoIds = [...new Set(modules.map(item => item.repository_id || "source"))];
  let top = 90;
  for (const repoId of repoIds) {
    const repo = repositories.find(item => item.id === repoId);
    const groups = sourceAreas.map(area => ({ area, modules: modules.filter(item => (item.repository_id || "source") === repoId && (sourceAreas.some(value => value.id === item.area) ? item.area : "SUPPORT") === area.id).sort((a, b) => a.path.localeCompare(b.path)) })).filter(group => group.modules.length);
    groups.forEach(({ area, modules: items }, column) => {
      boundaries.push({ id: `${repoId}-${area.id}`, label: `${repo ? repo.full_name.split("/").at(-1) + " · " : ""}${area.name}`, nodes: items.map(item => item.id), color: area.color });
      items.forEach((item, row) => graph.nodes.push({
        id: item.id,
        label: item.path.split("/").slice(-3).join("/"),
        service: `${item.language} · ${item.status.toLowerCase()}`,
        zone: area.zone,
        description: `${item.path}. ${item.entry_points.join("; ") || "No entry point detected"}. Imports: ${item.imports.join(", ") || "None detected"}`.slice(0, 700),
        x: 60 + column * 340, y: top + row * 180,
      }));
    });
    top += Math.max(1, ...groups.map(group => group.modules.length)) * 180 + 90;
  }
  const ids = new Set(graph.nodes.map(item => item.id));
  graph.edges = edges.filter(item => ids.has(item.source) && ids.has(item.target));
  return { graph, boundaries };
}
