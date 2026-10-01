"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  User,
  ExternalLink,
  ChevronRight,
  FileText,
  Plus,
  X,
} from "lucide-react";

export default function IncidentsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostmortem, setSelectedPostmortem] = useState<string | null>(null);

  const samplePostmortem = `# Postmortem: ALB Target Connection Flap during v1.4.1 deployment

## Executive Summary
- **Incident ID**: \`inc-78a9c2b4\`
- **Severity**: SEV2
- **Commander**: Alex Mercer
- **Detected**: 2026-09-28 14:22:00 UTC
- **Resolved**: 2026-09-28 14:36:00 UTC
- **Time to Resolution**: 14 minutes

## Impact
Transient 502 Bad Gateway errors observed on ALB public endpoints for 4 minutes during rolling traffic shift. 0.8% of user requests encountered connection drops before failing over.

## Timeline
- **14:22 UTC** \`[ALERT_FIRED]\`: ALB 5xx rate exceeded 1.0% threshold (spiked to 3.2%).
- **14:23 UTC** \`[RELEASE_DEPLOYED]\`: Release v1.4.1 was promoted to 100% traffic weight.
- **14:26 UTC** \`[USER_ACTION]\` (Alex Mercer): Investigated target group connection metrics. Identified connection resets on old task instances.
- **14:30 UTC** \`[USER_ACTION]\` (Alex Mercer): Adjusted ALB deregistration delay from 10s to 30s in OpenTofu configuration.
- **14:36 UTC** \`[HEALTH_RESTORED]\`: Ingress 5xx returned to 0.08%, health status returned to HEALTHY.

## Root Cause Analysis
Connection draining delay was set to 10 seconds, which was lower than the ECS task SIGTERM graceful shutdown grace period of 15 seconds. In-flight requests were abruptly aborted when tasks exited.

## Corrective Actions & Prevention
- [x] Increased ALB deregistration delay to 30s across all production target groups.
- [x] Added automated pre-drain connection check in smoke test suites.
- [x] Configured deterministic auto-rollback policy for high 5xx spikes.
`;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">
            <span>Enterprise Reliability</span>
            <span>•</span>
            <span>SEV1–SEV4 Incident Command</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Incident Command Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            One-click declaration, automated timeline recording, deterministic rollback correlation, and structured postmortems.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 shadow-sm shadow-rose-600/20 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Declare Incident
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Active Incidents</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">0 Open</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Production is healthy</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Mean Time to Resolution (MTTR)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">14 minutes</div>
          <div className="text-xs text-slate-500 mt-1">Target: &lt; 30 minutes</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Resolved This Month</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">1 Incident</div>
          <div className="text-xs text-emerald-600 mt-1">100% postmortems completed</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Auto-Rollback Policy</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">DETERMINISTIC</div>
          <div className="text-xs text-slate-500 mt-1">Enforced on 5xx breach</div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Incident History & Retrospectives</h2>
          <span className="text-xs text-slate-500">Linked to releases, alerts, and commit SHAs</span>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  SEV2
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  RESOLVED
                </span>
                <span className="text-xs text-slate-400 font-mono">#INC-78A9C2</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">ALB Target Connection Flap during v1.4.1 deployment</h3>
              <p className="text-xs text-slate-600">
                Transient 502 Bad Gateway errors observed on ALB public endpoints for 4 minutes during rolling shift.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                <span>Commander: Alex Mercer</span>
                <span>•</span>
                <span>Detected: 2026-09-28 14:22 UTC</span>
                <span>•</span>
                <span>Duration: 14 mins</span>
                <span>•</span>
                <span>Correlated Release: v1.4.1</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button
                onClick={() => setSelectedPostmortem(samplePostmortem)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
              >
                <FileText className="w-3.5 h-3.5" />
                View Postmortem
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Postmortem Modal */}
      {selectedPostmortem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Structured Incident Postmortem</h3>
              </div>
              <button
                onClick={() => setSelectedPostmortem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 prose prose-slate max-w-none text-xs">
              <pre className="font-sans whitespace-pre-wrap text-slate-800 leading-relaxed bg-white border-0 p-0">
                {selectedPostmortem}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Declare Incident Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Declare Production Incident</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Incident Title</label>
                <input
                  type="text"
                  defaultValue="Elevated API 5xx Error Rate Spike on ALB"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Severity</label>
                  <select defaultValue="SEV2" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900">
                    <option value="SEV1">SEV1 - Critical Production Down</option>
                    <option value="SEV2">SEV2 - Major Customer Impact</option>
                    <option value="SEV3">SEV3 - Moderate Degradation</option>
                    <option value="SEV4">SEV4 - Minor / Operational Issue</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Commander</label>
                  <input
                    type="text"
                    defaultValue="Alex Mercer"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Impact Description</label>
                <textarea
                  rows={3}
                  defaultValue="Users experiencing intermittent gateway timeouts when accessing dashboard APIs."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-[11px] text-slate-600">
                <div className="font-semibold text-slate-800">Auto-Linked Context</div>
                <div>Environment: Production (ap-south-1)</div>
                <div>Active Release: v1.4.2 (Commit a7b3e9f)</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert("Incident declared! Automated timeline logging initialized.");
                  setShowCreateModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition"
              >
                Declare & Dispatch Alerts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
