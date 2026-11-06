"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";

/** Map locations shared by AWS designs and external providers: [name, longitude, latitude]. */
export const CITIES: Record<string, [string, number, number]> = {
  mumbai: ["Mumbai", 72.88, 19.08], hyderabad: ["Hyderabad", 78.49, 17.39], virginia: ["N. Virginia", -77.49, 38.75],
  ohio: ["Ohio", -82.99, 39.96], california: ["N. California", -122.42, 37.77], oregon: ["Oregon", -122.68, 45.52],
  ireland: ["Ireland", -6.26, 53.35], london: ["London", -0.13, 51.51], paris: ["Paris", 2.35, 48.86],
  frankfurt: ["Frankfurt", 8.68, 50.11], stockholm: ["Stockholm", 18.07, 59.33], singapore: ["Singapore", 103.82, 1.35],
  sydney: ["Sydney", 151.21, -33.87], tokyo: ["Tokyo", 139.69, 35.68], osaka: ["Osaka", 135.5, 34.69], seoul: ["Seoul", 126.98, 37.57],
  hongkong: ["Hong Kong", 114.17, 22.32], montreal: ["Canada Central", -73.57, 45.5], saopaulo: ["São Paulo", -46.63, -23.55],
  capetown: ["Cape Town", 18.42, -33.92], uae: ["UAE", 55.27, 25.2],
};
const AWS_CITY: Record<string, string> = {
  "ap-south-1": "mumbai", "ap-south-2": "hyderabad", "us-east-1": "virginia", "us-east-2": "ohio", "us-west-1": "california",
  "us-west-2": "oregon", "eu-west-1": "ireland", "eu-west-2": "london", "eu-west-3": "paris", "eu-central-1": "frankfurt",
  "eu-north-1": "stockholm", "ap-southeast-1": "singapore", "ap-southeast-2": "sydney", "ap-northeast-1": "tokyo",
  "ap-northeast-2": "seoul", "ap-northeast-3": "osaka", "ap-east-1": "hongkong", "ca-central-1": "montreal",
  "sa-east-1": "saopaulo", "af-south-1": "capetown", "me-central-1": "uae",
};
const VERCEL_CITY: Record<string, string> = {
  iad1: "virginia", cle1: "ohio", sfo1: "california", pdx1: "oregon", gru1: "saopaulo", hnd1: "tokyo", kix1: "osaka",
  icn1: "seoul", sin1: "singapore", bom1: "mumbai", syd1: "sydney", cdg1: "paris", arn1: "stockholm", dub1: "ireland",
  lhr1: "london", fra1: "frankfurt", cpt1: "capetown", hkg1: "hongkong", dxb1: "uae",
};
const RENDER_CITY: Record<string, string> = { oregon: "oregon", ohio: "ohio", virginia: "virginia", frankfurt: "frankfurt", singapore: "singapore" };
const SERVER_RENDERED = new Set(["nextjs", "remix", "sveltekit", "nuxtjs", "astro", "solidstart", "blitzjs", "redwoodjs"]);

/** City key for an AWS region code, or null. */
export function awsCity(region: string | null | undefined): string | null {
  return region ? AWS_CITY[region] ?? null : null;
}

/**
 * Where a hosted resource runs: a city key, or "global" for edge/CDN services.
 * Vercel static sites are served from the global edge; server-rendered apps
 * run their functions in the project's function region.
 */
export function resourceCity(resource: LiveResource): string | null {
  const region = (resource.region || "").toLowerCase();
  if (resource.provider === "RENDER") return RENDER_CITY[region] ?? null;
  if (resource.provider === "NEON") {
    const aws = region.replace(/^aws-/, "");
    return AWS_CITY[aws] ?? ({ "azure-eastus2": "virginia", "azure-gwc": "frankfurt", "azure-westus3": "california" } as Record<string, string>)[region] ?? null;
  }
  if (resource.provider === "VERCEL") return SERVER_RENDERED.has((resource.framework || "").toLowerCase()) && VERCEL_CITY[region] ? VERCEL_CITY[region] : "global";
  return "global";
}

/** Live hosting data as returned by GET /hosting/overview (subset used by the canvas). */
export interface LiveResource {
  region?: string | null; framework?: string | null;
  id: string; provider: "VERCEL" | "RENDER" | "NEON" | "CLOUDINARY"; kind: string; name: string;
  status: "HEALTHY" | "DEPLOYING" | "DEGRADED" | "FAILED" | "SUSPENDED" | "UNKNOWN"; status_detail?: string;
  urls: string[]; repo?: string | null; root_dir?: string | null; links?: { resource_id: string }[];
}
export interface LiveProbe { resource_id: string; ok: boolean; latency_ms: number | null; status_code: number | null; error: string | null }
export interface LiveOverview { resources: LiveResource[]; probes: LiveProbe[]; last_synced_at: string | null; connections: unknown[] }

export interface LiveNodeStatus {
  status: LiveResource["status"];
  /** Short text for the badge, e.g. "Vercel · erp · 437 ms". */
  label: string;
  /** Full explanation for the tooltip. */
  detail: string;
  failing: boolean;
  resource_ids: string[];
}

interface DiagramNode { id: string; label: string; service: string; zone: string; description?: string }

const PROVIDER = { VERCEL: "Vercel", RENDER: "Render", NEON: "Neon", CLOUDINARY: "Cloudinary" } as const;
const GENERIC = new Set(["spa", "api", "app", "apps", "web", "site", "vite", "react", "next", "nextjs", "js", "fastapi", "django", "flask",
  "node", "express", "frontend", "backend", "front", "end", "service", "services", "server", "proxy", "ui", "the", "and", "private", "public",
  "ecs", "fargate", "aws", "amazon", "container", "portal", "prod", "production", "main", "legacy"]);
const RANK: Record<LiveResource["status"], number> = { FAILED: 0, SUSPENDED: 1, DEGRADED: 2, DEPLOYING: 3, UNKNOWN: 4, HEALTHY: 5 };

function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1 && !GENERIC.has(t)));
}

function role(node: DiagramNode): "frontend" | "api" | "database" | "storage" | null {
  const text = `${node.label} ${node.service}`.toLowerCase();
  if (/\bs3\b|object storage|cloudinary|\bmedia\b|\bcdn assets?\b/.test(text) && !/endpoint|route/.test(text)) return "storage";
  if (/postgres|\brds\b|aurora|mysql|database|\bneon\b/.test(text) && node.zone === "DATA") return "database";
  if (/\bspa\b|frontend|next\.?js|vite|react|static site/.test(text)) return "frontend";
  if (/\bapi\b|backend|fastapi|django|express|server/.test(text) && node.zone !== "DATA" && !/load balancer|\balb\b|ingress|gateway/.test(text)) return "api";
  return null;
}

function nameMatches(node: DiagramNode, resource: LiveResource): boolean {
  const wanted = tokens(node.label);
  if (!wanted.size) return false;
  const have = tokens(`${resource.name} ${resource.root_dir ?? ""}`);
  return [...wanted].some(t => have.has(t));
}

/**
 * Match proposed diagram components to the resources they run as today.
 * Frontends and APIs match by name; databases follow the links of the matched
 * APIs (or the only database); object storage maps to media. Unmatched
 * components get no live status rather than a guess.
 */
export function matchLiveStatus(nodes: DiagramNode[], overview: LiveOverview | null): Record<string, LiveNodeStatus> {
  if (!overview?.resources.length) return {};
  const resources = overview.resources;
  const byId = new Map(resources.map(r => [r.id, r]));
  const matched: Record<string, LiveResource[]> = {};
  const frontends = resources.filter(r => r.kind === "frontend" || r.kind === "static_site");
  const services = resources.filter(r => ["web_service", "private_service", "worker"].includes(r.kind));
  const databases = resources.filter(r => r.kind === "database");
  const media = resources.filter(r => r.kind === "media");

  for (const node of nodes) {
    const kind = role(node);
    if (kind === "frontend") matched[node.id] = frontends.filter(r => nameMatches(node, r));
    else if (kind === "api") {
      const named = services.filter(r => nameMatches(node, r));
      matched[node.id] = named.length ? named : services.filter(r => r.kind === "web_service").length === 1 ? services.filter(r => r.kind === "web_service") : [];
    } else if (kind === "storage") matched[node.id] = media.length === 1 ? media : media.filter(r => nameMatches(node, r));
  }
  const apiIds = new Set(Object.entries(matched).filter(([id]) => role(nodes.find(n => n.id === id)!) === "api").flatMap(([, rs]) => rs.map(r => r.id)));
  const linkedDbs = [...new Set([...apiIds].flatMap(id => (byId.get(id)?.links ?? []).map(l => l.resource_id)))]
    .map(id => byId.get(id)).filter((r): r is LiveResource => !!r && r.kind === "database");
  for (const node of nodes) {
    if (role(node) !== "database") continue;
    const named = databases.filter(r => nameMatches(node, r));
    matched[node.id] = named.length ? named : linkedDbs.length ? linkedDbs : databases.length === 1 ? databases : [];
  }

  const result: Record<string, LiveNodeStatus> = {};
  for (const [nodeId, list] of Object.entries(matched)) {
    if (!list.length) continue;
    const probes = overview.probes.filter(p => list.some(r => r.id === p.resource_id) && !(p.error ?? "").startsWith("Skipped"));
    const failing = probes.some(p => !p.ok);
    const worst = list.reduce((a, b) => (RANK[b.status] < RANK[a.status] ? b : a));
    const status: LiveResource["status"] = failing && worst.status === "HEALTHY" ? "DEGRADED" : worst.status;
    const latency = probes.filter(p => p.ok && p.latency_ms != null).map(p => p.latency_ms as number);
    const provider = PROVIDER[list[0].provider];
    const names = list.length === 1 ? list[0].name : `${list.length} ${list[0].kind === "database" ? "databases" : "resources"}`;
    result[nodeId] = {
      status, failing, resource_ids: list.map(r => r.id),
      label: `${provider} · ${names}${latency.length ? ` · ${Math.max(...latency)} ms` : ""}`,
      detail: list.map(r => `${PROVIDER[r.provider]} ${r.name}: ${r.status.toLowerCase()}${r.status_detail ? ` (${r.status_detail})` : ""}`).join("\n")
        + (failing ? "\nHealth check failing" : "") + "\nMatched by name from Current hosting; this is today's hosting, not the AWS plan.",
    };
  }
  return result;
}

/**
 * Keep live hosting status current while the canvas is visible: show stored
 * status at once, then ask the server to refresh (it throttles provider calls)
 * and re-read every minute.
 */
export function useLiveHosting(active: boolean): LiveOverview | null {
  const [overview, setOverview] = useState<LiveOverview | null>(null);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const read = () => apiClient<LiveOverview>("/hosting/overview", { retries: 0 })
      .then(data => { if (!cancelled) setOverview(data); return data; });
    const load = async () => {
      try {
        const data = await read();
        if (!data.connections.length) return;
        await apiClient("/hosting/refresh", { method: "POST", timeout: 180000 }).catch(() => undefined);
        await read();
      } catch { /* Live status is optional on the design canvas. */ }
    };
    void load();
    const timer = window.setInterval(load, 60000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [active]);
  return overview;
}
