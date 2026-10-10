import type { ArchitectureGraph, DiagramBoundary } from "./CloudDiagram";
import type { DeploymentRequirements } from "./ProductionDiagram";
import { networkPlacement, type NetworkPlacement } from "./networkPlacement";

const groups: { placement: NetworkPlacement; label: string; color: string }[] = [
  { placement: "OUTSIDE_VPC", label: "Managed & global services · outside subnet boundaries", color: "#0891b2" },
  { placement: "PUBLIC_INGRESS", label: "Public ingress subnets · internet gateway route proposed", color: "#65a30d" },
  { placement: "PRIVATE_COMPUTE", label: "Private application subnets · no direct internet ingress", color: "#6366f1" },
  { placement: "PRIVATE_DATA", label: "Isolated data subnets · consumer security groups only", color: "#059669" },
  { placement: "REVIEW", label: "Hosting decision pending · placement not confirmed", color: "#d97706" },
];

/** One editable card per source component. Boundaries describe a proposed network,
 * never measured infrastructure or unverified replicas. Only coordinates change. */
export function arrangeBusinessArchitecture(graph: ArchitectureGraph): ArchitectureGraph {
  const positions = new Map<string, { x: number; y: number }>();
  let leftY = 150, vpcY = 150;
  for (const group of groups) {
    const nodes = graph.nodes.filter(node => networkPlacement(node) === group.placement);
    const outside = ["OUTSIDE_VPC", "REVIEW"].includes(group.placement);
    const y = outside ? leftY : vpcY;
    nodes.forEach((node, i) => positions.set(node.id, {
      x: (outside ? 80 : 750) + (i % 2) * 250,
      y: y + Math.floor(i / 2) * 140,
    }));
    const next = y + Math.max(1, Math.ceil(nodes.length / 2)) * 140 + 90;
    if (outside) leftY = next; else vpcY = next;
  }
  return { ...graph, nodes: graph.nodes.map(node => ({ ...node, ...positions.get(node.id) })) };
}

export function businessBoundaries(graph: ArchitectureGraph, requirements?: DeploymentRequirements): DiagramBoundary[] {
  const bounds = (ids: string[], padding: number, top: number) => {
    const nodes = graph.nodes.filter(node => ids.includes(node.id));
    const x = Math.max(8, Math.min(...nodes.map(n => n.x)) - padding);
    const y = Math.max(8, Math.min(...nodes.map(n => n.y)) - top);
    return { x, y, width: Math.max(...nodes.map(n => n.x + 220)) - x + padding,
      height: Math.max(...nodes.map(n => n.y + 104)) - y + padding };
  };
  const subnets = groups.flatMap(group => {
    const ids = graph.nodes.filter(node => networkPlacement(node) === group.placement).map(node => node.id);
    const box = ids.length ? bounds(ids, 24, 44) : null;
    const note = group.placement === "PRIVATE_COMPUTE" ? "Egress: NAT or VPC endpoints · decide before deploy"
      : group.placement === "PRIVATE_DATA" ? "No direct internet route · backup & failover to confirm"
      : group.placement === "PUBLIC_INGRESS" ? "TLS, listener / health-check ports & AZ subnets to confirm" : undefined;
    return box ? [{ id: `network-${group.placement}`, label: group.label, color: group.color, nodes: ids,
      ...box, height: box.height + (note ? 34 : 0), note }] : [];
  });
  const privateIds = graph.nodes.filter(node => !["OUTSIDE_VPC", "REVIEW"].includes(networkPlacement(node))).map(node => node.id);
  const parents: DiagramBoundary[] = [];
  if (privateIds.length) {
    const vpc = bounds(privateIds, 48, 92);
    vpc.height += 34;
    parents.push({ id: "vpc", label: "VPC · CIDR, routes & security groups to confirm", color: "#4d7c0f", nodes: privateIds, ...vpc });
    const availability = requirements?.availability === "SINGLE_AZ" ? (graph.nodes.some(n => /application load balancer|\balb\b/i.test(n.service)) ? "ALB: 2 AZ subnets; workloads: single AZ target" : "Single AZ target · assignment pending")
      : requirements?.availability === "MULTI_REGION" ? `Recovery: ${requirements.secondary_region} · separate VPC plan pending`
      : `${requirements ? "Multi-AZ target" : "Availability to confirm"} · AZ / subnet assignment pending`;
    parents.push({ id: "region", label: `${requirements?.region || "AWS region to choose"} · ${availability}`, color: "#64748b", nodes: privateIds,
      x: Math.max(4, vpc.x - 16), y: Math.max(4, vpc.y - 38), width: vpc.width + 32, height: vpc.height + 54 });
  }
  return [...parents.reverse(), ...subnets];
}
