"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Boxes,
  Github,
  Link2,
  ArrowRight,
  CheckCircle2,
  Circle,
  Activity,
} from "lucide-react";
import { ServiceRequests } from "@/components/workspace/ServiceRequests";
import { RequestHelp } from "@/components/workspace/RequestHelp";
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
  useEffect(() => {
    if (!organization || accountLoading) return;
    let active = true;
    setData(null);
    setError(null);
    apiClient<Summary>("/dashboard/workspace-summary")
      .then((result) => {
        if (active) setData(result);
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
    {
      label: "GitHub connections",
      value: data?.connection_count,
      icon: Link2,
      hint: "Connected GitHub accounts",
    },
    {
      label: "Repositories",
      value: data?.repository_count,
      icon: Github,
      hint: "Accessible through your connections",
    },
  ];
  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-7">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-cyan-700 font-semibold tracking-widest uppercase">
            Business overview
          </p>
          <h1 className="text-3xl font-bold text-slate-950 mt-2">
            Welcome{user ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Your applications, connections, and latest workspace activity for{" "}
            {organization?.name || "your business"}.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white px-5 py-3 text-sm font-semibold"
        >
          Create application
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
        className="grid sm:grid-cols-3 gap-4"
        aria-label="Get help with your app"
      >
        {[
          {
            code: "DEPLOYMENT_HELP",
            label: "Help me deploy",
            description: "Get your app ready for customers.",
          },
          {
            code: "SECURITY_ASSESSMENT",
            label: "Apply for security review",
            description: "Request an assessment of your app.",
          },
          {
            code: "COMPLIANCE_HELP",
            label: "Apply for compliance help",
            description: "Prepare the evidence your business needs.",
          },
        ].map((item) => (
          <div
            key={item.code}
            className="border border-slate-200 rounded-2xl bg-slate-50 p-5 space-y-3"
          >
            <p className="text-sm text-slate-500">{item.description}</p>
            <RequestHelp code={item.code} label={item.label} />
          </div>
        ))}
      </section>
      <section
        className="grid sm:grid-cols-3 gap-4"
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
      <ServiceRequests compact />
      {data && (
        <div className="grid lg:grid-cols-3 gap-6">
          <section className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b flex justify-between">
              <h2 className="font-bold text-slate-900">Your applications</h2>
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
          <section className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-900 space-y-5">
            <p className="text-xs uppercase tracking-widest text-cyan-700">
              Next steps
            </p>
            <h2 className="text-xl font-bold">Set up your workspace</h2>
            {[
              { label: "Business account created", done: true, href: null },
              {
                label: "Connect GitHub",
                done: data.connection_count > 0,
                href: "/onboarding",
              },
              {
                label: "Create an application",
                done: data.application_count > 0,
                href: "/onboarding",
              },
            ].map((item) => (
              <div key={item.label} className="flex gap-3 items-center text-sm">
                {item.done ? (
                  <CheckCircle2 className="w-5 h-5 text-cyan-700 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-500 shrink-0" />
                )}
                {item.href ? (
                  <Link href={item.href} className="hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
              </div>
            ))}
            <p className="pt-4 border-t border-slate-200 text-xs text-slate-500">
              Architecture, cloud access, and deployment are configured in their
              dedicated workflows.
            </p>
          </section>
          <section className="lg:col-span-3 rounded-2xl bg-white border border-slate-200">
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
