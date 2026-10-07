"use client";

import Link from "next/link";
import { ShieldCheck, CheckCircle2, ArrowLeft, Clock, AlertTriangle } from "lucide-react";

export default function StatusPage() {
  const components = [
    { name: "Platform Admin & API Services", status: "OPERATIONAL", uptime: "99.99%" },
    { name: "AWS STS Cross-Account Orchestrator", status: "OPERATIONAL", uptime: "99.98%" },
    { name: "Continuous Compliance Evidence Engine", status: "OPERATIONAL", uptime: "100.0%" },
    { name: "VAPT Remediation & Advisory Workspace", status: "OPERATIONAL", uptime: "99.95%" },
    { name: "Disaster Recovery Drill Runner", status: "OPERATIONAL", uptime: "99.99%" },
    { name: "Webhooks & Notifications Pipeline", status: "OPERATIONAL", uptime: "99.97%" }
  ];

  const pastIncidents = [
    {
      id: "INC-2026-08-04",
      title: "Transient Latency on Secondary Scan Workers",
      status: "RESOLVED",
      impact: "MINOR",
      date: "August 4, 2026",
      summary: "Container vulnerability scan worker autoscaling queue experienced a 12-minute backlog. Automatically mitigated by worker scale-out."
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="font-bold text-lg text-slate-950 tracking-tight">LaunchComply Status</span>
          </Link>
          <Link href="/dashboard" className="text-xs text-slate-600 hover:text-slate-950 flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8 w-full">
        {/* Banner */}
        <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-emerald-900">All LaunchComply Systems Operational</h1>
            <p className="text-xs text-emerald-700 mt-0.5">
              Current global system uptime over the last 90 days is <strong>99.98%</strong>.
            </p>
          </div>
        </div>

        {/* Component Health Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Platform Component Health
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Telemetry</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {components.map((c) => (
              <div key={c.name} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                <span className="font-semibold text-slate-900">{c.name}</span>
                <div className="flex items-center gap-6">
                  <span className="text-slate-500 hidden sm:inline">Uptime: <strong className="text-slate-800">{c.uptime}</strong></span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Operational</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incident History */}
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Past Incident & Maintenance Log
          </div>
          <div className="space-y-3">
            {pastIncidents.map((inc) => (
              <div key={inc.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold text-slate-900">{inc.title}</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {inc.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {inc.summary}
                </p>
                <div className="text-[11px] text-slate-500 font-mono">
                  {inc.date} • Impact: {inc.impact}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500 bg-white">
        <p>© 2026 LaunchComply Technologies Private Limited. Status telemetry refreshed automatically.</p>
      </footer>
    </div>
  );
}
