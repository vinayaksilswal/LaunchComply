"use client";

import { useState } from "react";
import { Target, Shield, CheckCircle2, Clock, AlertTriangle, FileText, Download, Sparkles, UserCheck } from "lucide-react";

export default function VAPTPage() {
  const [activeTab, setActiveTab] = useState<"projects" | "findings">("projects");

  const stages = [
    { name: "Requested", status: "COMPLETED" },
    { name: "Scoping", status: "COMPLETED" },
    { name: "Authorized", status: "COMPLETED" },
    { name: "Testing", status: "ACTIVE" },
    { name: "Findings", status: "PENDING" },
    { name: "Remediation", status: "PENDING" },
    { name: "Retest", status: "PENDING" },
    { name: "Final Report", status: "PENDING" },
    { name: "Closed", status: "PENDING" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Target className="w-6 h-6 text-amber-400" />
            Vulnerability Assessment & Penetration Testing (VAPT)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Combines automated scanning adapters with formal human-led penetration testing workflows and retesting proof.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert("Scope authorization certified. VAPT window active.")}
            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5"
          >
            <Shield className="w-4 h-4" />
            Request Retest
          </button>
        </div>
      </div>

      {/* Active Project Card */}
      <div className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">Annual Enterprise External & Web API VAPT</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-bold font-mono">
                STAGE: TESTING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Methodology: <strong className="text-slate-200">OWASP WSTG v4.2 + PTES</strong> • Lead Auditor:{" "}
              <strong className="text-slate-200">Siddharth Rao (OSCP, CRTP)</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert("Draft VAPT Interim Report generated (PDF).")}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Interim Report
            </button>
          </div>
        </div>

        {/* 9-Stage VAPT Lifecycle Tracker */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Engagement Lifecycle (Strict Authorization & Testing Window)
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
            {stages.map((stage, i) => (
              <div
                key={stage.name}
                className={`p-2.5 rounded-lg text-center border ${
                  stage.status === "COMPLETED"
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : stage.status === "ACTIVE"
                    ? "bg-amber-950/60 border-amber-500 text-amber-300 ring-2 ring-amber-500/20"
                    : "bg-slate-950/40 border-slate-800 text-slate-500"
                }`}
              >
                <div className="text-[10px] font-mono text-slate-400">Step {i + 1}</div>
                <div className="text-xs font-bold mt-0.5 truncate">{stage.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scope Specifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400">Authorized Target Domains</div>
            <div className="font-mono text-slate-200 mt-1">app.acmecloud.io, api.acmecloud.io</div>
          </div>
          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400">IP Addresses & VPC Boundary</div>
            <div className="font-mono text-slate-200 mt-1">13.232.0.0/16 (ALB Ingress)</div>
          </div>
          <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
            <div className="text-[11px] text-slate-400">Testing Window</div>
            <div className="font-mono text-cyan-400 mt-1">2026-09-25 to 2026-10-05</div>
          </div>
        </div>
      </div>
    </div>
  );
}
