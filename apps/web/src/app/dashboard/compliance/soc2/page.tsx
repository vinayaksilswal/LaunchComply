"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Download,
  Calendar,
  Search
} from "lucide-react";

export default function SOC2WorkspacePage() {
  const [activeTab, setActiveTab] = useState<"periods" | "tests" | "exceptions">("periods");

  const criteria = [
    { code: "Security (Common Criteria)", status: "IN_SCOPE", readiness: "92%", controls: 34, desc: "Firewalls, RBAC, KMS encryption, vulnerability management, and incident response." },
    { code: "Availability", status: "IN_SCOPE", readiness: "89%", controls: 12, desc: "Multi-AZ redundancy, cross-region replication, automated backup restore drills, and uptime monitoring." },
    { code: "Confidentiality", status: "IN_SCOPE", readiness: "94%", controls: 16, desc: "Customer data segregation, confidential document redaction, and strict employee NDAs." },
    { code: "Processing Integrity", status: "OPTIONAL", readiness: "N/A", controls: 0, desc: "Completeness and accuracy of data processing (applicable to financial transaction engines)." },
    { code: "Privacy", status: "OPTIONAL", readiness: "ALIGNED", controls: 18, desc: "Personal data notice, consent, and data principal access (covered under India DPDP workspace)." },
  ];

  const controlTests = [
    { control: "CC6.1 - Privileged MFA", method: "AUTOMATED_EVALUATION", sampleSize: 14, result: "PASS", testedAt: "Today at 03:00 UTC", observations: "All 14 active production IAM roles enforce aws:MultiFactorAuthPresent condition." },
    { control: "CC6.6 - Network Protection", method: "INSPECTION", sampleSize: 22, result: "PASS", testedAt: "Yesterday", observations: "ALB listeners enforce TLS 1.3; all non-TLS port 80 requests redirected to 443 with HSTS." },
    { control: "CC6.7 - Storage Encryption", method: "AUTOMATED_EVALUATION", sampleSize: 8, result: "PASS", testedAt: "2 days ago", observations: "RDS instance storage_encrypted=True; S3 bucket has Block Public Access & SSE-KMS." },
    { control: "A1.2 - Backup Point-in-Time", method: "OBSERVATION", sampleSize: 30, result: "PASS", testedAt: "3 days ago", observations: "Continuous WAL archiving confirmed with RPO measured at 4.1 minutes." },
    { control: "CC9.2 - Vendor Subprocessor DPA", method: "INSPECTION", sampleSize: 4, result: "PARTIAL", testedAt: "5 days ago", observations: "3 executed DPAs verified. 1 pending counter-signature (Resend Technologies - CAPA-2026-001 opened)." }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/dashboard/compliance" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Compliance Command Center
        </Link>
        <span>/</span>
        <span className="text-white font-medium">SOC 2 Type II</span>
      </div>

      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              AICPA TRUST SERVICES CRITERIA
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              90-Day Operating Window Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-cyan-400" />
            SOC 2 Type II Operating Center
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Continuous operating effectiveness evidence collection across Security, Availability, and Confidentiality.
            Type II readiness tracks recurring control execution over time.
          </p>
        </div>

        <div className="text-right">
          <div className="text-3xl font-black text-cyan-400 font-mono">68%</div>
          <div className="text-[10px] text-slate-400 font-bold uppercase">Operating Evidence Coverage</div>
        </div>
      </div>

      {/* Operating Window Gauge */}
      <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            Active Operating Period: Q3 2026 Evaluation Window
          </span>
          <span className="text-slate-400 font-mono">60 of 90 Days Elapsed (30 Days Remaining)</span>
        </div>
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full" style={{ width: "66.6%" }} />
        </div>
        <div className="grid grid-cols-4 gap-4 text-xs font-mono pt-1 text-slate-300">
          <div>Design Readiness: <strong className="text-emerald-400">92%</strong></div>
          <div>Implementation: <strong className="text-emerald-400">89%</strong></div>
          <div>Operating Evidence: <strong className="text-cyan-400">86%</strong></div>
          <div>Logged Exceptions: <strong className="text-amber-400">1 (Resolved)</strong></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("periods")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "periods" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Shield className="w-4 h-4" />
          Trust Services Criteria Scope
        </button>
        <button
          onClick={() => setActiveTab("tests")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "tests" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Recurring Control Tests ({controlTests.length})
        </button>
        <button
          onClick={() => setActiveTab("exceptions")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "exceptions" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Exceptions & Deviations Log (1)
        </button>
      </div>

      {activeTab === "periods" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {criteria.map((c, i) => (
            <div key={i} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  c.status === "IN_SCOPE"
                    ? "text-cyan-400 bg-cyan-950/60 border-cyan-800/40"
                    : "text-slate-400 bg-slate-800/60 border-slate-700"
                }`}>
                  {c.status}
                </span>
                <span className="text-sm font-bold text-white font-mono">{c.readiness}</span>
              </div>
              <h4 className="font-bold text-white text-sm">{c.code}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p>
              <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                Mapped Controls: <strong className="text-slate-200">{c.controls}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "tests" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Continuous Control Sampling & Automated Test Log
            </h3>
            <span className="text-xs text-slate-400">Evaluated against AICPA Common Criteria</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-4">Control & Criteria</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Sample Size</th>
                  <th className="py-3 px-4">Observations</th>
                  <th className="py-3 px-4">Evaluated At</th>
                  <th className="py-3 px-4 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {controlTests.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/40">
                    <td className="py-3 px-4 font-bold text-white">{t.control}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{t.method}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{t.sampleSize} items</td>
                    <td className="py-3 px-4 text-slate-400 max-w-sm">{t.observations}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{t.testedAt}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        t.result === "PASS"
                          ? "text-emerald-400 bg-emerald-950/60 border-emerald-500/30"
                          : "text-amber-400 bg-amber-950/60 border-amber-500/30"
                      }`}>
                        {t.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "exceptions" && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">Control Deviation Log (EXC-2026-001)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Auditor-visible exception logged during operating period.</p>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
              STATUS: RESOLVED
            </span>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Detected Condition</div>
                <div className="text-white mt-1">Stale subprocessor DPA terms for transactional email service (Resend Inc.).</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Impact Assessment</div>
                <div className="text-white mt-1">Medium. Zero customer personal data leaked; terms lacked statutory India DPDP clauses.</div>
              </div>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase font-bold">Remediation Action</div>
              <div className="text-white mt-1">
                Linked to Corrective Action CAPA-2026-001. Executed custom DPA with standard contractual clauses.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
