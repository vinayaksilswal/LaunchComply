"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  History,
  FileCheck2,
} from "lucide-react";

interface ControlItem {
  code: string;
  title: string;
  category: string;
  status: "PASS" | "PARTIAL" | "FAIL" | "STALE";
  reason: string;
  evidenceUsed: string[];
  evidenceMissing: string[];
  lastEvaluated: string;
  recurrenceCount: number;
}

const INITIAL_CONTROLS: ControlItem[] = [
  {
    code: "LC-CR-001",
    title: "Cryptographic Protection & Encryption at Rest",
    category: "CRYPTOGRAPHY",
    status: "PASS",
    reason: "AWS RDS storage encryption verified with KMS Customer Managed Key arn:aws:kms:ap-south-1:123456789012:key/cmk-rds-prod.",
    evidenceUsed: ["EVD-AWS-RDS-20261003", "KMS-KEY-STATUS-OK"],
    evidenceMissing: [],
    lastEvaluated: "12 mins ago",
    recurrenceCount: 90,
  },
  {
    code: "LC-AC-001",
    title: "S3 Public Access Block & Object Encryption",
    category: "ACCESS_CONTROL",
    status: "PASS",
    reason: "Account-level and bucket-level public access block enforced across 8 production S3 buckets.",
    evidenceUsed: ["EVD-AWS-S3-009"],
    evidenceMissing: [],
    lastEvaluated: "34 mins ago",
    recurrenceCount: 88,
  },
  {
    code: "LC-BC-001",
    title: "Automated Daily Database Backups & Point-in-Time Recovery",
    category: "BACKUP_RESILIENCE",
    status: "PASS",
    reason: "Continuous automated snapshot retention policy confirmed >= 7 days with multi-AZ replication.",
    evidenceUsed: ["EVD-BACKUP-RUN-4412"],
    evidenceMissing: [],
    lastEvaluated: "1 hour ago",
    recurrenceCount: 90,
  },
  {
    code: "LC-IA-001",
    title: "Workforce MFA Enforcement & SSO Directory Sync",
    category: "IDENTITY",
    status: "PARTIAL",
    reason: "Okta SCIM synchronized 42 accounts; 2 contractor accounts pending hardware FIDO2 key activation.",
    evidenceUsed: ["SCIM-SYNC-RUN-881"],
    evidenceMissing: ["FIDO2_TOKEN_REGISTRATION_REPORT"],
    lastEvaluated: "2 hours ago",
    recurrenceCount: 45,
  },
  {
    code: "LC-CH-001",
    title: "Production Branch Protection & Required Pull Request Approvals",
    category: "CHANGE_MANAGEMENT",
    status: "PASS",
    reason: "GitHub branch protection enforces 2 peer reviews, linear history, and required status checks on master.",
    evidenceUsed: ["GITHUB-BRANCH-RULE-EVD"],
    evidenceMissing: [],
    lastEvaluated: "4 hours ago",
    recurrenceCount: 114,
  },
  {
    code: "LC-DR-001",
    title: "Disaster Recovery Quarterly Restore Drill Verification",
    category: "DISASTER_RECOVERY",
    status: "PASS",
    reason: "Secondary region warm standby restore verified with observed RTO of 42 seconds (Target: 30 mins).",
    evidenceUsed: ["DR-DRILL-REPORT-Q3"],
    evidenceMissing: [],
    lastEvaluated: "Yesterday",
    recurrenceCount: 4,
  },
  {
    code: "LC-VM-001",
    title: "Security Finding Vulnerability Remediation SLA",
    category: "VULNERABILITY_MANAGEMENT",
    status: "PASS",
    reason: "Zero overdue Critical or High security findings. Mean time to remediate: 4.2 days.",
    evidenceUsed: ["EVD-SECURITY-SLA-SUMMARY"],
    evidenceMissing: [],
    lastEvaluated: "Yesterday",
    recurrenceCount: 90,
  },
];

export default function ContinuousControlsPage() {
  const [controls, setControls] = useState<ControlItem[]>(INITIAL_CONTROLS);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedControl, setSelectedControl] = useState<ControlItem | null>(null);

  const filteredControls = controls.filter((c) => {
    const matchSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard/assurance" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Continuous Assurance
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Continuous Controls Monitor</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Continuous Control Verification Monitor
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              118 Controls Monitored
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Every technical canonical control evaluated in real time against automated infrastructure observations.
          </p>
        </div>

        <Link
          href="/dashboard/assurance/bots"
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition text-slate-200"
        >
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          View Audit Bots
        </Link>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, title, or evidence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["ALL", "PASS", "PARTIAL", "FAIL", "STALE"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                statusFilter === st
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Controls List & Detail Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Controls Table */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
          {filteredControls.map((ctrl) => (
            <div
              key={ctrl.code}
              onClick={() => setSelectedControl(ctrl)}
              className={`p-5 flex items-start justify-between gap-4 hover:bg-slate-800/40 cursor-pointer transition ${
                selectedControl?.code === ctrl.code ? "bg-slate-800/60 border-l-4 border-l-cyan-500" : ""
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                    {ctrl.code}
                  </span>
                  <span className="text-sm font-semibold text-white truncate">{ctrl.title}</span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2">{ctrl.reason}</p>

                <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                  <span>Category: {ctrl.category}</span>
                  <span>Recurrence: {ctrl.recurrenceCount} observations</span>
                  <span>Evaluated {ctrl.lastEvaluated}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    ctrl.status === "PASS"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : ctrl.status === "PARTIAL"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {ctrl.status}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </div>
            </div>
          ))}
        </div>

        {/* Causal Explanation Drawer */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6 sticky top-6">
          {selectedControl ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {selectedControl.code}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      selectedControl.status === "PASS"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {selectedControl.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-2">{selectedControl.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedControl.category}</p>
              </div>

              <div className="space-y-3 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Causal Verification Reason</h4>
                <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs text-slate-300 leading-relaxed">
                  {selectedControl.reason}
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-800 pt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Evidence Used</h4>
                <div className="space-y-1.5">
                  {selectedControl.evidenceUsed.map((ev, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-slate-800/50 rounded text-xs font-mono text-cyan-300">
                      <span>{ev}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  ))}
                </div>
              </div>

              {selectedControl.evidenceMissing.length > 0 && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Missing Evidence</h4>
                  <div className="space-y-1.5">
                    {selectedControl.evidenceMissing.map((ev, i) => (
                      <div key={i} className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-300">
                        {ev}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-400">
                <span>SOC 2 Operating Evidence:</span>
                <span className="font-semibold text-white">{selectedControl.recurrenceCount} occurrences</span>
              </div>

              <Link
                href="/dashboard/copilot"
                className="w-full block text-center py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow transition"
              >
                Ask Copilot About This Control
              </Link>
            </>
          ) : (
            <div className="text-center py-12 text-slate-500 space-y-3">
              <FileCheck2 className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs">Select any monitored control to inspect causal explanations, evidence links, and recurrence history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
