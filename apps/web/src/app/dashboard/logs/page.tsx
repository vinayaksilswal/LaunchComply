"use client";

import React, { useState } from "react";
import {
  ScrollText,
  Search,
  Filter,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Clock,
  Layers,
} from "lucide-react";

export default function LogsExplorerPage() {
  const [search, setSearch] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [selectedService, setSelectedService] = useState("ALL");

  const sampleLogs = [
    {
      timestamp: "2026-10-01 16:12:04 UTC",
      service: "api",
      severity: "INFO",
      message: "Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)",
      correlation_id: "req-9a4f21",
    },
    {
      timestamp: "2026-10-01 16:12:05 UTC",
      service: "api",
      severity: "INFO",
      message: "Application startup complete. Database pool connected (min=5, max=20).",
      correlation_id: "req-9a4f22",
    },
    {
      timestamp: "2026-10-01 16:12:10 UTC",
      service: "web",
      severity: "INFO",
      message: "Next.js 15.0 ready in 142ms on port 3000.",
      correlation_id: "req-8b3c10",
    },
    {
      timestamp: "2026-10-01 16:12:15 UTC",
      service: "worker",
      severity: "INFO",
      message: "Worker task consumer listening on SQS queue 'acme-tasks-prod'.",
      correlation_id: "job-c19d44",
    },
    {
      timestamp: "2026-10-01 16:14:22 UTC",
      service: "api",
      severity: "WARN",
      message: "Slow query detected: SELECT * FROM audit_events WHERE org_id = 'demo' (248ms)",
      correlation_id: "req-3e7a91",
    },
    {
      timestamp: "2026-10-01 16:15:00 UTC",
      service: "api",
      severity: "INFO",
      message: "HTTP GET /api/v1/health returned 200 OK (latency: 18.2ms)",
      correlation_id: "req-4a8f30",
    },
    {
      timestamp: "2026-10-01 16:16:45 UTC",
      service: "api",
      severity: "INFO",
      message: "Authenticated user Alex Mercer (token: [***REDACTED***]) via JWT session",
      correlation_id: "req-5b9c41",
    },
    {
      timestamp: "2026-10-01 16:18:12 UTC",
      service: "worker",
      severity: "INFO",
      message: "Executed scheduled report generation batch job: 142 records compiled",
      correlation_id: "job-e20a55",
    },
  ];

  const filteredLogs = sampleLogs.filter((log) => {
    if (selectedSeverity !== "ALL" && log.severity !== selectedSeverity) return false;
    if (selectedService !== "ALL" && log.service !== selectedService) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>CloudWatch Logs Insights</span>
            <span>•</span>
            <span>Credential Redaction</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Application Log Explorer</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time sanitized application, container, and ingress access logs with zero secret leakage.
          </p>
        </div>

        {/* Zero-Leakage Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Log Redaction Active: Passwords, GitHub & AWS Keys Redacted</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs by message, path, query, or exception..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="ALL">All Services</option>
            <option value="api">api (FastAPI)</option>
            <option value="web">web (Next.js)</option>
            <option value="worker">worker (SQS)</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white"
          >
            <option value="ALL">All Severities</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
      </div>

      {/* Log Console Viewer */}
      <div className="bg-slate-950 text-slate-200 rounded-xl font-mono text-xs shadow-lg border border-slate-800 overflow-hidden">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>/ecs/launchcomply/acme-saas/production/*</span>
          </div>
          <span className="text-[11px] text-slate-500">Showing {filteredLogs.length} entries</span>
        </div>

        <div className="divide-y divide-slate-900 max-h-[600px] overflow-y-auto">
          {filteredLogs.map((log, idx) => (
            <div key={idx} className="p-3 hover:bg-slate-900/60 flex items-start gap-4 transition">
              <span className="text-slate-500 whitespace-nowrap text-[11px]">{log.timestamp}</span>

              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${
                  log.severity === "CRITICAL" || log.severity === "ERROR"
                    ? "bg-rose-950 text-rose-400 border border-rose-800"
                    : log.severity === "WARN"
                    ? "bg-amber-950 text-amber-400 border border-amber-800"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {log.severity}
              </span>

              <span className="text-cyan-400 text-[11px] whitespace-nowrap flex-shrink-0">
                [{log.service}]
              </span>

              <span className="text-slate-300 flex-1 break-all leading-relaxed">
                {log.message}
              </span>

              <span className="text-slate-600 text-[10px] whitespace-nowrap hidden md:inline">
                {log.correlation_id}
              </span>
            </div>
          ))}

          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              No log events matched your search criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
