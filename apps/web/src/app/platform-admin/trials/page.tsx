"use client";

import { useState } from "react";
import { Clock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export default function PlatformAdminTrialsPage() {
  const [trials] = useState([
    { id: "tr-1", orgName: "BlueLedger Healthcare", tier: "STARTER", startedAt: "2026-09-22", daysRemaining: 3, milestone: "FIRST_ARCHITECTURE_GENERATED", email: "meera@blueledger.in" },
    { id: "tr-2", orgName: "Zenith Cloud ERP", tier: "GROWTH", startedAt: "2026-09-28", daysRemaining: 9, milestone: "FIRST_APP_CREATED", email: "tarun@zenitherp.io" },
    { id: "tr-3", orgName: "Aether AI Labs", tier: "BUSINESS", startedAt: "2026-10-01", daysRemaining: 12, milestone: "FIRST_AWS_CONNECTED", email: "karan@aetherlabs.ai" }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Trial Conversion Funnel</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Active Free Trials</h1>
          <p className="text-sm text-slate-400 mt-1">14-day customer evaluation periods and activation milestone monitoring.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-3 pl-4">Organization</th>
              <th className="p-3">Evaluating Tier</th>
              <th className="p-3">Lead Email</th>
              <th className="p-3">Days Left</th>
              <th className="p-3">Activation Milestone</th>
              <th className="p-3 pr-4 text-right">Outreach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {trials.map((t) => (
              <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-3 pl-4 font-semibold text-white">{t.orgName}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-400 border border-slate-700">
                    {t.tier}
                  </span>
                </td>
                <td className="p-3 text-slate-300 font-mono">{t.email}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    t.daysRemaining <= 3 ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-cyan-500/10 text-cyan-400"
                  }`}>
                    {t.daysRemaining} Days Remaining
                  </span>
                </td>
                <td className="p-3 font-mono text-[11px] text-slate-400">{t.milestone}</td>
                <td className="p-3 pr-4 text-right">
                  <button
                    onClick={() => alert(`Engaging customer success follow-up for ${t.orgName}`)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    Engage Lead
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
