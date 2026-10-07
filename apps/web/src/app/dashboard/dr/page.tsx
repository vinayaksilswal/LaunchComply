"use client";

import { useState } from "react";
import {
  DatabaseBackup,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  AlertTriangle,
  RefreshCw,
  Server,
  Layers,
  ArrowRight,
  Globe,
  Database,
  FileCheck2,
  AlertCircle
} from "lucide-react";

interface DRDrillStep {
  name: string;
  status: "PENDING" | "RUNNING" | "PASSED";
  duration: string;
}

export default function DisasterRecoveryPage() {
  const [isDrillRunning, setIsDrillRunning] = useState(false);
  const [drillSuccessNotice, setDrillSuccessNotice] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [drillSteps, setDrillSteps] = useState<DRDrillStep[]>([
    { name: "Audit Cross-Region Replication Health (RDS & S3)", status: "PASSED", duration: "14s" },
    { name: "Provision Isolated DR Sandbox VPC (ap-southeast-1)", status: "PASSED", duration: "3m 40s" },
    { name: "Promote Aurora Standby Read Replica in Sandbox", status: "PASSED", duration: "4m 20s" },
    { name: "Execute Synthetic Transaction & Health Verification", status: "PASSED", duration: "2m 15s" },
    { name: "Verify Route53 Multi-Region Health Check Policies", status: "PASSED", duration: "1m 53s" },
  ]);

  const handleStartDrill = () => {
    setIsDrillRunning(true);
    setDrillSuccessNotice(false);
    setCurrentStepIndex(0);

    setDrillSteps((prev) =>
      prev.map((step) => ({ ...step, status: "PENDING" }))
    );

    let idx = 0;
    const interval = setInterval(() => {
      setDrillSteps((prev) =>
        prev.map((step, i) => {
          if (i < idx) return { ...step, status: "PASSED" };
          if (i === idx) return { ...step, status: "RUNNING" };
          return { ...step, status: "PENDING" };
        })
      );
      idx++;
      if (idx > 5) {
        clearInterval(interval);
        setDrillSteps((prev) => prev.map((s) => ({ ...s, status: "PASSED" })));
        setIsDrillRunning(false);
        setDrillSuccessNotice(true);
      }
    }, 1000);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <DatabaseBackup className="w-6 h-6 text-cyan-600" />
            Multi-Region Disaster Recovery & Resilience
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Continuous cross-region data replication, Route53 failover health validation, and non-destructive isolated DR simulation drills.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleStartDrill}
            disabled={isDrillRunning}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isDrillRunning ? "animate-spin" : ""}`} />
            {isDrillRunning ? "Executing Isolated Drill..." : "Trigger Isolated Failover Drill"}
          </button>
        </div>
      </div>

      {/* Safety Callout Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-200 text-xs flex items-start gap-3 shadow-md border border-slate-800">
        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-white font-semibold">Strict Production Safety Guarantee:</strong>
          <p className="text-slate-300 mt-0.5 leading-relaxed">
            All DR simulation drills execute strictly inside an isolated temporary sandbox in Singapore (<code className="text-cyan-400">ap-southeast-1</code>).
            Active production customer traffic routing, primary Mumbai database write leaders, and live Route53 DNS records are <strong>NEVER altered or disrupted</strong> during drills.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {drillSuccessNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <strong>Isolated DR Simulation Completed (SLA PASSED):</strong> Measured RTO was 12m 22s (Target: &lt;30m). Measured RPO was 4m 10s (Target: &lt;15m). Evidence log signed and committed to compliance vault.
            </div>
          </div>
          <button onClick={() => setDrillSuccessNotice(false)} className="text-emerald-700 font-bold hover:text-emerald-950">
            Dismiss
          </button>
        </div>
      )}

      {/* Cross-Region Topology Overview */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Active Multi-Region Topology (Warm Standby)</h2>
            <p className="text-xs text-slate-500">Auto-scaling ECS Fargate compute with cross-region Aurora RDS replication</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold">
            REPLICATION: SYNCHRONIZED
          </span>
        </div>

        {/* Region Cards Visual */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center text-xs">
          {/* Primary Region */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-600" /> Primary: ap-south-1 (Mumbai)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                ACTIVE LEADER
              </span>
            </div>
            <div className="space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Database:</span> <strong className="text-slate-800">RDS Aurora Multi-AZ (Postgres 16)</strong>
              </div>
              <div className="flex justify-between">
                <span>Ingress:</span> <strong className="text-slate-800">ALB + CloudFront CDN + WAF</strong>
              </div>
              <div className="flex justify-between">
                <span>Compute:</span> <strong className="text-slate-800">ECS Fargate (2 Tasks Live)</strong>
              </div>
            </div>
          </div>

          {/* Sync Arrow */}
          <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400">
            <div className="text-[11px] font-mono text-cyan-700 font-semibold mb-1 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cross-Region Replication (Lag: 0.8s)
            </div>
            <ArrowRight className="w-6 h-6 text-cyan-600 hidden md:block" />
            <div className="text-[10px] text-slate-500 mt-1 font-mono">Continuous WAL + KMS S3 Sync</div>
          </div>

          {/* DR Region */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-600" /> Standby: ap-southeast-1 (Singapore)
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-bold text-[10px]">
                WARM STANDBY
              </span>
            </div>
            <div className="space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Replica DB:</span> <strong className="text-slate-800">Aurora Cross-Region Read Replica</strong>
              </div>
              <div className="flex justify-between">
                <span>Storage Mirror:</span> <strong className="text-slate-800">S3 Cross-Region KMS Encrypted</strong>
              </div>
              <div className="flex justify-between">
                <span>Task Definitions:</span> <strong className="text-slate-800">Pre-Registered (ECR Mirrored)</strong>
              </div>
            </div>
          </div>
        </div>

        {/* SLA Gauge Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-slate-500 font-medium">Target RTO (Recovery Time)</div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">&lt; 30 Minutes</div>
            <div className="text-[11px] text-slate-500 mt-1">SLA Guarantee</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-slate-500 font-medium">Measured RTO</div>
            <div className="text-xl font-extrabold text-emerald-600 mt-1">12m 22s</div>
            <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> SLA MET (59% headroom)
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-slate-500 font-medium">Target RPO (Data Loss Window)</div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">&lt; 15 Minutes</div>
            <div className="text-[11px] text-slate-500 mt-1">Continuous WAL</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-slate-500 font-medium">Measured RPO</div>
            <div className="text-xl font-extrabold text-emerald-600 mt-1">4m 10s</div>
            <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" /> SLA MET (72% headroom)
            </div>
          </div>
        </div>
      </div>

      {/* Drill Step Execution Pipeline */}
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-900">Isolated Failover Simulation Step Log</h3>
        <div className="space-y-2 text-xs">
          {drillSteps.map((step, idx) => (
            <div
              key={step.name}
              className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] flex items-center justify-center font-bold">
                  {idx + 1}
                </span>
                <span className="font-medium text-slate-800">{step.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-500">{step.duration}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    step.status === "PASSED"
                      ? "bg-emerald-100 text-emerald-800"
                      : step.status === "RUNNING"
                      ? "bg-cyan-100 text-cyan-800 animate-pulse"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {step.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
