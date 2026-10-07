"use client";

import { useState } from "react";
import { Briefcase, FileCheck, CheckCircle2, Clock, ArrowRight } from "lucide-react";

export default function PlatformAdminServicesPage() {
  const [orders] = useState([
    { orderNumber: "LC-ORD-2026-0001", customer: "AcmeCloud SaaS", service: "ISO 27001:2022 Lead Implementation Package", amount: "₹2,36,000.00", status: "IN_PROGRESS", consultant: "LaunchComply Advisory Team", milestone: "Stage 1 Audit Fieldwork" },
    { orderNumber: "LC-ORD-2026-0002", customer: "AcmeCloud SaaS", service: "Phase 6 Authorized Penetration Testing (VAPT)", amount: "₹1,50,000.00", status: "DELIVERED", consultant: "SecAssure Offensive Labs", milestone: "Clean Retest Attestation Issued" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Advisory & Security Engagements</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Professional Services Commercial Orders</h1>
          <p className="text-sm text-slate-400 mt-1">One-time and retainer services including VAPT, ISO implementation, and AWS provisioning.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-3 pl-4">Order #</th>
              <th className="p-3">Client</th>
              <th className="p-3">Professional Service</th>
              <th className="p-3">Contract Value</th>
              <th className="p-3">Status</th>
              <th className="p-3 pr-4">Delivery Milestone</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {orders.map((o) => (
              <tr key={o.orderNumber} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-3 pl-4 font-mono font-bold text-cyan-400">{o.orderNumber}</td>
                <td className="p-3 font-semibold text-white">{o.customer}</td>
                <td className="p-3 text-slate-300">{o.service}</td>
                <td className="p-3 font-semibold text-white">{o.amount}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    o.status === "DELIVERED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  }`}>
                    {o.status}
                  </span>
                </td>
                <td className="p-3 pr-4 text-slate-400 font-mono text-[11px]">{o.milestone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
