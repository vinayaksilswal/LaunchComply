"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Maximize2,
  Sparkles,
  Network,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  CloudDiagram,
  arrangeArchitecture,
  diagramBounds,
  downloadArchitectureSvg,
  type ArchitectureGraph,
  type DiagramBoundary,
} from "./CloudDiagram";

function exampleGraph(
  backgroundJobs: boolean,
  cache: boolean,
): ArchitectureGraph {
  const graph: ArchitectureGraph = {
    nodes: [
      {
        id: "dns",
        label: "Your application domain",
        service: "Route 53 + ACM certificate",
        zone: "EDGE",
        description:
          "Example: resolve the app domain and provide a validated HTTPS certificate. Confirm domain ownership and certificate regions before release.",
        x: 0,
        y: 0,
      },
      {
        id: "cdn",
        label: "Website delivery",
        service: "CloudFront + WAF",
        zone: "EDGE",
        description:
          "Example: deliver the web app through HTTPS. Review caching, security rules, and the selected origin. These services are not provisioned.",
        x: 0,
        y: 0,
      },
      {
        id: "ingress",
        label: "API entry point",
        service: "Application Load Balancer",
        zone: "EDGE",
        description:
          "Example: direct API requests to healthy application targets. Review HTTPS listeners, health checks, target groups, and security groups.",
        x: 0,
        y: 0,
      },
      {
        id: "web",
        label: "Web application",
        service: "S3 static assets / web container",
        zone: "APPLICATION",
        description:
          "Example: use private S3 origins for a static frontend. A server-rendered app needs a web runtime instead. Decide from the actual build output.",
        x: 0,
        y: 0,
      },
      {
        id: "api",
        label: "Application API",
        service: "ECS Fargate service",
        zone: "APPLICATION",
        description:
          "Example: run the API in private application subnets. Configure image, port, environment secrets, health checks, scaling, and an appropriate task role.",
        x: 0,
        y: 0,
      },
      {
        id: "database",
        label: "Business database",
        service: "RDS PostgreSQL",
        zone: "DATA",
        description:
          "Example: private database subnets, encrypted storage, backups, and tested migrations. Select availability, size, and retention from business requirements.",
        x: 0,
        y: 0,
      },
      {
        id: "files",
        label: "Customer uploads",
        service: "S3 object storage",
        zone: "DATA",
        description:
          "Example: keep customer objects separate from frontend assets. Review encryption, retention, access policies, and signed upload URLs.",
        x: 0,
        y: 0,
      },
      {
        id: "secrets",
        label: "Application credentials",
        service: "Secrets Manager + scoped IAM",
        zone: "SUPPORT",
        description:
          "Example: inject credentials into approved runtimes using restricted roles. Do not put secrets in the repository, diagram, or chat.",
        x: 0,
        y: 0,
      },
      {
        id: "logs",
        label: "Logs and alerts",
        service: "CloudWatch",
        zone: "SUPPORT",
        description:
          "Example: collect application logs and publish actionable alerts. Decide retention, redaction, ownership, and incident response before release.",
        x: 0,
        y: 0,
      },
      {
        id: "images",
        label: "Release artifacts",
        service: "ECR container images",
        zone: "SUPPORT",
        description:
          "Example: build and scan images, retain immutable release tags, and make rollback possible. Establish a delivery pipeline before provisioning.",
        x: 0,
        y: 0,
      },
    ],
    edges: [
      { source: "dns", target: "cdn", label: "Domain / HTTPS" },
      { source: "cdn", target: "web", label: "Web requests" },
      { source: "cdn", target: "ingress", label: "API requests" },
      { source: "ingress", target: "api", label: "Healthy targets" },
      { source: "api", target: "database", label: "Database access" },
      { source: "api", target: "files", label: "Object access" },
      { source: "secrets", target: "api", label: "Runtime configuration" },
      { source: "api", target: "logs", label: "Logs / metrics" },
      { source: "images", target: "api", label: "Release image" },
    ],
  };
  if (backgroundJobs) {
    graph.nodes.push(
      {
        id: "worker",
        label: "Background jobs",
        service: "ECS worker task",
        zone: "APPLICATION",
        description:
          "Example: process jobs independently of web requests. Review task permissions, retries, idempotency, and failure handling.",
        x: 0,
        y: 0,
      },
      {
        id: "queue",
        label: "Work queue",
        service: "SQS + dead-letter queue",
        zone: "DATA",
        description:
          "Example: persist pending jobs. Review visibility timeout, encryption, maximum retries, and dead-letter handling.",
        x: 0,
        y: 0,
      },
    );
    graph.edges.push(
      { source: "api", target: "queue", label: "Submit job" },
      { source: "queue", target: "worker", label: "Process job" },
      { source: "worker", target: "database", label: "Store result" },
    );
  }
  if (cache) {
    graph.nodes.push({
      id: "cache",
      label: "Application cache",
      service: "ElastiCache Redis",
      zone: "DATA",
      description:
        "Example: cache only appropriate data. Confirm expiry, invalidation, authentication, and a safe fallback when the cache is unavailable.",
      x: 0,
      y: 0,
    });
    graph.edges.push({
      source: "api",
      target: "cache",
      label: "Cache reads / writes",
    });
  }
  return arrangeArchitecture(graph);
}

function regionalExample(
  base: ArchitectureGraph,
  twoRegions: boolean,
): { graph: ArchitectureGraph; boundaries: DiagramBoundary[] } {
  const globalIds = ["dns", "cdn"];
  const regionalNodes = base.nodes.filter((n) => !globalIds.includes(n.id));
  const graph: ArchitectureGraph = {
    nodes: base.nodes
      .filter((n) => globalIds.includes(n.id))
      .map((n, i) => ({
        ...n,
        x: twoRegions ? 430 + i * 340 : 90 + i * 340,
        y: 75,
      })),
    edges: base.edges.filter(
      (e) => globalIds.includes(e.source) && globalIds.includes(e.target),
    ),
  };
  const boundaries: DiagramBoundary[] = [];
  for (let region = 0; region < (twoRegions ? 2 : 1); region++) {
    const prefix = region ? "recovery-" : "";
    const left = 70 + region * 770;
    const locations: Record<string, [number, number]> = {
      ingress: [165, 390],
      web: [0, 1270],
      api: [0, 650],
      worker: [330, 650],
      database: [0, 910],
      cache: [330, 910],
      files: [330, 1270],
      queue: [0, 1480],
      secrets: [330, 1480],
      images: [0, 1690],
      logs: [330, 1690],
    };
    regionalNodes.forEach((n) => {
      const [x, y] = locations[n.id] || [0, 1900];
      graph.nodes.push({
        ...n,
        id: prefix + n.id,
        x: left + x,
        y,
        label:
          region && n.id === "database"
            ? "Recovery database candidate"
            : n.label,
        description: `${region ? "Recovery region" : "Primary region"} example. ${n.description}${region && n.id === "database" ? " Cross-region replication and promotion need separate review." : ""}`,
      });
    });
    base.edges
      .filter(
        (e) => !(globalIds.includes(e.source) && globalIds.includes(e.target)),
      )
      .forEach((e) =>
        graph.edges.push({
          ...e,
          source: globalIds.includes(e.source) ? e.source : prefix + e.source,
          target: globalIds.includes(e.target) ? e.target : prefix + e.target,
        }),
      );
    const network = regionalNodes
      .filter((n) =>
        ["ingress", "api", "worker", "database", "cache"].includes(n.id),
      )
      .map((n) => prefix + n.id);
    boundaries.push(
      {
        id: `region-${region}`,
        label: `${region ? "Recovery" : "Primary"} AWS region · example`,
        nodes: regionalNodes.map((n) => prefix + n.id),
        color: "#0284c7",
        padding: 55,
      },
      {
        id: `vpc-${region}`,
        label: "Proposed VPC · network configuration requires review",
        nodes: network,
        color: "#16a34a",
        padding: 30,
      },
      {
        id: `public-subnet-${region}`,
        label: "Public ingress subnets · proposed",
        nodes: [prefix + "ingress"],
        color: "#0891b2",
        padding: 12,
      },
      {
        id: `app-subnet-${region}`,
        label: "Private application subnets · proposed",
        nodes: regionalNodes
          .filter((n) => ["api", "worker"].includes(n.id))
          .map((n) => prefix + n.id),
        color: "#6366f1",
        padding: 12,
      },
      {
        id: `data-subnet-${region}`,
        label: "Private data subnets · proposed",
        nodes: regionalNodes
          .filter((n) => ["database", "cache"].includes(n.id))
          .map((n) => prefix + n.id),
        color: "#059669",
        padding: 12,
      },
    );
  }
  if (twoRegions)
    graph.edges.push(
      {
        source: "database",
        target: "recovery-database",
        label: "Replication · needs review",
      },
      {
        source: "files",
        target: "recovery-files",
        label: "S3 replication · proposed",
      },
      {
        source: "images",
        target: "recovery-images",
        label: "Image replication · proposed",
      },
    );
  return { graph, boundaries };
}

export function DeploymentExample() {
  const [jobs, setJobs] = useState(true),
    [cache, setCache] = useState(false);
  const [regions, setRegions] = useState(false);
  const [selected, setSelected] = useState("api"),
    [zoom, setZoom] = useState(0.8);
  const topology = useMemo(
    () => regionalExample(exampleGraph(jobs, cache), regions),
    [jobs, cache, regions],
  );
  const { graph, boundaries } = topology;
  const svg = useRef<SVGSVGElement>(null),
    viewport = useRef<HTMLDivElement>(null);
  const node = graph.nodes.find((n) => n.id === selected);
  return (
    <div className="bg-white text-slate-900">
      <header className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8">
        <Link
          href="/architecture"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"
        >
          <ArrowLeft size={14} />
          Architecture overview
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-cyan-700">
              Interactive deployment example
            </p>
            <h1 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">
              See how an app reaches your customers.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Follow the arrows from the public entry to your application and
              data. Select a service to understand what needs to be decided
              before deployment.
            </p>
          </div>
          <Link
            href="/dashboard/architecture"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          >
            Design my application
            <ArrowRight size={16} />
          </Link>
        </div>
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
          Example only. This design is not derived from your code, saved to your
          business, or deployed. AWS resources, costs, network isolation, and
          security controls have not been verified.
        </p>
      </header>
      <div className="mx-auto max-w-[1600px] border-y border-slate-200 xl:grid xl:grid-cols-[minmax(0,1fr)_340px]">
        <section
          className="min-w-0 xl:border-r border-slate-200"
          aria-label="Example cloud deployment diagram"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap gap-4 text-xs font-medium">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={jobs}
                  onChange={(e) => {
                    setJobs(e.target.checked);
                    setSelected("api");
                  }}
                />
                Background jobs
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cache}
                  onChange={(e) => {
                    setCache(e.target.checked);
                    setSelected("api");
                  }}
                />
                Application cache
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={regions}
                  onChange={(e) => {
                    setRegions(e.target.checked);
                    setSelected("api");
                  }}
                />
                Two-region recovery design
              </label>
            </div>
            <div className="flex items-center gap-1">
              <button
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <ZoomOut size={16} />
              </button>
              <span className="w-10 text-center text-xs">
                {Math.round(zoom * 100)}%
              </span>
              <button
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <ZoomIn size={16} />
              </button>
              <button
                aria-label="Fit diagram"
                onClick={() =>
                  setZoom(
                    Math.max(
                      0.65,
                      Math.min(
                        1,
                        ((viewport.current?.clientWidth || 800) - 32) /
                          diagramBounds(graph).width,
                      ),
                    ),
                  )
                }
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <Maximize2 size={16} />
              </button>
              <button
                aria-label="Download example diagram SVG"
                onClick={() => downloadArchitectureSvg(svg.current)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <Download size={16} />
              </button>
            </div>
          </div>
          <div
            ref={viewport}
            className="h-[690px] overflow-auto bg-slate-50/40 p-3"
          >
            <CloudDiagram
              ref={svg}
              graph={graph}
              boundaries={boundaries}
              zoom={zoom}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
          <div className="flex flex-wrap gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            <Network size={14} />
            <span>
              {graph.nodes.length} example services · {graph.edges.length}{" "}
              proposed connections
            </span>
            <span>Use zoom and scroll to explore each layer.</span>
          </div>
        </section>
        <aside className="space-y-6 p-6">
          <section aria-label="Selected example component">
            <p className="text-xs uppercase tracking-wider text-cyan-700 font-semibold">
              Selected component
            </p>
            <h2 className="mt-2 text-xl font-semibold">{node?.label}</h2>
            <p className="mt-1 text-sm text-slate-500">{node?.service}</p>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              {node?.description}
            </p>
            <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Connected services
            </h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              {graph.edges
                .filter((e) => e.source === selected || e.target === selected)
                .map((e, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-slate-100 p-3"
                  >
                    {graph.nodes.find((n) => n.id === e.source)?.label} →{" "}
                    {graph.nodes.find((n) => n.id === e.target)?.label}
                    <span className="mt-1 block text-slate-400">{e.label}</span>
                  </li>
                ))}
            </ul>
          </section>
          <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={16} className="text-indigo-600" />
              Refine your actual app with AI
            </h2>
            <p className="mt-3 text-xs leading-5 text-slate-600">
              Connect your repository in the workspace. When the AI provider is
              configured, ask for changes, preview the proposal, and apply it to
              your saved draft. No cloud resources are changed by chat.
            </p>
            <Link
              href="/dashboard/architecture"
              className="mt-4 inline-flex gap-2 items-center text-xs font-semibold text-indigo-700"
            >
              Open my architecture workspace
              <ArrowRight size={14} />
            </Link>
          </section>
          <section>
            <h2 className="text-sm font-semibold">Before deployment</h2>
            <ol className="mt-3 space-y-3 text-xs leading-5 text-slate-500">
              <li>
                1. Confirm runtime, traffic, data, and availability
                requirements.
              </li>
              <li>
                2. Review VPC subnets, IAM, certificates, secrets, and backups.
              </li>
              <li>
                3. Agree costs, rollout, rollback, monitoring, and ownership.
              </li>
              <li>4. Request deployment help and review the delivery scope.</li>
            </ol>
            {regions && (
              <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                The second region is an example recovery target. Replication,
                database promotion, routing failover, and recovery time require
                separate design and testing.
              </p>
            )}
            <Link
              href="/dashboard/deployments"
              className="mt-4 inline-flex gap-2 text-xs font-semibold text-cyan-700"
            >
              Request deployment help
              <ArrowRight size={14} />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
