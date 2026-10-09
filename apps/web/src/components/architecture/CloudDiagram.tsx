"use client";
import { forwardRef, useId } from "react";
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

export function diagramBounds(graph: ArchitectureGraph, compact = false) {
  return {
    width: Math.max(540, ...graph.nodes.map((n) => n.x + (compact ? 260 : 320))),
    height: Math.max(320, ...graph.nodes.map((n) => n.y + (compact ? 144 : 180))),
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
        x: left + (i % columns) * 250,
        y: 90 + Math.floor(i / columns) * 140,
      }),
    );
    left += columns * 250 + 60;
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
    onSelect: (id: string) => void;
    onNodePointerDown?: (
      event: React.PointerEvent<SVGGElement>,
      node: ArchitectureNode,
    ) => void;
    onPointerMove?: React.PointerEventHandler<SVGSVGElement>;
    onPointerUp?: React.PointerEventHandler<SVGSVGElement>;
  }
>(function CloudDiagram(
  {
    graph,
    zoom,
    selected,
    code,
    boundaries,
    onSelect,
    onNodePointerDown,
    onPointerMove,
    onPointerUp,
  },
  ref,
) {
  const id = useId().replace(/:/g, "");
  const compact = !code;
  const cardWidth = compact ? 220 : 280, cardHeight = compact ? 104 : 136;
  const { width, height } = diagramBounds(graph, compact);
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
      <desc>
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
        const x = Math.max(5, Math.min(...nodes.map((n) => n.x)) - padding),
          y = Math.max(5, Math.min(...nodes.map((n) => n.y)) - padding - 30);
        return (
          <g key={boundary.id}>
            <rect
              x={x}
              y={y}
              width={Math.max(...nodes.map((n) => n.x + cardWidth)) - x + padding}
              height={Math.max(...nodes.map((n) => n.y + cardHeight)) - y + padding}
              rx="12"
              fill={boundary.color}
              fillOpacity="0.018"
              stroke={boundary.color}
              strokeOpacity="0.45"
              strokeDasharray={
                boundary.id.includes("subnet") ? "5 4" : undefined
              }
            />
            <rect
              x={x + 12}
              y={y + 11}
              width={Math.min(460, boundary.label.length * 6 + 20)}
              height="24"
              rx="6"
              fill="white"
            />
            <text
              x={x + 22}
              y={y + 27}
              fontSize="11"
              fontWeight="600"
              fill={boundary.color}
            >
              {boundary.label}
            </text>
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
        const dx = to.x - from.x,
          dy = to.y - from.y;
        const horizontal = Math.abs(dx) > Math.abs(dy);
        const x1 = from.x + (horizontal ? (dx >= 0 ? cardWidth : 0) : cardWidth / 2),
          y1 = from.y + (horizontal ? cardHeight / 2 : dy >= 0 ? cardHeight : 0);
        const x2 = to.x + (horizontal ? (dx >= 0 ? 0 : cardWidth) : cardWidth / 2),
          y2 = to.y + (horizontal ? cardHeight / 2 : dy >= 0 ? 0 : cardHeight);
        const mx = (x1 + x2) / 2,
          my = (y1 + y2) / 2;
        let path = horizontal
          ? `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
          : `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
        let labelX = mx,
          labelY = my;
        // Keep long cross-layer links beside the cards instead of drawing through
        // intervening resources. Short traffic links use the nearest ports.
        if (!horizontal && Math.abs(dy) > 300) {
          const corridor =
            Math.max(from.x + cardWidth, to.x + cardWidth) + 24 + (i % 3) * 12;
          const start = from.y + cardHeight / 2,
            end = to.y + cardHeight / 2;
          path = `M${from.x + cardWidth},${start} H${corridor} V${end} H${to.x + cardWidth}`;
          labelX = corridor;
          labelY = (start + end) / 2;
        }
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
              stroke={active ? "#0891b2" : "#94a3b8"}
              strokeWidth={active ? 2.5 : 1.6}
              markerEnd={`url(#${id}-arrow)`}
            />
            {(code || active) && <><rect
              x={labelX - label.length * 2.9 - 7}
              y={labelY - 12}
              width={label.length * 5.8 + 14}
              height="24"
              rx="7"
              fill="white"
              stroke={active ? "#a5f3fc" : "#e2e8f0"}
            />
            <text
              x={labelX}
              y={labelY + 4}
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
            aria-label={`Inspect ${node.label}`}
            onClick={() => onSelect(node.id)}
            onKeyDown={(e) => {
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
              fillOpacity="0.08"
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
              fontSize={compact ? 13 : 12}
              fontWeight="600"
              fill="#0f172a"
            >
              {lines(node.label, compact ? 20 : 28).map((line, i) => (
                <tspan key={i} x={node.x + 60} dy={i ? 15 : 0}>
                  {line}
                </tspan>
              ))}
            </text>
            <text x={node.x + 16} y={node.y + (compact ? 64 : 72)} fontSize={compact ? 12 : 11} fill="#475569">
              {lines(node.service, compact ? 29 : 38, compact ? 1 : 2).map((line, i) => (
                <tspan key={i} x={node.x + 16} dy={i ? 14 : 0}>
                  {line}
                </tspan>
              ))}
            </text>
            <line
              x1={node.x + 16}
              y1={node.y + (compact ? 77 : 101)}
              x2={node.x + cardWidth - 16}
              y2={node.y + (compact ? 77 : 101)}
              stroke="#f1f5f9"
            />
            <text
              x={node.x + 16}
              y={node.y + (compact ? 94 : 121)}
              fontSize="9"
              fontWeight="600"
              fill={layer.color}
            >
              {code ? "STATIC CODE FINDING" : "PROPOSED SERVICE"}
            </text>
            <text
              x={node.x + cardWidth - 16}
              y={node.y + (compact ? 94 : 121)}
              textAnchor="end"
              fontSize="9"
              fill="#64748b"
            >
              {
                graph.edges.filter(
                  (e) => e.source === node.id || e.target === node.id,
                ).length
              }{" "}
              connections
            </text>
          </g>
        );
      })}
    </svg>
  );
});
