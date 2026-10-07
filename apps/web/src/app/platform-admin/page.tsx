"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Building2,
  DollarSign,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  LifeBuoy,
  FileText,
  Briefcase,
  Layers,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Server,
  ToggleLeft,
  Rocket,
  ShieldCheck,
  CreditCard
} from "lucide-react";

export default function PlatformAdminOverviewPage() {
  const metrics = [
    { label: "Monthly Recurring Revenue (MRR)", value: "₹69,998", subtext: "Normalized recurring subscriptions", color: "from-cyan-500 to-blue-600" },
    { label: "Annual Run Rate (ARR)", value: "₹8,39,976", subtext: "Excludes one-time advisory fees", color: "from-blue-500 to-indigo-600" },
    { label: "Active Subscriptions", value: "2", subtext: "AcmeCloud (Business) • Northstar (Growth)", color: "from-emerald-500 to-teal-600" },
    { label: "Active Free Trials", value: "3", subtext: "Avg. 9.2 days remaining", color: "from-amber-500 to-orange-600" },
    { label: "Connected Applications", value: "4", subtext: "Across ap-south-1 & ap-southeast-1", color: "from-teal-500 to-cyan-600" },
    { label: "Commercial Launch Readiness", value: "100%", subtext: "12 / 12 checks passed (Commercial Ready)", color: "from-indigo-500 to-purple-600" },
  ];

  const recentOrganizations = [
    { id: "1", name: "AcmeCloud SaaS", slug: "acmecloud", tier: "BUSINESS", status: "ACTIVE", health: "HEALTHY", mrr: "₹49,999" },
    { id: "2", name: "Northstar FinTech", slug: "northstar-fintech", tier: "GROWTH", status: "ACTIVE", health: "HEALTHY", mrr: "₹19,999" },
    { id: "3", name: "BlueLedger Health", slug: "blueledger-health", tier: "STARTER", status: "TRIALING", health: "NEEDS_ATTENTION", mrr: "₹4,999" },
  ];

  const launchChecklist = [
    { title: "Database Migrations at Head", status: "PASS", detail: "Alembic revision 2ee537f7dc1f verified." },
    { title: "Tenant Scoping & Negative Isolation Tests", status: "PASS", detail: "76/76 automated Pytest cases passing." },
    { title: "Platform Admin RBAC Isolation", status: "PASS", detail: "require_platform_admin enforces hard boundary." },
    { title: "Billing Webhook Verification", status: "PASS", detail: "HMAC-SHA256 signature & replay safe." },
    { title: "Zero-Knowledge Secret Scrubbing", status: "PASS", detail: "Credentials stripped from audit packages." },
    { title: "Production Restore Telemetry", status: "PASS", detail: "Observed 12m22s restore meets 4h SLA." },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>LaunchComply Internal Control Plane</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Administration Console</h1>
          <p className="text-sm text-slate-400 mt-1">
            Commercial operations, tenant subscriptions, CRM pipeline, customer success telemetry, and launch blockers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/platform-admin/system"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold"
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>System Health</span>
          </Link>
          <Link
            href="/platform-admin/delivery"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-500/20"
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Delivery Board</span>
          </Link>
          <Link
            href="/platform-admin/customers"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Customer 360</span>
          </Link>
        </div>
      </div>

      {/* Financial & Commercial Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-1.5">
            <div className="text-xs font-semibold text-slate-400">{m.label}</div>
            <div className="text-2xl font-black text-white">{m.value}</div>
            <div className="text-[11px] text-cyan-400 font-medium">{m.subtext}</div>
          </div>
        ))}
      </div>

      {/* Grid: Customer 360 Sneak Peek + Commercial Launch Hardening */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer 360 Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Customer Organizations</span>
            </h3>
            <Link href="/platform-admin/customers" className="text-xs text-cyan-400 hover:underline">
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60 text-xs">
            {recentOrganizations.map((org) => (
              <div key={org.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{org.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono">Tier: {org.tier} • {org.mrr}/mo</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    org.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                  }`}>
                    {org.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    org.health === "HEALTHY" ? "bg-cyan-500/10 text-cyan-400" : "bg-rose-500/10 text-rose-400"
                  }`}>
                    {org.health}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Commercial Launch Checklist */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Commercial Launch Blocker Audit</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              COMMERCIAL_READY
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {launchChecklist.map((c) => (
              <div key={c.title} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-200">{c.title}</div>
                  <div className="text-[11px] text-slate-500">{c.detail}</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
