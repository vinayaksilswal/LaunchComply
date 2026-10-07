"use client";

import { useState } from "react";
import {
  Target,
  Shield,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Sparkles,
  UserCheck,
  Check,
  Hash,
  ExternalLink,
  ChevronRight,
  FileCheck
} from "lucide-react";

export default function VAPTPage() {
  const [activeTab, setActiveTab] = useState<"project" | "report">("project");
  const [reportGenerated, setReportGenerated] = useState(true);
  const [reportHash, setReportHash] = useState("a8f9c1e4d3b271609e5a42fb1894cd3a76e9321f008892ca5419fe09bcde3421");
  const [isGenerating, setIsGenerating] = useState(false);

  const stages = [
    { name: "Requested", status: "COMPLETED", date: "Sep 20, 2026" },
    { name: "Scoping", status: "COMPLETED", date: "Sep 22, 2026" },
    { name: "Authorized", status: "COMPLETED", date: "Sep 25, 2026" },
    { name: "Testing", status: "COMPLETED", date: "Sep 28, 2026" },
    { name: "Findings", status: "COMPLETED", date: "Sep 30, 2026" },
    { name: "Remediation", status: "COMPLETED", date: "Oct 01, 2026" },
    { name: "Retest", status: "COMPLETED", date: "Oct 02, 2026" },
    { name: "Final Report", status: "ACTIVE", date: "Oct 03, 2026" },
    { name: "Closed", status: "PENDING", date: "Estimated Oct 06" },
  ];

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setReportHash("e718b4592ca943d01fc9e8210344ba8736a8e52098dcf319760a9fbe45d19280");
      setReportGenerated(true);
      setIsGenerating(false);
      setActiveTab("report");
    }, 1200);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Target className="w-6 h-6 text-amber-600" />
            Vulnerability Assessment & Penetration Testing (VAPT)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Combines authorized automated scanning adapters with formal human-led penetration testing workflows, verified retests, and SHA256-signed audit reports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            {isGenerating ? "Signing Report..." : "Generate Signed Audit Report"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("project")}
          className={`pb-3 transition-colors ${
            activeTab === "project"
              ? "text-cyan-700 border-b-2 border-cyan-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Active Engagement Lifecycle
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`pb-3 transition-colors ${
            activeTab === "report"
              ? "text-cyan-700 border-b-2 border-cyan-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Immutable Signed Audit Report
        </button>
      </div>

      {/* Tab 1: Project Details & Stage Tracker */}
      {activeTab === "project" && (
        <div className="space-y-6">
          {/* Active Project Card */}
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-slate-900">Annual Enterprise External & Web API VAPT</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold font-mono">
                    STAGE: FINAL REPORT
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Methodology: <strong className="text-slate-800">OWASP WSTG v4.2 + PTES + NIST SP 800-115</strong> • Lead Assessor:{" "}
                  <strong className="text-slate-800">Siddharth Rao (Offensive Security Certified Lead)</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                  Scope: app.acmecloud.io, api.acmecloud.io
                </span>
              </div>
            </div>

            {/* 9-Stage Progress Tracker */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                VAPT Lifecycle Progression
              </div>
              <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
                {stages.map((st, i) => (
                  <div
                    key={st.name}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      st.status === "COMPLETED"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : st.status === "ACTIVE"
                        ? "bg-cyan-50 border-cyan-400 text-cyan-900 shadow-sm ring-1 ring-cyan-400"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      {st.status === "COMPLETED" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : st.status === "ACTIVE" ? (
                        <Clock className="w-4 h-4 text-cyan-600 animate-pulse" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300" />
                      )}
                    </div>
                    <div className="font-bold text-[11px] truncate">{st.name}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">{st.date}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Engagement Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-slate-500 font-medium">Rules of Engagement</div>
                <div className="font-bold text-slate-800">Strict Non-Destructive Testing</div>
                <p className="text-slate-500 text-[11px]">
                  Rate limit capped at 100 RPS. Denial-of-Service and destructive schema modifications explicitly prohibited.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-slate-500 font-medium">Verified Asset Inventory</div>
                <div className="font-bold text-slate-800">3 In-Scope Targets</div>
                <p className="text-slate-500 text-[11px]">
                  All DNS and API targets verified via Route53 TXT record ownership prior to test commencement.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-slate-500 font-medium">Retest & Resolution Rate</div>
                <div className="font-bold text-emerald-700">100% Remediated (4/4 Resolved)</div>
                <p className="text-slate-500 text-[11px]">
                  All high and critical vulnerabilities retested and confirmed closed on staging before live promote.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Immutable Report Viewer */}
      {activeTab === "report" && (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-xs font-bold">
                  CRYPTOGRAPHICALLY VERIFIED
                </span>
                <span className="text-xs text-slate-500 font-mono">Report ID: VAPT-2026-ACME-FINAL</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                AcmeCloud Production Penetration Testing Final Audit Report
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Generated: October 03, 2026 10:45 UTC • Signed by Offensive Security Certified Assessment Authority
              </p>
            </div>

            <button
              onClick={() => alert("Downloading signed PDF and cryptographic JSON package...")}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-2 transition-colors self-start"
            >
              <Download className="w-4 h-4" />
              Download Audit Package (.zip)
            </button>
          </div>

          {/* Cryptographic SHA256 Checksum Card */}
          <div className="p-4 rounded-xl bg-slate-950 text-cyan-400 font-mono text-xs space-y-1">
            <div className="text-slate-400 text-[11px] uppercase font-bold flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-cyan-400" />
              SHA-256 Tamper-Evident Report Hash
            </div>
            <div className="select-all break-all text-sm font-bold text-white tracking-wide">
              {reportHash}
            </div>
            <div className="text-[11px] text-slate-400 pt-1">
              Verified by LaunchComply Trust Portal. Any modification to report JSON will immediately fail integrity validation.
            </div>
          </div>

          {/* Report Summary Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Critical Findings</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">0 Active (1 Fixed)</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-slate-500">High Findings</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">0 Active (2 Fixed)</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Risk Accepted</div>
              <div className="text-2xl font-bold text-indigo-700 mt-1">1 Mitigated</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-slate-500">Final Assessment</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">SATISFACTORY</div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200 space-y-2">
            <h4 className="font-bold text-slate-800">Executive Summary & Attestation</h4>
            <p>
              LaunchComply Offensive Security team conducted an authorized gray-box penetration test against AcmeCloud SaaS infrastructure and web application services between September 28, 2026 and October 02, 2026. All identified critical and high vulnerabilities were remediated and verified through automated retesting. The production environment meets the security baseline requirements of SOC 2 Type II and ISO 27001 Annex A.8.
            </p>
            <p className="text-[11px] text-slate-500 italic">
              Disclaimer: This report represents point-in-time security testing within pre-authorized boundaries and does not constitute formal certification by a third-party registrar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
