"use client";
import { forwardRef, useId } from "react";
import { routeFlow, flowEvidence, flowPorts } from "./flowRouting";
import { networkPlacement } from "./networkPlacement";
import type { WorkloadPolicy } from "./ProductionDiagram";
import {
  Globe,
  Server,
  Database,
  Layers,
  ShieldCheck,
  Container,
  HardDrive,
  KeyRound,
  ScrollText,
  Waypoints,
} from "lucide-react";

export type ArchitectureZone = "EDGE" | "APPLICATION" | "DATA" | "SUPPORT";
export interface ArchitectureNode {
  id: string;
  label: string;
  service: string;
  zone: ArchitectureZone;
  description: string;
  x: number;
  y: number;
}
export interface ArchitectureGraph {
  nodes: ArchitectureNode[];
  edges: { source: string; target: string; label: string }[];
}
export interface DiagramBoundary {
  id: string;
  label: string;
  nodes: string[];
  color: string;
  padding?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  note?: string;
}
export const architectureLayers = [
  { id: "EDGE", name: "Public entry", color: "#0891b2", icon: Globe },
  {
    id: "APPLICATION",
    name: "Application services",
    color: "#6366f1",
    icon: Server,
  },
  { id: "DATA", name: "Data & persistence", color: "#059669", icon: Database },
  { id: "SUPPORT", name: "Platform services", color: "#d97706", icon: Layers },
] as const;

export function diagramBounds(graph: ArchitectureGraph, compact = false, boundaries?: DiagramBoundary[]) {
  return {
    width: Math.max(540, ...graph.nodes.map((n) => n.x + 320), ...(boundaries || []).map(b => (b.x || 0) + (b.width || 0) + 24)),
    height: Math.max(320, ...graph.nodes.map((n) => n.y + 180), ...(boundaries || []).map(b => (b.y || 0) + (b.height || 0) + 24)),
  };
}

/** Arrange existing components only; never add inferred resources or connections. */
export function arrangeArchitecture(
  graph: ArchitectureGraph,
): ArchitectureGraph {
  let left = 50;
  const positions = new Map<string, { x: number; y: number }>();
  for (const layer of architectureLayers) {
    const nodes = graph.nodes.filter((n) => n.zone === layer.id);
    if (!nodes.length) continue;
    const columns = Math.min(3, Math.ceil(nodes.length / 4));
    nodes.forEach((node, i) =>
      positions.set(node.id, {
        x: left + (i % columns) * 320,
        y: 150 + Math.floor(i / columns) * 180,
      }),
    );
    left += columns * 320 + 60;
  }
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({ ...n, ...positions.get(n.id) })),
  };
}

function lines(value: string, limit: number, maxLines = 2) {
  const chunks: string[] = [];
  let rest = value;
  while (rest.length && chunks.length < maxLines) {
    if (rest.length <= limit) {
      chunks.push(rest);
      break;
    }
    const space = rest.lastIndexOf(" ", limit);
    const length = space > limit / 2 ? space : limit;
    chunks.push(rest.slice(0, length));
    rest = rest.slice(length).trimStart();
    if (chunks.length === maxLines)
      chunks[chunks.length - 1] = chunks[chunks.length - 1].slice(0, -1) + "…";
  }
  return chunks;
}

export function downloadArchitectureSvg(svg: SVGSVGElement | null, filename = "cloud-architecture-proposal.svg") {
  if (!svg) return;
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("font-family", "Arial, Helvetica, sans-serif");
  copy.style.fontFamily = "Arial, Helvetica, sans-serif";
  const box = svg.viewBox.baseVal;
  copy.setAttribute("width", String(box.width));
  copy.setAttribute("height", String(box.height));
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(copy)], {
      type: "image/svg+xml",
    }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const CloudDiagram = forwardRef<
  SVGSVGElement,
  {
    graph: ArchitectureGraph;
    zoom: number;
    selected?: string | null;
    code?: boolean;
    boundaries?: DiagramBoundary[];
    workloadPolicies?: WorkloadPolicy[];
    onSelect: (id: string) => void;
    onNodePointerDown?: (
      event: React.PointerEvent<SVGGElement>,
      node: ArchitectureNode,
    ) => void;
    onPointerMove?: React.PointerEventHandler<SVGSVGElement>;
    onPointerUp?: React.PointerEventHandler<SVGSVGElement>;
    onNodeMove?: (node: ArchitectureNode, dx: number, dy: number) => void;
  }
>(function CloudDiagram(
  {
    graph,
    zoom,
    selected,
    code,
    boundaries,
    workloadPolicies,
    onSelect,
    onNodePointerDown,
    onPointerMove,
    onPointerUp,
    onNodeMove,
  },
  ref,
) {
  const id = useId().replace(/:/g, "");
  const compact = !code;
  const cardWidth = 280, cardHeight = 136;
  const { width, height } = diagramBounds(graph, compact, boundaries);
  const captionObstacles = (boundaries || []).flatMap(boundary => {
    const nodes = graph.nodes.filter(node => boundary.nodes.includes(node.id));
    if (!nodes.length) return [];
    const padding = boundary.padding || 20;
    const x = boundary.x ?? Math.max(5, Math.min(...nodes.map(node => node.x)) - padding);
    const y = boundary.y ?? Math.max(5, Math.min(...nodes.map(node => node.y)) - padding - 30);
    const boxWidth = boundary.width ?? Math.max(...nodes.map(node => node.x + cardWidth)) - x + padding;
    const boxHeight = boundary.height ?? Math.max(...nodes.map(node => node.y + cardHeight)) - y + padding;
    return [
      { x: x + 12, y: y + 11, width: Math.min(boxWidth - 24, boundary.label.length * 6 + 20), height: 34 },
      ...(boundary.note ? [{ x: x + 16, y: y + boxHeight - 38, width: boxWidth - 32, height: 28 }] : []),
    ];
  });
  const related = new Set(
    graph.edges
      .filter((e) => e.source === selected || e.target === selected)
      .flatMap((e) => [e.source, e.target]),
  );
  return (
    <svg
      ref={ref}
      role="img"
      aria-label={`${code ? "Static code findings" : "Proposed cloud architecture"} diagram`}
      width={width * zoom}
      height={height * zoom}
      viewBox={`0 0 ${width} ${height}`}
      fontFamily="Arial, Helvetica, sans-serif"
      className="select-none touch-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <title>
        {code
          ? "Static repository code findings"
          : "Cloud architecture proposal — not deployed"}
      </title>
      <desc id={`${id}-help`}>
        {code ? "Arrows show resolved static imports in the inspected source sample. Groups describe file organization, not runtime connections. Select a group or file to review source paths." : "Arrow direction shows proposed data flow. Select a component to review its details. Layer placement does not verify network isolation or deployment."}
      </desc>
      <defs>
        <marker
          id={`${id}-arrow`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0 0 L10 5 L0 10 Z" fill="context-stroke" />
        </marker>
        <filter
          id={`${id}-shadow`}
          x="-10%"
          y="-10%"
          width="120%"
          height="135%"
        >
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="4"
            floodColor="#0f172a"
            floodOpacity="0.05"
          />
        </filter>
      </defs>
      <rect width={width} height={height} fill="white" />
      {boundaries?.map((boundary) => {
        const nodes = graph.nodes.filter((n) => boundary.nodes.includes(n.id));
        if (!nodes.length) return null;
        const padding = boundary.padding || 20;
        const x = boundary.x ?? Math.max(5, Math.min(...nodes.map((n) => n.x)) - padding),
          y = boundary.y ?? Math.max(5, Math.min(...nodes.map((n) => n.y)) - padding - 30);
        const boundaryWidth = boundary.width ?? Math.max(...nodes.map((n) => n.x + cardWidth)) - x + padding;
        return (
          <g key={boundary.id}>
            <rect
              x={x}
              y={y}
              width={boundaryWidth}
              height={boundary.height ?? Math.max(...nodes.map((n) => n.y + cardHeight)) - y + padding}
              rx="12"
              fill={boundary.color}
              fillOpacity={boundary.id === "vpc" || boundary.id === "aws-cloud" ? 0 : 0.045}
              stroke={boundary.color}
              strokeOpacity={boundary.id === "aws-cloud" ? 0.75 : 0.5}
              strokeDasharray={
                boundary.id.startsWith("network-") ? "5 4" : undefined
              }
            />
            <rect
              x={x + 12}
              y={y + 11}
              width={Math.min(boundaryWidth - 24, boundary.label.length * 6 + 20)}
              height="34"
              rx="6"
              fill="white"
            />
            <text
              x={x + 22}
              y={y + 27}
              fontSize={boundary.id === "aws-cloud" ? 17 : 14}
              fontWeight="600"
              fill={boundary.color}
            >
              {lines(boundary.label, Math.max(22, Math.floor((boundaryWidth - 44) / 7))).map((line, i) => <tspan key={i} x={x + 22} dy={i ? 15 : 0}>{line}</tspan>)}
            </text>
            {boundary.note && <text x={x + 16} y={y + (boundary.height || 0) - 25} fontSize="11" fill="#64748b">{lines(boundary.note, Math.max(22, Math.floor((boundaryWidth - 32) / 6))).map((line, i) => <tspan key={i} x={x + 16} dy={i ? 13 : 0}>{line}</tspan>)}</text>}
          </g>
        );
      })}
      {!code &&
        !boundaries &&
        architectureLayers.map((layer) => {
          const nodes = graph.nodes.filter((n) => n.zone === layer.id);
          if (!nodes.length) return null;
          const x = Math.max(8, Math.min(...nodes.map((n) => n.x)) - 20),
            y = Math.max(8, Math.min(...nodes.map((n) => n.y)) - 48);
          return (
            <g key={layer.id}>
              <rect
                x={x}
                y={y}
                width={Math.max(...nodes.map((n) => n.x + cardWidth)) - x + 20}
                height={Math.max(...nodes.map((n) => n.y + cardHeight)) - y + 20}
                rx="16"
                fill={layer.color}
                fillOpacity="0.025"
                stroke={layer.color}
                strokeOpacity="0.2"
              />
              <circle cx={x + 17} cy={y + 22} r="4" fill={layer.color} />
              <text
                x={x + 30}
                y={y + 26}
                fontSize="11"
                fontWeight="600"
                fill={layer.color}
              >
                {layer.name.toUpperCase()}
              </text>
            </g>
          );
        })}
      {graph.edges.map((edge, i) => {
        const from = graph.nodes.find((n) => n.id === edge.source),
          to = graph.nodes.find((n) => n.id === edge.target);
        if (!from || !to) return null;
        const routed = routeFlow(from, to, graph.nodes, i, captionObstacles, flowPorts(graph, i));
        const path = routed.path, labelX = routed.x, labelY = routed.y;
        const inferred = flowEvidence(edge.label).startsWith("Source signal");
        const color = to.zone === "DATA" ? "#059669" : from.zone === "SUPPORT" || to.zone === "SUPPORT" ? "#b45309" : "#0e7490";
        const active = edge.source === selected || edge.target === selected;
        const label =
          edge.label.length > 35 ? edge.label.slice(0, 34) + "…" : edge.label;
        return (
          <g
            key={`${edge.source}-${edge.target}-${i}`}
            opacity={selected && !active ? 0.25 : 1}
          >
            <title>
              {from.label} → {to.label}: {edge.label}
            </title>
            <path
              d={path}
              fill="none"
              stroke={active ? "#0284c7" : code ? "#94a3b8" : color}
              strokeWidth={active ? 2.8 : 1.8}
              strokeDasharray={inferred ? "7 5" : undefined}
              strokeLinejoin="round"
              markerEnd={`url(#${id}-arrow)`}
            />
            {!code && <g aria-label={`Request flow ${i + 1}`}><circle cx={labelX} cy={labelY} r="12" fill="white" stroke={active ? "#0284c7" : color} strokeWidth="1.5" /><text x={labelX} y={labelY + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill={color}>{i + 1}</text></g>}
            {(code || active) && <><rect
              x={labelX - label.length * 2.9 - 7}
              y={labelY - (code ? 12 : 40)}
              width={label.length * 5.8 + 14}
              height="24"
              rx="7"
              fill="white"
              stroke={active ? "#a5f3fc" : "#e2e8f0"}
            />
            <text
              x={labelX}
              y={labelY + (code ? 4 : -24)}
              textAnchor="middle"
              fontSize="10"
              fill={active ? "#0e7490" : "#64748b"}
            >
              {label}
            </text></>}
          </g>
        );
      })}
      {graph.nodes.map((node) => {
        const layer = architectureLayers.find((z) => z.id === node.zone)!;
        const service = node.service.toLowerCase();
        const Icon = /secret|credential|iam/.test(service)
          ? KeyRound
          : /ecr|container|fargate|ecs/.test(service)
            ? Container
            : /cloudwatch|log/.test(service)
              ? ScrollText
              : /s3|storage/.test(service)
                ? HardDrive
                : /sqs|queue|balancer/.test(service)
                  ? Waypoints
                  : /waf|security/.test(service)
                    ? ShieldCheck
                    : layer.icon;
        return (
          <g
            key={node.id}
            role="button"
            tabIndex={0}
            aria-label={`Inspect ${node.label}${code ? "" : ` (${node.service})`}`}
            aria-describedby={onNodeMove ? `${id}-help` : undefined}
            onClick={() => onSelect(node.id)}
            onKeyDown={(e) => {
              const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
              if (direction && onNodeMove && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                const step = e.shiftKey ? 40 : 10;
                onNodeMove(node, direction[0] * step, direction[1] * step);
                return;
              }
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(node.id);
              }
            }}
            onPointerDown={(e) => onNodePointerDown?.(e, node)}
            style={{ cursor: onNodePointerDown ? "grab" : "pointer" }}
          >
            <title>
              {node.label} · {node.service}\n{node.description}
            </title>
            <rect
              x={node.x}
              y={node.y}
              width={cardWidth}
              height={cardHeight}
              rx="12"
              fill="white"
              stroke={
                selected === node.id
                  ? layer.color
                  : related.has(node.id)
                    ? "#a5f3fc"
                    : "#dbe3ec"
              }
              strokeWidth={selected === node.id ? 2 : 1}
              filter={`url(#${id}-shadow)`}
            />
            <rect
              x={node.x + 1}
              y={node.y + 15}
              width="3"
              height="35"
              rx="1.5"
              fill={layer.color}
            />
            <rect
              x={node.x + 15}
              y={node.y + 16}
              width="34"
              height="34"
              rx="9"
              fill={layer.color}
              fillOpacity="0.14"
            />
            <Icon
              x={node.x + 23}
              y={node.y + 24}
              width={18}
              height={18}
              color={layer.color}
            />
            <text
              x={node.x + 60}
              y={node.y + 29}
              fontSize={compact ? 18 : 15}
              fontWeight="600"
              fill="#0f172a"
            >
              {lines(node.label, compact ? 22 : 24).map((line, i) => (
                <tspan key={i} x={node.x + 60} dy={i ? 21 : 0}>
                  {line}
                </tspan>
              ))}
            </text>
            <text x={node.x + 16} y={node.y + 75} fontSize={compact ? 15 : 13} fill="#475569">
              {lines(node.service, compact ? 32 : 34, 1).map((line, i) => (
                <tspan key={i} x={node.x + 16} dy={i ? 17 : 0}>
                  {line}
                </tspan>
              ))}
            </text>
            <line
              x1={node.x + 16}
              y1={node.y + 101}
              x2={node.x + cardWidth - 16}
              y2={node.y + 101}
              stroke="#f1f5f9"
            />
            {!code && node.zone === "APPLICATION" && /\becs\b|\bfargate\b/i.test(node.service) && workloadPolicies?.filter(policy => policy.node_id === node.id).map(policy => <text key={policy.node_id} x={node.x + 16} y={node.y + 94} fontSize="12" fill="#0e7490">{policy.min_tasks}–{policy.max_tasks} tasks · {policy.metric === "ALB_REQUESTS" ? "ALB request scaling" : `${policy.metric} ${policy.target}%`} · plan</text>)}
            <text
              x={node.x + 16}
              y={node.y + 121}
              fontSize="10"
              fontWeight="600"
              fill={layer.color}
            >
              {code ? "STATIC SOURCE" : /Proposed (\d+) replicas/i.test(node.description) ? `${/Proposed (\d+) replicas/i.exec(node.description)?.[1]} REPLICAS · PLAN` : ({ PUBLIC_FRONTEND: "PUBLIC FRONTEND", PUBLIC_INGRESS: "HTTPS INGRESS", PRIVATE_INGRESS: "INTERNAL HTTPS INGRESS", PRIVATE_COMPUTE: "PRIVATE COMPUTE", PRIVATE_DATA: "ISOLATED DATA", VPC_ENDPOINT: "PRIVATE SERVICE ROUTE", PRIVATE_MANAGED_STORAGE: "PRIVATE MANAGED STORAGE", OUTSIDE_VPC: "MANAGED / GLOBAL", REVIEW: "PLACEMENT TO CONFIRM" }[networkPlacement(node)])}
            </text>
            <text
              x={node.x + cardWidth - 16}
              y={node.y + 121}
              textAnchor="end"
              fontSize="10"
              fill="#64748b"
            >
              {
                graph.edges.filter(
                  (e) => e.source === node.id || e.target === node.id,
                ).length
              }{" "}
              links
            </text>
          </g>
        );
      })}
    </svg>
  );
});
