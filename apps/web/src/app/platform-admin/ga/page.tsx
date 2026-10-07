"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Rocket,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Server,
  ArrowRight,
  Lock,
  Layers,
  Activity,
  Mail,
  CreditCard,
  Users,
  Database,
  RefreshCw,
  FileText,
  BadgeAlert,
  HelpCircle,
  CheckSquare
} from "lucide-react";
import { platformAdminApi } from "@/lib/api/modules";



export default function PlatformAdminGACenterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGAStatus = async () => {
    try {
      setLoading(true);
      const res = await platformAdminApi.getGaStatus();
      setData(res);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load GA status:", err);
      setError("Failed to load live GA status from platform admin API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGAStatus();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                <Rocket className="w-4 h-4" />
                <span>Commercial Release Command Center</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                LaunchComply v1.0 GA Launch Center
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                General Availability validation, verified external provider reality matrix, and Go/No-Go release governance.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchGAStatus}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Matrix</span>
              </button>
              <Link
                href="/platform-admin/customers/first-10"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow transition"
              >
                <Users className="w-4 h-4" />
                <span>First 10 Customers</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Release Status Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-slate-900">
                  Version: {data?.release?.version ?? "Unverified"}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                  {data?.go_no_go_decision ?? "Unverified"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                  Target: 2026-10-04
                </span>
              </div>
              <p className="text-sm text-slate-600">
                Positioning: <span className="font-semibold text-slate-800">&quot;From Localhost to Real Business.&quot;</span> — Deploy. Secure. Audit. Comply.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span>Migration: <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{data?.release?.database_migration ?? "Unverified"}</code></span>
                <span>Artifact: <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{data?.release?.deployment_artifact ?? "Unverified"}</code></span>
                <span>SBOM: <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{data?.release?.sbom_ref ?? "Unverified"}</code></span>
                <span>Rollback: <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{data?.release?.rollback_version ?? "Unverified"}</code></span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2 lg:pt-0">
              <div className="text-right">
                <div className="text-xs text-slate-500 uppercase font-semibold">Live Billing Status</div>
                <div className="text-sm font-bold text-amber-700">
                  {data?.revenue_summary?.live_billing_status || "AWAITING_LIVE_PAYMENT_ACCEPTANCE"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Key Pillars Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Providers Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Providers Audited</span>
              <Server className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {data?.providers_matrix?.length ?? "Unknown"}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Provider evidence required</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Configuration alone does not verify provider connectivity.
            </p>
          </div>

          {/* Card 2: Price Mismatch Blocker */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catalog & Prices</span>
              <CreditCard className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {data?.pricing_review_summary?.total_price_points ?? "Unknown"}
              </span>
              <span className="text-xs text-slate-500">Tiers & Frequencies</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Catalog review required</span>
            </div>
          </div>

          {/* Card 3: Email Health */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transactional Email</span>
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {data?.email_health?.delivery_rate_percent == null ? "Unverified" : `${data.email_health.delivery_rate_percent}%`}
              </span>
              <span className="text-xs text-slate-600 font-semibold">SPF: {data?.email_health?.domain_health?.spf_status ?? "Unverified"} / DKIM: {data?.email_health?.domain_health?.dkim_status ?? "Unverified"}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {data?.email_health?.totals?.sent ?? "Unknown"} sent · {data?.email_health?.totals?.complaints ?? "Unknown"} complaints · DMARC: {data?.email_health?.domain_health?.dmarc_status ?? "Unverified"}
            </p>
          </div>

          {/* Card 4: First 10 Customers */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">First 10 Customers</span>
              <Users className="w-5 h-5 text-amber-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {data?.first_10_customers_count ?? "Unknown"}
              </span>
              <span className="text-xs text-indigo-600 font-semibold">Active Pipeline</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              White-glove pilot onboarding & continuous assurance criteria active.
            </p>
          </div>
        </div>

        {/* 18 External Providers Reality Matrix Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">External Provider Reality Matrix</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Adheres strictly to §6–8 reality principles. Unconfigured third-party credentials are never marked live.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Source: <code className="text-indigo-600">GA_REALITY_MATRIX.md</code>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Capability / Provider</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Provider State</th>
                  <th className="px-6 py-3">Verified Details</th>
                  <th className="px-4 py-3 text-right">GA Blocker?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(data?.providers_matrix ?? []).map((p: any, idx: number) => {
                  const isBlocker = !["REAL_AND_VERIFIED", "DISABLED"].includes(p.status);

                  let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                  if (p.status === "REAL_AND_VERIFIED") {
                    badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  } else if (p.status === "AWAITING_CREDENTIALS" || p.status === "BLOCKER") {
                    badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
                  } else if (p.status === "CONFIGURED") {
                    badgeColor = "bg-blue-50 text-blue-700 border-blue-200";
                  } else if (p.status === "SIMULATED") {
                    badgeColor = "bg-purple-50 text-purple-700 border-purple-200";
                  }

                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        {p.provider}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500 font-medium">
                        {p.category}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-600">
                        {p.mode}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${badgeColor}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600 max-w-md">
                        {p.details}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {isBlocker ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Verification required</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>NO</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Links to Operational Centers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            href="/platform-admin/customers/first-10"
            className="group bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-5 shadow-sm transition block"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                First 10 Customers Program
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
            </div>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Track onboarding stages from Lead → Technical Onboarding → AWS Connected → Live Deployment → Security Attestation → Paid.
            </p>
          </Link>

          <Link
            href="/platform-admin/sales"
            className="group bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-5 shadow-sm transition block"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                Sales Pipeline & Proposals
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
            </div>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Inbound Book Demo requests, sales qualification criteria, and 7 standardized enterprise service proposal templates.
            </p>
          </Link>

          <Link
            href="/platform-admin/customer-success"
            className="group bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-5 shadow-sm transition block"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                Customer Success & Retention
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
            </div>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              Explainable health scores, automated risk alerts (trials ending, payment overdue), and representative action tasks.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
