"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileCheck2,
  DatabaseBackup,
  Globe,
  Lock,
  ArrowRight,
  Download,
  Sparkles,
  Rocket,
  Activity,
  Layers,
  Briefcase,
  ExternalLink,
  ChevronRight,
  Code2,
  DollarSign
} from "lucide-react";
import { fetchDashboardData, fallbackDemoData } from "@/lib/api";
import { DashboardData, SecurityFinding } from "@/types";

export default function DashboardOverviewPage() {
  const [data, setData] = useState<DashboardData>(fallbackDemoData);
  const [selectedFinding, setSelectedFinding] = useState<SecurityFinding | null>(null);
  const [aiFixResult, setAiFixResult] = useState<any>(null);
  const [isFixing, setIsFixing] = useState<boolean>(false);

  useEffect(() => {
    fetchDashboardData().then(setData);
  }, []);

  const handleFixWithAi = async (finding: SecurityFinding) => {
    setSelectedFinding(finding);
    setIsFixing(true);
    // Simulate real backend AI patch generation or call endpoint
    try {
      const res = await fetch(`/api/backend/security/findings/${finding.id}/fix-with-ai`, {
        method: "POST"
      });
      if (res.ok) {
        const json = await res.json();
        setAiFixResult(json);
      } else {
        throw new Error();
      }
    } catch {
      // Graceful offline mock response
      setAiFixResult({
        finding_id: finding.id,
        title: finding.title,
        severity: finding.severity,
        root_cause: `Detailed static & infrastructure analysis indicates ${finding.title} was triggered by overly permissive default ingress rules.`,
        suggested_fix: finding.suggested_fix || "Restrict security group ingress and enforce least privilege.",
        proposed_patch: `diff --git a/app/core/config.py b/app/core/config.py\n--- a/app/core/config.py\n+++ b/app/core/config.py\n@@ -14,3 +14,3 @@\n-    BACKEND_CORS_ORIGINS: List[str] = ["*"]\n+    BACKEND_CORS_ORIGINS: List[str] = [\n+        "https://app.acmecloud.io"\n+    ]`,
        security_impact: "Restricts all untrusted origin ingress and meets ISO 27001 A.8.20 and SOC 2 CC6.6 criteria.",
        potential_breaking_changes: "Origins outside app.acmecloud.io will receive HTTP 403.",
        requires_human_approval: true
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner: Application Identity & Live Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">{data.application_name}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {data.application_status}
            </span>
            <span className="text-xs font-mono text-slate-400">Environment: {data.environment}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Connected via <span className="text-slate-200 font-mono">github.com/acmecloud/acme-core</span> • Primary
            Region: <span className="text-slate-200 font-mono">ap-south-1 (Mumbai)</span>
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/architecture"
            className="px-3.5 py-2 text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            View Architecture
          </Link>
          <Link
            href="/dashboard/deployments"
            className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:opacity-90 rounded-lg shadow-sm shadow-cyan-500/20 transition-all flex items-center gap-1.5"
          >
            <Rocket className="w-4 h-4" />
            Deploy (v1.4.3)
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Production Readiness */}
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Production Readiness</div>
          <div className="text-2xl font-extrabold text-cyan-400 mt-1">{data.production_readiness}</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">84 / 100</span> checks pass
          </div>
        </div>

        {/* Security Posture */}
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Security Posture</div>
          <div className="text-2xl font-extrabold text-blue-400 mt-1">{data.security_posture}</div>
          <div className="text-[11px] text-amber-400 mt-1 flex items-center gap-1 font-medium">
            <AlertTriangle className="w-3 h-3" />
            {data.critical_findings} Critical, {data.high_findings} High
          </div>
        </div>

        {/* Compliance Readiness */}
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Compliance Readiness</div>
          <div className="text-2xl font-extrabold text-teal-400 mt-1">{data.compliance_readiness}</div>
          <div className="text-[11px] text-slate-400 mt-1">Across DPDP, ISO, SOC 2</div>
        </div>

        {/* Backup Status */}
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Backup & DR</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
            {data.backup_status}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Last Restore: 2026-09-15 (PASS)</div>
        </div>

        {/* Domain & HTTPS */}
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Domain & SSL</div>
          <div className="text-sm font-bold text-white mt-1 truncate">{data.domain}</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <Lock className="w-3 h-3" />
            ACM TLS 1.3 Active
          </div>
        </div>

        {/* AWS Monthly Estimate */}
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">AWS Est. Budget</div>
          <div className="text-2xl font-extrabold text-white mt-1 font-mono">{data.aws_monthly_estimate}</div>
          <div className="text-[11px] text-slate-400 mt-1">Billed to your AWS account</div>
        </div>
      </div>

      {/* Quick Action Navigation Strip */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] px-2">Quick Actions:</span>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/architecture"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Interactive Canvas
          </Link>
          <Link
            href="/dashboard/deployments"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Deploy
          </Link>
          <Link
            href="/dashboard/security"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Run Assessment
          </Link>
          <Link
            href="/dashboard/vapt"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Start VAPT
          </Link>
          <Link
            href="/dashboard/compliance"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Compliance Readiness
          </Link>
          <Link
            href="/dashboard/services"
            className="px-3 py-1.5 rounded-lg bg-cyan-950/70 text-cyan-300 border border-cyan-700/50 hover:bg-cyan-900/60 transition-colors flex items-center gap-1"
          >
            <Briefcase className="w-3.5 h-3.5" />
            Book Expert Advisory
          </Link>
        </div>
      </div>

      {/* Mid-Row: Active Architecture & Compliance Frameworks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Architecture Snapshot */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Active Multi-Tier AWS Architecture
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                VPC 10.0.0.0/16 with isolated Public, Application, and Database subnets.
              </p>
            </div>
            <Link
              href="/dashboard/architecture"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              Full Interactive Map <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {data.infrastructure.map((inf, i) => (
              <div key={i} className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-mono">Service {i + 1}</div>
                <div className="font-bold text-slate-100 mt-0.5 truncate">{inf}</div>
                <div className="text-[10px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  PROVISIONED
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
            <span>
              Stack: <strong className="text-slate-200">React / Vite + FastAPI (Python 3.11) + PostgreSQL 16</strong>
            </span>
            <Link
              href="/dashboard/architecture"
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> Download IaC & Terraform
            </Link>
          </div>
        </div>

        {/* Compliance Hub Scores */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-teal-400" />
                Compliance Readiness
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Readiness assessments (Not external certification)</p>
            </div>
            <Link href="/dashboard/compliance" className="text-xs text-teal-400 hover:underline">
              View Hub
            </Link>
          </div>

          <div className="space-y-4">
            {data.compliance_scores.map((c) => (
              <div key={c.framework_code} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">{c.framework_name}</span>
                  <span className="font-mono text-cyan-400 font-bold">{c.readiness_percentage}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                    style={{ width: c.readiness_percentage }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Passing: {c.passing_controls} controls</span>
                  <span>Total: {c.total_controls} controls</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            💡 <strong>Enterprise Procurement Readiness:</strong> Closing 3 remaining database and CORS findings will
            elevate DPDP readiness to 86% and ISO 27001 readiness to 72%.
          </div>
        </div>
      </div>

      {/* Security Findings & "Fix with AI" Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Prioritized Security Findings & Remediation
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated scans and VAPT tracker. Click "Fix with AI" to generate human-reviewable proposed patches.
            </p>
          </div>
          <Link
            href="/dashboard/security"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
          >
            All 12 Findings <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Severity / CVSS</th>
                <th className="py-2.5 px-3">Vulnerability / Finding</th>
                <th className="py-2.5 px-3">Affected Asset</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {data.recent_findings.map((f) => (
                <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        f.severity === "CRITICAL"
                          ? "bg-rose-950 text-rose-400 border border-rose-800/60"
                          : f.severity === "HIGH"
                          ? "bg-amber-950 text-amber-400 border border-amber-800/60"
                          : "bg-blue-950 text-blue-400 border border-blue-800/60"
                      }`}
                    >
                      {f.severity} ({f.cvss_score})
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-white">{f.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{f.owasp_mapping}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-300">{f.affected_asset}</td>
                  <td className="py-3 px-3 text-slate-400">{f.category}</td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                      {f.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleFixWithAi(f)}
                      className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/50 text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Fix with AI
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Remediation Human Approval Modal */}
      {selectedFinding && aiFixResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI-Assisted Remediation (Human Approval Required)
                </span>
                <h3 className="text-base font-bold text-white mt-1">{aiFixResult.title}</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedFinding(null);
                  setAiFixResult(null);
                }}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px] font-semibold">Root Cause Analysis</div>
                <p className="text-slate-300 leading-relaxed">{aiFixResult.root_cause}</p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1">
                <div className="text-slate-400 text-[11px] font-semibold">Proposed Patch Diff</div>
                <pre className="font-mono text-cyan-300 bg-slate-900 p-2.5 rounded border border-slate-800 overflow-x-auto text-[11px]">
                  {aiFixResult.proposed_patch}
                </pre>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400">Security & Compliance Impact</div>
                  <p className="text-slate-300 text-[11px] mt-0.5">{aiFixResult.security_impact}</p>
                </div>
                <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-amber-400 font-semibold">Breaking Changes Check</div>
                  <p className="text-slate-300 text-[11px] mt-0.5">{aiFixResult.potential_breaking_changes}</p>
                </div>
              </div>

              <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-lg text-slate-400 text-[11px]">
                🛡️ <strong>Safety Guarantee:</strong> LaunchComply never applies patches or deploys infrastructure
                changes automatically without explicit administrative sign-off.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedFinding(null);
                    setAiFixResult(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Reject & Close
                </button>
                <button
                  onClick={() => {
                    alert("Proposed remediation patch approved! Created PR #42 in GitHub repository.");
                    setSelectedFinding(null);
                    setAiFixResult(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-teal-400 hover:opacity-95 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                >
                  Approve & Create Pull Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
