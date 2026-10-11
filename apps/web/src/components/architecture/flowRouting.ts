import type { ArchitectureGraph, ArchitectureNode } from "./CloudDiagram";
export type Point = { x: number; y: number };
export type FlowObstacle = { x: number; y: number; width: number; height: number };
const width = 280, height = 136;
/** Metadata classification is intentionally conservative: a drawn arrow is never runtime proof. */
export function flowEvidence(label: string) {
  if (/inferred|manifest|source signal/i.test(label)) return "Source signal · runtime unverified";
  if (/customer|declared|environment|\benv\b/i.test(label)) return "Customer-declared connection";
  if (/proposed|proposal/i.test(label)) return "Proposed connection";
  if (/dependency/i.test(label)) return "Source signal · runtime unverified";
  return "Proposed connection";
}
export function flowProtocol(label: string) {
  return /https|tls/i.test(label) ? "HTTPS / TLS plan" : /postgres/i.test(label) ? "PostgreSQL · encryption to review" : /redis/i.test(label) ? "Redis · encryption to review" : /dns/i.test(label) ? "DNS resolution" : /grpc/i.test(label) ? "gRPC · TLS to review" : "Protocol to confirm";
}
const length = (points: Point[]) => points.slice(1).reduce((total, p, i) => total + Math.abs(p.x - points[i].x) + Math.abs(p.y - points[i].y), 0);
function intersects(a: Point, b: Point, n: FlowObstacle) {
  const left = n.x - 12, right = n.x + n.width + 12, top = n.y - 12, bottom = n.y + n.height + 12;
  return a.y === b.y ? a.y > top && a.y < bottom && Math.max(a.x, b.x) > left && Math.min(a.x, b.x) < right
    : a.x > left && a.x < right && Math.max(a.y, b.y) > top && Math.min(a.y, b.y) < bottom;
}
/** Choose short orthogonal channels outside resource cards. Recomputed on dragging;
 * a manually overlapping layout may still need Arrange layers. Never changes graph edges. */
export function routeFlow(from: ArchitectureNode, to: ArchitectureNode, nodes: ArchitectureNode[], index: number, captions: FlowObstacle[] = []) {
  const rightward = to.x >= from.x, downward = to.y >= from.y;
  const startH = { x: from.x + (rightward ? width : 0), y: from.y + height / 2 }, endH = { x: to.x + (rightward ? 0 : width), y: to.y + height / 2 };
  const startV = { x: from.x + width / 2, y: from.y + (downward ? height : 0) }, endV = { x: to.x + width / 2, y: to.y + (downward ? 0 : height) };
  const obstacles = [...nodes.filter(n => n.id !== from.id && n.id !== to.id).map(node => ({ x: node.x, y: node.y, width, height })), ...captions];
  const offset = (index % 5) * 7;
  const mx = (startH.x + endH.x) / 2, my = (startV.y + endV.y) / 2;
  const candidates: Point[][] = [];
  const xs = [...new Set([mx + offset, from.x - 28 - offset, from.x + width + 28 + offset, to.x - 28 - offset, to.x + width + 28 + offset, ...obstacles.flatMap(n => [n.x - 14, n.x + n.width + 14])])];
  const ys = [...new Set([my + offset, from.y - 28 - offset, from.y + height + 28 + offset, to.y - 28 - offset, to.y + height + 28 + offset, ...obstacles.flatMap(n => [n.y - 14, n.y + n.height + 14])])];
  // Only outward-facing departure/arrival ports; no segment can re-enter its own card.
  for (const x of xs) {
    if (x < 20 || (rightward ? x < startH.x || x > endH.x : x > startH.x || x < endH.x)) continue;
    candidates.push([startH, { x, y: startH.y }, { x, y: endH.y }, endH]);
  }
  for (const y of ys) {
    if (y < 20 || (downward ? y < startV.y || y > endV.y : y > startV.y || y < endV.y)) continue;
    candidates.push([startV, { x: startV.x, y }, { x: endV.x, y }, endV]);
  }
  // An aligned pair can have a third card between them. A single elbow cannot
  // avoid that card; depart into the gap, detour above/below, then approach.
  const direction = rightward ? 1 : -1;
  const departureX = startH.x + direction * 24;
  const arrivalX = endH.x - direction * 24;
  const outerTop = Math.max(20, Math.min(...nodes.map(node => node.y), ...captions.map(caption => caption.y)) - 38 - offset);
  const outerBottom = Math.max(...nodes.map(node => node.y + height), ...captions.map(caption => caption.y + caption.height)) + 38 + offset;
  const lanes = [...new Set([...ys.filter(y => y >= 20).sort((a, b) => Math.abs(a - startH.y) + Math.abs(a - endH.y) - Math.abs(b - startH.y) - Math.abs(b - endH.y)).slice(0, 12), outerTop, outerBottom])];
  if (rightward ? departureX <= arrivalX : departureX >= arrivalX) {
    for (const y of lanes) candidates.push([
      startH, { x: departureX, y: startH.y }, { x: departureX, y },
      { x: arrivalX, y }, { x: arrivalX, y: endH.y }, endH,
    ]);
  }
  // Side corridor for same-column resources and return paths.
  for (const right of [true, false]) {
    const a = { x: from.x + (right ? width : 0), y: from.y + height / 2 }, b = { x: to.x + (right ? width : 0), y: to.y + height / 2 };
    const x = right ? Math.max(from.x, to.x) + width + 38 + offset : Math.min(from.x, to.x) - 38 - offset;
    if (x >= 20) candidates.push([a, { x, y: a.y }, { x, y: b.y }, b]);
  }
  let points = candidates[0], score = Infinity;
  for (const candidate of candidates) {
    const crossings = candidate.slice(1).reduce((count, p, i) => count + obstacles.filter(n => intersects(candidate[i], p, n)).length, 0);
    const next = crossings * 100000 + length(candidate);
    if (next < score) { points = candidate; score = next; }
  }
  const segments = points.slice(1).map((p, i) => ({ a: points[i], b: p, distance: Math.abs(p.x - points[i].x) + Math.abs(p.y - points[i].y) }));
  const center = segments.reduce((longest, segment) => segment.distance > longest.distance ? segment : longest, segments[0]);
  return { path: points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" "), x: (center.a.x + center.b.x) / 2, y: (center.a.y + center.b.y) / 2 };
}
