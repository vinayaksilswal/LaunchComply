"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard, CheckCircle2, Clock, AlertTriangle, Search, Filter } from "lucide-react";

export default function PlatformAdminSubscriptionsPage() {
  const [subscriptions] = useState([
    { id: "sub-1", orgName: "AcmeCloud SaaS", tier: "BUSINESS", amount: "₹49,999", interval: "MONTHLY", status: "ACTIVE", provider: "STRIPE", renewal: "2026-10-31" },
    { id: "sub-2", orgName: "Northstar FinTech", tier: "GROWTH", amount: "₹19,999", interval: "MONTHLY", status: "ACTIVE", provider: "RAZORPAY", renewal: "2026-11-04" },
    { id: "sub-3", orgName: "BlueLedger Health", tier: "STARTER", amount: "₹4,999", interval: "MONTHLY", status: "PAST_DUE", provider: "STRIPE", renewal: "Grace period active" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Revenue Operations</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Active Subscriptions</h1>
          <p className="text-sm text-slate-400 mt-1">Tenant recurring billing states and gateway synchronization.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-3 pl-4">Organization</th>
              <th className="p-3">Plan Tier</th>
              <th className="p-3">Recurring MRR</th>
              <th className="p-3">Interval</th>
              <th className="p-3">Status</th>
              <th className="p-3">Gateway</th>
              <th className="p-3 pr-4">Renewal / Term</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {subscriptions.map((s) => (
              <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-3 pl-4 font-semibold text-white">{s.orgName}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-400 border border-slate-700">
                    {s.tier}
                  </span>
                </td>
                <td className="p-3 font-semibold text-slate-200">{s.amount}</td>
                <td className="p-3 text-slate-400">{s.interval}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    s.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td className="p-3 text-slate-400">{s.provider}</td>
                <td className="p-3 pr-4 text-slate-300 font-mono text-[11px]">{s.renewal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
