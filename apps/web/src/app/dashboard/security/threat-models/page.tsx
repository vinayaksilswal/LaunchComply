"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  Target,
  Network,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  GitCompare,
  ExternalLink,
  ShieldCheck,
  Server,
  Database,
  Cloud,
  Lock,
} from "lucide-react";

export default function ThreatModelsPage() {
  const [selectedVersion, setSelectedVersion] = useState("v2.0");
  const [promotedThreats, setPromotedThreats] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);

  const trustBoundaries = [
    {
      name: "Internet External Boundary",
      type: "INTERNET",
      zone: "Public Untrusted",
      color: "border-rose-300 bg-rose-50/50 text-rose-900",
      controls: "AWS WAF, CloudFront TLS 1.3, Rate Limiting",
    },
    {
      name: "Public Edge Ingress",
      type: "EDGE",
      zone: "Public AWS",
      color: "border-amber-300 bg-amber-50/50 text-amber-900",
      controls: "ALB Security Groups, SSL/TLS Termination",
    },
    {
      name: "Private Application Subnet",
      type: "PRIVATE_APP",
      zone: "Isolated VPC",
      color: "border-cyan-300 bg-cyan-50/50 text-cyan-900",
      controls: "Private NAT, IAM Task Execution Roles",
    },
    {
      name: "Database Subnet Tier",
      type: "DATABASE_SUBNET",
      zone: "Air-gapped VPC",
      color: "border-indigo-300 bg-indigo-50/50 text-indigo-900",
      controls: "Multi-AZ DB Subnet, Inbound 5432 only from App SG",
    },
  ];

  const threats = [
    {
      id: "THR-01",
      code: "THREAT-SPOOF-01",
      category: "SPOOFING",
      title: "Credential Stuffing & Session Spoofing",
      entryPoint: "Public HTTPS /api/v1/auth/login",
      impact: 4,
      likelihood: 4,
      riskLevel: "HIGH",
      status: "MITIGATED",
      mitigations: "Enforced MFA, Account Lockout, Anomaly Detection",
    },
    {
      id: "THR-02",
      code: "THREAT-TAMP-02",
      category: "TAMPERING",
      title: "Evidence Manipulation or Tampering",
      entryPoint: "Internal Microservice S3 Connection",
      impact: 5,
      likelihood: 2,
      riskLevel: "CRITICAL",
      status: "MITIGATED",
      mitigations: "S3 Object Lock (Compliance WORM Mode), SHA-256 Hashes",
    },
    {
      id: "THR-03",
      code: "THREAT-INFO-03",
      category: "INFORMATION_DISCLOSURE",
      title: "Unencrypted Database Snapshot Leakage",
      entryPoint: "Cross-Account AWS API Access",
      impact: 5,
      likelihood: 2,
      riskLevel: "CRITICAL",
      status: "MITIGATED",
      mitigations: "AWS KMS Customer-Managed Key Encryption, Public Snapshot Block",
    },
    {
      id: "THR-04",
      code: "THREAT-ELEV-04",
      category: "ELEVATION_OF_PRIVILEGE",
      title: "SSRF / Privilege Escalation via AWS Metadata",
      entryPoint: "Outbound Webhook Dispatcher",
      impact: 4,
      likelihood: 3,
      riskLevel: "HIGH",
      status: "IDENTIFIED",
      mitigations: "IMDSv2 Enforced. Needs Domain Whitelist Validation",
    },
  ];

  const attackPaths = [
    {
      id: "path-1",
      title: "Internet -> Ingress ALB -> Container SSRF -> S3 Vault",
      status: "POSSIBLE",
      steps: [
        { label: "1. Public Webhook API", desc: "Attacker submits crafted webhook callback URL" },
        { label: "2. ECS Task Container", desc: "Outbound HTTP client dispatches without localhost block" },
        { label: "3. IMDSv1 Query", desc: "Attempted query to AWS EC2 instance metadata (Blocked by IMDSv2)" },
        { label: "4. S3 Evidence Vault", desc: "Targeted confidential audit artifacts" },
      ],
      mitigatingControls: "IMDSv2 Hop Limit = 1, S3 VPC Endpoint Policy, WORM Object Lock",
    },
    {
      id: "path-2",
      title: "Internet -> Brute Force -> Admin Console Hijack",
      status: "MITIGATED",
      steps: [
        { label: "1. Login Form", desc: "Automated credential spray against platform administrators" },
        { label: "2. Identity Provider", desc: "Challenged by mandatory TOTP/Hardware Key MFA" },
        { label: "3. Admin Plane", desc: "Access strictly blocked by IP allowlist & required MFA" },
      ],
      mitigatingControls: "MFA Required, Session Max Idle 60m, IP Allowlist",
    },
  ];

  const handlePromoteRisk = (threatId: string) => {
    if (!promotedThreats.includes(threatId)) {
      setPromotedThreats([...promotedThreats, threatId]);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Target className="w-6 h-6 text-cyan-600" />
              Continuous Architecture Threat Modeling
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-300">
              STRIDE & ATTACK PATHS
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time threat modeling continuously synthesized from application topology, AWS IaC resources, and trust boundaries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <GitCompare className="w-3.5 h-3.5 text-slate-500" />
            {showDiff ? "Hide Version Diff" : "Compare v1.0 vs v2.0"}
          </button>
          <div className="px-3 py-1.5 bg-cyan-50 border border-cyan-200 rounded-lg text-xs font-bold text-cyan-800">
            Active Snapshot: {selectedVersion}
          </div>
        </div>
      </div>

      {showDiff && (
        <div className="p-5 rounded-2xl bg-cyan-50/60 border border-cyan-200 text-xs text-slate-800 space-y-2">
          <div className="font-bold text-sm text-cyan-900 flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-cyan-700" />
            Threat Model Version Diff (v1.0 → v2.0)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-3 bg-white rounded-xl border border-cyan-100">
              <span className="font-semibold text-rose-700 block">+1 New Identified Threat</span>
              <span className="text-[11px] text-slate-600">THREAT-ELEV-04 (SSRF Webhook Dispatcher)</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-cyan-100">
              <span className="font-semibold text-emerald-700 block">1 Mitigated Threat</span>
              <span className="text-[11px] text-slate-600">THREAT-SPOOF-01 (MFA enforcement verified)</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-cyan-100">
              <span className="font-semibold text-slate-700 block">Trust Boundary Crossing</span>
              <span className="text-[11px] text-slate-600">New Outbound Webhook Subnet traversal</span>
            </div>
          </div>
        </div>
      )}

      {/* Trust Boundaries Strip */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-600" />
          Architectural Trust Boundaries & Isolation Perimeters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {trustBoundaries.map((b, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border ${b.color} shadow-2xs space-y-2`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">{b.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/80 border border-slate-200">
                  {b.type}
                </span>
              </div>
              <p className="text-[11px] opacity-80">{b.zone}</p>
              <div className="pt-2 text-[10px] font-medium border-t border-slate-200/50">
                <span className="font-bold">Controls:</span> {b.controls}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* STRIDE Threats List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Synthesized STRIDE Threats</h3>
            <p className="text-xs text-slate-500 mt-0.5">Categorized by STRIDE methodology with verified canonical mitigations.</p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {threats.length} Threats Analyzed
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {threats.map((t) => {
            const isPromoted = promotedThreats.includes(t.id);
            return (
              <div key={t.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1.5 max-w-3xl">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-slate-800">{t.code}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {t.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.riskLevel === "CRITICAL"
                          ? "bg-rose-100 text-rose-800"
                          : t.riskLevel === "HIGH"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {t.riskLevel}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.status === "MITIGATED" ? "bg-emerald-100 text-emerald-800" : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{t.title}</h4>
                  <div className="text-slate-500 text-xs">
                    Entry Point: <code className="text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{t.entryPoint}</code>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">Mitigations:</span> {t.mitigations}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={isPromoted}
                    onClick={() => handlePromoteRisk(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      isPromoted
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
                    }`}
                  >
                    {isPromoted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Linked to Risk Register
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        Promote to Risk Register
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attack Path Graph Visualization */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-600" />
            Attack Path Traversal & Mitigating Control Graph
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Step-by-step traversal models showing how threat actors traverse perimeter boundaries toward confidential data.
          </p>
        </div>

        <div className="space-y-4">
          {attackPaths.map((path) => (
            <div key={path.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{path.title}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    path.status === "MITIGATED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {path.status}
                </span>
              </div>

              {/* Steps timeline */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {path.steps.map((st, sidx) => (
                  <div key={sidx} className="p-3 bg-white border border-slate-200 rounded-xl relative shadow-2xs space-y-1">
                    <span className="font-bold text-cyan-800 text-xs block">{st.label}</span>
                    <p className="text-[11px] text-slate-500 leading-tight">{st.desc}</p>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-600 bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong className="text-slate-800">Mitigating Defense Controls:</strong> {path.mitigatingControls}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
