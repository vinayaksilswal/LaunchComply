import type { ArchitectureGraph, ArchitectureNode } from "./CloudDiagram";

export type NetworkPlacement = "PUBLIC_INGRESS" | "PRIVATE_COMPUTE" | "PRIVATE_DATA" | "OUTSIDE_VPC" | "REVIEW";

/** Service names describe intended placement, not observed AWS resources. */
export function networkPlacement(node: ArchitectureNode): NetworkPlacement {
  const service = node.service;
  // Ambiguous candidates must not be drawn as confirmed private workloads.
  if (/static hosting\s*\/\s*container|cloudfront\s*\/\s*alb|choose a cloud|candidate/i.test(service)) return "REVIEW";
  if (/internal|private/i.test(service) && /load balancer|\balb\b|\bnlb\b/i.test(service)) return "REVIEW";
  if (/application load balancer|\balb\b|network load balancer|\bnlb\b/i.test(service)) return "PUBLIC_INGRESS";
  if (/\brds\b|\baurora\b|elasticache|\bredis\b|\bdocumentdb\b/i.test(service)) return "PRIVATE_DATA";
  if (/\bfargate\b|\becs\b|\bec2\b|\beks\b|container|virtual machine/i.test(service)) return "PRIVATE_COMPUTE";
  if (/cloudfront|route\s*53|static hosting|amplify|\bs3\b|dynamodb|\bsqs\b|\bsns\b|api gateway|\becr\b|cloudwatch|secrets manager|\biam\b|\bwaf\b/i.test(service)) return "OUTSIDE_VPC";
  // Lambda can be VPC-connected or outside a VPC; never infer that from its name.
  return "REVIEW";
}

export function NetworkReview({ graph }: { graph: ArchitectureGraph }) {
  const counts = (placement: NetworkPlacement) => graph.nodes.filter(node => networkPlacement(node) === placement);
  const unresolved = counts("REVIEW");
  const privateWorkloads = counts("PRIVATE_COMPUTE").length + counts("PRIVATE_DATA").length;
  return <section aria-label="Network design review" className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
    <h3 className="text-sm font-semibold">Public & private network design</h3>
    <p className="text-xs leading-5 text-slate-600">A VPC can contain public, private application and isolated data subnets. Placement below is a proposal based on service names; it does not verify routes or access.</p>
    <ul className="text-xs leading-5 text-slate-600 space-y-2">
      <li>{counts("PRIVATE_COMPUTE").length} private compute services · {counts("PRIVATE_DATA").length} private data services · {counts("PUBLIC_INGRESS").length} proposed ingress services.</li>
      {!!privateWorkloads && <li>Decide outbound access: NAT per availability zone when internet access is needed, or supported VPC endpoints. Isolated data subnets should have no direct internet route.</li>}
      {!!counts("PRIVATE_COMPUTE").length && !counts("PUBLIC_INGRESS").length && <li className="text-amber-800">Private compute is proposed, but no explicit load balancer is selected. Confirm whether it serves public traffic or only background jobs.</li>}
      <li>Confirm non-overlapping CIDRs, route tables, TLS termination, health checks, task ports and security groups. Permit application traffic from the ingress security group; restrict data access to its consumers.</li>
      {graph.nodes.some(node => /application load balancer|\balb\b/i.test(node.service)) && <li>For a regional Application Load Balancer, plan subnets in at least two availability zones, even when application capacity is requested in a single zone.</li>}
      <li>Static sites and managed service APIs are outside subnet boundaries. Private access may require endpoints. Multi-region recovery needs separate VPCs and a tested replication and failover plan.</li>
    </ul>
    {!!unresolved.length && <details><summary className="text-xs font-semibold text-amber-800 cursor-pointer">Placement needs review · {unresolved.length} services</summary><ul className="mt-2 space-y-1 text-xs text-slate-600">{unresolved.map(node => <li key={node.id}>{node.label} · {node.service}</li>)}</ul></details>}
    <a className="text-xs text-cyan-800 underline inline-block" target="_blank" rel="noopener noreferrer" href="https://docs.aws.amazon.com/vpc/latest/userguide/vpc-example-private-subnets-nat.html">AWS: private workloads, public ingress & routing</a>
  </section>;
}
