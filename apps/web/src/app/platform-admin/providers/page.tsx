"use client";

import { getAuthToken } from "@/lib/api";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Server,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Mail,
  Cloud,
  Database,
  Lock,
  Layers,
  Activity,
  ArrowRight,
  RefreshCw
} from "lucide-react";

interface ProviderItem {
  provider: string;
  category: string;
  mode: string;
  status: string;
  details: string;
  last_check: string;
}

export default function PlatformAdminProvidersPage() {
  const [providers, setProviders] = useState<ProviderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken() || "";
      const res = await fetch("/api/v1/platform-admin/providers-matrix", {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setProviders(await res.json());
      } else {
        setProviders([]);
        setError(`Provider status is unavailable (HTTP ${res.status}).`);
      }
    } catch (err) {
      setProviders([]);
      setError("Provider status could not be retrieved. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">Live Provider Reality Matrix</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  REALITY AUDIT
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Zero ambiguity. Verified connection state across database, payments, cloud roles, email, and backup subsystems.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchProviders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Diagnostics
          </button>
          <Link
            href="/platform-admin/launch"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-md transition"
          >
            Launch Center
          </Link>
        </div>
      </div>

      {/* Providers Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold uppercase text-slate-400 bg-slate-950/60">
                <th className="py-3.5 px-4">Subsystem / Provider</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Operating Mode</th>
                <th className="py-3.5 px-4">Reality Status</th>
                <th className="py-3.5 px-4">Verification Details</th>
                <th className="py-3.5 px-4">Last Checked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {providers.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {p.provider}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-indigo-300">
                    {p.mode}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      p.status === "PASS" || p.status === "CONNECTED"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : p.status === "SIMULATED" || p.status === "CONFIGURED"
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-300">
                    {p.details}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                    {new Date(p.last_check).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
