"use client";
import { useRef, useState } from "react";
import type { ArchitectureGraph, ArchitectureNode } from "./CloudDiagram";
import { arrangeBusinessArchitecture, isPlatformService } from "./businessArchitecture";
import { networkPlacement } from "./networkPlacement";
import { privateStorageProposal, isS3Storage } from "./privateStorage";
import { isFrontendWorkload } from "./workloadRole";

const frontendCandidate = isFrontendWorkload;
const backendCandidate = (node: ArchitectureNode) => node.zone === "APPLICATION" && !frontendCandidate(node) && !isPlatformService(node);
type RequestPath = "FRONTEND_PROXY" | "PUBLIC_API";

const sourceIdentity = (node: ArchitectureNode) => `Component identity: ${node.label} (${node.id}). Inspected paths and dependency signals remain in Source code architecture; runtime configuration is unverified.`;

/** Explicit customer-selected planning change, never a claim about source calls or deployed routes. */
function secureTrafficProposal(graph: ArchitectureGraph, frontendIds: string[], backendId: string, requestPath: RequestPath): ArchitectureGraph {
  const fronts = new Set(frontendIds);
  const backend = graph.nodes.find(node => node.id === backendId);
  if (!backend || !backendCandidate(backend) || !fronts.size || fronts.has(backendId) || frontendIds.some(id => !graph.nodes.some(node => node.id === id && frontendCandidate(node)))) throw new Error("Select frontend services and a separate backend service.");
  if (!/ecs|fargate|container/i.test(backend.service)) throw new Error("This pattern needs a container backend. Choose its hosting service before applying.");
  const proxy = requestPath === "FRONTEND_PROXY";
  const nodes = graph.nodes.map(node => fronts.has(node.id) ? { ...node, service: proxy ? "ECS Fargate · public frontend + proxy" : "ECS Fargate · public frontend", description: `${proxy ? "Proposed server-side /api proxy REQUIRED; source implementation unverified. Browser uses same-origin HTTPS; hosting server forwards allowed paths to internal ALB. Configure authorization, CSRF protection where needed, timeouts and TLS." : "Proposed browser calls authenticated public HTTPS API ingress; review CORS, authentication and TLS."} Public subnet; web-ALB SG only. ${sourceIdentity(node)}`.slice(0, 500) }
    : node.id === backendId ? { ...node, service: "ECS Fargate · private backend", description: `Proposed private backend: no public IP/direct ingress; accept only API-ALB SG. ${proxy ? "Internal ALB accepts frontend server SGs only." : "Public API ALB fronts private targets."} Configure HTTPS targets, authorization, health checks, scoped IAM and outbound NAT/endpoints. ${sourceIdentity(node)}`.slice(0, 500) } : { ...node });
  const unique = (base: string) => { let id = base, index = 1; while (nodes.some(node => node.id === id)) id = `${base}-${index++}`; return id; };
  // Convert only an ingress dedicated to this backend and these selected frontends.
  const apiIngress = nodes.find(node => ["PUBLIC_INGRESS", "PRIVATE_INGRESS"].includes(networkPlacement(node)) && graph.edges.some(edge => edge.source === node.id && edge.target === backendId)
    && !graph.edges.some(edge => edge.source === node.id && edge.target !== backendId)
    && !graph.edges.some(edge => edge.target === node.id && !fronts.has(edge.source) && nodes.some(source => source.id === edge.source && source.zone === "APPLICATION")));
  const apiId = apiIngress?.id || unique("secure-api-ingress");
  const apiConfig = { label: proxy ? "Internal HTTPS API ingress" : "Secured public API entry", service: proxy ? "Internal Application Load Balancer" : "Application Load Balancer", description: proxy ? "Proposed internal ALB in private subnets, private IPs only. Accept HTTPS only from selected frontend server security groups; private backend accepts this ALB SG only. Configure listeners, certificates, health checks and application authentication/authorization. No public DNS/CDN origin route to this API ingress. Server-side frontend proxy must be implemented and verified." : "Proposed public HTTPS API entry. Authentication, CORS, TLS target certificates and health checks must be configured. Private backend accepts only this ingress security group; no public task IP." };
  if (!apiIngress) nodes.push({ id: apiId, ...apiConfig, zone: "EDGE", x: 1500, y: 220 });
  else Object.assign(apiIngress, apiConfig);
  const existingWeb = nodes.find(node => node.id !== apiId && node.label === "Frontend HTTPS ingress" && networkPlacement(node) === "PUBLIC_INGRESS");
  const webId = existingWeb?.id || unique("secure-web-ingress");
  if (!existingWeb) nodes.push({ id: webId, label: "Frontend HTTPS ingress", service: "Application Load Balancer", zone: "EDGE", x: 650, y: 290, description: "Proposed HTTPS ingress for customer-selected public frontend containers. Host/path routing, TLS to targets, certificates and frontend health checks must be configured. Frontend SG accepts only this ingress SG." });
  const support = new Set(nodes.filter(isPlatformService).map(node => node.id));
  // Replace the selected frontend routes explicitly, retaining unrelated workload/data links.
  const retained = graph.edges.filter(edge => !support.has(edge.source) && !support.has(edge.target) && !fronts.has(edge.source) && !fronts.has(edge.target) && edge.source !== apiId && edge.target !== apiId && !(edge.target === backendId && nodes.some(node => node.id === edge.source && node.zone === "EDGE")));
  const edges: ArchitectureGraph["edges"] = [];
  const link = (source: string, target: string, label: string) => { if (!edges.some(edge => edge.source === source && edge.target === target)) edges.push({ source, target, label }); };
  const cdn = nodes.find(node => /cloudfront/i.test(node.service));
  if (cdn) cdn.description = "Proposed global CloudFront distribution with HTTPS origin forwarding to the public frontend web ALB. Frontend containers serve the web application and the selected API path. Configure origin access restrictions, cache behaviors (no caching of authenticated /api responses), certificates and WAF association if selected. This is not an S3 static-hosting origin or a direct route to private API ingress.";
  const dns = nodes.find(node => /route\s*53/i.test(node.service));
  if (dns && cdn) link(dns.id, cdn.id, "DNS resolution · proposed");
  if (cdn) link(cdn.id, webId, "HTTPS web origin · proposed");
  else if (dns) link(dns.id, webId, "DNS resolution · proposed");
  if (!proxy && dns) link(dns.id, apiId, "API DNS · proposed");
  for (const id of frontendIds) {
    link(webId, id, "HTTPS web target · proposed");
    link(id, apiId, proxy ? "Server HTTPS /api proxy · proposed" : "Browser HTTPS API · customer intent");
  }
  link(apiId, backendId, "HTTPS private target · proposed");
  for (const edge of retained) link(edge.source, edge.target, edge.label);
  if (nodes.length > 80 || edges.length > 160) throw new Error("This change exceeds the workspace diagram limit. Reduce the selection first.");
  return arrangeBusinessArchitecture(privateStorageProposal({ nodes, edges }, nodes.filter(node => isS3Storage(node)).map(node => node.id)));
}

export function SecureTrafficDesign({ graph, disabled, onApply }: { graph: ArchitectureGraph; disabled: boolean; onApply: (graph: ArchitectureGraph) => void }) {
  const modal = useRef<HTMLDialogElement>(null);
  const [frontends, setFrontends] = useState<string[]>([]);
  const [backend, setBackend] = useState("");
  const [requestPath, setRequestPath] = useState<RequestPath>("FRONTEND_PROXY");
  const [error, setError] = useState("");
  const candidates = graph.nodes.filter(frontendCandidate), backends = graph.nodes.filter(backendCandidate);
  return <>
    <button disabled={disabled || !candidates.length || !backends.length} onClick={() => { setFrontends(candidates.map(node => node.id)); setBackend(backends.find(node => /api|backend/i.test(node.label))?.id || backends[0]?.id || ""); setError(""); modal.current?.showModal(); }} className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-xs font-semibold text-cyan-800 disabled:opacity-40">Review secure traffic</button>
    <dialog ref={modal} aria-labelledby="secure-traffic-title" className="m-auto w-[calc(100%_-_2rem)] max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 p-6 text-slate-900 shadow-xl backdrop:bg-slate-900/40">
      <h2 id="secure-traffic-title" className="text-lg font-semibold">Public frontends, private backend</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Choose the request path and its services. This changes the plan; it does not configure AWS or prove a proxy exists in the code.</p>
      <fieldset className="mt-4 space-y-2"><legend className="mb-2 text-xs font-semibold">API request path</legend><label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="radio" name="request-path" value="FRONTEND_PROXY" checked={requestPath === "FRONTEND_PROXY"} onChange={() => setRequestPath("FRONTEND_PROXY")} className="mt-1" /><span><strong>Through frontend server · private API</strong><span className="mt-1 block text-xs leading-5 text-slate-600">Browser calls /api on the frontend origin. A server-side proxy forwards to an internal HTTPS ALB. Requires proxy implementation for static SPAs.</span></span></label><label className="flex items-start gap-2 rounded-lg border p-3 text-sm"><input type="radio" name="request-path" value="PUBLIC_API" checked={requestPath === "PUBLIC_API"} onChange={() => setRequestPath("PUBLIC_API")} className="mt-1" /><span><strong>Browser calls secured public API entry</strong><span className="mt-1 block text-xs leading-5 text-slate-600">Public authenticated HTTPS ALB; backend targets still private. Useful when clients need a directly reachable API.</span></span></label></fieldset>
      <fieldset className="my-4 space-y-2"><legend className="mb-2 text-xs font-semibold">Public-tier frontend containers</legend>{candidates.map(node => <label key={node.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={frontends.includes(node.id)} onChange={event => setFrontends(current => event.target.checked ? [...current, node.id] : current.filter(id => id !== node.id))} />{node.label}</label>)}</fieldset>
      <label className="block text-xs font-semibold">Private backend<select value={backend} onChange={event => setBackend(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm">{backends.map(node => <option key={node.id} value={node.id}>{node.label} · {node.service}</option>)}</select></label>
      <ul className="my-4 space-y-2 text-xs leading-5 text-slate-600"><li>{requestPath === "FRONTEND_PROXY" ? "Browser → public frontend server → internal HTTPS ALB → private backend. No public API origin. Restrict proxy paths, forward identity safely, and configure authorization, CSRF protection where applicable, timeouts and TLS validation." : "Browser → public HTTPS API ingress → private backend. Review authentication, authorization, CORS and rate limits."}</li><li>Public and private subnet tiers share one regional VPC. Frontend containers accept only web ingress. WAF can be associated with supported public ingress; it is not the private connection.</li><li>Databases/cache stay private. S3 is private managed storage outside the VPC with a gateway endpoint path. IAM, policies, encryption and region need review.</li><li>Selected frontend routes are replaced. Inferred data dependencies keep their evidence labels. CloudWatch and build services stay separate, with no request traffic arrows.</li></ul>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex justify-end gap-2"><button onClick={() => modal.current?.close()} className="rounded-lg border px-3 py-2 text-sm">Cancel</button><button disabled={disabled || !frontends.length || !backend} onClick={() => { try { onApply(secureTrafficProposal(graph, frontends, backend, requestPath)); modal.current?.close(); } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to prepare this design."); } }} className="rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Apply to local draft</button></div>
    </dialog>
  </>;
}
