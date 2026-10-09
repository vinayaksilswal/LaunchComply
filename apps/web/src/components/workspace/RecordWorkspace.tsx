"use client";
import { Dialog } from "@/components/ui/Dialog";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  ChevronRight,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";
import { MODULES, modulePath } from "@/lib/workspaces";
import { RequestHelp } from "./RequestHelp";
import { ServiceRequests } from "./ServiceRequests";
import { ServiceQuotes } from "./ServiceQuotes";
import { AwsAccountConnection } from "./AwsAccountConnection";
import { DeploymentPreparation } from "./DeploymentPreparation";
interface RecordItem {
  id: string;
  title: string;
  status: string;
  created_at: string;
  fields: Record<string, string | number | boolean | null>;
}
interface Records {
  total: number;
  available?: boolean;
  records: RecordItem[];
}
const readable = (value: string) => value.toLowerCase().replaceAll("_", " ");
export function RecordWorkspace({ module }: { module: string }) {
  const definition = MODULES.find((item) => item.key === module)!;
  const {
    organization,
    loading: accountLoading,
    error: accountError,
  } = useAccount();
  const params = useParams<{
    id?: string;
    releaseId?: string;
    environmentId?: string;
  }>();
  const [data, setData] = useState<Records | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<RecordItem | null>(null);
  useEffect(() => {
    setOffset(0);
    setQuery("");
    setSelected(null);
  }, [module, organization]);
  useEffect(() => {
    if (!organization || accountLoading) return;
    let active = true;
    setData(null);
    setError(null);
    apiClient<Records>(`/workspace-records/${module}`, {
      params: {
        offset,
        application_id: ["releases", "environments"].includes(module)
          ? params.id
          : undefined,
        record_id:
          params.releaseId ||
          params.environmentId ||
          (module === "threat-models" ? params.id : undefined),
      },
    })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [
    organization,
    accountLoading,
    module,
    refresh,
    offset,
    params.id,
    params.releaseId,
    params.environmentId,
  ]);
  const filtered =
    data?.records.filter((item) =>
      `${item.title} ${item.status}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ) || [];
  const peers = MODULES.filter(
    (item) =>
      item.group === definition.group &&
      [
        module,
        "deployments",
        "operations",
        "logs",
        "incidents",
        "backups",
        "cost",
        "security",
        "vapt",
        "dr",
        "compliance",
        "policies",
        "risks",
        "audits",
        "assurance",
        "team",
        "account",
        "billing",
        "support",
        "services",
      ].includes(item.key),
  );
  const request = [
    "deployments",
    "operations",
    "incidents",
    "backups",
    "cost",
    "security",
    "vapt",
    "compliance",
    "iso27001",
    "soc2",
    "privacy",
    "support",
    "services",
  ].includes(module)
    ? {
        code: (
          {
            deployments: "DEPLOYMENT_HELP",
            operations: "AWS_CONNECTION",
            incidents: "SUPPORT",
            backups: "BACKUP_REVIEW",
            cost: "COST_REVIEW",
            security: "SECURITY_ASSESSMENT",
            vapt: "VAPT_ASSESSMENT",
            compliance: "COMPLIANCE_HELP",
            iso27001: "ISO27001_HELP",
            soc2: "SOC2_HELP",
            privacy: "PRIVACY_HELP",
            support: "SUPPORT",
            services: "SUPPORT",
          } as Record<string, string>
        )[module],
        label: (
          {
            deployments: "Help me deploy",
            operations: "Request monitoring setup",
            incidents: "Get incident help",
            backups: "Review my backups",
            cost: "Connect cost reporting",
            security: "Apply for security review",
            vapt: "Apply for assessment",
            compliance: "Apply for compliance help",
            iso27001: "Apply for ISO 27001 preparation",
            soc2: "Apply for SOC 2 preparation",
            privacy: "Apply for privacy review",
            support: "Get help",
            services: "Apply for support",
          } as Record<string, string>
        )[module],
      }
    : null;
  return (
    <div className="p-5 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex gap-2 items-center text-xs text-slate-500">
        <Link href="/dashboard" className="hover:text-cyan-700">
          Home
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span>{definition.group}</span>
      </div>
      <header className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-950">
            {definition.title}
          </h1>
          <p className="text-sm leading-6 mt-2 text-slate-500 max-w-2xl">
            {definition.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {request && !["services", "deployments"].includes(module) && <RequestHelp {...request} />}
          <button
            onClick={() => setRefresh((value) => value + 1)}
            className="inline-flex gap-2 items-center px-4 py-2.5 border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </header>
      <nav
        aria-label={`${definition.group} pages`}
        className="flex gap-1 overflow-x-auto border-b border-slate-200 pb-2"
      >
        {peers.map((item) => (
          <Link
            key={item.key}
            href={modulePath(item.key)}
            aria-current={module === item.key ? "page" : undefined}
            className={`px-3 py-2 rounded-lg shrink-0 text-xs font-medium ${module === item.key ? "bg-cyan-50 text-cyan-800" : "text-slate-500 hover:bg-slate-50"}`}
          >
            {item.title}
          </Link>
        ))}
      </nav>
      {(error || accountError) && (
        <div
          role="alert"
          className="p-5 border border-rose-200 bg-rose-50 text-rose-800 rounded-xl text-sm"
        >
          {error || accountError}
          <button
            onClick={() => setRefresh((value) => value + 1)}
            className="block mt-2 underline"
          >
            Try again
          </button>
        </div>
      )}
      {module === "deployments" && <DeploymentPreparation />}
      {["operations", "deployments"].includes(module) && <AwsAccountConnection />}
      {module === "billing" && <ServiceQuotes />}
      {module === "compliance" && (
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { key: "iso27001", title: "ISO 27001 preparation" },
            { key: "soc2", title: "SOC 2 preparation" },
            { key: "privacy", title: "Privacy review" },
          ].map((item) => (
            <Link
              key={item.key}
              href={modulePath(item.key)}
              className="border border-slate-200 rounded-xl p-4 flex justify-between items-center text-sm font-semibold text-slate-700 hover:border-cyan-400"
            >
              {item.title}
              <ArrowRight className="w-4 h-4 text-cyan-700" />
            </Link>
          ))}
        </div>
      )}
      {module === "services" && (
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { code: "DEPLOYMENT_HELP", label: "Apply for deployment help" },
            { code: "VAPT_ASSESSMENT", label: "Apply for assessment" },
            { code: "COMPLIANCE_HELP", label: "Apply for compliance help" },
          ].map((item) => (
            <div
              key={item.code}
              className="border border-slate-200 rounded-xl p-5 bg-slate-50"
            >
              <RequestHelp {...item} />
            </div>
          ))}
        </div>
      )}
      {request && (
        <ServiceRequests
          code={module === "services" ? undefined : request.code}
        />
      )}
      {module !== "services" &&
        (!request || (data?.total || 0) > 0 || !!error) && (
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
              <div className="text-sm font-semibold">
                {module === "team"
                  ? "Team members"
                  : module === "vapt"
                    ? "Recorded assessment projects"
                    : module === "security"
                      ? "Recorded findings"
                      : "Recorded items"}
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {data ? `${data.total} total` : "Loading…"}
                </span>
              </div>
              <label className="flex gap-2 items-center border border-slate-200 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  aria-label="Search recorded items"
                  placeholder="Search this page…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="outline-none text-xs w-40 bg-transparent"
                />
              </label>
            </div>
            {!data && !error && !accountError ? (
              <div
                role="status"
                className="p-12 flex items-center justify-center gap-2 text-sm text-slate-500"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading your business records…
              </div>
            ) : data && data.total === 0 ? (
              <div className="p-10 sm:p-16 flex flex-col items-center text-center">
                <span className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5">
                  <FolderOpen className="w-7 h-7 text-slate-400" />
                </span>
                <h2 className="text-lg font-semibold text-slate-900">
                  {params.id
                    ? "No matching records"
                    : `No ${definition.title.toLowerCase()} yet`}
                </h2>
                <p className="text-sm leading-6 text-slate-500 max-w-lg mt-2">
                  {definition.empty}
                </p>
                {["deployments", "releases", "environments"].includes(
                  module,
                ) && (
                  <Link
                    href="/dashboard/architecture"
                    className="mt-6 inline-flex gap-2 items-center text-sm font-semibold text-cyan-700"
                  >
                    Review app design
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {module === "team" && (
                  <p className="mt-4 text-xs text-slate-500">
                    Ask your business owner to check active memberships.
                  </p>
                )}
              </div>
            ) : (
              data && (
                <div>
                  {filtered.length ? (
                    filtered.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelected(item)}
                        className="px-5 py-5 border-b border-slate-100 last:border-0 w-full flex flex-wrap justify-between items-center gap-3 text-left hover:bg-slate-50"
                      >
                        <div className="flex gap-3 items-center min-w-0">
                          <span className="p-2.5 rounded-lg border border-slate-100 text-slate-400">
                            <FileText className="w-4 h-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 break-words">
                              {module === "logs"
                                ? readable(item.title)
                                : item.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Recorded{" "}
                              {new Date(item.created_at).toLocaleString()}
                              {item.fields.email
                                ? ` · ${item.fields.email}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600">
                            {readable(item.status)}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="p-10 text-sm text-slate-500 text-center">
                      No records match your search on this page.
                    </p>
                  )}
                  <div className="p-4 border-t border-slate-100 flex justify-between text-xs">
                    <button
                      disabled={offset === 0}
                      onClick={() =>
                        setOffset((value) => Math.max(0, value - 50))
                      }
                      className="disabled:opacity-30"
                    >
                      Previous
                    </button>
                    <span className="text-slate-500">
                      {offset + 1}–{Math.min(offset + 50, data.total)} of{" "}
                      {data.total}
                    </span>
                    <button
                      disabled={offset + 50 >= data.total}
                      onClick={() => setOffset((value) => value + 50)}
                      className="disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )
            )}
          </section>
        )}
      <p className="text-xs text-slate-500 leading-5">
        {module === "team"
          ? "Memberships come from your business account."
          : "These are stored business records. A recorded status alone does not confirm a live provider connection, a completed assessment, or certification."}
      </p>
      {selected && (
        <Dialog label="Record details" onDismiss={() => setSelected(null)}>
          <section
            className="bg-white border rounded-2xl shadow-xl w-full max-w-xl p-6 max-h-[80vh] overflow-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex justify-between items-start gap-3">
              <h2 className="font-semibold text-lg">{selected.title}</h2>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close record details"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </header>
            <dl className="mt-6 divide-y">
              {Object.entries(selected.fields)
                .filter(([key]) => key !== "application_id")
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="py-3 grid grid-cols-[130px_1fr] gap-4 text-sm"
                  >
                    <dt className="text-slate-500 capitalize">
                      {readable(key)}
                    </dt>
                    <dd className="text-slate-900 break-words">
                      {String(value)}
                    </dd>
                  </div>
                ))}
            </dl>
          </section>
        </Dialog>
      )}
    </div>
  );
}
