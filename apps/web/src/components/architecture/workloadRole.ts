import type { ArchitectureNode } from "./CloudDiagram";

/** Classify proposed workloads consistently, including model-renamed SPA cards. */
export const isFrontendWorkload = (node: ArchitectureNode) =>
  node.zone === "APPLICATION" &&
  !/\bapi\b|backend|worker/i.test(node.label) &&
  /frontend|web app|web application|\bspa\b|static hosting/i.test(
    `${node.label} ${node.service} ${node.description}`,
  );
