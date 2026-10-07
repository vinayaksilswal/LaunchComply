"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Bot,
  Vault,
  ArrowRight,
  Filter,
  RefreshCw,
  TrendingUp,
  FileText,
  Activity,
  Zap,
  Lock,
} from "lucide-react";

export default function ContinuousAssurancePage() {
  const [selectedFramework, setSelectedFramework] = useState("ALL");
  const [selectedBU, setSelectedBU] = useState("GLOBAL");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const timelineEvents = [
    {
      time: "12 mins ago",
      type: "BOT_RUN",
      title: "AWS RDS Encryption Bot verified storage compliance",
      control: "LC-CR-001",
      status: "PASS",
      evidence: "EVD-AWS-RDS-20261003",
    },
    {
      time: "48 mins ago",
      type: "EXCEPTION",
      title: "S3 Public Access Block deviation detected & remediated",
      control: "LC-AC-001",
      status: "RESOLVED",
      evidence: "EVD-AWS-S3-009",
    },
    {
      time: "2 hours ago",
      type: "AUDIT_REVIEW",
      title: "Auditor Sarah Jenkins accepted 90-day restore drill sample",
      control: "LC-DR-001",
      status: "ACCEPTED",
      evidence: "WP-2026-SOC2-CC6.1",
    },
    {
      time: "4 hours ago",
      type: "CHAIN_HASH",
      title: "Evidence Integrity Hash Chain verified: Sequence #4421 sealed",
      control: "LC-AU-001",
      status: "INTEGRITY_OK",
      evidence: "CHAIN-SEQ-4421",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                Continuous Assurance Operating Platform
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  CONTINUOUS VERIFICATION ACTIVE
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Real-time cryptographic evidence streaming, autonomous audit bot evaluations, and SOC 2 / ISO 27001 control operating integrity.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action & Refresh */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
            Refresh Signals
          </button>
          <Link
            href="/dashboard/copilot"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition"
          >
            <Zap className="w-4 h-4" />
            Ask Copilot
          </Link>
        </div>
      </div>

      {/* Scope Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Filter className="w-4 h-4 text-cyan-400" />
            Framework:
          </div>
          <div className="flex items-center gap-1.5">
            {["ALL", "SOC 2 Type II", "ISO 27001", "DPDP", "Custom Standard"].map((fw) => (
              <button
                key={fw}
                onClick={() => setSelectedFramework(fw)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  selectedFramework === fw
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {fw}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scope:</span>
          <select
            value={selectedBU}
            onChange={(e) => setSelectedBU(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="GLOBAL">Global Enterprise (All Units)</option>
            <option value="BU-INDIA">India Division (DPDP Primary)</option>
            <option value="BU-US">US Division (SOC 2 Primary)</option>
          </select>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Control Health</span>
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-white">101</span>
            <span className="text-xs text-emerald-400 font-medium">94.4% Passing</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
            <span className="text-emerald-400 font-semibold">101 PASS</span> •
            <span className="text-amber-400 font-semibold">9 PARTIAL</span> •
            <span className="text-rose-400 font-semibold">1 FAIL</span>
          </div>
        </div>

        <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Evidence Freshness</span>
            <span className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-white">98.2%</span>
            <span className="text-xs text-cyan-400 font-medium">SLA Compliant</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
            <span>Current: 442 items</span>
            <span className="text-amber-400">Expiring: 4</span>
          </div>
        </div>

        <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Audit Bots</span>
            <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
              <Bot className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-white">31 / 31</span>
            <span className="text-xs text-emerald-400 font-medium">100% Operational</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
            <span>AWS, GitHub, DR, IAM</span>
            <span className="text-emerald-400 font-medium">0 Errors</span>
          </div>
        </div>

        <div className="p-5 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Exception Windows</span>
            <span className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-white">0 Active</span>
            <span className="text-xs text-slate-400 font-medium">1 Resolved (24h)</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-3">
            <span>Max duration: 14m</span>
            <Link href="/dashboard/assurance/exceptions" className="text-cyan-400 hover:underline">
              Inspect Windows →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Assurance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Quick Navigation Pillars */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Assurance Domains</h2>

          <Link
            href="/dashboard/assurance/controls"
            className="block p-4 bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white group-hover:text-cyan-400 transition flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  Continuous Controls Monitor
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  118 canonical controls continuously mapped to automated provider observations with causal explanations.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/dashboard/assurance/evidence"
            className="block p-4 bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white group-hover:text-cyan-400 transition flex items-center gap-2">
                  <Vault className="w-4 h-4 text-cyan-400" />
                  Evidence Vault & Hash Chain
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tamper-evident sequential SHA-256 chaining, verified origin provenance, and automated freshness policies.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/dashboard/assurance/bots"
            className="block p-4 bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white group-hover:text-cyan-400 transition flex items-center gap-2">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  Continuous Audit Bots
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Autonomous inspectors verifying RDS encryption, S3 buckets, CloudTrail, GitHub branch protection, and DR drills.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/audit/workpapers"
            className="block p-4 bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl transition group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-white group-hover:text-cyan-400 transition flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  Auditor Workpapers & Collaboration
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Live auditor sampling, threaded evidence discussions, and independent workpaper review tracking.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        {/* Right 2 Columns: Live Assurance Stream */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Live Assurance Activity Stream
            </h2>
            <span className="text-xs text-slate-500">Auto-refreshing every 30s</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl divide-y divide-slate-800/80">
            {timelineEvents.map((evt, idx) => (
              <div key={idx} className="p-4 flex items-start gap-4 hover:bg-slate-800/30 transition">
                <div className="p-2 rounded-lg bg-slate-800 text-cyan-400 shrink-0 mt-0.5">
                  {evt.type === "BOT_RUN" && <Bot className="w-4 h-4" />}
                  {evt.type === "EXCEPTION" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {evt.type === "AUDIT_REVIEW" && <Lock className="w-4 h-4 text-emerald-400" />}
                  {evt.type === "CHAIN_HASH" && <Vault className="w-4 h-4 text-blue-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white truncate">{evt.title}</p>
                    <span className="text-xs text-slate-400 shrink-0">{evt.time}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {evt.control}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {evt.evidence}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-medium text-[11px] ${
                        evt.status === "PASS" || evt.status === "ACCEPTED" || evt.status === "INTEGRITY_OK"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {evt.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tamper Evident Banner */}
          <div className="p-4 bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-800/30 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 text-cyan-300 rounded-lg">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Tamper-Evident Hash Chain Status: OK</p>
                <p className="text-xs text-slate-300">
                  4,421 evidence observations cryptographically linked with zero hash deviations detected.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/assurance/evidence"
              className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold transition shrink-0"
            >
              Verify Chain
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
