"use client";

import React from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Info,
} from "lucide-react";

export default function CostCenterPage() {
  const serviceBreakdown = [
    { service: "Amazon Elastic Container Service (ECS Fargate)", amount: "₹14,200", pct: 33.2, note: "2 API tasks, 1 Worker task" },
    { service: "Amazon Relational Database Service (RDS)", amount: "₹12,800", pct: 29.9, note: "db.t4g.medium, Multi-AZ, 100GB gp3" },
    { service: "Amazon VPC (NAT Gateway Egress)", amount: "₹5,100", pct: 11.9, note: "Private subnet outbound egress" },
    { service: "Elastic Load Balancing (Application Load Balancer)", amount: "₹4,600", pct: 10.7, note: "TLS termination, LCU hours" },
    { service: "Amazon CloudFront (Edge CDN)", amount: "₹2,100", pct: 4.9, note: "Global asset delivery, Brotli" },
    { service: "AWS WAF (Web Application Firewall)", amount: "₹1,600", pct: 3.7, note: "OWASP Core Rule Set evaluation" },
    { service: "Amazon Simple Storage Service (S3)", amount: "₹1,400", pct: 3.3, note: "Encrypted build artifacts & backups" },
    { service: "Amazon CloudWatch & CloudTrail", amount: "₹1,000", pct: 2.3, note: "Custom metrics, sanitized log retention" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            <span>AWS FinOps & Cost Center</span>
            <span>•</span>
            <span>Cost Explorer API Ingestion</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cloud Cost Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time AWS spend tracking, monthly forecasting, budget threshold enforcement, and anomaly detection.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Within Monthly Budget Target</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Monthly Forecast</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">₹42,800</div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Budget: ₹45,000 (95.1%)</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Spend Month-to-Date</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">₹18,420</div>
          <div className="text-xs text-slate-500 mt-1">Period: Oct 1 – Oct 14</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Last Month Total</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">₹39,500</div>
          <div className="text-xs text-slate-500 mt-1">+8.3% MoM (Scaling)</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Anomaly Detection</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">NOMINAL</div>
          <div className="text-xs text-slate-500 mt-1">0 daily spikes &gt; 150% baseline</div>
        </div>
      </div>

      {/* Service Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">AWS Infrastructure Spend by Service</h2>
          <span className="text-xs text-slate-500">Currency: INR (₹) • Normalized AWS Cost Allocation</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-5">AWS Service</th>
                <th className="py-3 px-5">Monthly Forecast</th>
                <th className="py-3 px-5">Share</th>
                <th className="py-3 px-5">Primary Resource Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {serviceBreakdown.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-5 font-semibold text-slate-900">{row.service}</td>
                  <td className="py-3 px-5 font-mono font-bold text-slate-800">{row.amount}</td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-600 rounded-full" style={{ width: `${row.pct}%` }} />
                      </div>
                      <span className="text-slate-500 font-mono text-[11px]">{row.pct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-5 text-slate-500">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost Change Correlation Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-600" />
          <h2 className="text-base font-bold text-slate-900">Operational Change Correlation</h2>
        </div>
        <p className="text-xs text-slate-600">
          LaunchComply correlates spend adjustments directly with audited changes so engineering leads know exactly what prompted resource deltas:
        </p>
        <div className="space-y-2 pt-1 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-800">ECS Task Scaling (+₹3,300/mo)</span>
              <span className="text-slate-500 ml-2">• Correlated with Release v1.4.2 Blue/Green capacity provision</span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">3 hours ago</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-800">RDS PostgreSQL Snapshot Retention (+₹800/mo)</span>
              <span className="text-slate-500 ml-2">• Continuous WAL archiving for 5-minute RPO assurance</span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">14 days ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
