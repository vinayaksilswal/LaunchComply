"use client";
import { useRef, useState } from "react";
import type { ArchitectureGraph, ArchitectureNode } from "./CloudDiagram";
import { arrangeBusinessArchitecture, isPlatformService } from "./businessArchitecture";
import { networkPlacement } from "./networkPlacement";

const frontendCandidate = (node: ArchitectureNode) => node.zone === "APPLICATION" && /frontend|web app|web application/i.test(`${node.label} ${node.description}`) && !/\bapi\b|backend|worker/i.test(node.label);
const backendCandidate = (node: ArchitectureNode) => node.zone === "APPLICATION" && !frontendCandidate(node) && !isPlatformService(node);

/** Explicit customer-selected planning change, never a claim about source calls or deployed routes. */
function secureTrafficProposal(graph: ArchitectureGraph, frontendIds: string[], backendId: string): ArchitectureGraph {
  const fronts = new Set(frontendIds);
  const backend = graph.nodes.find(node => node.id === backendId);
  if (!backend || !backendCandidate(backend) || !fronts.size || fronts.has(backendId) || frontendIds.some(id => !graph.nodes.some(node => node.id === id && frontendCandidate(node)))) throw new Error("Select frontend services and a separate backend service.");
  if (!/ecs|fargate|container/i.test(backend.service)) throw new Error("This pattern needs a container backend. Choose its hosting service before applying.");
  const nodes = graph.nodes.map(node => fronts.has(node.id) ? { ...node, service: "ECS Fargate · public frontend", description: `${node.description.slice(0, 240)} Customer-selected proposal: public frontend subnet; no direct task access; web-ingress SG only. Browser API calls use HTTPS, authentication and reviewed CORS. Build/start/ports and TLS target configuration still need review.`.slice(0, 500) }
    : node.id === backendId ? { ...node, service: "ECS Fargate · private backend", description: `${node.description.slice(0, 240)} Customer-selected proposal: private subnet, no public IP; API-ingress SG only. HTTPS target, health checks, IAM and outbound NAT/endpoints require configuration.`.slice(0, 500) } : { ...node });
  const unique = (base: string) => { let id = base, index = 1; while (nodes.some(node => node.id === id)) id = `${base}-${index++}`; return id; };
  // Reuse an API ingress only if it is not already routing to another workload.
  const apiIngress = nodes.find(node => networkPlacement(node) === "PUBLIC_INGRESS" && graph.edges.some(edge => edge.source === node.id && edge.target === backendId) && !graph.edges.some(edge => edge.source === node.id && edge.target !== backendId && nodes.some(target => target.id === edge.target && target.zone === "APPLICATION")));
  const apiId = apiIngress?.id || unique("secure-api-ingress");
  if (!apiIngress) nodes.push({ id: apiId, label: "Secured API entry", service: "Application Load Balancer", zone: "EDGE", x: 650, y: 150, description: "Proposed public HTTPS API entry with authentication, reviewed CORS and restrictive security groups. Backend targets stay private with no public IP. TLS to targets and certificate/health checks need configuration." });
  else Object.assign(apiIngress, { label: "Secured API entry", description: "Proposed public HTTPS API entry. Authentication, CORS, TLS target certificates and health checks must be configured. Private backend accepts only this ingress security group; no public task IP." });
  const existingWeb = nodes.find(node => node.id !== apiId && node.label === "Frontend HTTPS ingress" && networkPlacement(node) === "PUBLIC_INGRESS");
  const webId = existingWeb?.id || unique("secure-web-ingress");
  if (!existingWeb) nodes.push({ id: webId, label: "Frontend HTTPS ingress", service: "Application Load Balancer", zone: "EDGE", x: 650, y: 290, description: "Proposed HTTPS ingress for customer-selected public frontend containers. Host/path routing, TLS to targets, certificates and frontend health checks must be configured. Frontend SG accepts only this ingress SG." });
  const support = new Set(nodes.filter(isPlatformService).map(node => node.id));
  // Replace the selected frontend routes explicitly, retaining unrelated workload/data links.
  const edges = graph.edges.filter(edge => !support.has(edge.source) && !support.has(edge.target) && !fronts.has(edge.source) && !fronts.has(edge.target) && !(edge.target === backendId && nodes.some(node => node.id === edge.source && node.zone === "EDGE")));
  const link = (source: string, target: string, label: string) => { if (!edges.some(edge => edge.source === source && edge.target === target)) edges.push({ source, target, label }); };
  const cdn = nodes.find(node => /cloudfront/i.test(node.service));
  const dns = nodes.find(node => /route\s*53/i.test(node.service));
  if (cdn) link(cdn.id, webId, "HTTPS web origin · proposed");
  else if (dns) link(dns.id, webId, "DNS resolution · proposed");
  if (dns && !edges.some(edge => edge.target === apiId)) link(dns.id, apiId, "API DNS · proposed");
  for (const id of frontendIds) {
    link(webId, id, "HTTPS web target · proposed");
    link(id, apiId, "Browser HTTPS API · customer intent");
  }
  link(apiId, backendId, "HTTPS private target · proposed");
  if (nodes.length > 80 || edges.length > 160) throw new Error("This change exceeds the workspace diagram limit. Reduce the selection first.");
  return arrangeBusinessArchitecture({ nodes, edges });
}

export function SecureTrafficDesign({ graph, disabled, onApply }: { graph: ArchitectureGraph; disabled: boolean; onApply: (graph: ArchitectureGraph) => void }) {
  const modal = useRef<HTMLDialogElement>(null);
  const [frontends, setFrontends] = useState<string[]>([]);
  const [backend, setBackend] = useState("");
  const [error, setError] = useState("");
  const candidates = graph.nodes.filter(frontendCandidate), backends = graph.nodes.filter(backendCandidate);
  return <>
    <button disabled={disabled || !candidates.length || !backends.length} onClick={() => { setFrontends(candidates.map(node => node.id)); setBackend(backends.find(node => /api|backend/i.test(node.label))?.id || backends[0]?.id || ""); setError(""); modal.current?.showModal(); }} className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-xs font-semibold text-cyan-800 disabled:opacity-40">Review secure traffic</button>
    <dialog ref={modal} aria-labelledby="secure-traffic-title" className="m-auto w-[calc(100%_-_2rem)] max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40">
      <h2 id="secure-traffic-title" className="text-lg font-semibold">Public frontends, private backend</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Choose the frontends that should call this backend. This records your intended connection; source endpoints and live access remain unverified.</p>
      <fieldset className="my-4 space-y-2"><legend className="mb-2 text-xs font-semibold">Public-tier frontend containers</legend>{candidates.map(node => <label key={node.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={frontends.includes(node.id)} onChange={event => setFrontends(current => event.target.checked ? [...current, node.id] : current.filter(id => id !== node.id))} />{node.label}</label>)}</fieldset>
      <label className="block text-xs font-semibold">Private backend<select value={backend} onChange={event => setBackend(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm">{backends.map(node => <option key={node.id} value={node.id}>{node.label} · {node.service}</option>)}</select></label>
      <ul className="my-4 space-y-2 text-xs leading-5 text-slate-600"><li>Browser → HTTPS API ingress → private backend. No public backend IP; ingress security group only.</li><li>Frontend containers sit in public subnets behind separate web HTTPS ingress. Existing CDN remains outside the VPC.</li><li>Selected frontend routes are replaced. Existing backend data dependencies stay labelled as inferred. CloudWatch and build services stay separate, with no traffic arrows.</li><li>Containers, routing, authentication, TLS certificates, CORS, ports and health checks need implementation review. No AWS changes are executed.</li></ul>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex justify-end gap-2"><button onClick={() => modal.current?.close()} className="rounded-lg border px-3 py-2 text-sm">Cancel</button><button disabled={disabled || !frontends.length || !backend} onClick={() => { try { onApply(secureTrafficProposal(graph, frontends, backend)); modal.current?.close(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to prepare this design."); } }} className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Apply to local draft</button></div>
    </dialog>
  </>;
}
