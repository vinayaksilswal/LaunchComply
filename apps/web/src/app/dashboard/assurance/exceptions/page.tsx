"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ShieldAlert,
  Calendar,
  Layers,
  FileCheck2,
} from "lucide-react";

interface ExceptionWindowItem {
  id: string;
  controlCode: string;
  title: string;
  detectedAt: string;
  resolvedAt: string | null;
  durationMinutes: number;
  impact: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  affectedPeriod: string;
  remediation: string;
  status: "OPEN" | "RESOLVED";
  linkedIncident: string | null;
}

const SAMPLE_EXCEPTIONS: ExceptionWindowItem[] = [
  {
    id: "exc-1",
    controlCode: "LC-AC-001",
    title: "Temporary public access block removal on development bucket",
    detectedAt: "2026-10-03 14:12 UTC",
    resolvedAt: "2026-10-03 14:26 UTC",
    durationMinutes: 14,
    impact: "MEDIUM",
    affectedPeriod: "2026-Q3",
    remediation: "Terraform state synchronization reconciled bucket policy and restored BlockPublicAcls.",
    status: "RESOLVED",
    linkedIncident: "INC-2026-089",
  },
  {
    id: "exc-2",
    controlCode: "LC-IA-001",
    title: "Directory sync delayed during Okta SCIM credential rotation",
    detectedAt: "2026-09-15 08:00 UTC",
    resolvedAt: "2026-09-15 08:45 UTC",
    durationMinutes: 45,
    impact: "LOW",
    affectedPeriod: "2026-Q3",
    remediation: "New SCIM bearer token generated and authenticated with provider.",
    status: "RESOLVED",
    linkedIncident: null,
  },
];

export default function ExceptionWindowsPage() {
  const [exceptions] = useState<ExceptionWindowItem[]>(SAMPLE_EXCEPTIONS);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard/assurance" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Continuous Assurance
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Control Exception Windows</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            SOC 2 & ISO Operating Exception Windows
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Audit Period Scoped
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Exact time intervals during which technical controls deviated from compliant baseline states, including causal root causes and remediations.
          </p>
        </div>
      </div>

      {/* SOC 2 Operating Assurance Info Card */}
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300">
        <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
          <ShieldAlert className="w-4 h-4 text-cyan-400" />
          Operating Effectiveness vs. Theoretical Point-in-Time Compliance
        </h3>
        <p className="leading-relaxed text-slate-400">
          In a continuous assurance model, temporary control deviations are captured as precise exception windows rather than causing global audit failures.
          Auditors can review the exact deviation interval (e.g. 14 minutes), the compensating controls in place, and the automated reconciliation proof.
        </p>
      </div>

      {/* Exceptions List */}
      <div className="space-y-4">
        {exceptions.map((exc) => (
          <div
            key={exc.id}
            className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4 hover:border-slate-700 transition"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {exc.controlCode}
                </span>
                <h3 className="font-bold text-white text-sm">{exc.title}</h3>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    exc.impact === "HIGH" || exc.impact === "CRITICAL"
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {exc.impact} IMPACT
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {exc.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs text-slate-300">
              <div>
                <span className="text-slate-500 block">Detected:</span>
                <span className="font-medium text-slate-200">{exc.detectedAt}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Resolved:</span>
                <span className="font-medium text-slate-200">{exc.resolvedAt || "Active (Unresolved)"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Window Duration:</span>
                <span className="font-medium text-cyan-400">{exc.durationMinutes} minutes</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">Remediation & Closure:</span>
              <p className="text-slate-300 bg-slate-800/40 p-3 rounded-lg border border-slate-800">
                {exc.remediation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
