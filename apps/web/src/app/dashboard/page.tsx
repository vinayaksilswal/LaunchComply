"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Boxes,
  Globe2,
  Layers3,
  MapPin,
  Rocket,
  ArrowRight,
  Activity,
} from "lucide-react";
import { ArchitectureMap, type MapAsset } from "@/components/workspace/ArchitectureMap";
import { apiClient } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";

interface Summary {
  application_count: number;
  repository_count: number;
  connection_count: number;
  applications: {
    id: string;
    name: string;
    repo_url: string | null;
    repo_branch: string;
    created_at: string;
  }[];
  activity: {
    id: string;
    action: string;
    created_at: string;
    name: string | null;
  }[];
}
export default function DashboardOverviewPage() {
  const { user, organization, loading: accountLoading } = useAccount();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [assets, setAssets] = useState<MapAsset[] | null>(null);
  useEffect(() => {
    if (!organization || accountLoading) return;
    let active = true;
    setData(null);
    setAssets(null);
    setError(null);
    async function loadMap() {
      const items: MapAsset[] = [];
      let offset: number | null = 0;
      while (offset !== null && active) {
        const page: { items: MapAsset[]; next_offset: number | null } = await apiClient(`/dashboard/architecture-map?offset=${offset}`);
        items.push(...page.items);
        offset = page.next_offset;
      }
      return items;
    }
    Promise.all([apiClient<Summary>("/dashboard/workspace-summary"), loadMap()])
      .then(([result, locations]) => {
        if (active) { setData(result); setAssets(locations); }
      })
      .catch((failure) => {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : "Unable to load your workspace.",
          );
      });
    return () => {
      active = false;
    };
  }, [organization, accountLoading, refresh]);
  const metrics = [
    {
      label: "Business assets",
      value: data?.application_count,
      icon: Boxes,
      hint: "Workspaces in your business",
    },
    { label: "Regions planned", value: assets ? new Set(assets.flatMap(a => [a.region, a.secondary_region]).filter(Boolean)).size : undefined, icon: Globe2, hint: "From saved architecture settings" },
    { label: "Resilient designs", value: assets?.filter(a => ["MULTI_AZ", "MULTI_REGION"].includes(a.availability || "")).length, icon: Layers3, hint: "Multi-AZ or multi-region targets" },
    { label: "Region not set", value: assets?.filter(a => !a.region).length, icon: MapPin, hint: "Choose a location to map these assets" },
  ];
  return (
    <div className="p-6 sm:p-8 max-w-[1800px] mx-auto space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-cyan-700 font-semibold tracking-widest uppercase">
            Business overview
          </p>
          <h1 className="text-3xl font-bold text-slate-950 mt-2">
            Welcome{user ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Architecture, availability planning and deployment preparation for{" "}
            {organization?.name || "your business"}.
          </p>
        </div>
        <Link
          href="/dashboard/deployments"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-5 py-3 text-sm font-semibold"
        >
          <Rocket className="w-4 h-4" /> Deploy application
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-800"
        >
          <p>{error}</p>
          <button
            onClick={() => setRefresh((value) => value + 1)}
            className="mt-2 underline text-sm"
          >
            Try again
          </button>
        </div>
      )}
      <section
        className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4"
        aria-label="Workspace totals"
      >
        {metrics.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-slate-500">
                  {item.label}
                </p>
                <Icon className="w-5 h-5 text-cyan-700" />
              </div>
              <p className="text-3xl font-bold text-slate-950 mt-4">
                {item.value ?? "—"}
              </p>
              <p className="text-xs text-slate-500 mt-2">{item.hint}</p>
            </div>
          );
        })}
      </section>
      {!data && !error && (
        <p role="status" className="text-sm text-slate-500">
          Loading your workspace…
        </p>
      )}
      {assets && <ArchitectureMap assets={assets} />}
      {data && (
        <div className="grid gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b flex justify-between">
              <h2 className="font-bold text-slate-900">My business assets</h2>
              <Link
                href="/dashboard/applications"
                className="text-sm text-cyan-700"
              >
                View all
              </Link>
            </div>
            {data.applications.length === 0 ? (
              <div className="p-8 space-y-3">
                <Boxes className="w-10 h-10 text-slate-400" />
                <h3 className="font-semibold text-slate-900">
                  Build your first workspace
                </h3>
                <p className="text-sm text-slate-500">
                  Connect GitHub and select a repository. You can configure
                  architecture and AWS later.
                </p>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700"
                >
                  Start setup
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {data.applications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/dashboard/applications/${app.id}`}
                    className="flex justify-between items-center gap-3 p-6 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{app.name}</p>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {app.repo_url || "Repository not linked"}
                      </p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-cyan-700 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section className="rounded-2xl bg-white border border-slate-200">
            <div className="p-6 border-b flex gap-2 items-center">
              <Activity className="w-4 h-4 text-cyan-700" />
              <h2 className="font-bold">Recent activity</h2>
            </div>
            {data.activity.length ? (
              <div className="divide-y">
                {data.activity.map((event) => (
                  <div
                    key={event.id}
                    className="p-5 flex flex-wrap gap-2 items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {event.action.toLowerCase().replaceAll("_", " ")}
                      </p>
                      {event.name && (
                        <p className="text-xs text-slate-500 mt-1">
                          {event.name}
                        </p>
                      )}
                    </div>
                    <time
                      className="text-xs text-slate-500"
                      dateTime={event.created_at}
                    >
                      {new Date(event.created_at).toLocaleString()}
                    </time>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-sm text-slate-500">
                Your workspace activity will appear here as you complete setup.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
