"use client";

import { useState } from "react";
import { DollarSign, FileText, Download, CheckCircle2 } from "lucide-react";

export default function PlatformAdminBillingPage() {
  const [invoices] = useState([
    { number: "LC-INV-2026-0003", org: "AcmeCloud SaaS", gstin: "29AABCA1234F1Z5", taxable: "₹49,999.00", gst: "₹8,999.82", total: "₹58,998.82", status: "PAID" },
    { number: "LC-INV-2026-0002", org: "AcmeCloud SaaS", gstin: "29AABCA1234F1Z5", taxable: "₹49,999.00", gst: "₹8,999.82", total: "₹58,998.82", status: "PAID" },
    { number: "LC-INV-2026-0001", org: "AcmeCloud SaaS", gstin: "29AABCA1234F1Z5", taxable: "₹49,999.00", gst: "₹8,999.82", total: "₹58,998.82", status: "PAID" },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Platform Financial Ledger</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Billing & Tax Register</h1>
          <p className="text-sm text-slate-400 mt-1">Platform-wide tax invoices, GST ledger, and gateway settlements.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs text-slate-400 uppercase font-semibold">Total Taxable Value</div>
          <div className="text-2xl font-black text-white mt-1">₹1,49,997.00</div>
          <div className="text-[11px] text-cyan-400 mt-1">Software as a Service (SAC: 998313)</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs text-slate-400 uppercase font-semibold">Total GST Collected (18%)</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">₹26,999.46</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">Intra-State: CGST (9%) + SGST (9%)</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="text-xs text-slate-400 uppercase font-semibold">Total Gross Collections</div>
          <div className="text-2xl font-black text-white mt-1">₹1,76,996.46</div>
          <div className="text-[11px] text-slate-400 mt-1">Settled via Stripe Tokenized Gateway</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-3 pl-4">Invoice Number</th>
              <th className="p-3">Customer Entity</th>
              <th className="p-3">Customer GSTIN</th>
              <th className="p-3">Taxable Subtotal</th>
              <th className="p-3">GST (18%)</th>
              <th className="p-3">Total Amount</th>
              <th className="p-3 pr-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {invoices.map((i) => (
              <tr key={i.number} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-3 pl-4 font-mono font-bold text-cyan-400">{i.number}</td>
                <td className="p-3 text-white font-medium">{i.org}</td>
                <td className="p-3 text-slate-400 font-mono">{i.gstin}</td>
                <td className="p-3 text-slate-300">{i.taxable}</td>
                <td className="p-3 text-slate-300">{i.gst}</td>
                <td className="p-3 font-semibold text-white">{i.total}</td>
                <td className="p-3 pr-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {i.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
