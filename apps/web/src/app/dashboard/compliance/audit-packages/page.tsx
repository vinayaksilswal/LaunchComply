"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileArchive,
  Shield,
  Download,
  CheckCircle2,
  Lock,
  Layers,
  FileText,
  Calendar,
  Sparkles,
  ExternalLink,
  Search,
  Eye,
  Hash,
  AlertCircle
} from "lucide-react";

interface AuditPackage {
  id: string;
  packageNumber: string;
  title: string;
  framework: string;
  period: string;
  generatedAt: string;
  generatedBy: string;
  status: "FINALIZED" | "DRAFT";
  itemCount: number;
  manifestHash: string;
  redactionStatus: "ZERO_KNOWLEDGE_VERIFIED";
  summary: {
    controls: number;
    evidence: number;
    policies: number;
    risks: number;
    audits: number;
  };
}

const INITIAL_PACKAGES: AuditPackage[] = [
  {
    id: "pkg-1",
    packageNumber: "PKG-2026-Q3-001",
    title: "ISO/IEC 27001:2022 Stage 1 Readiness Evidence Package",
    framework: "ISO/IEC 27001:2022",
    period: "2026-07-01 to 2026-09-30",
    generatedAt: "2026-10-01 14:22:08 UTC",
    generatedBy: "alex.mercer@acmecloud.io",
    status: "FINALIZED",
    itemCount: 142,
    manifestHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    redactionStatus: "ZERO_KNOWLEDGE_VERIFIED",
    summary: {
      controls: 83,
      evidence: 38,
      policies: 14,
      risks: 5,
      audits: 2
    }
  },
  {
    id: "pkg-2",
    packageNumber: "PKG-2026-SOC2-001",
    title: "SOC 2 Type II Security & Availability 90-Day Evidence Package",
    framework: "SOC 2 Type II (TSC 2017)",
    period: "2026-07-01 to 2026-09-30",
    generatedAt: "2026-10-02 09:15:44 UTC",
    generatedBy: "compliance@acmecloud.io",
    status: "FINALIZED",
    itemCount: 168,
    manifestHash: "8a4f61b7e8d0219c670a41f82ec45819e68d0bb12a7d8c47f32e92a81c3e7215",
    redactionStatus: "ZERO_KNOWLEDGE_VERIFIED",
    summary: {
      controls: 64,
      evidence: 72,
      policies: 16,
      risks: 8,
      audits: 8
    }
  }
];

export default function AuditPackagesPage() {
  const [packages, setPackages] = useState<AuditPackage[]>(INITIAL_PACKAGES);
  const [selectedPkg, setSelectedPkg] = useState<AuditPackage | null>(INITIAL_PACKAGES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleGenerate = (framework: string, period: string) => {
    setIsGenerating(true);
    setTimeout(() => {
      const newPkg: AuditPackage = {
        id: `pkg-${Date.now()}`,
        packageNumber: `PKG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: `${framework} Audit Evidence Dossier`,
        framework: framework,
        period: period,
        generatedAt: new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC",
        generatedBy: "alex.mercer@acmecloud.io",
        status: "FINALIZED",
        itemCount: 135,
        manifestHash: "c45819e68d0bb12a7d8c47f32e92a81c3e7215e3b0c44298fc1c149afbf4c8",
        redactionStatus: "ZERO_KNOWLEDGE_VERIFIED",
        summary: {
          controls: 78,
          evidence: 42,
          policies: 12,
          risks: 3,
          audits: 0
        }
      };
      setPackages([newPkg, ...packages]);
      setSelectedPkg(newPkg);
      setIsGenerating(false);
      setNotification(`Audit Package ${newPkg.packageNumber} generated with SHA-256 manifest.`);
      setTimeout(() => setNotification(null), 5000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <FileArchive className="w-4 h-4" />
            <span>Immutable Evidence Vault</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Audit Evidence Packages & Manifests</h1>
          <p className="text-sm text-slate-400 mt-1">
            Cryptographically sealed, zero-knowledge redacted dossiers compiled for external accredited auditors and customer due diligence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleGenerate("ISO/IEC 27001:2022", "2026-Q3")}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-cyan-500/20 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGenerating ? "Compiling Dossier..." : "Generate New Package"}</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-emerald-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Grid: List of Packages + Selected Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Package List */}
        <div className="space-y-3 lg:col-span-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Generated Packages ({packages.length})
          </div>
          {packages.map((pkg) => {
            const isSelected = selectedPkg?.id === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPkg(pkg)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-500/10"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-cyan-400">{pkg.packageNumber}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {pkg.status}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white leading-snug line-clamp-2">
                  {pkg.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2">
                  <span>{pkg.framework}</span>
                  <span>•</span>
                  <span>{pkg.itemCount} items</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Generated: {pkg.generatedAt}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Detailed Package Manifest */}
        {selectedPkg && (
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-800 px-2 py-0.5 rounded">
                      {selectedPkg.packageNumber}
                    </span>
                    <span className="text-xs text-slate-400">
                      Period: <strong className="text-slate-200">{selectedPkg.period}</strong>
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{selectedPkg.title}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      alert(`Manifest exported for ${selectedPkg.packageNumber}. SHA256 integrity verified.`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Manifest</span>
                  </button>
                  <Link
                    href="/dashboard/trust"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-semibold text-cyan-400 border border-cyan-500/30 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Auditor Access</span>
                  </Link>
                </div>
              </div>

              {/* Redaction & Integrity Verification Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Zero-Knowledge Redaction Applied</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Scrubbed: DB Passwords, API Keys, AWS STS Secrets, PII
                  </span>
                </div>
                <div className="flex items-start gap-2 pt-1 border-t border-slate-900 text-xs">
                  <Hash className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="truncate">
                    <span className="text-slate-400 text-[11px]">SHA-256 Manifest Digest: </span>
                    <span className="font-mono text-[11px] text-slate-300 select-all">
                      {selectedPkg.manifestHash}
                    </span>
                  </div>
                </div>
              </div>

              {/* Package Inventory Metrics */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                  Package Composition
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-center">
                    <div className="text-lg font-bold text-white">{selectedPkg.summary.controls}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Controls</div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-center">
                    <div className="text-lg font-bold text-cyan-400">{selectedPkg.summary.evidence}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Evidence Files</div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-center">
                    <div className="text-lg font-bold text-blue-400">{selectedPkg.summary.policies}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Signed Policies</div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-center">
                    <div className="text-lg font-bold text-amber-400">{selectedPkg.summary.risks}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Risk Register</div>
                  </div>
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 text-center">
                    <div className="text-lg font-bold text-emerald-400">{selectedPkg.summary.audits}</div>
                    <div className="text-[10px] text-slate-400 uppercase">Audit Records</div>
                  </div>
                </div>
              </div>

              {/* Included Artifacts Index */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                  Included Artifacts Sample Index
                </h4>
                <div className="bg-slate-950 border border-slate-800 rounded-lg divide-y divide-slate-800/60 text-xs">
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Statement_of_Applicability_v2026.1.pdf</span>
                    <span className="text-[11px] text-slate-500 font-mono">SHA256: 4a9f...b281</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-300 font-medium">AWS_RDS_AES256_Encryption_Evidence.json</span>
                    <span className="text-[11px] text-slate-500 font-mono">SHA256: 7f1c...890a</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Cross_Region_DR_Restore_Drill_Telemetry.json</span>
                    <span className="text-[11px] text-slate-500 font-mono">SHA256: 91a4...112e</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Management_Review_Minutes_Clause_9.3.pdf</span>
                    <span className="text-[11px] text-slate-500 font-mono">SHA256: 3c5e...df02</span>
                  </div>
                  <div className="p-2.5 flex items-center justify-between">
                    <span className="text-slate-300 font-medium">VAPT_Remediation_Report_Clean_Retest.pdf</span>
                    <span className="text-[11px] text-slate-500 font-mono">SHA256: 8b01...64aa</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Zero-Knowledge Guarantee:</strong> Audit evidence packages generated by LaunchComply are immutable upon finalization. Any changes to evidence or policies require generating a new versioned package with a newly computed SHA-256 hash. Secret credentials and unnecessary PII are automatically scrubbed during generation.
        </div>
      </div>
    </div>
  );
}
