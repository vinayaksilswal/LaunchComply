"use client";
import { forwardRef, useId } from "react";
import { Cloud, Globe, Container, Database, HardDrive, ShieldCheck, KeyRound, ScrollText, Network, Users, Server, Waypoints } from "lucide-react";
import type { ArchitectureGraph, ArchitectureNode } from "./CloudDiagram";
import { networkPlacement } from "./networkPlacement";

export interface DeploymentRequirements {
  peak_requests_per_minute: number;
  concurrent_users: number;
  region: string;
  availability: "SINGLE_AZ" | "MULTI_AZ" | "MULTI_REGION";
  secondary_region: string | null;
}
interface Instance { key: string; node: ArchitectureNode; x: number; y: number; region: number; az: number; role: string; }
interface Boundary { label: string; x: number; y: number; width: number; height: number; kind: "region" | "vpc" | "az" | "subnet"; }
const isIngress = (node: ArchitectureNode) => networkPlacement(node) === "PUBLIC_INGRESS";
const isDatabase = (node: ArchitectureNode) => /\brds\b/i.test(node.service);

/** Network boundaries are proposals; ambiguous hosting is left outside for review. */
export function productionLayout(graph: ArchitectureGraph, requirements: DeploymentRequirements) {
  const regions = requirements.availability === "MULTI_REGION" ? [requirements.region, requirements.secondary_region!] : [requirements.region];
  const compute = graph.nodes.filter(node => networkPlacement(node) === "PRIVATE_COMPUTE");
  const data = graph.nodes.filter(node => networkPlacement(node) === "PRIVATE_DATA");
  const ingress = graph.nodes.filter(isIngress);
  const needsTwoAzIngress = ingress.some(node => /application load balancer|\balb\b/i.test(node.service));
  const azCount = requirements.availability === "SINGLE_AZ" && !needsTwoAzIngress ? 1 : 2;
  const replicas = requirements.availability !== "SINGLE_AZ";
  const shared = graph.nodes.filter(node => ["OUTSIDE_VPC", "REVIEW"].includes(networkPlacement(node)));
  const hasVpc = !!(compute.length || data.length || ingress.length);
  const columns = Math.max(compute.length, data.length, ingress.length) > 3 ? 2 : 1;
  const azWidth = columns * 200 + 48;
  const regionWidth = azCount * (azWidth + 16) + 48;
  const publicHeight = Math.max(1, Math.ceil(ingress.length / columns)) * 116 + 76;
  const computeHeight = compute.length ? Math.ceil(compute.length / columns) * 116 + 42 : 0;
  const dataHeight = data.length ? Math.ceil(data.length / columns) * 116 + 42 : 0;
  const regionHeight = 118 + publicHeight + computeHeight + dataHeight;
  const top = 150;
  const regionalWidth = hasVpc ? regions.length * (regionWidth + 24) : 0;
  const sharedX = 40 + regionalWidth;
  const width = Math.max(760, sharedX + (shared.length ? 448 : 0) + 40);
  const height = Math.max(420, top + (hasVpc ? regionHeight : 0) + 75, top + Math.ceil(shared.length / 2) * 116 + 80);
  const instances: Instance[] = shared.map((node, i) => ({ key: `${node.id}-shared`, node,
    x: sharedX + 22 + (i % 2) * 204, y: top + 48 + Math.floor(i / 2) * 116, region: -1, az: -1,
    role: networkPlacement(node) === "REVIEW" ? "Hosting / network placement unresolved" : "Outside VPC - review regional scope" }));
  const boundaries: Boundary[] = [];
  if (shared.length) boundaries.push({ label: "Managed services / placement to review", x: sharedX, y: top, width: 448, height: Math.ceil(shared.length / 2) * 116 + 64, kind: "region" });
  if (hasVpc) regions.forEach((region, r) => {
    const x = 40 + r * (regionWidth + 24);
    boundaries.push({ label: `${r ? "Recovery region" : "Primary region"}: ${region} - proposed`, x, y: top, width: regionWidth, height: regionHeight, kind: "region" });
    boundaries.push({ label: "VPC - CIDR and route tables need review", x: x + 12, y: top + 36, width: regionWidth - 24, height: regionHeight - 48, kind: "vpc" });
    for (let az = 0; az < azCount; az++) {
      const ax = x + 24 + az * (azWidth + 16);
      boundaries.push({ label: `Availability zone ${az ? "B" : "A"} - planned`, x: ax, y: top + 74, width: azWidth, height: regionHeight - 94, kind: "az" });
      const py = top + 110;
      boundaries.push({ label: "Public subnet - proposed", x: ax + 8, y: py, width: azWidth - 16, height: publicHeight - 8, kind: "subnet" });
      ingress.forEach((node, i) => instances.push({ key: `${node.id}-${r}-${az}-ingress`, node, x: ax + 24 + (i % columns) * 200, y: py + 35 + Math.floor(i / columns) * 116, region: r, az,
        role: "Ingress zone endpoint - proposed" }));
      const cy = py + publicHeight;
      if (computeHeight) boundaries.push({ label: "Private application subnet", x: ax + 8, y: cy, width: azWidth - 16, height: computeHeight - 8, kind: "subnet" });
      if (!az || replicas) compute.forEach((node, i) => instances.push({ key: `${node.id}-${r}-${az}`, node, x: ax + 24 + (i % columns) * 200, y: cy + 34 + Math.floor(i / columns) * 116, region: r, az,
        role: r ? "Recovery capacity - needs sizing" : `${replicas ? "Replica" : "Instance"} ${az + 1} - proposed` }));
      const dy = cy + computeHeight;
      if (dataHeight) boundaries.push({ label: "Isolated data subnet - review routes", x: ax + 8, y: dy, width: azWidth - 16, height: dataHeight - 8, kind: "subnet" });
      data.forEach((node, i) => {
        if (az && (!replicas || !isDatabase(node))) return;
        instances.push({ key: `${node.id}-${r}-${az}`, node, x: ax + 24 + (i % columns) * 200, y: dy + 34 + Math.floor(i / columns) * 116, region: r, az,
          role: isDatabase(node) ? `${r ? "Recovery copy" : az ? "Standby" : "Primary"} - proposed` : "Data placement - review required" });
      });
    }
  });
  const links: { from: Instance; to: Instance; label: string; replication?: boolean }[] = [];
  graph.edges.forEach(edge => {
    const from = instances.filter(item => item.node.id === edge.source);
    const to = instances.filter(item => item.node.id === edge.target && !(isDatabase(item.node) && item.az === 1));
    for (const source of from) {
      if (isDatabase(source.node) && source.az === 1) continue;
      if (source.region === -1 || source.az === -1) {
        to.filter(target => source.region === -1 || target.region === source.region || target.region === -1).forEach(target => links.push({ from: source, to: target, label: edge.label }));
      } else {
        const target = to.find(item => item.region === source.region && item.az === source.az) || to.find(item => item.region === source.region && item.az === 0) || to.find(item => item.region === source.region && item.az === -1) || to.find(item => item.region === -1);
        if (target) links.push({ from: source, to: target, label: edge.label });
      }
    }
  });
  graph.nodes.filter(isDatabase).forEach(node => {
    regions.forEach((_, r) => {
      const a = instances.find(item => item.node.id === node.id && item.region === r && item.az === 0);
      const b = instances.find(item => item.node.id === node.id && item.region === r && item.az === 1);
      if (a && b) links.push({ from: a, to: b, label: "Multi-AZ standby · proposed", replication: true });
    });
  });
  return { width, height, boundaries, instances, links };
}
const ingressPresent = (graph: ArchitectureGraph) => graph.nodes.some(isIngress);

function appearance(service: string) {
  if (/rds|database|postgres|mysql|redis|mongo/i.test(service)) return { icon: Database, color: "#4338ca" };
  if (/s3|storage/i.test(service)) return { icon: HardDrive, color: "#4d7c0f" };
  if (/waf|security/i.test(service)) return { icon: ShieldCheck, color: "#be123c" };
  if (/secret|iam/i.test(service)) return { icon: KeyRound, color: "#be123c" };
  if (/cloudwatch|log/i.test(service)) return { icon: ScrollText, color: "#a21caf" };
  if (/fargate|ecs|container/i.test(service)) return { icon: Container, color: "#c2611b" };
  if (/cloudfront|dns|route 53/i.test(service)) return { icon: Globe, color: "#6d28d9" };
  if (/balancer|alb|ingress/i.test(service)) return { icon: Waypoints, color: "#c2611b" };
  return { icon: Server, color: "#0e7490" };
}
function truncate(value: string, length = 29) { return value.length > length ? value.slice(0, length - 1) + "…" : value; }

export const ProductionDiagram = forwardRef<SVGSVGElement, {
  graph: ArchitectureGraph; requirements: DeploymentRequirements; zoom: number; selected?: string | null; onSelect: (id: string) => void;
}>(function ProductionDiagram({ graph, requirements, zoom, selected, onSelect }, ref) {
  const id = useId().replace(/:/g, "");
  const { width, height, boundaries, instances, links } = productionLayout(graph, requirements);
  return <svg ref={ref} width={width * zoom} height={height * zoom} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Proposed AWS region and availability zone architecture" className="select-none">
    <title>AWS deployment architecture proposal · not deployed</title>
    <desc>Proposed placement from saved source findings and customer requirements. Availability-zone letters are placeholders. Replica counts are initial proposals, not measured capacity. Region recovery and network configuration need an infrastructure plan.</desc>
    <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="context-stroke" /></marker></defs>
    <rect width={width} height={height} fill="white" />
    <rect x="12" y="12" width={width - 24} height={height - 24} fill="white" stroke="#64748b" rx="3" />
    <rect x="12" y="12" width="42" height="38" fill="#263342" /><Cloud x={23} y={20} width={22} height={22} color="white" />
    <text x="68" y="36" fill="#334155" fontSize="14" fontWeight="700">AWS Cloud · deployment proposal</text>
    <text x="68" y="59" fill="#64748b" fontSize="11">{requirements.peak_requests_per_minute.toLocaleString()} peak requests/min · {requirements.concurrent_users.toLocaleString()} concurrent users · capacity validation pending</text>
    <Users x={width / 2 - 20} y={76} width={40} height={40} color="#334155" />
    <text x={width / 2} y={132} textAnchor="middle" fill="#475569" fontSize="12">Application users</text>
    {boundaries.map((boundary, index) => {
      const color = boundary.kind === "vpc" ? "#548d36" : boundary.kind === "az" ? "#3b82a0" : boundary.kind === "subnet" ? "#9ac0cb" : "#cbd5e1";
      return <g key={index}><rect x={boundary.x} y={boundary.y} width={boundary.width} height={boundary.height} fill={boundary.kind === "subnet" ? "#eef7fa" : "none"} stroke={color} strokeDasharray={boundary.kind === "az" ? "6 5" : undefined} strokeWidth={boundary.kind === "vpc" ? 1.5 : 1} />
        <rect x={boundary.x + 9} y={boundary.y + 9} width={Math.min(boundary.width - 18, boundary.label.length * 6.2 + 12)} height="21" fill="white" />
        {boundary.kind === "vpc" && <Network x={boundary.x + 13} y={boundary.y + 13} width={14} height={14} color={color} />}
        <text x={boundary.x + (boundary.kind === "vpc" ? 33 : 14)} y={boundary.y + 24} fill={color} fontWeight="600" fontSize="10.5">{boundary.label}</text></g>;
    })}
    {boundaries.filter(boundary => boundary.kind === "subnet" && boundary.label.startsWith("Public")).map((boundary, i) => <g key={`route-${i}`}>
      <text x={boundary.x + 12} y={boundary.y + boundary.height - 23} fill="#64748b" fontSize="10">Public route: 0.0.0.0/0 to internet gateway</text>
      <text x={boundary.x + 12} y={boundary.y + boundary.height - 9} fill="#64748b" fontSize="10">NAT / endpoint strategy to confirm</text>
      {!ingressPresent(graph) && <text x={boundary.x + 12} y={boundary.y + 58} fill="#9a6700" fontSize="11">Ingress / NAT decision pending</text>}
    </g>)}
    {instances.filter(instance => instance.region === -1 && instance.node.zone === "EDGE" && !graph.edges.some(edge => edge.target === instance.node.id)).map(instance => <path key={`users-${instance.key}`} d={`M${width / 2} 134 V140 H${instance.x + 88} V${instance.y}`} fill="none" stroke="#7b8794" strokeWidth="1.3" markerEnd={`url(#${id}-arrow)`} />)}
    {links.map((link, i) => {
      const sx = link.from.x + 88, sy = link.from.y + 28, tx = link.to.x + 88, ty = link.to.y + 28;
      const horizontal = Math.abs(tx - sx) > Math.abs(ty - sy);
      const startX = horizontal ? sx + (tx > sx ? 28 : -28) : sx;
      const endX = horizontal ? tx + (tx > sx ? -28 : 28) : tx;
      const startY = horizontal ? sy : sy + (ty > sy ? 28 : -28);
      const endY = horizontal ? ty : ty + (ty > sy ? -28 : 28);
      const corridor = (startX + endX) / 2;
      const active = selected === link.from.node.id || selected === link.to.node.id;
      return <g key={i} opacity={selected && !active ? 0.22 : 1}><title>{link.from.node.label} → {link.to.node.label}: {link.label}</title>
        <path d={horizontal ? `M${startX} ${startY} H${corridor} V${endY} H${endX}` : `M${startX} ${startY} V${(startY + endY) / 2} H${endX} V${endY}`} fill="none" stroke={active ? "#0891b2" : "#7b8794"} strokeWidth={active ? 2 : 1.3} strokeDasharray={link.replication ? "5 4" : undefined} markerEnd={`url(#${id}-arrow)`} />
        {(link.replication || (selected && active)) && <><rect x={corridor - 95} y={(startY + endY) / 2 - 19} width="190" height="18" fill="white" /><text x={corridor} y={(startY + endY) / 2 - 6} textAnchor="middle" fontSize="10" fill="#64748b">{truncate(link.label, 38)}</text></>}
      </g>;
    })}
    {instances.map(instance => {
      const { icon: Icon, color } = appearance(instance.node.service);
      return <g key={instance.key} role="button" tabIndex={0} aria-label={`Inspect ${instance.node.label}, ${instance.role}`} onClick={() => onSelect(instance.node.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(instance.node.id); } }} style={{ cursor: "pointer" }}>
        <title>{instance.node.label} · {instance.node.service} · {instance.role}\n{instance.node.description}</title>
        {selected === instance.node.id && <rect x={instance.x - 4} y={instance.y - 4} width="184" height="109" rx="6" fill="#ecfeff" stroke="#0891b2" />}
        <rect x={instance.x + 60} y={instance.y} width="56" height="56" rx="3" fill={color} />
        <Icon x={instance.x + 72} y={instance.y + 12} width={32} height={32} color="white" strokeWidth={1.3} />
        <rect x={instance.x} y={instance.y + 61} width="176" height="42" fill="white" fillOpacity="0.93" />
        <text x={instance.x + 88} y={instance.y + 73} textAnchor="middle" fontSize="12" fill="#0f172a" fontWeight="600">{truncate(instance.node.label)}</text>
        <text x={instance.x + 88} y={instance.y + 87} textAnchor="middle" fontSize="11" fill="#475569">{truncate(instance.node.service, 34)}</text>
        <text x={instance.x + 88} y={instance.y + 100} textAnchor="middle" fontSize="10" fill="#64748b">{truncate(instance.role, 39)}</text>
      </g>;
    })}
    <text x="40" y={height - 34} fontSize="10.5" fill="#64748b">Planned boundaries · no assigned subnet CIDRs · no cloud resources created · load testing and recovery design required</text>
  </svg>;
});
