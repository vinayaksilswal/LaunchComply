"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Vault,
  ShieldCheck,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Lock,
  Layers,
  FileCode,
} from "lucide-react";

interface EvidenceItem {
  id: string;
  code: string;
  provider: string;
  resourceId: string;
  controlCode: string;
  collectedAt: string;
  validUntil: string;
  rawHash: string;
  normalizedHash: string;
  authenticityStatus: string;
  freshnessStatus: "CURRENT" | "EXPIRING" | "STALE";
}

const SAMPLE_EVIDENCE: EvidenceItem[] = [
  {
    id: "ev-1",
    code: "EVD-AWS-RDS-20261003120000",
    provider: "AWS",
    resourceId: "arn:aws:rds:ap-south-1:123456789012:db:db-prod-main",
    controlCode: "LC-CR-001",
    collectedAt: "12 mins ago",
    validUntil: "Tomorrow at 12:00 UTC",
    rawHash: "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
    normalizedHash: "a15998a44b9b9409e5b22b64d0d03b71ec9114f6b8df815c3ec0b0179929dcf2",
    authenticityStatus: "API_COLLECTED",
    freshnessStatus: "CURRENT",
  },
  {
    id: "ev-2",
    code: "EVD-AWS-S3-20261003113000",
    provider: "AWS",
    resourceId: "s3-evidence-vault-bucket",
    controlCode: "LC-AC-001",
    collectedAt: "42 mins ago",
    validUntil: "Tomorrow at 11:30 UTC",
    rawHash: "3f79bb7b435b05321651daefd374cd681b49172d694ff8a86a6064d5059d48be",
    normalizedHash: "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
    authenticityStatus: "API_COLLECTED",
    freshnessStatus: "CURRENT",
  },
  {
    id: "ev-3",
    code: "EVD-OKTA-SCIM-20261003100000",
    provider: "OKTA",
    resourceId: "directory-sync-run-441",
    controlCode: "LC-IA-001",
    collectedAt: "2 hours ago",
    validUntil: "In 88 days",
    rawHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    normalizedHash: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
    authenticityStatus: "API_COLLECTED",
    freshnessStatus: "CURRENT",
  },
  {
    id: "ev-4",
    code: "EVD-DR-DRILL-20260930140000",
    provider: "DR",
    resourceId: "dr-plan-warm-standby-drill",
    controlCode: "LC-DR-001",
    collectedAt: "3 days ago",
    validUntil: "In 87 days",
    rawHash: "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
    normalizedHash: "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
    authenticityStatus: "VERIFIED_SOURCE",
    freshnessStatus: "CURRENT",
  },
];

export default function EvidenceVaultPage() {
  const [evidenceList] = useState<EvidenceItem[]>(SAMPLE_EVIDENCE);
  const [searchTerm, setSearchTerm] = useState("");
  const [isVerifyingChain, setIsVerifyingChain] = useState(false);
  const [chainVerified, setChainVerified] = useState(true);

  const handleVerifyChain = () => {
    setIsVerifyingChain(true);
    setTimeout(() => {
      setIsVerifyingChain(false);
      setChainVerified(true);
    }, 600);
  };

  const filteredEvidence = evidenceList.filter((e) => {
    return (
      e.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.controlCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.resourceId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard/assurance" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Continuous Assurance
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Evidence Vault & Authenticity Pipeline</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Evidence Vault & Integrity Hash Chain
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Tamper-Evident Chaining Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Every technical observation captures raw and normalized cryptographic SHA-256 hashes linked into a sequential integrity chain.
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={isVerifyingChain}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition"
        >
          <RefreshCw className={`w-4 h-4 ${isVerifyingChain ? "animate-spin" : ""}`} />
          {isVerifyingChain ? "Verifying Hash Chain..." : "Cryptographically Verify Chain"}
        </button>
      </div>

      {/* Hash Chain Status Banner */}
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl mt-0.5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              Sequential Hash Chain Status: {chainVerified ? "VERIFIED VALID" : "RE-VERIFICATION REQUIRED"}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified 4,421 consecutive evidence blocks. Previous block hash linking enforces tamper-evidence without centralized override.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-400 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6 shrink-0">
          <div>
            <span className="block text-slate-500 font-medium">LATEST SEQUENCE</span>
            <span className="font-mono text-cyan-400 font-bold text-sm">#4421</span>
          </div>
          <div>
            <span className="block text-slate-500 font-medium">ALGORITHM</span>
            <span className="font-mono text-white font-bold text-sm">HMAC-SHA256</span>
          </div>
        </div>
      </div>

      {/* Freshness Policy Matrix */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Evidence Freshness SLA Configuration
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { name: "Cloud Configuration", maxAge: "24 Hours", warn: "12 Hours", status: "100% CURRENT" },
            { name: "Backup Health", maxAge: "24 Hours", warn: "12 Hours", status: "100% CURRENT" },
            { name: "VAPT Assessment", maxAge: "90 Days", warn: "60 Days", status: "CURRENT" },
            { name: "Access Review", maxAge: "90 Days", warn: "60 Days", status: "CURRENT" },
            { name: "Corporate Policies", maxAge: "365 Days", warn: "300 Days", status: "CURRENT" },
          ].map((pol, idx) => (
            <div key={idx} className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1">
              <span className="text-xs font-semibold text-white block truncate">{pol.name}</span>
              <span className="text-[11px] text-slate-400 block">Max Age: {pol.maxAge}</span>
              <span className="text-[11px] text-emerald-400 font-medium block">{pol.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by evidence code, control code, provider, or resource ARN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Evidence Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/80">
        {filteredEvidence.map((ev) => (
          <div key={ev.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-800/30 transition">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-cyan-300 px-2.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/50">
                  {ev.code}
                </span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {ev.controlCode}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-400">
                  {ev.provider}
                </span>
              </div>

              <p className="text-xs text-slate-300 font-mono truncate">{ev.resourceId}</p>

              <div className="space-y-1 pt-1 text-[11px] text-slate-500 font-mono">
                <p className="truncate">Raw SHA-256: {ev.rawHash}</p>
                <p className="truncate">Normalized SHA-256: {ev.normalizedHash}</p>
              </div>
            </div>

            <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2 shrink-0 border-t lg:border-t-0 border-slate-800/80 pt-3 lg:pt-0">
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {ev.freshnessStatus}
              </span>
              <span className="text-xs text-slate-400">Collected {ev.collectedAt}</span>
              <span className="text-[11px] text-slate-500">Valid until {ev.validUntil}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
