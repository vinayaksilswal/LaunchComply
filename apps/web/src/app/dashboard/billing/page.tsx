"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Download,
  ArrowUpRight,
  Shield,
  ShieldCheck,
  Clock,
  Building2,
  X,
  ExternalLink,
  Flame,
  HelpCircle
} from "lucide-react";

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: string;
  status: "PAID" | "OPEN" | "PAST_DUE";
  pdfUrl: string;
}

export default function BillingPage() {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isGstModalOpen, setIsGstModalOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<InvoiceRecord[]>([
    { id: "1", invoiceNumber: "LC-INV-2026-0003", date: "2026-10-01", amount: "₹58,998.82", status: "PAID", pdfUrl: "/invoices/LC-INV-2026-0003.pdf" },
    { id: "2", invoiceNumber: "LC-INV-2026-0002", date: "2026-09-01", amount: "₹58,998.82", status: "PAID", pdfUrl: "/invoices/LC-INV-2026-0002.pdf" },
    { id: "3", invoiceNumber: "LC-INV-2026-0001", date: "2026-08-01", amount: "₹58,998.82", status: "PAID", pdfUrl: "/invoices/LC-INV-2026-0001.pdf" }
  ]);

  const handleSimulateUpgrade = (tier: string) => {
    setIsUpgradeModalOpen(false);
    setActionNotice(`Subscription plan updated to ${tier}. Backend entitlements applied.`);
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleSimulateCancel = () => {
    setIsCancelModalOpen(false);
    setActionNotice("Subscription marked to cancel at end of billing period (2026-10-31). Your production AWS resources and deployments remain completely safe and untouched.");
    setTimeout(() => setActionNotice(null), 7000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Commercial SaaS Subscription</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Subscription & Billing Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Active plan tier, metered usage allocations, payment gateways, and compliant Indian GST tax invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsGstModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            GSTR-1 Tax Preview
          </button>
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Change Plan</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-cyan-400 hover:text-cyan-200 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Plan Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Plan</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ACTIVE
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">Business Tier</div>
            <div className="text-xs text-slate-400 mt-0.5">₹49,999 + 18% GST / month</div>
          </div>
          <div className="pt-2 border-t border-slate-800 text-xs space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Billing Cycle:</span>
              <span className="font-medium text-slate-200">Monthly</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Next Renewal:</span>
              <span className="font-medium text-slate-200">October 31, 2026</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Gateway:</span>
              <span className="font-medium text-cyan-400">Stripe (Tokenized)</span>
            </div>
          </div>
        </div>

        {/* Metered Resource Entitlements */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Resource Entitlements</span>
            <Link href="/dashboard/usage" className="text-xs text-cyan-400 hover:underline">
              View Metrics
            </Link>
          </div>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Applications</span>
                <span className="font-bold text-white">1 / 20</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: "5%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Active Environments</span>
                <span className="font-bold text-white">2 / 10</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: "20%" }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Monthly Security Scans</span>
                <span className="font-bold text-white">42 / 500</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: "8.4%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Business & Tax Identity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tax Profile</span>
            <Link href="/dashboard/account" className="text-xs text-cyan-400 hover:underline">
              Edit Profile
            </Link>
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-snug">AcmeCloud Technologies Pvt Ltd</div>
            <div className="text-xs text-slate-400 mt-1">Karnataka, India (State Code: 29)</div>
          </div>
          <div className="pt-2 border-t border-slate-800 text-xs space-y-1.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">GSTIN:</span>
              <span className="font-mono text-slate-200">29AABCA1234F1Z5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax Mechanism:</span>
              <span className="text-emerald-400 font-medium">B2B Reverse Charge N/A</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Billing Contact:</span>
              <span className="text-slate-200">billing@acmecloud.io</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Tax Invoice History (B2B Tax Invoices)
          </div>
          <span className="text-xs text-slate-500">SAC Code: 998313 (IT Software as a Service)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 pl-4">Invoice #</th>
                <th className="p-3">Issue Date</th>
                <th className="p-3">Total Amount (incl. 18% GST)</th>
                <th className="p-3">Status</th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 pl-4 font-mono font-bold text-cyan-400">{inv.invoiceNumber}</td>
                  <td className="p-3 text-slate-300">{inv.date}</td>
                  <td className="p-3 font-semibold text-white">{inv.amount}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3 pr-4 text-right">
                    <button
                      onClick={() => alert(`Downloading official PDF tax invoice ${inv.invoiceNumber}`)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Notice & Cancellation Area */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 gap-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Need to modify subscription terms or pause account?</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCancelModalOpen(true)}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors"
          >
            Cancel Subscription
          </button>
        </div>
      </div>

      {/* Upgrade Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Select Subscription Tier</h3>
              <button onClick={() => setIsUpgradeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div
                onClick={() => handleSimulateUpgrade("GROWTH")}
                className="p-3 rounded-xl border border-slate-800 hover:border-cyan-500 cursor-pointer transition-colors bg-slate-950/60"
              >
                <div className="font-bold text-white text-sm">Growth Tier — ₹19,999/mo</div>
                <div className="text-slate-400 mt-1">5 apps, 3 environments, continuous security, DR restore drills.</div>
              </div>
              <div
                onClick={() => handleSimulateUpgrade("BUSINESS")}
                className="p-3 rounded-xl border border-cyan-500/50 bg-cyan-500/10 cursor-pointer transition-colors"
              >
                <div className="font-bold text-cyan-300 text-sm">Business Tier — ₹49,999/mo (Current)</div>
                <div className="text-slate-300 mt-1">20 apps, 10 environments, auditor portal, compliance workspaces.</div>
              </div>
              <div
                onClick={() => handleSimulateUpgrade("ENTERPRISE")}
                className="p-3 rounded-xl border border-slate-800 hover:border-cyan-500 cursor-pointer transition-colors bg-slate-950/60"
              >
                <div className="font-bold text-white text-sm">Enterprise Tier — Custom</div>
                <div className="text-slate-400 mt-1">Unlimited apps, dedicated lead security consultant, 24x7 30-min SLA.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <AlertCircle className="w-5 h-5" />
              <span>Cancel SaaS Subscription</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to cancel? Your subscription will remain active until the end of the current billing cycle (October 31, 2026).
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>LaunchComply Zero-Destruction Guarantee:</strong> Your AWS workloads, VPCs, databases, and production apps are never deleted upon SaaS cancellation. You retain complete ownership of all IaC configurations.
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Keep Active
              </button>
              <button
                onClick={handleSimulateCancel}
                className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GSTR-1 Preview Modal */}
      {isGstModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">GSTR-1 Outward Supply Reconciliation Preview</h3>
              </div>
              <button onClick={() => setIsGstModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Total Taxable Value</span>
                  <div className="text-sm font-bold text-white mt-1">₹1,49,997.00</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Total GST (18%)</span>
                  <div className="text-sm font-bold text-cyan-400 mt-1">₹26,999.46</div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase">Total Invoiced</span>
                  <div className="text-sm font-bold text-white mt-1">₹1,76,996.46</div>
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                <strong>Statutory Notice:</strong> This is a read-only reconciliation preview generated from verified invoice records for your accounting team. Official GSTR-1 returns must be submitted via GST Common Portal or authorized GSP.
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsGstModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
