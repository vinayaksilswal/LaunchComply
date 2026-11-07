import type { ArchitectureGraph } from "./CloudDiagram";

/** Place only the new card; never move the customer's existing components. */
export function newComponentPosition(graph: ArchitectureGraph) {
  const free = (x: number, y: number) => graph.nodes.every(node =>
    x + 304 <= node.x || node.x + 304 <= x || y + 160 <= node.y || node.y + 160 <= y);
  const bottom = Math.max(150, ...graph.nodes.map(node => node.y + 180));
  if (bottom <= 5800 && free(150, bottom)) return { x: 150, y: bottom };
  // Dense or tall manually arranged diagrams use the first unoccupied grid slot.
  for (let y = 150; y <= 5800; y += 180)
    for (let x = 150; x <= 5600; x += 320)
      if (free(x, y)) return { x, y };
  return { x: 150, y: 5800 }; // Graph size is bounded far below the grid capacity.
}

const CARD_W = 280, CARD_H = 136, GAP = 24, GRID = 20;
const snap = (value: number) => Math.round(value / GRID) * GRID;
const clampX = (x: number) => Math.max(80, Math.min(6000, x));
const clampY = (y: number) => Math.max(150, Math.min(6000, y));

/**
 * After a card is dropped, snap it to the grid and push any cards it now
 * overlaps out of the way (cascading), so the diagram stays readable. Only
 * positions change; boundaries and connections follow automatically.
 */
export function settleLayout<G extends ArchitectureGraph>(graph: G, anchorId: string): G {
  const positions = new Map(graph.nodes.map(node => [node.id, { x: node.x, y: node.y }]));
  const anchor = positions.get(anchorId);
  if (!anchor) return graph;
  anchor.x = clampX(snap(anchor.x)); anchor.y = clampY(snap(anchor.y));
  const fixed = new Set([anchorId]);
  const queue = [anchorId];
  for (let steps = 0; queue.length && steps < 400; steps++) {
    const id = queue.shift()!;
    const a = positions.get(id)!;
    for (const [otherId, b] of positions) {
      if (fixed.has(otherId)) continue;
      const overlapX = Math.min(a.x + CARD_W + GAP, b.x + CARD_W + GAP) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + CARD_H + GAP, b.y + CARD_H + GAP) - Math.max(a.y, b.y);
      if (overlapX <= 0 || overlapY <= 0) continue;
      // Smallest move that clears the settled card and stays on the canvas.
      const options = [
        { x: snap(a.x + CARD_W + GAP), y: b.y }, { x: snap(a.x - CARD_W - GAP), y: b.y },
        { x: b.x, y: snap(a.y + CARD_H + GAP) }, { x: b.x, y: snap(a.y - CARD_H - GAP) },
      ].filter(o => o.x === clampX(o.x) && o.y === clampY(o.y));
      const best = options.sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
      if (!best) continue;
      b.x = best.x; b.y = best.y;
      fixed.add(otherId);
      queue.push(otherId);
    }
  }
  return { ...graph, nodes: graph.nodes.map(node => ({ ...node, ...positions.get(node.id)! })) };
}

/** True when two diagrams differ only in card positions. */
export function layoutOnlyChange(saved: ArchitectureGraph, current: ArchitectureGraph): boolean {
  const strip = (graph: ArchitectureGraph) => JSON.stringify({
    nodes: [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id)).map(({ x: _x, y: _y, ...rest }) => rest),
    edges: [...graph.edges].map(e => `${e.source}|${e.target}|${e.label}`).sort(),
  });
  return strip(saved) === strip(current);
}
