import type { ArchitectureGraph, ArchitectureNode, DiagramBoundary } from "./CloudDiagram";
import type { DeploymentRequirements } from "./ProductionDiagram";
import { networkPlacement, type NetworkPlacement } from "./networkPlacement";

const groups: { placement: NetworkPlacement; label: string; color: string }[] = [
  { placement: "OUTSIDE_VPC", label: "Managed & global services · outside subnet boundaries", color: "#0891b2" },
  { placement: "PUBLIC_INGRESS", label: "Public ingress subnets · internet gateway route proposed", color: "#65a30d" },
  { placement: "PUBLIC_FRONTEND", label: "Public frontend subnets · web ingress security group only", color: "#0891b2" },
  { placement: "PRIVATE_INGRESS", label: "Internal API ingress · frontend servers only", color: "#6366f1" },
  { placement: "PRIVATE_COMPUTE", label: "Private application subnets · no direct internet ingress", color: "#6366f1" },
  { placement: "PRIVATE_DATA", label: "Isolated data subnets · consumer security groups only", color: "#059669" },
  { placement: "VPC_ENDPOINT", label: "VPC route endpoints · private service access proposed", color: "#059669" },
  { placement: "PRIVATE_MANAGED_STORAGE", label: "Private managed storage · outside VPC, public access blocked", color: "#059669" },
  { placement: "REVIEW", label: "Hosting decision pending · placement not confirmed", color: "#d97706" },
];

export const isPlatformService = (node: ArchitectureNode) => node.zone === "SUPPORT" || /cloudwatch|\becr\b|secrets manager|\biam\b/i.test(node.service);

/** One editable card per source component. Boundaries describe a proposed network,
 * never measured infrastructure or unverified replicas. Only coordinates change. */
export function arrangeBusinessArchitecture(graph: ArchitectureGraph): ArchitectureGraph {
  const positions = new Map<string, { x: number; y: number }>();
  let outsideY = 220, publicY = 220, privateY = 220, storageBottom = 220;
  for (const group of groups) {
    const nodes = graph.nodes.filter(node => !isPlatformService(node) && networkPlacement(node) === group.placement);
    if (!nodes.length) continue;
    const outside = ["OUTSIDE_VPC", "REVIEW"].includes(group.placement);
    const publicTier = ["PUBLIC_INGRESS", "PUBLIC_FRONTEND"].includes(group.placement);
    const storage = group.placement === "PRIVATE_MANAGED_STORAGE";
    const endpointY = graph.nodes.find(node => networkPlacement(node) === "VPC_ENDPOINT");
    const y = storage ? (endpointY ? positions.get(endpointY.id)?.y || privateY : privateY) : outside ? outsideY : publicTier ? publicY : privateY;
    nodes.forEach((node, i) => positions.set(node.id, {
      x: (storage ? 2210 : outside ? 80 : publicTier ? 790 : 1500) + (i % 2) * 320,
      y: Math.min(6000, y + Math.floor(i / 2) * 185),
    }));
    const next = y + Math.max(1, Math.ceil(nodes.length / 2)) * 185 + 80;
    if (storage) storageBottom = next; else if (outside) outsideY = next; else if (publicTier) publicY = next; else privateY = next;
  }
  const supportY = Math.max(outsideY, publicY, privateY, storageBottom) + 30;
  graph.nodes.filter(isPlatformService).forEach((node, i) => positions.set(node.id, {
    x: 790 + (i % 3) * 320, y: Math.min(6000, supportY + Math.floor(i / 3) * 180),
  }));
  return { ...graph, nodes: graph.nodes.map(node => ({ ...node, ...positions.get(node.id) })) };
}

export function businessBoundaries(graph: ArchitectureGraph, requirements?: DeploymentRequirements): DiagramBoundary[] {
  const bounds = (ids: string[], padding: number, top: number) => {
    const nodes = graph.nodes.filter(node => ids.includes(node.id));
    const x = Math.max(8, Math.min(...nodes.map(n => n.x)) - padding);
    const y = Math.max(8, Math.min(...nodes.map(n => n.y)) - top);
    return { x, y, width: Math.max(...nodes.map(n => n.x + 280)) - x + padding,
      height: Math.max(...nodes.map(n => n.y + 136)) - y + padding };
  };
  const subnets = groups.flatMap(group => {
    const ids = graph.nodes.filter(node => !isPlatformService(node) && networkPlacement(node) === group.placement).map(node => node.id);
    const box = ids.length ? bounds(ids, 24, 52) : null;
    const note = group.placement === "PRIVATE_INGRESS" ? "Private IPs only · HTTPS, frontend SG & target certificates to configure"
      : group.placement === "PRIVATE_COMPUTE" ? "Egress: NAT or VPC endpoints · decide before deploy"
      : group.placement === "PRIVATE_DATA" ? "No direct internet route · backup & failover to confirm"
      : group.placement === "PUBLIC_INGRESS" ? "TLS, listener / health-check ports & AZ subnets to confirm"
      : group.placement === "PUBLIC_FRONTEND" ? "HTTPS ingress only · no direct public task access proposed"
      : group.placement === "VPC_ENDPOINT" ? "Gateway route, region & endpoint policy to confirm"
      : group.placement === "PRIVATE_MANAGED_STORAGE" ? "Block Public Access · IAM, bucket policy & encryption to review" : undefined;
    return box ? [{ id: `network-${group.placement}`, label: group.label, color: group.color, nodes: ids,
      ...box, height: box.height + (note ? 34 : 0), note }] : [];
  });
  const privateIds = graph.nodes.filter(node => !isPlatformService(node) && !["OUTSIDE_VPC", "PRIVATE_MANAGED_STORAGE", "REVIEW"].includes(networkPlacement(node))).map(node => node.id);
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
  const supportIds = graph.nodes.filter(isPlatformService).map(node => node.id);
  const support: DiagramBoundary[] = supportIds.length ? [{ id: "platform-operations", label: "Build, secrets & observability · separate from application traffic", color: "#d97706", nodes: supportIds,
    ...bounds(supportIds, 24, 52), note: "Configure image delivery, IAM, logs, alarms & retention independently" }] : [];
  if (support.length) support[0].height = (support[0].height || 0) + 34;
  const cloud: DiagramBoundary[] = graph.nodes.length ? [{ id: "aws-cloud", label: "AWS Cloud · architecture proposal", color: "#334155", nodes: graph.nodes.map(node => node.id), ...bounds(graph.nodes.map(node => node.id), 72, 196) }] : [];
  if (cloud.length) cloud[0].height = (cloud[0].height || 0) + 32;
  return [...cloud, ...parents.reverse(), ...subnets, ...support];
}
