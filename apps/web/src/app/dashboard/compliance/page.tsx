"use client";

import { useState } from "react";
import { FileCheck2, Shield, Lock, Building2, Download, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";

export default function ComplianceHubPage() {
  const [activeTab, setActiveTab] = useState<"frameworks" | "subprocessors" | "inventory">("frameworks");

  const frameworks = [
    {
      code: "LAUNCHCOMPLY_BASELINE",
      name: "LaunchComply Production Readiness Baseline",
      readiness: "84%",
      passing: "42",
      total: "50",
      description: "Foundation controls across VPC isolation, TLS 1.3, continuous backups, and automated secret rotation."
    },
    {
      code: "DPDP",
      name: "India Digital Personal Data Protection (DPDP Act 2023) Readiness",
      readiness: "76%",
      passing: "38",
      total: "50",
      description: "Data principal notice workflows, purpose limitation, subprocessor DPA tracking, and erasure mechanisms."
    },
    {
      code: "ISO27001",
      name: "ISO/IEC 27001:2022 ISMS Readiness",
      readiness: "64%",
      passing: "60",
      total: "93",
      description: "Information security management system across 93 Annex A controls, risk register, and Statement of Applicability."
    },
    {
      code: "SOC2",
      name: "SOC 2 Type II Trust Services Criteria Readiness",
      readiness: "58%",
      passing: "41",
      total: "71",
      description: "Security, Confidentiality, and Availability criteria preparation for enterprise vendor security questionnaires."
    }
  ];

  const subprocessors = [
    { name: "Amazon Web Services (AWS)", purpose: "Cloud Infrastructure, Multi-AZ PostgreSQL, Compute", country: "India (ap-south-1)", dpa: "EXECUTED", risk: "LOW" },
    { name: "Twilio / SendGrid", purpose: "Transactional Email & OTP Alerts", country: "USA / EU", dpa: "EXECUTED", risk: "LOW" },
    { name: "OpenAI Inc.", purpose: "AI Data Summarization & Insights", country: "USA", dpa: "EXECUTED", risk: "MEDIUM" },
    { name: "Razorpay Software Pvt Ltd", purpose: "PCI-DSS Level 1 Payment Gateway", country: "India", dpa: "EXECUTED", risk: "LOW" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Notice Banner */}
      <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300">
          <strong className="text-white">Compliance Readiness Status Notice:</strong> LaunchComply tracks continuous
          technical readiness, automated controls, and audit evidence. Percentages reflect internal implementation
          readiness and do not constitute formal accredited external certification or legal attestation.
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FileCheck2 className="w-6 h-6 text-teal-400" />
            Compliance & Privacy Readiness Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Continuous control mapping, evidence collection, and readiness assessments for enterprise sales.
          </p>
        </div>

        {/* Tab switch */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab("frameworks")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === "frameworks" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-white"
            }`}
          >
            Frameworks
          </button>
          <button
            onClick={() => setActiveTab("subprocessors")}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === "subprocessors" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-white"
            }`}
          >
            Subprocessors ({subprocessors.length})
          </button>
        </div>
      </div>

      {activeTab === "frameworks" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {frameworks.map((f) => (
            <div key={f.code} className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-base">{f.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-cyan-400 font-mono">{f.readiness}</div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Readiness Score</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-400 rounded-full"
                    style={{ width: f.readiness }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Passing: {f.passing} controls</span>
                  <span>Total Scoped: {f.total} controls</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Owner: Security & Legal Lead</span>
                <button
                  onClick={() => alert(`Generated ${f.name} Readiness Report (PDF)`)}
                  className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Export Readiness Report
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Subprocessor Registry */
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Authorized Subprocessor Registry (DPDP & GDPR Compliant)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                All third-party vendors handling or processing customer personal data.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Provider</th>
                  <th className="py-2.5 px-4">Purpose & Processing Role</th>
                  <th className="py-2.5 px-4">Hosting Country</th>
                  <th className="py-2.5 px-4">DPA Status</th>
                  <th className="py-2.5 px-4">Risk Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {subprocessors.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-850/40">
                    <td className="py-3 px-4 font-bold text-white">{s.name}</td>
                    <td className="py-3 px-4 text-slate-400">{s.purpose}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{s.country}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        {s.dpa}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-500/30">
                        {s.risk} RISK
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
