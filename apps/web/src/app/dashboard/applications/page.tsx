"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Github,
  GitBranch,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Layers,
  Sparkles,
  Search,
  Plus,
  Rocket,
  ShieldCheck,
  Cpu,
  Lock,
  RefreshCw
} from "lucide-react";

interface AppItem {
  id: string;
  name: string;
  slug: string;
  repo: string;
  branch: string;
  status: "HEALTHY" | "ANALYZING" | "READY_TO_DEPLOY";
  frontend: string;
  backend: string;
  database: string;
  readiness: string;
  architecture_version: string;
}

export default function ApplicationsPage() {
  const [apps, setApps] = useState<AppItem[]>([
    {
      id: "app-01",
      name: "Acme SaaS Web Platform",
      slug: "acme-saas",
      repo: "acmecloud/acme-core",
      branch: "main",
      status: "HEALTHY",
      frontend: "Next.js 15",
      backend: "FastAPI (Python 3.11)",
      database: "PostgreSQL 16",
      readiness: "84%",
      architecture_version: "v2.0.0"
    }
  ]);

  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [selectedRepo, setSelectedRepo] = useState<string>("acmecloud/acme-core");
  const [selectedBranch, setSelectedBranch] = useState<string>("main");
  const [isLinking, setIsLinking] = useState<boolean>(false);

  const availableRepos = [
    { name: "acmecloud/acme-core", desc: "Monorepo with Next.js frontend and FastAPI backend API", lang: "Python / TypeScript" },
    { name: "acmecloud/acme-frontend", desc: "Next.js 15 standalone customer web application", lang: "TypeScript" },
    { name: "acmecloud/acme-backend-api", desc: "FastAPI REST API with PostgreSQL and Celery worker", lang: "Python 3.11" },
    { name: "acmecloud/acme-infra-terraform", desc: "Production Terraform modules and AWS policies", lang: "HCL" },
  ];

  const handleLinkRepo = async () => {
    setIsLinking(true);
    setTimeout(() => {
      setIsLinking(false);
      setShowConnectModal(false);
      alert(`Repository '${selectedRepo}' on branch '${selectedBranch}' successfully linked and deep static analysis triggered!`);
    }, 1200);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-cyan-400" />
            Applications & Workspaces
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage connected GitHub repositories, multi-tier application architectures, and live environments.
          </p>
        </div>

        <button
          onClick={() => setShowConnectModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs rounded-lg shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
        >
          <Github className="w-4 h-4" />
          Connect GitHub Repository
        </button>
      </div>

      {/* Applications Cards */}
      <div className="grid grid-cols-1 gap-4">
        {apps.map((app) => (
          <div
            key={app.id}
            className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/applications/${app.id}`}
                    className="text-lg font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-2"
                  >
                    {app.name}
                    <ArrowRight className="w-4 h-4 text-cyan-400" />
                  </Link>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {app.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5">
                  <span className="flex items-center gap-1.5 font-mono text-slate-200">
                    <Github className="w-3.5 h-3.5 text-slate-400" />
                    {app.repo}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono text-cyan-400">
                    <GitBranch className="w-3.5 h-3.5" />
                    {app.branch}
                  </span>
                  <span>•</span>
                  <span>
                    Architecture: <strong className="text-white font-mono">{app.architecture_version}</strong>
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5">
                <Link
                  href={`/dashboard/applications/${app.id}`}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  View Deep Analysis
                </Link>
                <Link
                  href="/dashboard/architecture"
                  className="px-3.5 py-2 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/60 text-cyan-300 text-xs font-semibold border border-cyan-700/50 flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  AWS Architecture
                </Link>
              </div>
            </div>

            {/* Stack Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Frontend</div>
                <div className="font-bold text-white mt-0.5">{app.frontend}</div>
              </div>
              <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Backend API</div>
                <div className="font-bold text-white mt-0.5">{app.backend}</div>
              </div>
              <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Database Engine</div>
                <div className="font-bold text-white mt-0.5">{app.database}</div>
              </div>
              <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Production Readiness</div>
                <div className="font-bold text-cyan-400 mt-0.5 font-mono">{app.readiness} PASS</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* GitHub Repository Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                  <Github className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Connect GitHub Repository</h3>
                  <p className="text-xs text-slate-400">LaunchComply GitHub App (Installation: inst_acme_8912)</p>
                </div>
              </div>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Select Permitted Repository
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableRepos.map((r) => (
                    <div
                      key={r.name}
                      onClick={() => setSelectedRepo(r.name)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedRepo === r.name
                          ? "bg-cyan-950/60 border-cyan-400 text-white"
                          : "bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-850"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="font-mono text-xs">{r.name}</span>
                        <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                          {r.lang}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Production Branch</label>
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    <option value="main">main (Default)</option>
                    <option value="staging">staging</option>
                    <option value="feat/production-hardening">feat/production-hardening</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Root Directory Path</label>
                  <input
                    type="text"
                    defaultValue="/"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                    placeholder="/"
                  />
                </div>
              </div>

              <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-lg text-slate-300 text-[11px] leading-relaxed">
                🔒 <strong>Security Policy:</strong> LaunchComply uses short-lived GitHub App installation tokens. No
                personal access tokens or customer source code are permanently stored on disk.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  disabled={isLinking}
                  onClick={handleLinkRepo}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 hover:opacity-95 text-slate-950 font-bold shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
                >
                  {isLinking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                  Link & Run Deep Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
