"use client";

import { useState } from "react";
import { LifeBuoy, Clock, CheckCircle2, MessageSquare, Send } from "lucide-react";

export default function PlatformAdminSupportQueuePage() {
  const [tickets] = useState([
    { number: "LC-TCK-2026-0002", org: "AcmeCloud SaaS", priority: "HIGH", category: "COMPLIANCE", title: "SOC 2 Type II Evidence export clarification for auditor", status: "IN_PROGRESS", sla: "2h SLA Target (35m elapsed)" },
    { number: "LC-TCK-2026-0001", org: "AcmeCloud SaaS", priority: "NORMAL", category: "AWS", title: "Production AWS KMS Key Rotation and CloudTrail integration", status: "RESOLVED", sla: "Met (First response: 42m)" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
            <LifeBuoy className="w-4 h-4" />
            <span>Platform Support Queue</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Customer Support Operations</h1>
          <p className="text-sm text-slate-400 mt-1">Cross-tenant support queue, priority SLA countdown timers, and response dispatch.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-3 pl-4">Case #</th>
              <th className="p-3">Organization</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Status</th>
              <th className="p-3 pr-4">SLA Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {tickets.map((t) => (
              <tr key={t.number} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-3 pl-4 font-mono font-bold text-cyan-400">{t.number}</td>
                <td className="p-3 font-semibold text-white">{t.org}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    t.priority === "HIGH" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-slate-800 text-slate-300"
                  }`}>
                    {t.priority}
                  </span>
                </td>
                <td className="p-3 text-slate-200 font-medium">{t.title}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    t.status === "RESOLVED" ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400"
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-3 pr-4 font-mono text-[11px] text-slate-400">{t.sla}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
