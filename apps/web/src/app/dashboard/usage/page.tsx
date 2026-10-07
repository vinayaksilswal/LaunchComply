"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Layers,
  Cloud,
  Terminal,
  Shield,
  Target,
  DatabaseBackup,
  Vault,
  Sparkles,
  ArrowUpRight
} from "lucide-react";

export default function UsagePage() {
  const metrics = [
    { key: "applications", name: "Connected Applications", used: 1, limit: 20, unit: "apps", icon: Layers },
    { key: "environments", name: "Active Cloud Environments", used: 2, limit: 10, unit: "envs", icon: Cloud },
    { key: "aws_accounts", name: "Integrated AWS Accounts", used: 1, limit: 5, unit: "accounts", icon: Cloud },
    { key: "build_minutes", name: "CI/CD Build Minutes", used: 342, limit: 2000, unit: "minutes", icon: Terminal },
    { key: "security_scans", name: "Automated Security Scans", used: 42, limit: 500, unit: "scans", icon: Shield },
    { key: "vapt_assets", name: "Authorized VAPT Assets", used: 2, limit: 4, unit: "scopes", icon: Target },
    { key: "stored_evidence_gb", name: "Compliance Evidence Vault", used: 4.2, limit: 25, unit: "GB", icon: Vault },
    { key: "restore_drills", name: "Cross-Region Restore Drills", used: 1, limit: 4, unit: "drills", icon: DatabaseBackup },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Metered Cloud & Compliance Operations</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Resource Metering & Usage</h1>
          <p className="text-sm text-slate-400 mt-1">
            Idempotent tracking of compute, security scans, compliance evidence volume, and environment allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <span>Subscription Tier</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Usage Dimensions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          const percentage = Math.min(100, Math.round((m.used / m.limit) * 100));
          return (
            <div key={m.key} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold text-slate-300">{m.name}</span>
                <Icon className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-white">{m.used}</span>
                <span className="text-xs text-slate-400">/ {m.limit} {m.unit}</span>
              </div>
              <div className="space-y-1">
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${percentage}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>{percentage}% utilized</span>
                  <span>{m.limit - m.used} remaining</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metering Guarantee Card */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Idempotent Metering Protocol:</strong> Every usage event emitted by LaunchComply CI workers, vulnerability scanners, and backup drills carries a unique cryptographic client idempotency key. Webhook retries, worker restarts, or transient network blips never lead to double-counted usage.
        </div>
      </div>
    </div>
  );
}
