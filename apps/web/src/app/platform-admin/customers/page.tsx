"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
  Shield,
  Activity
} from "lucide-react";

interface Customer360 {
  id: string;
  name: string;
  slug: string;
  tier: "STARTER" | "GROWTH" | "BUSINESS" | "ENTERPRISE";
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELLED";
  mrr: string;
  healthStatus: "HEALTHY" | "NEEDS_ATTENTION" | "AT_RISK";
  healthScore: number;
  appsCount: number;
  lastDeployment: string;
  milestone: string;
  healthReasons: string[];
}

export default function PlatformAdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer360[]>([
    {
      id: "org-1",
      name: "AcmeCloud SaaS",
      slug: "acmecloud",
      tier: "BUSINESS",
      status: "ACTIVE",
      mrr: "₹49,999",
      healthStatus: "HEALTHY",
      healthScore: 98,
      appsCount: 1,
      lastDeployment: "3 days ago (ap-south-1)",
      milestone: "FIRST_COMPLIANCE_FRAMEWORK",
      healthReasons: ["Active subscription paid on time", "Continuous evidence fresh (91%)", "Zero critical security findings"]
    },
    {
      id: "org-2",
      name: "Northstar FinTech",
      slug: "northstar-fintech",
      tier: "GROWTH",
      status: "ACTIVE",
      mrr: "₹19,999",
      healthStatus: "HEALTHY",
      healthScore: 90,
      appsCount: 2,
      lastDeployment: "5 days ago (ap-south-1)",
      milestone: "FIRST_DEPLOYMENT",
      healthReasons: ["Active subscription", "Multi-AZ database deployed"]
    },
    {
      id: "org-3",
      name: "BlueLedger Healthcare",
      slug: "blueledger-health",
      tier: "STARTER",
      status: "TRIALING",
      mrr: "₹4,999",
      healthStatus: "NEEDS_ATTENTION",
      healthScore: 65,
      appsCount: 1,
      lastDeployment: "11 days ago",
      milestone: "FIRST_ARCHITECTURE_GENERATED",
      healthReasons: ["Trial expiring in 3 days", "No production deployment completed yet"]
    }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTier, setFilterTier] = useState("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer360 | null>(null);

  const filtered = customers.filter(c => {
    const matchesTier = filterTier === "ALL" || c.tier === filterTier;
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Platform CRM & Customer Success</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Customer 360 Directory</h1>
          <p className="text-sm text-slate-400 mt-1">
            Holistic view of tenant subscription tiers, MRR contribution, explainable retention health, and technical milestones.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2">
          {["ALL", "STARTER", "GROWTH", "BUSINESS", "ENTERPRISE"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterTier(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTier === t
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search tenant name or slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 pl-4">Customer Organization</th>
                <th className="p-3">Plan Tier</th>
                <th className="p-3">Status</th>
                <th className="p-3">MRR</th>
                <th className="p-3">Customer Health</th>
                <th className="p-3">Latest Milestone</th>
                <th className="p-3 pr-4 text-right">360 View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 pl-4">
                    <div className="font-semibold text-white">{c.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">/{c.slug}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-400 border border-slate-700">
                      {c.tier}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      c.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3 font-semibold text-white">{c.mrr}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.healthStatus === "HEALTHY" ? "bg-cyan-500/10 text-cyan-400" : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {c.healthStatus} ({c.healthScore}%)
                    </span>
                  </td>
                  <td className="p-3 text-[11px] font-mono text-slate-400">{c.milestone}</td>
                  <td className="p-3 pr-4 text-right">
                    <button
                      onClick={() => setSelectedCustomer(c)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360 Inspection Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedCustomer.name}</h3>
                <span className="text-[11px] font-mono text-cyan-400">Organization ID: {selectedCustomer.id}</span>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-slate-400 uppercase text-[10px] font-bold">Explainable Retention Health Analysis</div>
                <div className="space-y-1">
                  {selectedCustomer.healthReasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Monthly MRR</div>
                  <div className="text-sm font-bold text-white mt-0.5">{selectedCustomer.mrr}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">Active Workloads</div>
                  <div className="text-sm font-bold text-white mt-0.5">{selectedCustomer.appsCount} Apps</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
