"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  ArrowRight,
  Download,
  Calendar,
  Layers,
  ShieldCheck,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { platformAdminApi } from "@/lib/api/modules";

export default function PlatformAdminAnalyticsPage() {
  const [revenueData, setRevenueData] = useState<any>(null);
  const [funnelData, setFunnelData] = useState<any>(null);
  const [cohortsData, setCohortsData] = useState<any[]>([]);
  const [drilldownData, setDrilldownData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [rev, funnel, cohorts, drill] = await Promise.all([
        platformAdminApi.getRevenueDashboard(),
        platformAdminApi.getActivationFunnel(),
        platformAdminApi.getCohorts(),
        platformAdminApi.getRevenueDrilldown(),
      ]);
      setRevenueData(rev);
      setFunnelData(funnel);
      setCohortsData(cohorts || []);
      setDrilldownData(drill);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExportCSV = () => {
    if (!revenueData) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Metric,Value,Category\n" +
      `Live MRR,${revenueData?.summary?.live_mrr || 0},LIVE\n` +
      `ARR Run Rate,${revenueData?.summary?.arr_run_rate || 0},LIVE\n` +
      `Paid Customers,${revenueData?.summary?.paid_customers_count || 0},LIVE\n` +
      `Active Trials,${revenueData?.summary?.active_trials_count || 0},LIVE\n` +
      `Service Revenue,${revenueData?.summary?.service_revenue_total || 0},PROFESSIONAL_SERVICES\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `launchcomply_business_metrics_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>Executive Revenue & Product Telemetry</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                Real Revenue & Business Analytics Hub
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Strict financial isolation of LIVE vs TEST vs DEMO revenue, primary activation funnel, and cohort retention.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchAnalytics}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow transition"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Real Revenue Hero Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Live MRR */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Monthly Recurring (MRR)</span>
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                ₹{revenueData?.summary?.live_mrr?.toLocaleString("en-IN") || "0"}
              </span>
              <span className="text-xs text-slate-500">/month</span>
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
              <span className="font-semibold text-slate-700">ARR Run Rate:</span>
              <span>₹{revenueData?.summary?.arr_run_rate?.toLocaleString("en-IN") || "0"}</span>
            </div>
          </div>

          {/* Paid Customers */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid Live Customers</span>
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {revenueData?.summary?.paid_customers_count || 0}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Active Subscriptions</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Active Trials: <span className="font-semibold text-slate-700">{revenueData?.summary?.active_trials_count || 0}</span> · Churn: {revenueData?.summary?.churn_rate_percent || 0}%
            </p>
          </div>

          {/* Service Revenue */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Professional Services Revenue</span>
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                ₹{revenueData?.summary?.service_revenue_total?.toLocaleString("en-IN") || "0"}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Tracked separately from recurring SaaS MRR (§59).
            </p>
          </div>

          {/* Revenue Isolation Mode */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Separation Mode</span>
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {revenueData?.summary?.live_billing_status || "AWAITING_LIVE_PAYMENT_ACCEPTANCE"}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Demo and staging tenants strictly quarantined from analytics (§16, §110).
            </p>
          </div>
        </div>

        {/* Financial Separation Breakdown Table (§110, §111) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-900">
              Environment Financial Separation Table (§110)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly labels LIVE vs TEST vs DEMO financial metrics.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Environment Tier</th>
                  <th className="px-4 py-3">Mode Description</th>
                  <th className="px-4 py-3">Active Subscriptions</th>
                  <th className="px-6 py-3">Recorded MRR</th>
                  <th className="px-4 py-3 text-right">Counted in Live ARR?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr className="hover:bg-slate-50/50">
                  <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>LIVE</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">
                    Production recurring subscriptions via live verified payment gateways.
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-800">
                    {revenueData?.environment_breakdown?.live?.active_subscriptions || 0}
                  </td>
                  <td className="px-6 py-3.5 font-bold text-emerald-700">
                    ₹{revenueData?.environment_breakdown?.live?.mrr?.toLocaleString("en-IN") || 0}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-emerald-600 text-xs">
                    YES (Canonical)
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span>TEST</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">
                    Sandbox checkouts, integration test transactions, and local test adapters.
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-800">
                    {revenueData?.environment_breakdown?.test?.active_subscriptions || 0}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-600">
                    ₹{revenueData?.environment_breakdown?.test?.mrr?.toLocaleString("en-IN") || 0}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-400 text-xs">
                    NO (Excluded)
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>DEMO</span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">
                    Public demo tenants (demo.launchcomply.com) and sales presentation mock data.
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-800">
                    {revenueData?.environment_breakdown?.demo?.active_subscriptions || 0}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-600">
                    ₹{revenueData?.environment_breakdown?.demo?.mrr?.toLocaleString("en-IN") || 0}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-400 text-xs">
                    NO (Excluded)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Primary Activation Funnel (§25–28) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Primary Activation Funnel & Time-to-Value (§25–29)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                North Star: <span className="font-semibold text-slate-800">APPLICATIONS_REACHING_PRODUCTION_READINESS</span> · Primary Event: FIRST_PRODUCTION_ARCHITECTURE_GENERATED
              </p>
            </div>
            <div className="text-xs text-slate-600 font-semibold bg-slate-100 px-3 py-1.5 rounded-lg">
              Overall Activation Rate: {funnelData?.activation_rate_percent || 0}%
            </div>
          </div>

          <div className="space-y-3">
            {(funnelData?.steps || []).map((step: any, idx: number) => {
              const pct = step.conversion_percent || 100;
              return (
                <div key={step.step} className="border border-slate-100 rounded-lg p-3 hover:bg-slate-50/50 transition">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[11px]">{idx + 1}.</span>
                      <span className="font-bold text-slate-900">{step.label}</span>
                      <span className="font-mono text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                        {step.count}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                      <span>Avg Time: <strong className="text-slate-800">{step.avg_time_to_step}</strong></span>
                      <span>Conversion: <strong className="text-indigo-600">{pct}%</strong></span>
                      {step.drop_off_percent > 0 && (
                        <span>Drop-off: <strong className="text-rose-500">{step.drop_off_percent}%</strong></span>
                      )}
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Cohorts Table (§61) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-base font-bold text-slate-900">
              Monthly Cohort Retention & Conversion (§61)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks activation, paid conversion, and 30-day retention by signup cohort.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Cohort Month</th>
                  <th className="px-4 py-3">New Signups</th>
                  <th className="px-4 py-3">Activated Orgs</th>
                  <th className="px-4 py-3">Activation Rate</th>
                  <th className="px-4 py-3">Paid Conversions</th>
                  <th className="px-4 py-3">Conversion Rate</th>
                  <th className="px-6 py-3 text-right">30-Day Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {cohortsData.map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-3.5 font-bold text-slate-900 font-mono">
                      {c.cohort_month}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">
                      {c.signups}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">
                      {c.activated_count}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-indigo-600 text-xs">
                      {c.activation_rate_percent}%
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-700">
                      {c.paid_conversions}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-emerald-600 text-xs">
                      {c.conversion_rate_percent}%
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-900 text-xs">
                      {c.retention_30d_percent}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Revenue Drilldown with End-to-End Lineage (§75-77) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Revenue Provenance &amp; Transaction Drilldown (§75–77)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every rupee/dollar traces to: Organization &rarr; Subscription &rarr; Invoice &rarr; Payment &rarr; Reconciliation.
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-700 font-mono">
              Records: {drilldownData?.total_records || 0}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Customer / Classification</th>
                  <th className="px-4 py-3">Plan / Entity</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Reality Status</th>
                  <th className="px-6 py-3">Audit Provenance Lineage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {(drilldownData?.records || []).map((rec: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-3">
                      <div className="font-bold text-slate-900 font-sans">{rec.organization_name}</div>
                      <div className="text-[10px] text-slate-400">{rec.customer_classification}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-800">{rec.plan_tier}</span>
                      <div className="text-[10px] text-slate-400">{rec.entity_type}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      ₹{rec.amount?.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {rec.payment_source}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rec.reality_status === "RECONCILED"
                            ? "bg-emerald-100 text-emerald-800"
                            : rec.reality_status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {rec.reality_status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[11px] text-slate-500 max-w-md truncate">
                      {rec.lineage_path}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
