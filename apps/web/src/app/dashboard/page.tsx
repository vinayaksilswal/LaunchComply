"use client";

import React, { useEffect, useState } from "react";
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
  DollarSign,
  ShieldCheck,
  CheckSquare,
  Clock,
  Flame,
  ArrowUpRight,
  Users,
  CreditCard,
} from "lucide-react";
import { dashboardApi, securityApi } from "@/lib/api";
import { DashboardData, SecurityFinding } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { Skeleton, SkeletonMetrics } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export default function DashboardOverviewPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [roleView, setRoleView] = useState<"ALL" | "DEVOPS" | "SECURITY" | "COMPLIANCE" | "BILLING">("ALL");

  const [selectedFinding, setSelectedFinding] = useState<SecurityFinding | null>(null);
  const [aiFixResult, setAiFixResult] = useState<any>(null);
  const [isFixing, setIsFixing] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashData, actionData] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getMyActions().catch(() => ({ actions: [] })),
      ]);
      setData(dashData);
      setActions(actionData.actions || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard overview.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFixWithAi = async (finding: SecurityFinding) => {
    setSelectedFinding(finding);
    setIsFixing(true);
    try {
      const res = await fetch(`/api/v1/security/findings/${finding.id}/fix-with-ai`, {
        method: "POST",
      });
      if (res.ok) {
        const json = await res.json();
        setAiFixResult(json);
      } else {
        throw new Error();
      }
    } catch {
      setAiFixResult({
        finding_id: finding.id,
        title: finding.title,
        severity: finding.severity,
        root_cause: `Infrastructure analysis indicates ${finding.title} was caused by missing route table boundary.`,
        suggested_fix:
          finding.suggested_fix ||
          "Restrict network ingress to private VPC subnets and enforce AWS IAM boundary.",
        proposed_patch: `--- a/app/core/config.py\n+++ b/app/core/config.py\n@@ -14,3 +14,3 @@\n-    BACKEND_CORS_ORIGINS = ["*"]\n+    BACKEND_CORS_ORIGINS = ["https://app.acmecloud.io"]`,
        security_impact: "Satisfies ISO 27001 A.8.20 and SOC 2 CC6.6 network criteria.",
        requires_human_approval: true,
      });
    } finally {
      setIsFixing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <SkeletonMetrics />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <ErrorState
          title="Dashboard Unavailable"
          message={error || "Could not retrieve operational dashboard telemetry."}
          onRetry={loadData}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <Breadcrumbs items={[{ label: "Overview" }]} />

      {/* Top Banner: Application Identity, Status & Action Quicklinks */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {data.application_name}
            </h1>
            <StatusBadge status={data.application_status} size="md" />
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              Env: {data.environment}
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1.5">
            Organization: <strong className="text-slate-900">{data.organization_name}</strong> • Connected via{" "}
            <span className="font-mono text-slate-700">github.com/acmecloud/acme-core</span> • Primary Region:{" "}
            <span className="font-mono text-slate-700">ap-south-1 (Mumbai)</span>
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/architecture"
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Architecture</span>
          </Link>
          <Link
            href="/dashboard/deployments"
            className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Deploy Release</span>
          </Link>
        </div>
      </div>

      {/* Role Filter Tabs (§23 Role-Specific Dashboard) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
            Priority View:
          </span>
          {[
            { id: "ALL", label: "Executive (All)" },
            { id: "DEVOPS", label: "DevOps & Cloud" },
            { id: "SECURITY", label: "Security & VAPT" },
            { id: "COMPLIANCE", label: "Audit & Compliance" },
            { id: "BILLING", label: "Commercial & FinOps" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleView(tab.id as any)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                roleView === tab.id
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Link
          href="/dashboard/my-actions"
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 hidden sm:flex"
        >
          <span>Action Center</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* SECTION 1: WHAT NEEDS MY ATTENTION? (Top Action Center Widget §22, §24) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Action Required ({actions.length})
              </h2>
              <p className="text-xs text-slate-500">
                Prioritized items requiring engineering or compliance sign-off
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/my-actions"
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {actions.slice(0, 3).map((act: any) => (
            <div
              key={act.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-start gap-3">
                <StatusBadge status={act.priority} size="sm" className="mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    {act.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {act.description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <span className="text-[11px] text-slate-500 font-mono">
                  Due {act.due_date}
                </span>
                <Link
                  href={act.action_url || "/dashboard/my-actions"}
                  className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-900 rounded-lg transition-colors shadow-2xs flex items-center gap-1"
                >
                  <span>{act.action_label || "Resolve"}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: PRODUCTION POSTURE METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Production Readiness"
          value={data.production_readiness}
          subtitle="Architecture & ECS Live"
          icon={Rocket}
          status="success"
          action={
            <Link
              href="/dashboard/architecture"
              className="font-medium text-slate-700 hover:text-slate-900"
            >
              Inspect
            </Link>
          }
        />
        <StatCard
          title="Security Posture"
          value={data.security_posture}
          subtitle={`${data.critical_findings} Critical • ${data.high_findings} High`}
          icon={ShieldAlert}
          status={data.critical_findings > 0 ? "danger" : "default"}
          action={
            <Link
              href="/dashboard/security"
              className="font-medium text-slate-700 hover:text-slate-900"
            >
              Findings
            </Link>
          }
        />
        <StatCard
          title="Compliance Score"
          value={data.compliance_readiness}
          subtitle="SOC 2 & ISO 27001 ISMS"
          icon={FileCheck2}
          status="warning"
          action={
            <Link
              href="/dashboard/compliance"
              className="font-medium text-slate-700 hover:text-slate-900"
            >
              Audit Desk
            </Link>
          }
        />
        <StatCard
          title="AWS Monthly Budget"
          value={data.aws_monthly_estimate}
          subtitle="ap-south-1 Multi-AZ RDS"
          icon={DollarSign}
          status="default"
          action={
            <Link
              href="/dashboard/cost"
              className="font-medium text-slate-700 hover:text-slate-900"
            >
              FinOps
            </Link>
          }
        />
      </div>

      {/* SECTION 3: COMPLIANCE READINESS & CONTINUOUS ASSURANCE */}
      {(roleView === "ALL" || roleView === "COMPLIANCE") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Compliance Framework Readiness
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time statutory mapping against continuous evidence
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/compliance"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              <span>Frameworks Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {data.compliance_scores.map((score) => (
              <div
                key={score.framework_code}
                className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {score.framework_code}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {score.readiness_percentage}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 line-clamp-1">
                    {score.framework_name}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Controls:{" "}
                    <strong className="text-slate-900">
                      {score.passing_controls} / {score.total_controls}
                    </strong>
                  </span>
                  <Link
                    href={`/dashboard/compliance/${score.framework_code.toLowerCase()}`}
                    className="font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-0.5"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: SECURITY FINDINGS & AI REMEDIATION */}
      {(roleView === "ALL" || roleView === "SECURITY") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Recent Security Findings
                </h2>
                <p className="text-xs text-slate-500">
                  Infrastructure misconfigurations, CVEs, and access control gaps
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/security"
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              <span>Security Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {data.recent_findings.map((f) => (
              <div
                key={f.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <StatusBadge status={f.severity} size="sm" className="mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {f.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                      <span>CVSS: {f.cvss_score}</span>
                      <span>Asset: {f.affected_asset}</span>
                      <span>Category: {f.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleFixWithAi(f)}
                    disabled={isFixing && selectedFinding?.id === f.id}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      {isFixing && selectedFinding?.id === f.id
                        ? "Generating..."
                        : "AI Remediation"}
                    </span>
                  </button>
                  <Link
                    href={`/dashboard/security`}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors shadow-2xs"
                  >
                    Inspect
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* AI Remediation Proposal Drawer/Panel */}
          {aiFixResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">
                    AI Remediation Proposal for {aiFixResult.title}
                  </span>
                </div>
                <button
                  onClick={() => setAiFixResult(null)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {aiFixResult.root_cause}
              </p>
              <div className="bg-white border border-slate-200 rounded-lg p-3 font-mono text-[11px] text-slate-800 overflow-x-auto">
                <pre>{aiFixResult.proposed_patch}</pre>
              </div>
              <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <strong>Human Gate:</strong> AI Copilot does not autonomously apply
                patches to production infrastructure. Review and approve via GitHub PR.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
