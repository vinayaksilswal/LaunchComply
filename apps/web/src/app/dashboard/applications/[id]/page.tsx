"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Github,
  GitBranch,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  ArrowRight,
  Database,
  Cpu,
  Server,
  Play,
  RotateCcw,
  Check,
  ShieldCheck,
  FileCode,
  DollarSign
} from "lucide-react";

export default function ApplicationDetailPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "analysis" | "contract" | "topology">("analysis");
  const [analysisProgress, setAnalysisProgress] = useState<number>(100);
  const [analysisStage, setAnalysisStage] = useState<string>("Analysis complete. Architecture recommendation ready.");
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(false);

  const handleTriggerReanalysis = () => {
    setIsReanalyzing(true);
    setAnalysisProgress(15);
    setAnalysisStage("Fetching and indexing repository archive...");

    setTimeout(() => {
      setAnalysisProgress(50);
      setAnalysisStage("Detecting runtimes, Dockerfiles, and dependencies...");
    }, 700);

    setTimeout(() => {
      setAnalysisProgress(80);
      setAnalysisStage("Auditing environment contracts, secrets, and database connections...");
    }, 1400);

    setTimeout(() => {
      setAnalysisProgress(100);
      setAnalysisStage("Analysis complete. Architecture recommendation ready.");
      setIsReanalyzing(false);
    }, 2100);
  };

  const detectedServices = [
    {
      name: "Next.js Web Frontend",
      type: "frontend",
      framework: "Next.js 15",
      runtime: "Node.js 20",
      root: "/apps/web",
      build: "npm run build",
      start: "npm start",
      ports: "3000/HTTP (Public Ingress)",
      confidence: "100%"
    },
    {
      name: "FastAPI Core API",
      type: "backend",
      framework: "FastAPI",
      runtime: "Python 3.11",
      root: "/apps/api",
      build: "pip install -r requirements.txt",
      start: "uvicorn app.main:app --port 8000",
      ports: "8000/HTTP (Private Ingress)",
      confidence: "100%"
    },
    {
      name: "Celery Background Worker",
      type: "worker",
      framework: "Celery / ARQ",
      runtime: "Python 3.11",
      root: "/apps/api",
      build: "pip install -r requirements.txt",
      start: "celery -A app.worker worker",
      ports: "Internal Compute Task",
      confidence: "90%"
    },
  ];

  const envVars = [
    { name: "DATABASE_URL", category: "DATABASE", required: true, secret: true, source: "apps/api/app/core/config.py", desc: "Async PostgreSQL connection URI" },
    { name: "REDIS_URL", category: "BACKEND_ONLY", required: true, secret: false, source: "apps/api/app/core/config.py", desc: "Redis cluster cache & queue endpoint" },
    { name: "JWT_SECRET", category: "SECRET", required: true, secret: true, source: "apps/api/app/core/config.py", desc: "HMAC-SHA256 user authentication signing secret" },
    { name: "NEXT_PUBLIC_API_URL", category: "PUBLIC_FRONTEND", required: true, secret: false, source: "apps/web/next.config.mjs", desc: "Public browser ingress URL" },
    { name: "STRIPE_SECRET_KEY", category: "SECRET", required: true, secret: true, source: "apps/api/app/core/config.py", desc: "Stripe payment webhook & charge key" },
    { name: "OPENAI_API_KEY", category: "SECRET", required: false, secret: true, source: "apps/api/app/core/config.py", desc: "AI summarization API token" },
  ];

  const staticFindings = [
    {
      category: "Container Security",
      severity: "HIGH",
      title: "Container Runs as Root User in Dockerfile",
      source: "Dockerfile",
      desc: "Dockerfile does not declare an unprivileged USER instruction.",
      rec: "Add 'USER appuser' with UID 1000 before entrypoint."
    },
    {
      category: "Storage Resilience",
      severity: "HIGH",
      title: "Container Ephemeral Upload Directory Risk",
      source: "apps/api/app/uploads",
      desc: "Media attachments stored on local container disk; data is wiped on container reboot.",
      rec: "Migrate upload handler to S3 KMS encrypted buckets with presigned URLs."
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* App Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Acme SaaS Web Platform</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
              HEALTHY (PROD)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Linked to <span className="text-slate-200 font-mono">acmecloud/acme-core</span> on branch{" "}
            <span className="text-cyan-400 font-mono">main</span> • Architecture: <span className="text-white font-mono">v2.0.0</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            disabled={isReanalyzing}
            onClick={handleTriggerReanalysis}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isReanalyzing ? "animate-spin text-cyan-400" : ""}`} />
            Re-run Static Analysis
          </button>
          <Link
            href="/dashboard/architecture"
            className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs rounded-lg shadow-md flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            View AWS Architecture
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex items-center gap-1 text-xs">
        <button
          onClick={() => setActiveTab("analysis")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
            activeTab === "analysis" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Deep Analysis & Services
        </button>
        <button
          onClick={() => setActiveTab("contract")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
            activeTab === "contract" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          Environment Contract ({envVars.length})
        </button>
        <button
          onClick={() => setActiveTab("topology")}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
            activeTab === "topology" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Application Data Flows
        </button>
      </div>

      {/* TAB 1: Deep Analysis Run Progress & Detected Services */}
      {activeTab === "analysis" && (
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                Analysis Pipeline Status
              </span>
              <span className="font-mono text-cyan-400 font-bold">{analysisProgress}% Complete</span>
            </div>

            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{analysisStage}</span>
              <span className="font-mono">Commit: a7b3e9f4 • 482 files indexed</span>
            </div>
          </div>

          {/* Detected Services Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Detected Microservices & Workloads ({detectedServices.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {detectedServices.map((s, i) => (
                <div key={i} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-cyan-400 font-mono">{s.type}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Confidence: {s.confidence}</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-sm">{s.name}</h4>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{s.framework} • {s.runtime}</p>
                  </div>

                  <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-800">
                    <div className="text-slate-400">
                      Root Path: <code className="text-slate-200">{s.root}</code>
                    </div>
                    <div className="text-slate-400">
                      Port: <span className="text-cyan-300 font-mono">{s.ports}</span>
                    </div>
                    <div className="text-slate-400 truncate">
                      Start: <code className="text-slate-300 text-[10px]">{s.start}</code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Static Analysis Findings */}
          <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Static Production Readiness Warnings ({staticFindings.length})
              </h3>
              <span className="text-xs text-slate-400">Detected from Dockerfile & Source Code</span>
            </div>

            <div className="space-y-2.5">
              {staticFindings.map((f, i) => (
                <div key={i} className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">{f.title}</span>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                      {f.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{f.desc}</p>
                  <div className="text-[11px] text-cyan-300 font-semibold pt-1">
                    Recommendation: {f.rec}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Architecture Approval Banner */}
          <div className="p-5 bg-gradient-to-r from-slate-900 to-cyan-950/40 border border-cyan-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                Dynamic Architecture Synthesis Ready
              </span>
              <h4 className="text-base font-bold text-white mt-0.5">
                BALANCED Multi-Tier AWS Topology (₹38,500/mo)
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Synthesized based on detected Next.js frontend, FastAPI container, Celery worker, and Multi-AZ PostgreSQL database.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isApproved ? (
                <div className="px-4 py-2 bg-emerald-950 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                  Architecture Approved
                </div>
              ) : (
                <button
                  onClick={() => setIsApproved(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs rounded-lg shadow-md shadow-cyan-500/20 hover:opacity-95"
                >
                  Approve AWS Architecture
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Environment Variable Contract */}
      {activeTab === "contract" && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden space-y-4 p-5">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Discovered Environment Variable Contract
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Detected from source code AST references. Values are never retrieved or stored in plaintext.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Variable Name</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">Required</th>
                  <th className="py-2.5 px-3">Source Code Reference</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {envVars.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-850/40">
                    <td className="py-3 px-3 font-bold text-white">{v.name}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.category === "SECRET"
                            ? "bg-rose-950 text-rose-300 border border-rose-800/40"
                            : v.category === "PUBLIC_FRONTEND"
                            ? "bg-cyan-950 text-cyan-300 border border-cyan-800/40"
                            : "bg-blue-950 text-blue-300 border border-blue-800/40"
                        }`}
                      >
                        {v.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-emerald-400">{v.required ? "YES" : "OPTIONAL"}</td>
                    <td className="py-3 px-3 text-slate-400 text-[11px]">{v.source}</td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-xs">{v.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Application Topology Data Flows */}
      {activeTab === "topology" && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Application Architecture (Software Data Flows)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Code-level communications between frontend, backend, workers, databases, and third-party APIs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {[
              { from: "User Browser", to: "Next.js Frontend", proto: "HTTPS / 443", desc: "Public user web session" },
              { from: "Next.js Frontend", to: "FastAPI Core API", proto: "HTTP / 8000", desc: "REST API JSON requests" },
              { from: "FastAPI Core API", to: "RDS PostgreSQL Multi-AZ", proto: "TLS 1.3 / 5432", desc: "SQLAlchemy relational queries" },
              { from: "FastAPI Core API", to: "ElastiCache Redis", proto: "TCP / 6379", desc: "Session cache & task queue dispatch" },
              { from: "Celery Worker", to: "ElastiCache Redis", proto: "TCP / 6379", desc: "Asynchronous task consumption" },
              { from: "FastAPI Core API", to: "External Stripe API", proto: "HTTPS / 443", desc: "Billing & customer subscriptions" },
            ].map((flow, i) => (
              <div key={i} className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>{flow.from}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-cyan-300">{flow.to}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{flow.desc}</div>
                </div>
                <span className="text-[10px] font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  {flow.proto}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
