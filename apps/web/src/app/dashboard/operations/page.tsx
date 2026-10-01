"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  Database,
  Globe,
  DollarSign,
  FileCheck2,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Cpu,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Bell,
  Lock,
} from "lucide-react";

export default function OperationsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleAcknowledge = (id: string) => {
    setAcknowledged((prev) => [...prev, id]);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 uppercase tracking-wider mb-1">
            <span>Enterprise Day-2 Operations</span>
            <span>•</span>
            <span>CloudWatch Telemetry</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operations Command Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Continuous production observability, SLO tracking, incident response, and recoverability assurance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-600" : ""}`} />
            Refresh Signals
          </button>
          <Link
            href="/dashboard/incidents"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-sm shadow-rose-600/20 transition"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Declare Incident
          </Link>
        </div>
      </div>

      {/* Production Health Hero Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  HEALTHY
                </span>
                <span className="text-xs text-slate-500">Live Release v1.4.2 (LIVE_STABLE)</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">Production System Operating Nominally</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                All 7 monitored operational subsystems meet SLO availability and latency targets with zero active critical alarms.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6 pt-4 lg:pt-0">
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Availability</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">99.98%</div>
              <div className="text-[10px] text-emerald-600 font-medium">SLO Target: 99.9%</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">p95 Latency</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">183ms</div>
              <div className="text-[10px] text-emerald-600 font-medium">&lt; 500ms target</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">ALB 5xx Rate</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">0.12%</div>
              <div className="text-[10px] text-emerald-600 font-medium">&lt; 1.0% threshold</div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase">ECS Tasks</div>
              <div className="text-xl font-bold text-slate-900 mt-0.5">2 / 2</div>
              <div className="text-[10px] text-emerald-600 font-medium">0 restarts in 24h</div>
            </div>
          </div>
        </div>
      </div>

      {/* Subsystem Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Ingress & ALB */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-600" />
              <h3 className="text-sm font-bold text-slate-900">ALB Ingress & Traffic</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              HEALTHY
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Request Throughput</span>
              <span className="font-semibold text-slate-800">2,400 req/min</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Target Response Time</span>
              <span className="font-semibold text-slate-800">45ms avg / 183ms p95</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Healthy Backend Targets</span>
              <span className="font-semibold text-emerald-600">2 Healthy / 0 Unhealthy</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">AWS WAF Rules</span>
              <span className="font-semibold text-slate-800">1,620 allowed / 4 blocked</span>
            </div>
          </div>
        </div>

        {/* ECS Compute */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">ECS Fargate Cluster</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              HEALTHY
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Service: &apos;api&apos; (FastAPI)</span>
              <span className="font-semibold text-slate-800">2/2 Desired Running</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Service: &apos;worker&apos; (SQS)</span>
              <span className="font-semibold text-slate-800">1/1 Desired Running</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Average CPU Utilization</span>
              <span className="font-semibold text-slate-800">28.5% (Safe)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Memory Working Set</span>
              <span className="font-semibold text-slate-800">42.0% (340 MB / task)</span>
            </div>
          </div>
        </div>

        {/* RDS PostgreSQL */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">RDS PostgreSQL Primary</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              HEALTHY
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Active Connections</span>
              <span className="font-semibold text-slate-800">22 / 100 max</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Storage Free Space</span>
              <span className="font-semibold text-slate-800">84.0 GB free (gp3)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Read / Write Latency</span>
              <span className="font-semibold text-slate-800">2.1ms / 4.5ms</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Disk Queue Depth</span>
              <span className="font-semibold text-slate-800">0.1 (Optimal)</span>
            </div>
          </div>
        </div>

        {/* Backup & DR Assurance */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-900">Backup & DR Readiness</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              VERIFIED
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Latest RDS Snapshot</span>
              <span className="font-semibold text-slate-800">2 hours ago (14.2 GB)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Observed RPO</span>
              <span className="font-semibold text-emerald-600">PASS (120 min &lt; 24h)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Last Restore Drill</span>
              <span className="font-semibold text-slate-800">Tested 12 days ago</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Measured RTO</span>
              <span className="font-semibold text-emerald-600">18m 42s (Target &lt; 60m)</span>
            </div>
          </div>
        </div>

        {/* Security Signals */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Cloud Security Signals</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              1 MEDIUM
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">AWS GuardDuty</span>
              <span className="font-semibold text-amber-700">Recon:IAMUser (Investigating)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">AWS Security Hub</span>
              <span className="font-semibold text-slate-800">0 Critical Findings</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Infrastructure Drift</span>
              <span className="font-semibold text-emerald-600">Clean (0 drifts detected)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Active Incidents</span>
              <span className="font-semibold text-slate-800">0 Open</span>
            </div>
          </div>
        </div>

        {/* Cost & Continuous Compliance */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Cost & Compliance Evidence</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              94% CURRENT
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Monthly AWS Spend Forecast</span>
              <span className="font-semibold text-slate-800">₹42,800 / ₹45,000 budget</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">SOC 2 Evidence Coverage</span>
              <span className="font-semibold text-emerald-600">4 / 4 Controls Active</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">ISO 27001 Evidence</span>
              <span className="font-semibold text-emerald-600">2 / 2 Controls Active</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Stale / Expired Evidence</span>
              <span className="font-semibold text-slate-800">0 Stale Records</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-700" />
            <h2 className="text-base font-bold text-slate-900">Configured Alert Rules & Events</h2>
          </div>
          <span className="text-xs text-slate-500">Deduplicated against open storm windows</span>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex items-start gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                CRITICAL
              </span>
              <div>
                <div className="text-xs font-bold text-slate-900">ALB 5xx Error Rate Exceeds 1.0%</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Threshold: &gt; 1.0% for 5 min • Auto-incident: ON • Auto-rollback: ON
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                Current: 0.12% (OK)
              </span>
            </div>
          </div>

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                HIGH
              </span>
              <div>
                <div className="text-xs font-bold text-slate-900">API p95 Latency Exceeds 800ms</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Threshold: &gt; 800.0ms for 5 min • Auto-incident: ON • Auto-rollback: OFF
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                Current: 183ms (OK)
              </span>
            </div>
          </div>

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                HIGH
              </span>
              <div>
                <div className="text-xs font-bold text-slate-900">RDS Free Storage Below 10GB</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Threshold: &lt; 10.0GB for 10 min • Auto-incident: ON • Auto-rollback: OFF
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                Current: 84.0 GB (OK)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Operational Timeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4">Operational Change & Signal Timeline</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-xs">
            <div className="w-2 h-2 rounded-full bg-cyan-600 mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-bold text-slate-800">Application Release v1.4.2 Promoted to LIVE_STABLE</span>
              <span className="text-slate-400 ml-2">3 hours ago</span>
              <p className="text-slate-600 mt-0.5">
                Blue/Green zero-downtime shift verified. Observation window passed with 0 alarms.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-xs">
            <div className="w-2 h-2 rounded-full bg-purple-600 mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-bold text-slate-800">Isolated RDS Restore Drill Verified (RTO: 18m 42s)</span>
              <span className="text-slate-400 ml-2">12 days ago</span>
              <p className="text-slate-600 mt-0.5">
                Temporary target database provisioned from snapshot, schema verified, evidence logged for SOC 2 CC9.1.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-600 mt-1.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-bold text-slate-800">Incident #INC-001 Resolved & Postmortem Published</span>
              <span className="text-slate-400 ml-2">14 days ago</span>
              <p className="text-slate-600 mt-0.5">
                ALB deregistration delay adjusted to 30s. Zero further connection termination drops observed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
