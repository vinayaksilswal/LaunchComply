"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Shield,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Search,
  Users,
  Eye,
  Plus,
  BookOpen
} from "lucide-react";

export default function PolicyCenterPage() {
  const [selectedPolicy, setSelectedPolicy] = useState<any | null>(null);

  const policies = [
    {
      id: "pol-01",
      title: "Information Security Policy",
      category: "SECURITY",
      version: "1.0",
      status: "PUBLISHED",
      owner: "ciso@acmecloud.io",
      effectiveDate: "2026-08-01",
      nextReview: "2027-08-01",
      ackRate: "98%",
      content: `### 1. Purpose & Objective
This policy establishes executive leadership commitment and directives for managing information security risks across all cloud and engineering operations.

### 2. Scope
Applies to all employees, contractors, third-party partners, and AWS production accounts.

### 3. Core Directives
- Mandatory multi-factor authentication (MFA) across all identity providers.
- Least privilege access enforced via role-based access control (RBAC).
- Encryption at rest (KMS AES-256) and in transit (TLS 1.3) on all sensitive data.
- 24/7 on-call escalation for high-severity cybersecurity incidents.

### 4. Review & Governance
Reviewed annually by top management during executive management review meetings. Non-compliance is subject to disciplinary action.`
    },
    {
      id: "pol-02",
      title: "Access Control & Authentication Policy",
      category: "SECURITY",
      version: "1.2",
      status: "PUBLISHED",
      owner: "ciso@acmecloud.io",
      effectiveDate: "2026-08-15",
      nextReview: "2027-08-15",
      ackRate: "95%",
      content: `### 1. Authentication Standards
- Password complexity: Minimum 14 characters with uppercase, lowercase, numbers, and symbols.
- Privileged access requires hardware FIDO2 key or TOTP multi-factor authentication.
- Quarterly access review campaigns with mandatory system owner sign-off.`
    },
    {
      id: "pol-03",
      title: "Incident Response & Breach Notification Policy",
      category: "OPERATIONS",
      version: "1.0",
      status: "PUBLISHED",
      owner: "security@acmecloud.io",
      effectiveDate: "2026-09-01",
      nextReview: "2027-09-01",
      ackRate: "92%",
      content: `### 1. Classification & Escalation
- SEV-1 (Critical): Confirmed breach or full outage. 15-minute response SLA.
- Mandatory CERT-In 6-hour reporting window for qualifying cyber incidents.
- Formal root cause postmortem published within 5 business days.`
    },
    {
      id: "pol-04",
      title: "Backup & Disaster Recovery Policy",
      category: "BUSINESS_CONTINUITY",
      version: "2.0",
      status: "PUBLISHED",
      owner: "devops@acmecloud.io",
      effectiveDate: "2026-09-10",
      nextReview: "2027-09-10",
      ackRate: "94%",
      content: `### 1. Recovery Objectives
- Target RPO <= 15 minutes via continuous WAL archiving.
- Target RTO <= 30 minutes via automated multi-region warm standby replication.
- Quarterly non-destructive restore drills required to validate recovery points.`
    },
    {
      id: "pol-05",
      title: "Privacy & Personal Data Protection Policy",
      category: "PRIVACY",
      version: "1.0",
      status: "PUBLISHED",
      owner: "privacy@acmecloud.io",
      effectiveDate: "2026-09-15",
      nextReview: "2027-09-15",
      ackRate: "91%",
      content: `### 1. DPDP Compliance
- Explicit notice provided to data principals prior to collection.
- Data principal requests (Access, Correction, Erasure) answered within 30-day SLA.
- Subprocessors must execute bilateral Data Processing Addendums.`
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
        <span className="text-white font-medium">Policy Center</span>
      </div>

      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
              GOVERNANCE SUITE
            </span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              5 Published Policies
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-purple-400" />
            Policy Management & Acknowledgements
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Version-controlled policy repository with executive approvals, annual review workflows,
            and employee acknowledgement campaign tracking.
          </p>
        </div>

        <div className="text-right">
          <div className="text-3xl font-black text-purple-400 font-mono">94%</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase">Avg Acknowledgement Rate</div>
        </div>
      </div>

      {/* Policy Catalog */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Active Organizational Policies ({policies.length})
          </h3>
          <span className="text-xs text-slate-400">All policies verified in audit pack</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Policy Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Version</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4">Next Review</th>
                <th className="py-3 px-4">Acknowledgement</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-slate-850/40">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{p.title}</div>
                    <div className="text-[11px] text-emerald-400 font-medium">Effective: {p.effectiveDate}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-cyan-400">v{p.version}</td>
                  <td className="py-3 px-4 font-mono text-slate-300">{p.owner}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{p.nextReview}</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {p.ackRate} Signed
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedPolicy(p)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-cyan-400 font-semibold flex items-center gap-1 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5" /> Read
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Reader Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  VERSION {selectedPolicy.version} • PUBLISHED
                </span>
                <h3 className="font-bold text-white text-lg mt-1">{selectedPolicy.title}</h3>
                <p className="text-xs text-slate-400">Owner: {selectedPolicy.owner}</p>
              </div>
              <button
                onClick={() => setSelectedPolicy(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
              {selectedPolicy.content}
            </div>

            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Formally approved by CISO
              </span>
              <button
                onClick={() => setSelectedPolicy(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-semibold"
              >
                Close Reader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
