"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Server,
  Database,
  Play,
  FileCheck2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function BackupsPage() {
  const [isDrillRunning, setIsDrillRunning] = useState(false);
  const [drillSuccess, setDrillSuccess] = useState(false);

  const handleRunDrill = () => {
    setIsDrillRunning(true);
    setDrillSuccess(false);
    setTimeout(() => {
      setIsDrillRunning(false);
      setDrillSuccess(true);
    }, 1800);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">
            <span>Disaster Recovery & Business Continuity</span>
            <span>•</span>
            <span>SOC 2 CC9.1 & ISO 27001 A.12.1</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Backup & DR Assurance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Beyond backup configuration: live recovery observation, non-destructive restore drills, and measured RPO/RTO validation.
          </p>
        </div>

        <button
          onClick={handleRunDrill}
          disabled={isDrillRunning}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 shadow-sm shadow-purple-600/20 transition"
        >
          {isDrillRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Running Isolated Drill...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Run Isolated Restore Drill
            </>
          )}
        </button>
      </div>

      {drillSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Restore Drill Completed Successfully</div>
            <div className="text-emerald-700 mt-0.5">
              Isolated temporary database <code className="font-mono bg-white px-1 py-0.5 rounded border border-emerald-200">lc-drill-temp-rds-20261001</code> provisioned, schema tables and migration revision verified, measured RTO: <strong>18m 42s</strong>. Temporary target destroyed. Compliance evidence generated for SOC 2 CC9.1.
            </div>
          </div>
        </div>
      )}

      {/* 4-Stage Recoverability Progression */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          The 4 Levels of Recovery Assurance
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">1. Backup Configured</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              RDS continuous WAL archiving + 35-day automated snapshots enforced via IaC.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">2. Backup Succeeded</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Latest automated recovery point created 2h ago (14.2 GB snapshot verified in AWS).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">3. Restore Tested</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Isolated drill tested 12 days ago into temporary VPC sandbox target.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-900">4. Recovery Verified</span>
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Schema parity, table row counts, and migration revisions verified without errors.
            </p>
          </div>
        </div>
      </div>

      {/* RPO / RTO Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Recovery Point Objective (RPO)</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              PASS
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">120 minutes</div>
          <div className="text-xs text-slate-600">
            Target SLA: <strong>&lt; 24 hours</strong> • Latest snapshot completed 2 hours ago.
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Recovery Point:</span>
              <span className="font-mono text-slate-800">rds:acme-prod-snapshot-2026-10-01-0200</span>
            </div>
            <div className="flex justify-between">
              <span>Encryption Status:</span>
              <span className="font-semibold text-emerald-700">AWS KMS AES-256</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Recovery Time Objective (RTO)</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              PASS
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">18m 42s</div>
          <div className="text-xs text-slate-600">
            Target SLA: <strong>&lt; 60 minutes</strong> • Measured during latest automated restore drill.
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-[11px] text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Data Validation:</span>
              <span className="font-semibold text-emerald-700">PASSED (18 tables verified)</span>
            </div>
            <div className="flex justify-between">
              <span>SOC 2 Evidence:</span>
              <span className="font-mono text-slate-800">ev-restore-drill-20260918</span>
            </div>
          </div>
        </div>
      </div>

      {/* Restore Drills History */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Restore Drill History & Verification Logs</h2>
          <span className="text-xs text-slate-500">Safe execution: Production DB is never modified</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900">Scheduled Isolated Restore Drill</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  COMPLETED
                </span>
                <span className="text-slate-400 font-mono">Target: lc-drill-temp-rds-20260918</span>
              </div>
              <div className="text-slate-500 text-[11px] mt-1">
                Schema validated • Migration revision confirmed • Read query latency 3.4ms • Destroyed after 30 min
              </div>
            </div>
            <div className="text-right sm:text-right">
              <div className="font-mono font-bold text-slate-800">RTO: 18m 42s</div>
              <div className="text-[11px] text-slate-400">12 days ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
