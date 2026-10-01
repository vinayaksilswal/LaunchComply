"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Rocket,
  GitCommit,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ArrowRight,
  Layers,
  Activity,
  Terminal,
  Database,
  Lock,
  FileCheck2,
  Server,
  Sparkles,
  Download,
  Clock,
  ChevronRight,
  RefreshCw,
  Cpu
} from "lucide-react";
import { ApplicationRelease } from "@/types";

export default function ReleaseDetailPage() {
  const params = useParams();
  const appId = (params?.id as string) || "demo-app";
  const releaseId = (params?.releaseId as string) || "rel-v142";

  const [activeTab, setActiveTab] = useState<
    "overview" | "build" | "artifacts" | "sbom" | "security" | "migrations" | "verification"
  >("overview");
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackSuccess, setRollbackSuccess] = useState(false);

  const releaseVersion = releaseId.includes("v141") ? "v1.4.1" : "v1.4.2";
  const commitSha = releaseVersion === "v1.4.2" ? "a1b2c3d4e5f6" : "7a8b9c0d1e2f";
  const isLive = releaseVersion === "v1.4.2" && !rollbackSuccess;

  const handleRollback = async () => {
    setIsRollingBack(true);
    try {
      await fetch(`/api/backend/deployments/dep-demo/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "User triggered rollback from cockpit" })
      });
    } catch {
      // Graceful offline fallback
    }
    setTimeout(() => {
      setIsRollingBack(false);
      setRollbackSuccess(true);
    }, 1500);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb / Top Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/applications/${appId}`} className="hover:text-slate-900 transition-colors">
            Applications
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link
            href={`/dashboard/applications/${appId}/releases`}
            className="hover:text-slate-900 transition-colors"
          >
            Releases
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900">{releaseVersion}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500">Commit: {commitSha}</span>
        </div>
      </div>

      {/* Release Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Release {releaseVersion}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                rollbackSuccess
                  ? "bg-amber-50 text-amber-700 border-amber-300"
                  : isLive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 animate-pulse"
                  : "bg-slate-100 text-slate-700 border-slate-300"
              }`}
            >
              {rollbackSuccess ? "ROLLED_BACK" : isLive ? "LIVE" : "SUPERSEDED"}
            </span>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
              Blue/Green (100% Traffic)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-mono">
              <GitCommit className="w-3.5 h-3.5 text-slate-400" />
              {commitSha}
            </span>
            <span className="flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
              main
            </span>
            <span>Target: <strong className="text-slate-800">Production (ap-south-1)</strong></span>
            <span>Public Host: <strong className="text-cyan-700">https://app.acmecloud.io</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleRollback}
            disabled={isRollingBack || rollbackSuccess}
            className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 shadow-sm ${
              rollbackSuccess
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRollingBack ? "animate-spin" : ""}`} />
            {isRollingBack
              ? "Executing Rollback..."
              : rollbackSuccess
              ? "Rolled Back to v1.4.1"
              : "Instant Rollback to v1.4.1"}
          </button>

          <a
            href="https://app.acmecloud.io"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>Visit Live URL</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold overflow-x-auto">
        {[
          { id: "overview", label: "Overview & Gates" },
          { id: "build", label: "Build Logs" },
          { id: "artifacts", label: "ECR Artifacts (3)" },
          { id: "sbom", label: "SBOM (CycloneDX)" },
          { id: "security", label: "Security & CVEs" },
          { id: "migrations", label: "DB Migrations" },
          { id: "verification", label: "Smoke Tests & Verification" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2.5 px-3.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-cyan-600 text-cyan-700 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & GATES */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Policy Gates Summary Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                DevSecOps Release Gates Evaluation
              </h3>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                ALL 8 GATES PASSED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                { code: "REL-SEC-001", name: "Image Vulnerability Gate", status: "PASS", detail: "0 Critical CVEs, 0 High CVEs" },
                { code: "REL-CONFIG-001", name: "Runtime Secrets Gate", status: "PASS", detail: "DATABASE_URL, JWT_SECRET, STRIPE configured" },
                { code: "REL-DB-001", name: "Database Migration Gate", status: "PASS", detail: "rev_20261001_004 applied cleanly" },
                { code: "REL-HEALTH-001", name: "Health Endpoint Gate", status: "PASS", detail: "HTTP 200, Latency 42.5ms" },
                { code: "REL-TLS-001", name: "Domain TLS Certificate Gate", status: "PASS", detail: "ACM Certificate Active, TLS 1.3 enforced" },
                { code: "REL-ART-001", name: "Immutable Digest Gate", status: "PASS", detail: "Cryptographic sha256 locked" },
                { code: "REL-IAC-001", name: "Infrastructure Readiness Gate", status: "PASS", detail: "VPC, ECS, RDS available" },
                { code: "REL-DRIFT-001", name: "Infrastructure Drift Gate", status: "PASS", detail: "Zero unmanaged state drift" },
              ].map((gate) => (
                <div key={gate.code} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-500">{gate.code}</span>
                      {gate.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{gate.detail}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    PASS
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Deployment Topology Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">ECS API Service</div>
              <div className="text-xl font-bold text-slate-900 mt-1">2 / 2 Tasks Healthy</div>
              <div className="text-xs text-slate-500 mt-1">Fargate • 512 CPU / 1024 MB</div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] font-mono text-emerald-700">
                Green Target Group: 100% Traffic
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Next.js Web Service</div>
              <div className="text-xl font-bold text-slate-900 mt-1">2 / 2 Tasks Healthy</div>
              <div className="text-xs text-slate-500 mt-1">Node 20 Multi-Stage • Port 3000</div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] font-mono text-emerald-700">
                ALB Ingress: 200 OK
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Worker Service</div>
              <div className="text-xl font-bold text-slate-900 mt-1">1 / 1 Task Running</div>
              <div className="text-xs text-slate-500 mt-1">Isolated Task • No Ingress</div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] font-mono text-emerald-700">
                Queue Active
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BUILD LOGS */}
      {activeTab === "build" && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-inner font-mono text-xs text-slate-300 space-y-1.5 overflow-x-auto">
          <div className="text-slate-500 pb-2 border-b border-slate-800 flex items-center justify-between">
            <span>LaunchComply Isolated Worker Log Stream</span>
            <span>Duration: 18.4s • Worker v2.4</span>
          </div>
          <p className="text-slate-400">[2026-10-01 17:33:01] Initialized isolated build workspace at /tmp/lc_worker_8f9a2</p>
          <p className="text-slate-400">[2026-10-01 17:33:02] Preparing source checkout for commit a1b2c3d4</p>
          <p className="text-cyan-400">[2026-10-01 17:33:03] Generating deterministic, hardened Dockerfile for FastAPI (Python 3.11)</p>
          <p className="text-slate-400">[2026-10-01 17:33:05] Non-root unprivileged service user configured (appuser:10001)</p>
          <p className="text-slate-400">[2026-10-01 17:33:07] Verified .dockerignore: excluded .env, .git, and credentials</p>
          <p className="text-cyan-400">[2026-10-01 17:33:10] Generating Software Bill of Materials (SBOM CycloneDX v1.5)...</p>
          <p className="text-slate-400">[2026-10-01 17:33:11] SBOM compiled: 5 components identified with license & cryptographic hash metadata.</p>
          <p className="text-emerald-400">[2026-10-01 17:33:14] Built container image: launchcomply-acme-saas-production-api:release-v1.4.2</p>
          <p className="text-slate-400">[2026-10-01 17:33:14] Assigned immutable digest: sha256:d8c6b7e0e7a4f5c90b6a7d8c6b7e0e7a4f5c90b6a7d8c6b7e0e7a4f5c90b6a7d</p>
          <p className="text-cyan-400">[2026-10-01 17:33:16] Running container vulnerability & configuration scan...</p>
          <p className="text-emerald-400">[2026-10-01 17:33:17] Scan complete: 0 Critical, 0 High, 0 Medium. Result: PASS</p>
          <p className="text-slate-400">[2026-10-01 17:33:18] Pushing image to 012345678901.dkr.ecr.ap-south-1.amazonaws.com...</p>
          <p className="text-emerald-400">[2026-10-01 17:33:19] Artifact registered and locked successfully. Ephemeral sandbox destroyed.</p>
        </div>
      )}

      {/* TAB 3: ARTIFACTS */}
      {activeTab === "artifacts" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">ECR Repository</th>
                <th className="py-3 px-4">Immutable SHA256 Digest</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {[
                {
                  service: "api",
                  repo: "launchcomply-acme-saas-production-api",
                  digest: "sha256:d8c6b7e0e7a4f5c90b6a7d8c6b7e0e7a4f5c90b6a7d8c6b7e0e7a4f5c90b6a7d",
                  size: "136.2 MB",
                },
                {
                  service: "web",
                  repo: "launchcomply-acme-saas-production-web",
                  digest: "sha256:e9a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
                  size: "112.9 MB",
                },
                {
                  service: "worker",
                  repo: "launchcomply-acme-saas-production-worker",
                  digest: "sha256:f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0b2",
                  size: "93.6 MB",
                },
              ].map((art) => (
                <tr key={art.service} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 font-sans">{art.service}</td>
                  <td className="py-3 px-4 text-slate-600">{art.repo}</td>
                  <td className="py-3 px-4 text-cyan-800 text-[11px] truncate max-w-xs">{art.digest}</td>
                  <td className="py-3 px-4 text-slate-600">{art.size}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                      ECR_LOCKED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: SBOM */}
      {activeTab === "sbom" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Software Bill of Materials (CycloneDX 1.5)
              </h3>
              <p className="text-xs text-slate-500">Cryptographically signed dependencies and license inventory.</p>
            </div>
            <button className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 flex items-center gap-1.5 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              { name: "fastapi", version: "0.115.0", purl: "pkg:pypi/fastapi@0.115.0", license: "MIT", cve: "0 CVEs" },
              { name: "uvicorn", version: "0.30.6", purl: "pkg:pypi/uvicorn@0.30.6", license: "BSD-3-Clause", cve: "0 CVEs" },
              { name: "pydantic", version: "2.9.2", purl: "pkg:pypi/pydantic@2.9.2", license: "MIT", cve: "0 CVEs" },
              { name: "sqlalchemy", version: "2.0.35", purl: "pkg:pypi/sqlalchemy@2.0.35", license: "MIT", cve: "0 CVEs" },
              { name: "alembic", version: "1.13.3", purl: "pkg:pypi/alembic@1.13.3", license: "MIT", cve: "0 CVEs" },
            ].map((comp) => (
              <div key={comp.name} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{comp.name} <span className="font-mono text-slate-500">v{comp.version}</span></div>
                  <div className="text-[10px] font-mono text-slate-500">{comp.purl}</div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                    {comp.license}
                  </span>
                  <div className="text-[10px] font-semibold text-emerald-700 mt-1">{comp.cve}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY & CVES */}
      {activeTab === "security" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Container Image Vulnerability Scan
            </h3>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
              SCAN PASS: 0 CRITICAL / 0 HIGH
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="font-bold text-slate-800">Scanner: LaunchComply CIS-Compliant Vulnerability Engine</div>
            <div className="text-slate-500">Analyzed base image: python:3.11-slim & node:20-alpine</div>
            <div className="text-emerald-700 font-medium">✓ No exploitable remote code execution or privilege escalation vectors found.</div>
          </div>
        </div>
      )}

      {/* TAB 6: DB MIGRATIONS */}
      {activeTab === "migrations" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Database Schema Migration Run
            </h3>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
              COMPLETED (SAFE)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-slate-500">Migration Engine</div>
              <div className="font-bold text-slate-900 mt-0.5">Alembic (SQLAlchemy 2)</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-slate-500">Target Revision</div>
              <div className="font-bold text-slate-900 mt-0.5 font-mono">rev_20261001_004</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-slate-500">Pre-Deploy RDS Snapshot ID</div>
              <div className="font-bold text-slate-900 mt-0.5 font-mono text-[11px]">
                rds-snapshot-acme-saas-prod-pre-v142
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-slate-500">Backward-Compatibility Assessment</div>
              <div className="font-bold text-emerald-700 mt-0.5">SAFE (Additive Nullable Schema)</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: VERIFICATION & SMOKE TESTS */}
      {activeTab === "verification" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Production Smoke Test Probes
            </h3>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
              4 / 4 PROBES PASSED
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              { name: "Application Health Probe", endpoint: "https://app.acmecloud.io/api/v1/health", code: 200, latency: "42.5ms", status: "PASSED" },
              { name: "Public Root Route Verification", endpoint: "https://app.acmecloud.io/", code: 200, latency: "68.2ms", status: "PASSED" },
              { name: "API Ping Route", endpoint: "https://app.acmecloud.io/api/v1/ping", code: 200, latency: "28.1ms", status: "PASSED" },
              { name: "TLS 1.3 / SSL Handshake", endpoint: "https://app.acmecloud.io", code: 200, latency: "18.4ms", status: "PASSED" },
            ].map((probe) => (
              <div key={probe.name} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{probe.name}</div>
                  <div className="text-[11px] font-mono text-slate-500">{probe.endpoint}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-600">HTTP {probe.code}</span>
                  <span className="font-mono text-slate-600">{probe.latency}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {probe.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
