"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Lock,
  Layers,
  FileCheck2,
  Zap,
  Building,
  Check,
  DollarSign,
  Clock
} from "lucide-react";
import { platformAdminApi } from "@/lib/api/modules";

export default function BillingActivationPage() {
  const [activationData, setActivationData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [validatingProvider, setValidatingProvider] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any | null>(null);

  // Manual reconciliation form state
  const [reconcileInvoiceId, setReconcileInvoiceId] = useState("");
  const [reconcileRef, setReconcileRef] = useState("");
  const [reconcileAmount, setReconcileAmount] = useState<number>(19999);
  const [reconcileNotes, setReconcileNotes] = useState("");
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileSuccess, setReconcileSuccess] = useState<any | null>(null);

  const fetchActivationStatus = async () => {
    try {
      setLoading(true);
      const res = await platformAdminApi.getBillingActivation();
      setActivationData(res);
    } catch (err) {
      console.error("Failed to load billing activation data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivationStatus();
  }, []);

  const handleRunValidation = async (provider: string) => {
    try {
      setValidatingProvider(provider);
      setValidationResult(null);
      const res = await platformAdminApi.validateBillingProvider(provider);
      setValidationResult(res);
      await fetchActivationStatus();
    } catch (err: any) {
      console.error("Provider validation test failed:", err);
      alert(`Validation test failed: ${err.message || "Unknown error"}`);
    } finally {
      setValidatingProvider(null);
    }
  };

  const handleManualReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileInvoiceId || !reconcileRef) {
      alert("Please enter both Invoice ID and Bank UTR/Reference");
      return;
    }
    try {
      setReconcileLoading(true);
      setReconcileSuccess(null);
      const res = await platformAdminApi.reconcileInvoice(reconcileInvoiceId, {
        bank_reference: reconcileRef,
        amount: Number(reconcileAmount),
        payment_source: "BANK_TRANSFER",
        notes: reconcileNotes || "Manual wire matched to invoice",
      });
      setReconcileSuccess(res);
      setReconcileInvoiceId("");
      setReconcileRef("");
      await fetchActivationStatus();
    } catch (err: any) {
      console.error("Invoice reconciliation failed:", err);
      alert(`Reconciliation error: ${err.message || "Check invoice ID and amount"}`);
    } finally {
      setReconcileLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> LIVE PRODUCTION
          </span>
        );
      case "VERIFIED":
      case "VERIFIED_SANDBOX":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> VERIFIED SANDBOX
          </span>
        );
      case "CONFIGURED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> CONFIGURED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" /> AWAITING CREDENTIALS
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                <CreditCard className="w-4 h-4" />
                Commercial Infrastructure &middot; Phase 14
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                Billing Provider Activation Center
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Zero-code runtime activation for Stripe Live, Razorpay Live, and Enterprise Bank Transfer reconciliation. Credentials never exposed.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/platform-admin/operating-review"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Operating Review &rarr;
              </Link>
              <button
                onClick={fetchActivationStatus}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh Checklist
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Security Warning Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <span className="font-semibold">Credential Security Standard (§15):</span> Raw Stripe secret keys and Razorpay secrets are never displayed or stored in frontend DOM. State transitions (AWAITING_CREDENTIALS &rarr; CONFIGURED &rarr; VERIFIED &rarr; LIVE) occur strictly via verified webhook responses and signed backend acceptance tests.
          </div>
        </div>

        {/* Providers Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              Checking gateway configurations...
            </div>
          ) : (
            (activationData?.providers || []).map((p: any) => (
              <div
                key={p.provider}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900">{p.provider}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {p.mode}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Merchant: <span className="font-mono text-slate-700">{p.merchant_account}</span>
                      </p>
                    </div>
                    <div>{getStatusBadge(p.status)}</div>
                  </div>

                  {/* Checklist */}
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">API Credentials</span>
                      {p.credentials_present ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
                          <XCircle className="w-4 h-4" /> Missing
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Webhook Secret</span>
                      {p.webhook_configured ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                          <AlertCircle className="w-4 h-4" /> Pending
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Price Catalog Mappings</span>
                      <span className="inline-flex items-center gap-1 text-indigo-600 text-xs font-semibold">
                        <Layers className="w-4 h-4" /> {p.price_catalog_count} active tiers
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Last Verified</span>
                      <span className="text-xs font-mono text-slate-500">
                        {p.last_verified ? new Date(p.last_verified).toLocaleString() : "Never"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Allowed: {p.live_checkout_allowed ? "Live Checkouts Active" : "Sandbox Only"}
                  </div>
                  <button
                    onClick={() => handleRunValidation(p.provider)}
                    disabled={validatingProvider === p.provider}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                  >
                    {validatingProvider === p.provider ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Zap className="w-3.5 h-3.5" />
                    )}
                    Run Acceptance Test
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Validation Result Output */}
        {validationResult && (
          <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Acceptance Test Result: {validationResult.provider} ({validationResult.status})
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {validationResult.verified_at}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-xs font-mono">
              <div className="bg-slate-800/60 p-3 rounded-lg">
                <div className="text-slate-400">Mode:</div>
                <div className="text-white font-bold">{validationResult.mode}</div>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-lg">
                <div className="text-slate-400">Account:</div>
                <div className="text-white font-bold">{validationResult.account}</div>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-lg">
                <div className="text-slate-400">Prices Verified:</div>
                <div className="text-white font-bold">{validationResult.prices_verified} tiers</div>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-lg">
                <div className="text-slate-400">Webhook Ready:</div>
                <div className="text-emerald-400 font-bold">{String(validationResult.webhook_ready)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Enterprise Manual Invoice Reconciliation Section (§19, §20) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  Enterprise Bank Wire &amp; Invoice Reconciliation
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Authorize manual NEFT/RTGS bank transfers against open customer invoices. Only formally reconciled invoices enter recognized revenue.
              </p>
            </div>
            <Link
              href="/platform-admin/analytics"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              View Revenue Drilldown &rarr;
            </Link>
          </div>

          {/* Zero False Green & Payment Reality Protocol (§17, §128) */}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold">Zero False Green Policy:</span> No provider marked LIVE until real charges verified (§17). No live money charged in CI (§128).
            </div>
            <span className="font-mono text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 shrink-0 text-[11px]">
              Payment Reality Status: UNVERIFIED / AWAITING_CREDENTIALS
            </span>
          </div>

          <form onSubmit={handleManualReconciliation} className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice ID (UUID)
              </label>
              <input
                type="text"
                value={reconcileInvoiceId}
                onChange={(e) => setReconcileInvoiceId(e.target.value)}
                placeholder="e.g. 7e9db5cb-e0b0-..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank UTR / Wire Reference
              </label>
              <input
                type="text"
                value={reconcileRef}
                onChange={(e) => setReconcileRef(e.target.value)}
                placeholder="e.g. UTR20261005998877"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Settled Amount (₹)
              </label>
              <input
                type="number"
                value={reconcileAmount}
                onChange={(e) => setReconcileAmount(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                required
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={reconcileLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition"
              >
                {reconcileLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
                Reconcile &amp; Count Revenue
              </button>
            </div>
          </form>

          {reconcileSuccess && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
              <div>
                <span className="font-bold">Reconciled Successfully!</span> {reconcileSuccess.provenance_lineage}
              </div>
              <span className="font-mono text-emerald-700">₹{reconcileSuccess.amount?.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
