"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Clock,
  ArrowLeft,
  Users,
  Search,
  ExternalLink,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

export default function InternalAuditAndCAPAPage() {
  const [activeTab, setActiveTab] = useState<"capa" | "audits" | "review">("capa");

  const capas = [
    {
      id: "CAPA-2026-001",
      title: "Stale Subprocessor DPA Remediation for Resend Inc.",
      source: "AUDIT (IA-2026-Q3)",
      owner: "legal@acmecloud.io",
      dueDate: "In 14 days",
      status: "IN_PROGRESS",
      rootCause: "Informal vendor onboarding for MVP transactional notifications without triggering mandatory legal intake workflow.",
      actionPlan: "Procure custom bilateral DPA containing statutory India DPDP and EU SCC clauses; obtain executive signature.",
    },
    {
      id: "CAPA-2026-002",
      title: "Automate Monthly Vulnerability Retesting Pipeline",
      source: "VAPT FINDING",
      owner: "devops@acmecloud.io",
      dueDate: "Completed",
      status: "EFFECTIVE",
      rootCause: "Lack of automated webhook callback between GitHub PR merge and dynamic scanner queue.",
      actionPlan: "Deploy LaunchComply continuous security webhook to auto-queue retests on pull request merge.",
      verifiedBy: "ciso@acmecloud.io",
      effectivenessReview: "100% of subsequent PRs in Sprint 47 triggered automated retest verification with zero regressions."
    }
  ];

  const audits = [
    {
      code: "IA-2026-Q3",
      title: "Annual ISO 27001 & SOC 2 Comprehensive Internal Management Systems Audit",
      leadAuditor: "Priya Nair (Lead ISO 27001 Auditor)",
      period: "Sep 2026",
      status: "FINAL",
      findingsCount: 1,
      summary: "ISMS is functioning effectively. Technical controls for encryption and multi-region resilience met all criteria. 1 Minor Non-Conformity recorded for subprocessor DPA tracking.",
      reportHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/dashboard/compliance" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Compliance Command Center
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Internal Audits & CAPA</span>
      </div>

      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-teal-400 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
              CLAUSE 9.2 & 10.1 ALIGNED
            </span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              Root Cause & Effectiveness Review
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-teal-400" />
            Internal Audit & Centralized CAPA
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Track annual internal audit engagements, formal corrective actions (CAPA) with root cause analyses,
            and executive management review meetings.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("capa")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "capa" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Corrective Actions (CAPA) ({capas.length})
        </button>
        <button
          onClick={() => setActiveTab("audits")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "audits" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          Internal Audits ({audits.length})
        </button>
        <button
          onClick={() => setActiveTab("review")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "review" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          Management Review (Clause 9.3)
        </button>
      </div>

      {activeTab === "capa" && (
        <div className="space-y-4">
          {capas.map((capa) => (
            <div key={capa.id} className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-cyan-400">{capa.id}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      SOURCE: {capa.source}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base mt-1">{capa.title}</h3>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded border ${
                  capa.status === "EFFECTIVE"
                    ? "text-emerald-400 bg-emerald-950/60 border-emerald-500/30"
                    : "text-amber-400 bg-amber-950/60 border-amber-500/30"
                }`}>
                  {capa.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Root Cause Analysis (5-Whys)</div>
                  <div className="text-slate-300 mt-1 leading-relaxed">{capa.rootCause}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Action Plan & Resolution</div>
                  <div className="text-slate-300 mt-1 leading-relaxed">{capa.actionPlan}</div>
                </div>
              </div>

              {capa.effectivenessReview && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg text-xs text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Formal Effectiveness Review (Verified by {capa.verifiedBy})
                  </div>
                  <div className="text-slate-300">{capa.effectivenessReview}</div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
                <span>Owner: <strong className="text-slate-200 font-mono">{capa.owner}</strong></span>
                <span>Due Date: <strong className="text-slate-200 font-mono">{capa.dueDate}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "audits" && (
        <div className="space-y-4">
          {audits.map((a) => (
            <div key={a.code} className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-cyan-400">{a.code}</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      STATUS: {a.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-base mt-1">{a.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Lead Auditor: {a.leadAuditor}</p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold text-amber-400 font-mono">{a.findingsCount} Minor Finding</div>
                  <div className="text-[10px] text-slate-400">Assigned to CAPA</div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-800">
                {a.summary}
              </p>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
                <span className="font-mono text-[11px]">Report SHA256: {a.reportHash.slice(0, 24)}...</span>
                <span className="text-cyan-400 font-semibold cursor-pointer hover:underline">
                  View Full Audit Report PDF
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "review" && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">Executive Management Review (ISMS Clause 9.3)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Approved minutes from executive review meeting.</p>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
              STATUS: APPROVED
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-3 font-mono leading-relaxed">
            <div><strong>Presiding Chairperson:</strong> Alex Mercer (CTO & Acting CISO)</div>
            <div><strong>Attendees:</strong> Vikram Patel (Engineering), Priya Nair (Compliance), Siddharth Rao (Security)</div>
            <div><strong>Audit Conclusions & Continual Improvement Actions:</strong></div>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Information Security Management System (ISMS) operates suitably, adequately, and effectively.</li>
              <li>Reviewed IA-2026-Q3 findings and ratified CAPA-2026-001 actions for third-party agreements.</li>
              <li>Approved cloud infrastructure budget for automated cross-region replication drills in ap-southeast-1.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
