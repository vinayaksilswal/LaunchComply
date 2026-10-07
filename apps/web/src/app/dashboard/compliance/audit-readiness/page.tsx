"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Download,
  FileCheck2,
  Clock,
  Sparkles,
  ShieldAlert
} from "lucide-react";

export default function AuditReadinessPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [packages, setPackages] = useState([
    {
      id: "pkg-01",
      number: "PKG-2026-SOC2-Q3",
      title: "Q3 2026 SOC 2 & ISO 27001 Auditor Assurance Pack",
      period: "2026-07-01 to 2026-09-30",
      generatedAt: "Today at 04:30 UTC",
      manifestHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      itemsCount: 7,
      redaction: "AUDITOR_SAFE_ZERO_KNOWLEDGE",
      status: "READY"
    }
  ]);

  const blockers = [
    { title: "Bilateral DPA Counter-Signature", category: "SUPPLIERS", impact: "CAPA-2026-001 active; vendor agreement pending final counter-signature.", severity: "MEDIUM", status: "IN_PROGRESS" },
    { title: "Annual Security Awareness Training", category: "HR / GOVERNANCE", impact: "Training completion rate is 92% (target >= 95%). 4 employees pending completion.", severity: "LOW", status: "ACTION_REQUIRED" }
  ];

  const handleGeneratePackage = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const now = new Date();
      const newPkg = {
        id: `pkg-${Date.now()}`,
        number: `PKG-${now.getFullYear()}09-ALL-002`,
        title: "Ad-hoc ISO 27001 & DPDP Audit Evidence Package",
        period: "Last 90 Days",
        generatedAt: "Just now",
        manifestHash: "a7b3e9f42c10b88d3e21894a7f8e912b3c4d5e6a1b2c3d4e5f67890123456789",
        itemsCount: 8,
        redaction: "AUDITOR_SAFE_ZERO_KNOWLEDGE",
        status: "READY"
      };
      setPackages([newPkg, ...packages]);
      setIsGenerating(false);
    }, 1200);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/dashboard/compliance" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Compliance Command Center
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Audit Readiness & Evidence Packages</span>
      </div>

      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
              AUDIT READINESS CENTER
            </span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              Zero-Knowledge Redaction
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Lock className="w-6 h-6 text-rose-400" />
            Audit Readiness & Package Generator
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Inspect audit blockers, compile immutable evidence package manifests with SHA-256 integrity hashes,
            and enforce zero-knowledge secret redaction prior to sharing with auditors.
          </p>
        </div>

        <button
          onClick={handleGeneratePackage}
          disabled={isGenerating}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-md shadow-rose-500/20"
        >
          <Sparkles className="w-4 h-4" />
          {isGenerating ? "Compiling Manifest..." : "Generate Audit Package"}
        </button>
      </div>

      {/* Blocker Inspector */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Pre-Audit Blocker Inspector ({blockers.length} Items Requiring Attention)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Identified gaps that may result in an external auditor inquiry or qualification.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {blockers.map((b, i) => (
            <div key={i} className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-xs">{b.title}</h4>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {b.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{b.impact}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                b.severity === "MEDIUM"
                  ? "text-amber-400 bg-amber-950/60 border-amber-500/30"
                  : "text-blue-400 bg-blue-950/60 border-blue-500/30"
              }`}>
                {b.severity} PRIORITY
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Packages Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Immutable Audit Packages ({packages.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic SHA-256 manifests with Zero-Knowledge credential scrubbing.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Package #</th>
                <th className="py-3 px-4">Package Title & Scope</th>
                <th className="py-3 px-4">Evaluation Period</th>
                <th className="py-3 px-4">SHA-256 Manifest Hash</th>
                <th className="py-3 px-4">Redaction Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-slate-850/40">
                  <td className="py-3 px-4 font-mono font-bold text-cyan-400">{pkg.number}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{pkg.title}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{pkg.itemsCount} evidence artifacts verified</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">{pkg.period}</td>
                  <td className="py-3 px-4 font-mono text-cyan-300 text-[11px]">
                    {pkg.manifestHash.slice(0, 16)}...
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      ZERO KNOWLEDGE
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => alert(`Downloading verified audit package ${pkg.number} (Manifest JSON + Redacted Artifacts)`)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-cyan-400 font-semibold flex items-center gap-1 ml-auto"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Pack
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
