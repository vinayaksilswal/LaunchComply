"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Network,
  Sparkles,
  Send,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  ScanLine,
  Save,
  X,
  Plus,
  ArrowRight,
  Database,
  Globe,
  Server,
  Layers,
  Loader2,
  Check,
  GitBranch,
  MousePointer2,
} from "lucide-react";
import {
  CloudDiagram,
  arrangeArchitecture,
  diagramBounds,
  downloadArchitectureSvg,
} from "./CloudDiagram";
import { apiClient, ApiError } from "@/lib/api";
import { codeArchitecture, sourceOverview, sourceAreas, type SourceModule } from "./codeArchitecture";
import { useAccount } from "@/components/auth/AccountProvider";
import { ProductionDiagram, productionLayout, type DeploymentRequirements } from "./ProductionDiagram";
import { RequirementsForm } from "./RequirementsForm";
import { AwsReferences, type AwsReferenceReview } from "./AwsReferences";

type Zone = "EDGE" | "APPLICATION" | "DATA" | "SUPPORT";
interface Node {
  id: string;
  label: string;
  service: string;
  zone: Zone;
  description: string;
  x: number;
  y: number;
}
interface Edge {
  source: string;
  target: string;
  label: string;
}
interface Graph {
  nodes: Node[];
  edges: Edge[];
}
interface Evidence {
  repositories?: { id: string; full_name: string; branch: string; commit: string }[];
  modules?: SourceModule[];
  module_edges?: Edge[];
  source_coverage?: { inspected: number; candidates: number; limit: number };
  repository: string;
  branch: string;
  commit: string;
  scope: string;
  files: { path: string; sha: string; dependencies: string[] }[];
  components: {
    kind: string;
    label: string;
    path: string;
    dependencies: string[];
  }[];
}
interface Draft {
  last_ai_workflow?: { framework: string; stages: string[]; missing_requirements: string[]; status: string };
  source_changed?: boolean;
  requirements?: DeploymentRequirements;
  id: string;
  version: string;
  graph: Graph;
  evidence: Evidence;
  messages: { role: string; content: string }[];
  proposal: { id: string; graph: Graph } | null;
  created_at: string;
  aws_references?: AwsReferenceReview;
  design_approval?: { approved_at: string; version: string; scope: string; graph_fingerprint: string };
}
interface Workspace {
  application_id: string;
  application_name: string;
  architecture: Draft | null;
  capabilities: { repository_analysis: boolean; ai_chat: boolean; aws_references?: boolean };
}
const zones: { id: Zone; name: string; color: string; icon: typeof Globe }[] = [
  { id: "EDGE", name: "Public entry", color: "#0891b2", icon: Globe },
  {
    id: "APPLICATION",
    name: "Application services",
    color: "#6366f1",
    icon: Server,
  },
  { id: "DATA", name: "Data & persistence", color: "#059669", icon: Database },
  { id: "SUPPORT", name: "Platform services", color: "#d97706", icon: Layers },
];

export function ArchitectureCanvas() {
  const {
    organization,
    loading: accountLoading,
    error: accountError,
  } = useAccount();
  const query = useSearchParams();
  const [apps, setApps] = useState<{ id: string; name: string; repositories?: { full_name: string }[] }[]>([]);
  const [appId, setAppId] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [graph, setGraph] = useState<Graph>({ nodes: [], edges: [] });
  const [view, setView] = useState<"cloud" | "code" | "inventory">("cloud");
  const [codeMode, setCodeMode] = useState<"overview" | "files">("overview");
  const [codeFocus, setCodeFocus] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.85);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [newConnection, setNewConnection] = useState("");
  const [chatVisible, setChatVisible] = useState(true);
  const [reviewApproval, setReviewApproval] = useState(false);
  const [requirementsVisible, setRequirementsVisible] = useState(false);
  const [networkView, setNetworkView] = useState(true);
  const canvas = useRef<HTMLDivElement>(null);
  const autoFit = useRef(true);
  const diagram = useRef<SVGSVGElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const componentDetails = useRef<HTMLElement>(null);
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);
  const draft = workspace?.architecture;
  const draftId = draft?.id;
  const canRefresh = ["OWNER", "ADMIN"].includes(
    organization?.role.toUpperCase() || "",
  );
  const canEdit = canRefresh && !draft?.source_changed;
  const adopt = (result: Draft) => {
    setWorkspace((current) =>
      current ? { ...current, architecture: result } : current,
    );
    setGraph(result.graph);
    setDirty(false);
    setPreview(false);
    setReviewApproval(false);
  };
  useEffect(() => {
    if (!organization || accountLoading) return;
    let active = true;
    setApps([]);
    setAppId("");
    setWorkspace(null);
    setGraph({ nodes: [], edges: [] });
    setError(null);
    setLoading(true);
    apiClient<{ id: string; name: string }[]>("/applications/")
      .then((items) => {
        if (active) {
          setApps(items);
          setAppId(
            items.find((item) => item.id === query.get("application"))?.id ||
              items[0]?.id ||
              "",
          );
          if (!items.length) setLoading(false);
        }
      })
      .catch((failure) => {
        if (active) {
          setError(failure.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [organization, accountLoading, query, reload]);
  useEffect(() => {
    if (!appId || !organization) return;
    let active = true;
    setWorkspace(null);
    setSelected(null);
    setCodeFocus(null);
    setReviewApproval(false);
    setLoading(true);
    setError(null);
    setDirty(false);
    setPreview(false);
    apiClient<Workspace>(`/architecture/workspace/${appId}`)
      .then((result) => {
        if (active) {
          setWorkspace(result);
          setGraph(result.architecture?.graph || { nodes: [], edges: [] });
        }
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appId, organization]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [draft?.messages.length]);
  useEffect(() => {
    if (selected && chatVisible) componentDetails.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected, chatVisible]);

  const operation = async (name: string, path: string, data?: object) => {
    if (!appId || busy) return;
    setBusy(name);
    setError(null);
    try {
      adopt(
        await apiClient<Draft>(`/architecture/workspace/${appId}/${path}`, {
          method: "POST",
          body: data ? JSON.stringify(data) : undefined,
          timeout: 120000,
        }),
      );
      if (name === "chat") setPrompt("");
      if (name === "requirements") setRequirementsVisible(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message + (failure instanceof ApiError && failure.requestId ? ` Reference: ${failure.requestId.slice(0, 8)}.` : "")
          : "Unable to update architecture.",
      );
    } finally {
      setBusy(null);
    }
  };
  const send = () => {
    if (draft && prompt.trim() && !dirty)
      void operation("chat", "chat", {
        expected_id: draft.id,
        message: prompt.trim(),
      });
  };
  const codeGraph: Graph = {
    nodes: (draft?.evidence.components || []).map((item, index) => ({
      id: `code-${index}`,
      label: item.label,
      service: item.dependencies.join(", "),
      zone:
        item.kind === "frontend" ||
        item.kind === "api" ||
        item.kind === "worker"
          ? "APPLICATION"
          : "DATA",
      description: `Dependency found in ${item.path}. A dependency alone does not prove a runtime connection.`,
      x: 60 + (index % 3) * 330,
      y: 60 + Math.floor(index / 3) * 180,
    })),
    edges: [],
  };
  const overview = sourceOverview(draft?.evidence.modules || [], draft?.evidence.module_edges || [], draft?.evidence.repositories);
  const sourceDesign = codeMode === "overview" ? overview : codeArchitecture(codeFocus && overview.groups[codeFocus] ? overview.groups[codeFocus] : draft?.evidence.modules || [], draft?.evidence.module_edges || [], draft?.evidence.repositories);
  if (sourceDesign.graph.nodes.length) {
    codeGraph.nodes = sourceDesign.graph.nodes;
    codeGraph.edges = sourceDesign.graph.edges;
  }
  const shown =
    view === "code"
      ? codeGraph
      : preview && draft?.proposal
        ? draft.proposal.graph
        : graph;
  const node = shown.nodes.find((item) => item.id === selected);
  const production = view === "cloud" && networkView && draft?.requirements && shown.nodes.length > 0;
  const { width, height } = production ? productionLayout(shown, draft!.requirements!) : diagramBounds(shown);
  const updateNode = (change: Partial<Node>) => {
    if (!node || !canEdit || busy || view === "code" || preview) return;
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((item) =>
        item.id === node.id ? { ...item, ...change } : item,
      ),
    }));
    setDirty(true);
  };
  const fit = () => {
    autoFit.current = true;
    if (canvas.current) {
      setZoom(
        Math.max(0.08, Math.min(1, (canvas.current.clientWidth - 32) / width, (canvas.current.clientHeight - 32) / height)),
      );
      canvas.current.scrollTo({ top: 0, left: 0 });
    }
  };
  useEffect(() => {
    if (!draftId || !canvas.current) return;
    autoFit.current = true;
    const frame = requestAnimationFrame(() => {
      if (canvas.current)
        setZoom(
          Math.max(
            0.08,
            Math.min(1, (canvas.current.clientWidth - 32) / width, (canvas.current.clientHeight - 24) / height),
          ),
        );
    });
    const observer = new ResizeObserver(() => {
      if (canvas.current && autoFit.current) setZoom(Math.max(0.08, Math.min(1, (canvas.current.clientWidth - 32) / width, (canvas.current.clientHeight - 24) / height)));
    });
    observer.observe(canvas.current);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [draftId, view, width, height]);
  const exportDraft = () => {
    if (!draft) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            status: !dirty && draft.design_approval ? "DESIGN_APPROVED_NOT_DEPLOYED" : "DRAFT_NOT_DEPLOYED",
            application: workspace?.application_name,
            graph,
            requirements: draft.requirements,
            evidence: draft.evidence,
            aws_references: dirty ? undefined : draft.aws_references,
            design_approval: dirty ? undefined : draft.design_approval,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "architecture-draft.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="bg-white h-full min-h-0 overflow-hidden flex flex-col text-slate-900">
      {draft?.source_changed && <div role="alert" className="shrink-0 px-5 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">Repository links changed. This diagram shows previous sources. <button disabled={!!busy || !canRefresh} onClick={() => operation("analyze", "analyze")} className="font-semibold underline">Refresh code findings</button> before making or approving changes.</div>}
      <header className="px-5 py-3 shrink-0 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3 items-center">
          <span className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700">
            <Network className="w-6 h-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Business architecture
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Understand your business assets. Shape your cloud architecture.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {draft && <button disabled={!!busy || dirty || !canEdit} onClick={() => { setRequirementsVisible(value => !value); setChatVisible(true); }} className="rounded-lg border px-3 py-2 text-xs font-semibold">Traffic & availability</button>}
          <select
            aria-label="Business asset for architecture"
            disabled={loading || !!busy || dirty}
            value={appId}
            onChange={(event) => setAppId(event.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm max-w-60 bg-white"
          >
            <option value="" disabled>
              Select application
            </option>
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}{app.repositories?.length ? ` · ${app.repositories[0].full_name.split("/").pop()}` : ""}
              </option>
            ))}
          </select>
          <button
            disabled={!draft || !!busy}
            onClick={exportDraft}
            className="border border-slate-200 rounded-lg p-2.5 disabled:opacity-40"
            aria-label="Export draft JSON"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            disabled={!draft || !dirty || !!busy || !canEdit}
            onClick={() =>
              draft &&
              operation("save", "save", { expected_id: draft.id, graph })
            }
            className="inline-flex gap-2 items-center bg-slate-900 text-white rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            {busy === "save" ? "Saving…" : "Save draft"}
          </button>
        </div>
      </header>
      {(error || accountError) && (
        <div
          role="alert"
          className="shrink-0 flex flex-wrap items-center gap-2 px-5 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs"
        >
          {error || accountError}
          <button
            disabled={!!busy || dirty}
            onClick={() => setReload((n) => n + 1)}
            className="text-xs font-semibold underline disabled:opacity-40"
          >
            Retry workspace connection
          </button>
          {error && !accountError && <button aria-label="Dismiss architecture error" onClick={() => setError(null)} className="ml-auto p-1"><X className="w-4 h-4" /></button>}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2 shrink-0 border-b border-slate-200">
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
          {[
            { id: "cloud", label: "Cloud deployment design" },
            { id: "code", label: "Source code architecture" },
            { id: "inventory", label: "Services & sizing" },
          ].map((tab) => (
            <button
              key={tab.id}
              aria-pressed={view === tab.id}
              onClick={() => {
                setView(tab.id as "cloud" | "code" | "inventory");
                setSelected(null);
              }}
              className={`px-4 py-2 rounded-md text-xs font-semibold ${view === tab.id ? "bg-white shadow-sm text-slate-900" : "text-slate-500"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {draft && <button disabled={!!busy || dirty || !canRefresh} onClick={() => operation("analyze", "analyze")} className="font-semibold text-cyan-700 disabled:opacity-40">{busy === "analyze" ? "Inspecting source…" : "Refresh code findings"}</button>}
          <span className="text-amber-700 bg-amber-50 rounded-full px-3 py-1.5 border border-amber-100">
            {dirty
              ? "Unsaved changes"
              : preview
                ? "Previewing AI proposal"
                : draft
                  ? `${draft.version} · Draft, not deployed`
                  : "No analyzed architecture"}
          </span>
          <button
            onClick={() => setChatVisible((value) => !value)}
            className="inline-flex gap-1.5 text-cyan-700 font-semibold"
          >
            <Sparkles className="w-4 h-4" />
            {chatVisible ? "Hide assistant" : "Open assistant"}
          </button>
        </div>
      </div>
      <div
        className={`relative grid flex-1 min-h-0 overflow-hidden ${chatVisible ? "md:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1"}`}
      >
        <section className="min-w-0 min-h-0 flex flex-col border-r border-slate-200">
          <div className="flex flex-wrap justify-between gap-3 items-center px-4 py-2 shrink-0 border-b border-slate-100">
            <div className="flex flex-wrap gap-4">
              {(view === "code" ? sourceAreas : zones).map((zone) => (
                <span
                  key={zone.id}
                  className="inline-flex gap-1.5 items-center text-[11px] text-slate-500"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: zone.color }}
                  />
                  {zone.name}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 items-center">
              {view === "code" && !!draft?.evidence.modules?.length && <div className="flex flex-wrap gap-1 mr-2">
                <button aria-pressed={codeMode === "overview"} onClick={() => { setCodeMode("overview"); setCodeFocus(null); setSelected(null); }} className={`rounded-lg border px-2 py-1.5 text-xs ${codeMode === "overview" ? "bg-cyan-50 text-cyan-800" : "bg-white"}`}>Source overview</button>
                <button aria-pressed={codeMode === "files"} onClick={() => { setCodeMode("files"); setCodeFocus(null); setSelected(null); }} className={`rounded-lg border px-2 py-1.5 text-xs ${codeMode === "files" ? "bg-cyan-50 text-cyan-800" : "bg-white"}`}>All inspected files</button>
                {codeFocus && <span className="self-center text-xs text-slate-500">Focused group</span>}
              </div>}
              {!!shown.nodes.length && view !== "inventory" && <select aria-label="Find architecture component" value={selected || ""} onChange={event => {
                const id = event.target.value; setSelected(id || null);
                if (!id) { fit(); return; }
                autoFit.current = false;
                setChatVisible(true);
                const instance = production ? productionLayout(shown, draft!.requirements!).instances.find(item => item.node.id === id) : shown.nodes.find(item => item.id === id);
                if (instance && canvas.current) {
                  const container = canvas.current; setZoom(0.95);
                  requestAnimationFrame(() => container.scrollTo({ left: Math.max(0, instance.x * 0.95 - container.clientWidth / 2 + 90), top: Math.max(0, instance.y * 0.95 - container.clientHeight / 2 + 60), behavior: "smooth" }));
                }
              }} className="mr-2 max-w-48 border rounded-lg p-1.5 text-xs bg-white"><option value="">Find a component</option>{shown.nodes.map(item => <option key={item.id} value={item.id}>{view === "code" ? draft?.evidence.modules?.find(module => module.id === item.id)?.path || item.label : item.label}</option>)}</select>}
              {view === "cloud" && draft?.requirements && <button onClick={() => setNetworkView(value => !value)} className="mr-2 rounded-lg border px-2 py-1.5 text-xs font-semibold">{networkView ? "Edit logical design" : "Network diagram"}</button>}
              <button
                disabled={
                  !draft || view === "code" || preview || !!busy || !canEdit || !!production
                }
                onClick={() => {
                  setGraph(arrangeArchitecture(graph));
                  setDirty(true);
                }}
                className="mr-2 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                Arrange layers
              </button>
              <button
                disabled={!draft || view === "inventory"}
                onClick={() => downloadArchitectureSvg(diagram.current, view === "code" ? "source-code-findings.svg" : "cloud-architecture-proposal.svg")}
                aria-label="Download diagram SVG"
                className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                aria-label="Zoom out"
                disabled={!shown.nodes.length || view === "inventory"}
                onClick={() => { autoFit.current = false; setZoom((value) => Math.max(0.08, value - 0.1)); }}
                className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                aria-label="Zoom in"
                disabled={!shown.nodes.length || view === "inventory"}
                onClick={() => { autoFit.current = false; setZoom((value) => Math.min(1.6, value + 0.1)); }}
                className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                aria-label="Fit diagram"
                title="Show the entire diagram"
                disabled={!shown.nodes.length || view === "inventory"}
                onClick={fit}
                className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-40"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div
            ref={canvas}
            className="relative overflow-auto flex-1 min-h-0 bg-white"
            style={{
              backgroundImage: "radial-gradient(#dbe3ec 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            {loading || accountLoading ? (
              <div
                role="status"
                className="flex justify-center items-center h-full gap-2 text-sm text-slate-500"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading architecture…
              </div>
            ) : !draft ? (
              <div className="flex flex-col items-center justify-center h-full p-5 text-center">
                <span className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 mb-5">
                  <Network className="w-12 h-12 text-cyan-600" />
                </span>
                <h2 className="text-xl font-bold">
                  Start with your repository
                </h2>
                <p className="text-sm text-slate-500 max-w-md mt-3 leading-6">
                  Analyze dependency manifests at a specific commit, then review
                  a cloud proposal based on those findings.
                </p>
                {apps.length ? (
                  <button
                    disabled={
                      !!busy ||
                      !workspace?.capabilities.repository_analysis ||
                      !canEdit
                    }
                    onClick={() => operation("analyze", "analyze")}
                    className="mt-6 inline-flex gap-2 items-center rounded-lg bg-cyan-700 text-white px-5 py-3 font-semibold text-sm disabled:opacity-40"
                  >
                    <ScanLine className="w-4 h-4" />
                    {busy === "analyze"
                      ? "Analyzing repository…"
                      : "Analyze repository"}
                  </button>
                ) : (
                  <Link
                    href="/onboarding"
                    className="mt-6 inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-lg text-sm font-semibold"
                  >
                    Create an application
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
                {apps.length > 0 &&
                  !workspace?.capabilities.repository_analysis && (
                    <p className="mt-3 text-xs text-slate-500">
                      Repository analysis needs administrator configuration.
                    </p>
                  )}
                <Link
                  href="/architecture/example"
                  className="mt-5 text-sm font-semibold text-cyan-700 underline"
                >
                  Explore a deployment example
                </Link>
              </div>
            ) : view === "inventory" ? (
              <div className="p-5">
                <h2 className="text-lg font-semibold">
                  Proposed deployment services
                </h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Every component in the current draft is listed below. Instance
                  size, replica count, network rules, and cost remain
                  unspecified unless documented in its requirements. A
                  dependency alone cannot establish production capacity.
                </p>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="p-3">Component</th>
                        <th className="p-3">Cloud service</th>
                        <th className="p-3">Layer</th>
                        <th className="p-3">Requirements / assumptions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.nodes.map((item) => (
                        <tr key={item.id} className="border-b border-slate-100">
                          <td className="p-3 align-top">
                            <button
                              onClick={() => {
                                setSelected(item.id);
                                setChatVisible(true);
                              }}
                              className="font-semibold text-cyan-700 text-left"
                            >
                              {item.label}
                            </button>
                          </td>
                          <td className="p-3 align-top">
                            {item.service || "Not selected"}
                          </td>
                          <td className="p-3 align-top">
                            {zones.find((z) => z.id === item.zone)?.name}
                          </td>
                          <td className="min-w-64 p-3 leading-5 text-slate-500">
                            {item.description || "Requirements need review"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Link
                  href="/dashboard/deployments"
                  className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-cyan-700"
                >
                  Review deployment requirements
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <section aria-label="Design approval" className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold">Approve your cloud design</h3>
                  {draft.design_approval && !dirty && !preview ? (
                    <>
                      <p className="mt-2 text-sm text-emerald-700">Design {draft.design_approval.version} approved · {new Date(draft.design_approval.approved_at).toLocaleString()}</p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{draft.design_approval.scope} Saving changes requires a new design approval.</p>
                      <Link href={`/dashboard/deployments?application=${appId}`} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">Continue to deployment preparation <ArrowRight className="h-4 w-4" /></Link>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-xs leading-5 text-slate-500">Review all services and save traffic, region and availability requirements above. Approval records this saved version. AWS connection and a costed infrastructure plan follow before deployment.</p>
                      {reviewApproval ? (
                        <div className="mt-3 space-y-3">
                          <p className="text-xs leading-5 text-slate-700">Confirm design {draft.version}? This records your decision and does not create AWS resources or grant cloud permissions.</p>
                          <div className="flex gap-2">
                            <button disabled={!!busy || dirty || preview || !!draft.proposal || !canEdit} onClick={() => operation("approve", "approve-design", { expected_id: draft.id })} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy === "approve" ? "Recording approval…" : "Confirm design approval"}</button>
                            <button disabled={!!busy} onClick={() => setReviewApproval(false)} className="rounded-lg border px-3 py-2 text-xs">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button disabled={!!busy || dirty || preview || !!draft.proposal || !canEdit || !shown.nodes.length || !draft.requirements} onClick={() => setReviewApproval(true)} className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Review design approval</button>
                      )}
                      {(dirty || preview || draft.proposal) && <p className="mt-2 text-xs text-amber-700">Apply pending proposals and save changes before approval.</p>}
                    </>
                  )}
                </section>
              </div>
            ) : shown.nodes.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No supported application dependencies were found in the
                inspected manifests. Review the code findings or add a proposed
                service.
              </div>
            ) : (
              <div style={{ width: width * zoom, height: height * zoom }}>
                {production ? <ProductionDiagram ref={diagram} graph={shown} requirements={draft!.requirements!} zoom={zoom} selected={selected} onSelect={id => { setSelected(id); setChatVisible(true); }} /> : <CloudDiagram
                  ref={diagram}
                  graph={shown}
                  zoom={zoom}
                  selected={selected}
                  code={view === "code"}
                  boundaries={view === "code" && sourceDesign.boundaries.length ? sourceDesign.boundaries : undefined}
                  onSelect={(id) => {
                    setSelected(id);
                    setChatVisible(true);
                    setNewConnection("");
                  }}
                  onNodePointerDown={
                    view === "cloud" && !preview && canEdit && !busy
                      ? (event, item) => {
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                          drag.current = {
                            id: item.id,
                            x: item.x,
                            y: item.y,
                            startX: event.clientX,
                            startY: event.clientY,
                          };
                        }
                      : undefined
                  }
                  onPointerMove={(event) => {
                    if (!drag.current || busy) return;
                    const item = drag.current;
                    const dx = (event.clientX - item.startX) / zoom,
                      dy = (event.clientY - item.startY) / zoom;
                    if (Math.abs(dx) + Math.abs(dy) < 4) return;
                    setGraph((current) => ({
                      ...current,
                      nodes: current.nodes.map((n) =>
                        n.id === item.id
                          ? {
                              ...n,
                              x: Math.round(
                                Math.max(30, Math.min(6000, item.x + dx)),
                              ),
                              y: Math.round(
                                Math.max(60, Math.min(6000, item.y + dy)),
                              ),
                            }
                          : n,
                      ),
                    }));
                    setDirty(true);
                  }}
                  onPointerUp={() => {
                    drag.current = null;
                  }}
                />}
              </div>
            )}
          </div>
          <p className="px-4 py-1.5 shrink-0 border-t border-slate-100 text-[11px] leading-5 text-slate-500">
            {view === "code" ? "Static imports from the inspected source sample. Dynamic runtime connections are not verified." : "Proposed placement · not deployed. Traffic targets inform planning; exact capacity, networking and recovery require validation."}
          </p>
          <div className="px-4 py-2 shrink-0 border-t flex flex-wrap justify-between items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex gap-2 items-center">
              <MousePointer2 className="w-3.5 h-3.5" />
              Select a component to inspect
              {view === "cloud" && canEdit ? " · Drag to arrange" : ""}
            </span>
            {draft && view === "cloud" && (
              <button
                disabled={
                  !!busy || preview || !canEdit || graph.nodes.length >= 80
                }
                onClick={() => {
                  const id = `node-${crypto.randomUUID().slice(0, 8)}`;
                  setGraph((current) => ({
                    ...current,
                    nodes: [
                      ...current.nodes,
                      {
                        id,
                        label: "New service",
                        service: "Choose a cloud service",
                        zone: "SUPPORT",
                        description:
                          "Manually proposed component. Requirements need review.",
                        x: 70,
                        y: Math.min(6000, height - 40),
                      },
                    ],
                  }));
                  setSelected(id);
                  setDirty(true);
                }}
                className="flex items-center gap-1.5 text-cyan-700 font-semibold disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                Add component
              </button>
            )}
          </div>
        </section>
        {chatVisible && (
          <aside className="absolute inset-y-0 right-0 z-20 w-[min(340px,100%)] md:static md:w-auto flex flex-col min-h-0 overflow-hidden bg-white border-l shadow-xl md:shadow-none">
            <div className="px-4 py-3 shrink-0 border-b flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="font-semibold text-sm">
                    Architecture assistant
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Discuss tradeoffs. Review proposed changes.
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 p-4 space-y-4">
              {draft && (requirementsVisible || !draft.requirements) && <RequirementsForm key={draft.id} value={draft.requirements} disabled={!!busy || dirty || !canEdit || !!draft.proposal} saving={busy === "requirements"} onSave={value => operation("requirements", "requirements", { expected_id: draft.id, ...value })} />}
              {draft && !requirementsVisible && draft.requirements && <div className="rounded-xl border p-3 text-xs leading-5 text-slate-600"><strong className="text-slate-900">Deployment targets</strong><br />{draft.requirements.region} · {draft.requirements.availability.replaceAll("_", " ").toLowerCase()}<br />{draft.requirements.peak_requests_per_minute.toLocaleString()} requests/min · {draft.requirements.concurrent_users.toLocaleString()} users</div>}
              {draft && (
                <AwsReferences review={draft.aws_references}
                  enabled={!!workspace?.capabilities.aws_references} canEdit={canEdit}
                  busy={!!busy} fetching={busy === "references"} unsaved={dirty} preview={preview}
                  onFind={() => operation("references", "references", { expected_id: draft.id })}
                />
              )}
              {node && (
                <section ref={componentDetails} className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm">Component details</h3>
                    <button
                      aria-label="Close component details"
                      onClick={() => setSelected(null)}
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  {view === "code" && codeMode === "overview" && overview.groups[node.id] && <div className="space-y-3">
                    <button onClick={() => { setCodeMode("files"); setCodeFocus(node.id); setSelected(null); }} className="rounded-lg bg-cyan-50 text-cyan-800 px-3 py-2 text-xs font-semibold">Inspect files in this group</button>
                    <ul className="text-xs text-slate-500 space-y-2 break-all">{overview.groups[node.id].map(item => <li key={item.id}>{item.path}</li>)}</ul>
                  </div>}
                  {view !== "code" && !preview && canEdit ? (
                    <>
                      <label className="block text-xs text-slate-500">
                        Component name
                        <input
                          maxLength={100}
                          value={node.label}
                          disabled={!!busy}
                          onChange={(event) =>
                            updateNode({ label: event.target.value })
                          }
                          className="mt-1 w-full p-2 rounded border text-slate-900"
                        />
                      </label>
                      <label className="block text-xs text-slate-500">
                        Cloud service
                        <input
                          maxLength={100}
                          value={node.service}
                          disabled={!!busy}
                          onChange={(event) =>
                            updateNode({ service: event.target.value })
                          }
                          className="mt-1 w-full p-2 rounded border text-slate-900"
                        />
                      </label>
                      <label className="block text-xs text-slate-500">
                        Requirements & sizing
                        <textarea
                          maxLength={500}
                          value={node.description}
                          disabled={!!busy}
                          onChange={(event) =>
                            updateNode({ description: event.target.value })
                          }
                          rows={4}
                          className="mt-1 w-full p-2 rounded border text-slate-900"
                        />
                      </label>
                      <label className="block text-xs text-slate-500">
                        Architecture layer
                        <select
                          value={node.zone}
                          disabled={!!busy}
                          onChange={(event) =>
                            updateNode({ zone: event.target.value as Zone })
                          }
                          className="mt-1 w-full p-2 rounded border text-slate-900 bg-white"
                        >
                          {zones.map((z) => (
                            <option key={z.id} value={z.id}>
                              {z.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-xs text-slate-500">
                        Connect to
                        <select
                          value={newConnection}
                          onChange={(event) =>
                            setNewConnection(event.target.value)
                          }
                          className="mt-1 w-full p-2 rounded border bg-white text-slate-900"
                        >
                          <option value="">Select component</option>
                          {graph.nodes
                            .filter((n) => n.id !== node.id)
                            .map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.label}
                              </option>
                            ))}
                        </select>
                      </label>
                      <button
                        disabled={
                          !newConnection ||
                          !!busy ||
                          graph.edges.length >= 160 ||
                          graph.edges.some(
                            (e) =>
                              e.source === node.id &&
                              e.target === newConnection,
                          )
                        }
                        onClick={() => {
                          setGraph((current) => ({
                            ...current,
                            edges: [
                              ...current.edges,
                              {
                                source: node.id,
                                target: newConnection,
                                label: "Proposed connection",
                              },
                            ],
                          }));
                          setDirty(true);
                          setNewConnection("");
                        }}
                        className="text-xs font-semibold text-cyan-700 disabled:opacity-40"
                      >
                        Add connection
                      </button>
                      <div className="space-y-2">
                        {graph.edges.map(
                          (edge, index) =>
                            (edge.source === node.id ||
                              edge.target === node.id) && (
                              <div
                                key={index}
                                className="flex justify-between text-xs text-slate-500 gap-2"
                              >
                                <span>
                                  {
                                    graph.nodes.find(
                                      (n) => n.id === edge.source,
                                    )?.label
                                  }{" "}
                                  →{" "}
                                  {
                                    graph.nodes.find(
                                      (n) => n.id === edge.target,
                                    )?.label
                                  }
                                </span>
                                <button
                                  disabled={!!busy}
                                  aria-label={`Remove connection ${index + 1}`}
                                  onClick={() => {
                                    setGraph((current) => ({
                                      ...current,
                                      edges: current.edges.filter(
                                        (_, i) => i !== index,
                                      ),
                                    }));
                                    setDirty(true);
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ),
                        )}
                      </div>
                      <button
                        disabled={!!busy}
                        onClick={() => {
                          setGraph((current) => ({
                            nodes: current.nodes.filter(
                              (n) => n.id !== node.id,
                            ),
                            edges: current.edges.filter(
                              (e) =>
                                e.source !== node.id && e.target !== node.id,
                            ),
                          }));
                          setSelected(null);
                          setDirty(true);
                        }}
                        className="text-xs text-rose-700"
                      >
                        Remove component
                      </button>
                    </>
                  ) : (
                    <h4 className="text-sm font-semibold">{node.label}</h4>
                  )}
                  <p className="text-xs leading-5 text-slate-500">
                    {node.description}
                  </p>
                </section>
              )}
              {draft && (
                <details className="border border-slate-200 rounded-xl p-3 text-xs">
                  <summary className="cursor-pointer font-semibold flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5" />
                    Source evidence · {draft.evidence.files.length} manifests
                  </summary>
                  {draft.evidence.repositories?.length ? <ul className="mt-3 space-y-2">{draft.evidence.repositories.map(repo => <li key={repo.id} className="break-all text-slate-500">{repo.full_name} · {repo.branch} @ {repo.commit.slice(0, 8)}</li>)}</ul> : <p className="text-slate-500 mt-3 break-all">
                    {draft.evidence.repository} · {draft.evidence.branch} @{" "}
                    {draft.evidence.commit.slice(0, 8)}
                  </p>}
                  <p className="text-slate-500 leading-5 mt-2">
                    {draft.evidence.scope}
                  </p>
                  {draft.evidence.source_coverage && <p className="mt-2 text-slate-500">Static source sample: {draft.evidence.source_coverage.inspected} of {draft.evidence.source_coverage.candidates} candidate files (limit {draft.evidence.source_coverage.limit}).</p>}
                  <ul className="mt-3 space-y-2">
                    {draft.evidence.files.map((file) => (
                      <li key={file.path} className="break-all text-slate-600">
                        {file.path}
                        <span className="block text-[10px] text-slate-400">
                          {file.dependencies.length} recognized dependency names
                        </span>
                        <span className="block mt-1 text-slate-500">
                          {file.dependencies.join(", ") ||
                            "No supported dependency names detected"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {draft?.last_ai_workflow && <p className="text-xs text-slate-500 border border-slate-200 rounded-lg p-3">Source context reviewed · proposal schema checked · your review required. {draft.last_ai_workflow.missing_requirements.length > 0 && "Traffic and availability details are still needed."}</p>}
              {!draft?.messages.length && (
                <div className="pt-2">
                  <p className="text-sm text-slate-700 leading-6">
                    Use this space to simplify services, explore availability,
                    or refine trust boundaries.
                  </p>
                  <div className="space-y-2 mt-4">
                    {[
                      "Explain the architecture and its assumptions",
                      "How can we simplify this design?",
                      "Separate public and private services",
                      "List the services and deployment sizing decisions we still need to confirm",
                    ].map((text) => (
                      <button
                        key={text}
                        disabled={
                          !draft || !workspace?.capabilities.ai_chat || !canEdit
                        }
                        onClick={() => setPrompt(text)}
                        className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:border-cyan-300 disabled:opacity-40"
                      >
                        {text}
                        <ArrowRight className="w-3 h-3 inline ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {draft?.messages.map((message, index) => (
                <div
                  key={index}
                  className={`rounded-xl p-3.5 text-sm leading-6 whitespace-pre-wrap break-words ${message.role === "user" ? "bg-slate-100 ml-5" : "border border-indigo-100 bg-indigo-50/40 mr-2"}`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                    {message.role === "user" ? "You" : "Assistant"}
                  </p>
                  {message.content}
                </div>
              ))}
              {draft?.proposal && (
                <div className="p-4 rounded-xl border border-cyan-200 bg-cyan-50 space-y-3">
                  <p className="text-sm font-semibold text-cyan-900">
                    Proposed diagram changes
                  </p>
                  <p className="text-xs text-cyan-800">
                    {
                      draft.proposal.graph.nodes.filter(
                        (n) => !graph.nodes.some((old) => old.id === n.id),
                      ).length
                    }{" "}
                    added ·{" "}
                    {
                      graph.nodes.filter(
                        (n) =>
                          !draft.proposal!.graph.nodes.some(
                            (next) => next.id === n.id,
                          ),
                      ).length
                    }{" "}
                    removed ·{" "}
                    {
                      draft.proposal.graph.nodes.filter((n) =>
                        graph.nodes.some(
                          (old) =>
                            old.id === n.id &&
                            (old.label !== n.label ||
                              old.service !== n.service ||
                              old.zone !== n.zone ||
                              old.description !== n.description),
                        ),
                      ).length
                    }{" "}
                    modified.
                  </p>
                  <p className="text-xs text-cyan-800">
                    {draft.proposal.graph.nodes.length} components ·{" "}
                    {draft.proposal.graph.edges.length} connections. Review the
                    diagram before applying.
                  </p>
                  <button
                    disabled={dirty || !!busy}
                    onClick={() => {
                      setPreview((value) => !value);
                      setView("cloud");
                      setSelected(null);
                    }}
                    className="text-xs font-semibold underline text-cyan-800 disabled:opacity-40"
                  >
                    {preview ? "Return to saved draft" : "Preview proposal"}
                  </button>
                  <button
                    disabled={dirty || !!busy || !canEdit}
                    onClick={() =>
                      operation("apply", "apply", {
                        expected_id: draft.id,
                        proposal_id: draft.proposal!.id,
                      })
                    }
                    className="w-full bg-cyan-700 text-white rounded-lg px-3 py-2 text-xs font-semibold inline-flex gap-2 items-center justify-center disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Apply to draft
                  </button>
                </div>
              )}
              {busy && (
                <p
                  role="status"
                  className="text-xs text-slate-500 flex gap-2 items-center"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {busy === "chat"
                    ? "Reviewing your architecture…"
                    : "Updating workspace…"}
                </p>
              )}
              <div ref={chatEnd} />
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
              className="border-t p-3 shrink-0 space-y-2"
            >
              <div className="rounded-xl border border-slate-200 focus-within:border-cyan-400 p-3">
                <textarea
                  aria-label="Message architecture assistant"
                  maxLength={2000}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  disabled={
                    !draft ||
                    !workspace?.capabilities.ai_chat ||
                    !canEdit ||
                    !!busy ||
                    dirty
                  }
                  placeholder="Ask about your architecture…"
                  rows={3}
                  className="w-full text-sm resize-none outline-none bg-white disabled:opacity-50"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400">
                    Changes stay in your draft
                  </span>
                  <button
                    type="submit"
                    aria-label="Send architecture message"
                    disabled={
                      !prompt.trim() ||
                      !draft ||
                      !workspace?.capabilities.ai_chat ||
                      !canEdit ||
                      !!busy ||
                      dirty
                    }
                    className="bg-cyan-700 p-2 rounded-lg text-white disabled:opacity-30"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-4">
                {loading || accountLoading
                  ? "Loading your architecture workspace…"
                  : !workspace
                    ? "Create or choose an application to check assistant availability."
                  : !draft
                    ? "Analyze your connected repository to start an architecture draft."
                  : !canEdit
                    ? "An owner or administrator can request architecture changes."
                  : dirty
                  ? "Save your changes before asking for another proposal."
                  : !workspace?.capabilities.ai_chat
                    ? "AI chat requires administrator configuration."
                    : "AI receives this draft and dependency findings. Review suggestions before applying."}
              </p>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
