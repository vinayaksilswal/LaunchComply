"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Rocket,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Server,
  Activity,
  Layers,
  Sparkles,
  GitCommit,
  ExternalLink,
  Clock
} from "lucide-react";

export default function DeploymentsCockpitPage() {
  const [trafficShifted, setTrafficShifted] = useState(true);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackDone, setRollbackDone] = useState(false);

  const handleRollback = () => {
    setIsRollingBack(true);
    setTimeout(() => {
      setIsRollingBack(false);
      setRollbackDone(true);
    }, 1200);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Application Deployments</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
              Blue/Green Engine Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Zero-downtime Blue/Green traffic promotion, ECS task definition revisions, and rollback management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRollback}
            disabled={isRollingBack || rollbackDone}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 shadow-sm ${
              rollbackDone
                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRollingBack ? "animate-spin" : ""}`} />
            {isRollingBack
              ? "Rolling Back..."
              : rollbackDone
              ? "Traffic Restored to Blue"
              : "Emergency Rollback to Blue"}
          </button>

          <Link
            href="/dashboard/applications/demo-app/releases"
            className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <Rocket className="w-3.5 h-3.5" />
            Manage Releases
          </Link>
        </div>
      </div>

      {/* Target Group Visual Comparison: Blue vs Green */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blue Target Group */}
        <div
          className={`border rounded-xl p-5 transition-all ${
            rollbackDone
              ? "bg-emerald-50/50 border-emerald-300 shadow-md"
              : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <h2 className="text-sm font-bold text-slate-900">Blue Target Group (TG-Active-1)</h2>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                rollbackDone
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {rollbackDone ? "100% TRAFFIC (ACTIVE)" : "STANDBY (0% TRAFFIC)"}
            </span>
          </div>

          <div className="mt-4 space-y-2 text-xs text-slate-600">
            <div>
              Release: <strong className="text-slate-800">v1.4.1</strong>
            </div>
            <div>
              Commit: <span className="font-mono text-slate-500">7a8b9c0d</span>
            </div>
            <div>
              ECS Tasks: <strong className="text-emerald-700">2 / 2 Healthy</strong>
            </div>
            <div>
              Task Definition:{" "}
              <span className="font-mono text-[11px] text-slate-500">launchcomply-acme-api:3</span>
            </div>
          </div>
        </div>

        {/* Green Target Group */}
        <div
          className={`border rounded-xl p-5 transition-all ${
            !rollbackDone
              ? "bg-emerald-50/50 border-emerald-300 shadow-md"
              : "bg-white border-slate-200 shadow-sm"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <h2 className="text-sm font-bold text-slate-900">Green Target Group (TG-Candidate-2)</h2>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                !rollbackDone
                  ? "bg-emerald-100 text-emerald-800 animate-pulse"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {!rollbackDone ? "100% TRAFFIC (LIVE)" : "DRAINED (0% TRAFFIC)"}
            </span>
          </div>

          <div className="mt-4 space-y-2 text-xs text-slate-600">
            <div>
              Release: <strong className="text-slate-800">v1.4.2</strong>
            </div>
            <div>
              Commit: <span className="font-mono text-slate-500">a1b2c3d4</span>
            </div>
            <div>
              ECS Tasks: <strong className="text-emerald-700">2 / 2 Healthy</strong>
            </div>
            <div>
              Task Definition:{" "}
              <span className="font-mono text-[11px] text-slate-500">launchcomply-acme-api:4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deployment Log Stream */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-600" />
          Deployment Execution Timeline
        </h3>

        <div className="space-y-2 text-xs">
          {[
            { time: "17:33:20", msg: "Registered ECS task definition revision: launchcomply-acme-api:4", status: "PASS" },
            { time: "17:33:22", msg: "Provisioned Green ECS service with 2 desired Fargate tasks", status: "PASS" },
            { time: "17:33:26", msg: "Green tasks healthy: 2/2 passing container health probe", status: "PASS" },
            { time: "17:33:28", msg: "Executed Alembic database migration: rev_20261001_004 applied cleanly", status: "PASS" },
            { time: "17:33:30", msg: "Automated smoke tests passed: /health (42ms), TLS 1.3 verified", status: "PASS" },
            { time: "17:33:32", msg: "Promoted traffic weight: 100% Green, 0% Blue. Release marked LIVE", status: "LIVE" },
          ].map((log, idx) => (
            <div
              key={idx}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-[11px] text-slate-400">{log.time}</span>
                <span className="text-slate-800 font-medium">{log.msg}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {log.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
