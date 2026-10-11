import type { ArchitectureGraph } from "./CloudDiagram";

/** Customer-requested access pattern; source dependencies and bucket usage stay unverified. */
export function privateStorageProposal(graph: ArchitectureGraph, storageIds: string[]): ArchitectureGraph {
  const selected = new Set(storageIds);
  const storage = graph.nodes.filter(node => selected.has(node.id) && /\bs3\b/i.test(node.service) && !/endpoint/i.test(node.service));
  if (!storage.length) return graph;
  const nodes = graph.nodes.map(node => storage.some(bucket => bucket.id === node.id) ? { ...node, service: "S3 · private access", description: `${node.description.slice(0, 260)} Customer-selected proposal: Block Public Access; workload IAM, bucket/endpoint policies and encryption to review. S3 is managed outside the VPC; same-region gateway endpoint routes need configuration. Runtime bucket use is unverified.`.slice(0, 500) } : { ...node });
  const consumers = graph.edges.filter(edge => selected.has(edge.target) && nodes.some(node => node.id === edge.source && node.zone === "APPLICATION"));
  if (!consumers.length) return { nodes, edges: graph.edges };
  const existing = nodes.find(node => /s3 gateway vpc endpoint/i.test(node.service));
  let endpointId = existing?.id || "private-s3-endpoint";
  let suffix = 1;
  while (!existing && nodes.some(node => node.id === endpointId)) endpointId = `private-s3-endpoint-${suffix++}`;
  if (!existing) nodes.push({ id: endpointId, label: "Private S3 access route", service: "S3 gateway VPC endpoint", zone: "DATA", x: 1220, y: 610, description: "Proposed same-region S3 gateway endpoint associated with workload route tables, not a subnet-hosted bucket. Endpoint and bucket policies must restrict actual workload access. Review existing VPC, routes, IAM and bucket region before implementation." });
  const edges = graph.edges.filter(edge => !consumers.includes(edge));
  const link = (source: string, target: string, label: string) => { if (!edges.some(edge => edge.source === source && edge.target === target)) edges.push({ source, target, label }); };
  for (const edge of consumers) {
    link(edge.source, endpointId, "HTTPS storage route · proposed");
    link(endpointId, edge.target, "S3 dependency · inferred; private route proposed");
  }
  if (nodes.length > 80 || edges.length > 160) throw new Error("Private storage would exceed the diagram limit. Reduce the diagram first.");
  return { nodes, edges };
}
