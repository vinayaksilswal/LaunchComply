import type { ArchitectureGraph, DiagramBoundary } from "./CloudDiagram";

export interface ResourcePlacement {
  node_id: string; resource_type: string; vpc_node_id: string | null; subnet_node_id: string | null;
  availability_zone: string | null; cidr: string | null;
  routing: "PUBLIC" | "PRIVATE_NAT" | "ISOLATED" | "UNKNOWN" | null;
  location: "MANAGED_SERVICE" | "OPERATIONS" | "NETWORK_CONFIGURATION";
}
export interface ResourceRelation { source: string; target: string; kind: string; field: string; label: string }
export interface ResourceTopology {
  schema_version: number; source: string; deployment_state: string; region: string | null;
  placements: ResourcePlacement[]; relations: ResourceRelation[];
  issues: { node_id: string; code: string; message: string }[];
}
export const routingLabels = { PUBLIC: "Public route", PRIVATE_NAT: "Private · NAT egress", ISOLATED: "Isolated IPv4 routing", UNKNOWN: "Routing unknown" };

/** Never turn a resource reference into a request flow or a workload attachment. */
export function visibleTopology(topology: ResourceTopology | undefined, graph: ArchitectureGraph, saved: ArchitectureGraph): ResourceTopology | undefined {
  if (!topology || topology.schema_version !== 1) return undefined;
  const savedServices = new Map(saved.nodes.map(node => [node.id, node.service]));
  const ids = new Set(graph.nodes.filter(node => savedServices.get(node.id) === node.service).map(node => node.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const r of topology.relations) if (ids.has(r.source) && !ids.has(r.target)) { ids.delete(r.source); changed = true; }
  }
  return { ...topology, placements: topology.placements.filter(p => ids.has(p.node_id)),
    relations: topology.relations.filter(r => ids.has(r.source) && ids.has(r.target)) };
}

function clusters(graph: ArchitectureGraph, topology: ResourceTopology) {
  const ids = new Set(graph.nodes.map(n => n.id));
  const placements = topology.placements.filter(p => ids.has(p.node_id));
  const vpcs = [...new Set(placements.map(p => p.vpc_node_id).filter((id): id is string => !!id))].sort();
  return { placements, vpcs, unassigned: graph.nodes.filter(n => !placements.some(p => p.node_id === n.id)).map(n => n.id) };
}

/** Layout-only projection of typed identity; stable IDs/properties/flows stay intact. */
export function arrangeResourceTopology(graph: ArchitectureGraph, topology: ResourceTopology): ArchitectureGraph {
  const { placements, vpcs, unassigned } = clusters(graph, topology);
  const positions = new Map<string, { x: number; y: number }>();
  let nextY = 190;
  const grid = (ids: string[], x: number, y: number, columns = 3) => {
    ids.forEach((id, i) => positions.set(id, { x: x + (i % columns) * 320, y: y + Math.floor(i / columns) * 176 }));
    return y + Math.ceil(ids.length / columns) * 176;
  };
  for (const vpc of vpcs) {
    const members = placements.filter(p => p.vpc_node_id === vpc);
    // Each AZ is a separate band; each explicitly assigned subnet has its own box.
    nextY = grid(members.filter(p => !p.availability_zone).map(p => p.node_id), 110, nextY, 4) + 100;
    const zones = [...new Set(members.map(p => p.availability_zone).filter((az): az is string => !!az))].sort();
    let zoneX = 110, zonesBottom = nextY;
    for (const az of zones) {
      const subnets = members.filter(p => p.resource_type === "AWS::EC2::Subnet" && p.availability_zone === az);
      const columns = Math.max(1, Math.min(2, subnets.length));
      let zoneY = nextY;
      if (!subnets.length) zoneY = grid(members.filter(p => p.availability_zone === az).map(p => p.node_id), zoneX, zoneY, 1) + 110;
      for (let batch = 0; batch < subnets.length; batch += columns) {
        let bottom = zoneY;
        subnets.slice(batch, batch + columns).forEach((subnet, i) => {
          const ids = [subnet.node_id, ...members.filter(p => p.subnet_node_id === subnet.node_id).map(p => p.node_id)];
          bottom = Math.max(bottom, grid(ids, zoneX + i * 360, zoneY, 1));
        });
        zoneY = bottom + 110;
      }
      zonesBottom = Math.max(zonesBottom, zoneY);
      zoneX += columns * 360 + 70;
    }
    nextY = zonesBottom + 120;
  }
  const regional = placements.filter(p => !p.vpc_node_id && p.location !== "OPERATIONS").map(p => p.node_id);
  if (regional.length) nextY = grid(regional, 110, nextY) + 100;
  const operations = placements.filter(p => p.location === "OPERATIONS").map(p => p.node_id);
  if (operations.length) nextY = grid(operations, 110, nextY) + 100;
  grid(unassigned, 110, nextY);
  // Respect existing canonical coordinate bounds without overlapping/clamping nodes.
  if ([...positions.values()].some(p => p.x > 6000 || p.y > 6000)) return graph;
  return { ...graph, nodes: graph.nodes.map(n => ({ ...n, ...positions.get(n.id) })) };
}

export function resourceBoundaries(graph: ArchitectureGraph, topology: ResourceTopology): DiagramBoundary[] {
  const { placements, vpcs, unassigned } = clusters(graph, topology);
  const labels = new Map(graph.nodes.map(n => [n.id, n.label]));
  const box = (id: string, label: string, ids: string[], color: string, padding = 22, top = 52): DiagramBoundary[] => {
    const nodes = graph.nodes.filter(n => ids.includes(n.id));
    if (!nodes.length) return [];
    const x = Math.max(4, Math.min(...nodes.map(n => n.x)) - padding);
    const y = Math.max(4, Math.min(...nodes.map(n => n.y)) - top);
    return [{ id, label, nodes: ids, color, x, y,
      width: Math.max(...nodes.map(n => n.x + 280)) - x + padding,
      height: Math.max(...nodes.map(n => n.y + 136)) - y + padding }];
  };
  const result: DiagramBoundary[] = [];
  if (graph.nodes.length) result.push(...box("aws-cloud", `${topology.region || "AWS region not selected"} · configured intent / placement pending`, graph.nodes.map(n => n.id), "#334155", 80, 164));
  for (const vpc of vpcs) {
    const members = placements.filter(p => p.vpc_node_id === vpc);
    const definition = placements.find(p => p.node_id === vpc);
    result.push(...box(`resource-vpc-${vpc}`, `${labels.get(vpc) || vpc} · VPC ${definition?.cidr || ""}`, members.map(p => p.node_id), "#4d7c0f", 60, 112));
    const zones = [...new Set(members.map(p => p.availability_zone).filter((az): az is string => !!az))].sort();
    for (const az of zones) result.push(...box(`resource-az-${vpc}-${az}`, `Availability zone · ${az}`, members.filter(p => p.availability_zone === az).map(p => p.node_id), "#64748b", 38, 84));
    for (const subnet of members.filter(p => p.resource_type === "AWS::EC2::Subnet")) {
      const ids = members.filter(p => p.node_id === subnet.node_id || p.subnet_node_id === subnet.node_id).map(p => p.node_id);
      result.push(...box(`resource-subnet-${subnet.node_id}`, `${routingLabels[subnet.routing || "UNKNOWN"]} · ${subnet.cidr}`, ids, subnet.routing === "PUBLIC" ? "#0891b2" : "#6366f1"));
    }
  }
  result.push(...box("resource-managed", "Regional services · outside subnets", placements.filter(p => !p.vpc_node_id && p.location !== "OPERATIONS").map(p => p.node_id), "#059669"));
  result.push(...box("resource-operations", "Operations · no request-path attachment implied", placements.filter(p => p.location === "OPERATIONS").map(p => p.node_id), "#d97706"));
  result.push(...box("resource-unassigned", "Unconfigured components · placement not established", unassigned, "#d97706"));
  return result;
}
