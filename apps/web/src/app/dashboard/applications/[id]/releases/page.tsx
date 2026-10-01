"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Rocket,
  GitCommit,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ArrowRight,
  Layers,
  Activity,
  Plus,
  Play,
  Clock,
  Sparkles,
  Server
} from "lucide-react";
import { ApplicationRelease } from "@/types";

export default function ApplicationReleasesPage() {
  const params = useParams();
  const appId = (params?.id as string) || "demo-app";

  const [releases, setReleases] = useState<ApplicationRelease[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt fetch from backend API with fallback to demo state
    fetch(`/api/backend/applications/${appId}/releases`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setReleases(data);
        } else {
          setReleases(demoReleases);
        }
      })
      .catch(() => {
        setReleases(demoReleases);
      })
      .finally(() => setLoading(false));
  }, [appId]);

  const demoReleases: ApplicationRelease[] = [
    {
      id: "rel-v142-live",
      organization_id: "demo-org",
      application_id: appId,
      environment_id: "env-prod",
      branch: "main",
      commit_sha: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
      version: "v1.4.2",
      status: "LIVE",
      created_by: "Alex Mercer",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      approved_by: "Security Lead",
      deployed_at: new Date(Date.now() - 3600000 * 1.5).toISOString()
    },
    {
      id: "rel-v141-prev",
      organization_id: "demo-org",
      application_id: appId,
      environment_id: "env-prod",
      branch: "main",
      commit_sha: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b",
      version: "v1.4.1",
      status: "SUPERSEDED",
      created_by: "Alex Mercer",
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      approved_by: "Platform Admin",
      deployed_at: new Date(Date.now() - 86400000 * 3).toISOString()
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Application Releases</h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
              Blue/Green Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Build, secure, migrate, verify, and promote immutable application releases.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/applications/${appId}`}
            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" />
            Application Overview
          </Link>
          <Link
            href={`/dashboard/applications/${appId}/releases/new`}
            className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <Rocket className="w-3.5 h-3.5" />
            Deploy New Release
          </Link>
        </div>
      </div>

      {/* Visual Deployment Pipeline Stages */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-600" />
          Production Release Lifecycle Engine
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
          {[
            { step: "1. Source", desc: "Commit sha", status: "PASS" },
            { step: "2. Build", desc: "Multi-stage", status: "PASS" },
            { step: "3. Scan", desc: "0 Critical", status: "PASS" },
            { step: "4. Artifact", desc: "ECR Digest", status: "PASS" },
            { step: "5. Migrate", desc: "DB Schema", status: "PASS" },
            { step: "6. Deploy", desc: "Green Tasks", status: "PASS" },
            { step: "7. Health", desc: "Target Group", status: "PASS" },
            { step: "8. Smoke", desc: "Latency < 50ms", status: "PASS" },
            { step: "9. Traffic", desc: "100% Green", status: "PASS" },
            { step: "10. Live", desc: "Protected", status: "PASS" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col justify-between"
            >
              <div className="text-[11px] font-bold text-slate-800">{item.step}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Verified</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Releases List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Release History ({releases.length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">Rollback Target Group: Standby</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Release Version</th>
                  <th className="py-3 px-4">Commit / Branch</th>
                  <th className="py-3 px-4">Environment</th>
                  <th className="py-3 px-4">Build & Scan</th>
                  <th className="py-3 px-4">Database Migration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Deployed At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {releases.map((rel) => {
                  const isLive = rel.status === "LIVE";
                  return (
                    <tr key={rel.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Version */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                          }`}
                        />
                        <Link
                          href={`/dashboard/applications/${appId}/releases/${rel.id}`}
                          className="hover:text-cyan-600 transition-colors"
                        >
                          {rel.version}
                        </Link>
                      </td>

                      {/* Commit / Branch */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <GitCommit className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rel.commit_sha.slice(0, 7)}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <GitBranch className="w-3 h-3" />
                            {rel.branch}
                          </span>
                        </div>
                      </td>

                      {/* Environment */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Production
                        </span>
                      </td>

                      {/* Build & Scan */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-medium flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Build PASS
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="text-emerald-700 font-medium flex items-center gap-1 text-[11px]">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Scan Clean
                          </span>
                        </div>
                      </td>

                      {/* Migration */}
                      <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                        rev_20261001_004 (PASS)
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isLive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : rel.status === "SUPERSEDED"
                              ? "bg-slate-100 text-slate-600 border-slate-300"
                              : "bg-amber-50 text-amber-700 border-amber-300"
                          }`}
                        >
                          {rel.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {rel.deployed_at ? new Date(rel.deployed_at).toLocaleString() : "Just now"}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/dashboard/applications/${appId}/releases/${rel.id}`}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors inline-flex items-center gap-1"
                        >
                          View Details
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
