"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  Network,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
  DollarSign,
  Maximize2,
  RefreshCw,
  Zap,
} from "lucide-react";

type CanvasMode = "TOPOLOGY" | "SECURITY" | "THREAT_MODEL" | "ATTACK_PATHS" | "COMPLIANCE" | "LIVE_HEALTH" | "COST";

interface ArchNode {
  id: string;
  name: string;
  type: string;
  tier: "EDGE" | "PUBLIC" | "APP" | "DATA";
  threatCount: { critical: number; high: number; medium: number; low: number };
  findingsCount: number;
  controlsPassing: number;
  controlsTotal: number;
  cpuPercent?: number;
  monthlyCost?: number;
}

const SAMPLE_NODES: ArchNode[] = [
  {
    id: "node-alb",
    name: "Public Internet ALB",
    type: "AWS::ElasticLoadBalancingV2::LoadBalancer",
    tier: "PUBLIC",
    threatCount: { critical: 0, high: 1, medium: 2, low: 1 },
    findingsCount: 1,
    controlsPassing: 5,
    controlsTotal: 6,
    cpuPercent: 24,
    monthlyCost: 28,
  },
  {
    id: "node-ecs",
    name: "ECS Fargate Microservices",
    type: "AWS::ECS::Service",
    tier: "APP",
    threatCount: { critical: 0, high: 2, medium: 3, low: 1 },
    findingsCount: 2,
    controlsPassing: 8,
    controlsTotal: 9,
    cpuPercent: 42,
    monthlyCost: 110,
  },
  {
    id: "node-rds",
    name: "PostgreSQL Production DB",
    type: "AWS::RDS::DBInstance",
    tier: "DATA",
    threatCount: { critical: 0, high: 0, medium: 1, low: 2 },
    findingsCount: 0,
    controlsPassing: 7,
    controlsTotal: 7,
    cpuPercent: 18,
    monthlyCost: 145,
  },
  {
    id: "node-s3",
    name: "Confidential Evidence S3 Bucket",
    type: "AWS::S3::Bucket",
    tier: "DATA",
    threatCount: { critical: 0, high: 0, medium: 1, low: 0 },
    findingsCount: 0,
    controlsPassing: 4,
    controlsTotal: 4,
    monthlyCost: 12,
  },
];

export default function ThreatModelDetailPage() {
  const [activeMode, setActiveMode] = useState<CanvasMode>("ATTACK_PATHS");
  const [selectedNode, setSelectedNode] = useState<ArchNode>(SAMPLE_NODES[1]);
  const [hasArchitectureDiff, setHasArchitectureDiff] = useState(true);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard/security/threat-models" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Continuous Threat Models
        </Link>
        <span>/</span>
        <span className="text-white font-medium">AcmeCloud Production Architecture Threat Canvas (v2.1)</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Live Architecture Threat & Attack Path Overlay
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              IaC Synced: v2.1
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visual trust boundary perimeter, STRIDE threat heatmap, attack path traversal, and continuous compliance control overlay.
          </p>
        </div>

        <Link
          href="/dashboard/copilot"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition"
        >
          <Zap className="w-4 h-4" />
          Explain Architecture in Copilot
        </Link>
      </div>

      {/* Architecture Change Detection Banner */}
      {hasArchitectureDiff && (
        <div className="p-4 bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Threat Model Update Available (v2.2 Proposed)</p>
              <p className="text-xs text-slate-300">
                IaC drift detection identified new Internet-facing webhook endpoint in ECS service. Review 2 newly synthesized STRIDE threats.
              </p>
            </div>
          </div>
          <button
            onClick={() => setHasArchitectureDiff(false)}
            className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition shrink-0"
          >
            Review & Approve Version Diff
          </button>
        </div>
      )}

      {/* Canvas Mode Switcher Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
        {[
          { mode: "TOPOLOGY", label: "Topology", icon: Network },
          { mode: "SECURITY", label: "Security Posture", icon: ShieldAlert },
          { mode: "THREAT_MODEL", label: "Threat Heatmap", icon: AlertTriangle },
          { mode: "ATTACK_PATHS", label: "Attack Paths", icon: Layers },
          { mode: "COMPLIANCE", label: "Compliance Controls", icon: CheckCircle2 },
          { mode: "LIVE_HEALTH", label: "Live Health", icon: Activity },
          { mode: "COST", label: "Cost Overlay", icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMode === tab.mode;
          return (
            <button
              key={tab.mode}
              onClick={() => setActiveMode(tab.mode as CanvasMode)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Visual Canvas + Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Visual Architecture Canvas Area */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-xl p-6 min-h-[460px] relative overflow-hidden flex flex-col justify-between">
          {/* Trust Boundary Indicator Lines */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-b border-slate-800/60 pb-3">
            <span>TRUST BOUNDARY 1: INTERNET / EDGE</span>
            <span>TRUST BOUNDARY 2: PRIVATE APP VPC</span>
            <span>TRUST BOUNDARY 3: SECURE DATA STORE</span>
          </div>

          {/* Interactive Nodes Canvas Flow */}
          <div className="py-12 flex flex-col sm:flex-row items-center justify-around gap-6 relative z-10">
            {SAMPLE_NODES.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-4 bg-slate-900/90 border rounded-xl cursor-pointer transition transform hover:-translate-y-1 w-44 text-center space-y-2.5 shadow-xl ${
                    isSelected ? "border-cyan-500 shadow-cyan-500/20 ring-2 ring-cyan-500/30" : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                    {node.tier}
                  </span>

                  <h4 className="text-xs font-bold text-white leading-snug">{node.name}</h4>

                  {/* Mode-specific badge overlay */}
                  {activeMode === "ATTACK_PATHS" && (
                    <div className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded py-0.5">
                      Hop #{node.tier === "PUBLIC" ? "1" : node.tier === "APP" ? "2" : "3 Target"}
                    </div>
                  )}

                  {activeMode === "THREAT_MODEL" && (
                    <div className="text-[11px] font-medium text-amber-400 bg-amber-500/10 rounded py-0.5">
                      {node.threatCount.high} High • {node.threatCount.medium} Med
                    </div>
                  )}

                  {activeMode === "COMPLIANCE" && (
                    <div className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 rounded py-0.5">
                      {node.controlsPassing}/{node.controlsTotal} Controls PASS
                    </div>
                  )}

                  {activeMode === "LIVE_HEALTH" && (
                    <div className="text-[11px] font-medium text-blue-400 bg-blue-500/10 rounded py-0.5">
                      CPU: {node.cpuPercent}%
                    </div>
                  )}

                  {activeMode === "COST" && (
                    <div className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 rounded py-0.5">
                      ${node.monthlyCost}/mo
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Canvas Attack Path Highlight Flow Bar */}
          {activeMode === "ATTACK_PATHS" && (
            <div className="p-3 bg-slate-900/90 border border-rose-900/40 rounded-lg text-xs flex flex-wrap items-center gap-2 text-rose-300">
              <span className="font-bold text-white">Traversed Path:</span>
              <span>Internet Gateway</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span>Public ALB</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span>ECS Task Role</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold text-rose-400">S3 Evidence Vault Bucket</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold uppercase">
                STATUS: POSSIBLE (THEORETICAL)
              </span>
            </div>
          )}
        </div>

        {/* Node Inspector Drawer */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {selectedNode.type}
            </span>
            <h3 className="text-lg font-bold text-white mt-2">{selectedNode.name}</h3>
            <p className="text-xs text-slate-400">Architectural Tier: {selectedNode.tier}</p>
          </div>

          {/* Threats Section */}
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>STRIDE Threats</span>
              <span className="text-rose-400 font-bold">{selectedNode.threatCount.high} High</span>
            </h4>
            <div className="space-y-2">
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between text-white font-semibold">
                  <span>Elevation of Privilege</span>
                  <span className="text-rose-400">HIGH</span>
                </div>
                <p className="text-slate-400 text-[11px]">Over-permissive IAM task role execution grant allows S3 wildcard Read permissions.</p>
              </div>
            </div>
          </div>

          {/* Mapped Controls Section */}
          <div className="space-y-3 border-t border-slate-800 pt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Mitigating Canonical Controls</span>
              <span className="text-emerald-400 font-bold">{selectedNode.controlsPassing} Passing</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-800/50 rounded flex items-center justify-between">
                <span>LC-AC-001 (S3 Public Access Block)</span>
                <span className="text-emerald-400 font-semibold">PASS</span>
              </div>
              <div className="p-2.5 bg-slate-800/50 rounded flex items-center justify-between">
                <span>LC-CR-001 (KMS Encryption At Rest)</span>
                <span className="text-emerald-400 font-semibold">PASS</span>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/compliance/risks"
            className="w-full block text-center py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Promote Threat to Risk Register →
          </Link>
        </div>
      </div>
    </div>
  );
}
