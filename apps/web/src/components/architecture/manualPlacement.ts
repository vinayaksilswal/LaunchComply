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
