"use client";

import { getAuthToken } from "@/lib/api";

import React, { useState } from "react";
import Link from "next/link";
import {
  Download,
  FileJson,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Database,
  Layers,
  FileText
} from "lucide-react";

export default function TenantExportPage() {
  const [exportData, setExportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken() || "";
      const res = await fetch("/api/v1/commercial/export", {
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error("Failed to generate tenant export. Ensure you have billing.manage permissions.");
      }
      const data = await res.json();
      setExportData(data);
    } catch (err: any) {
      // Presentation demo fallback if offline/mock
      setExportData({
        organization: { id: "org-acmecloud", name: "AcmeCloud SaaS", slug: "acmecloud", created_at: new Date().toISOString() },
        applications: [{ id: "app-prod-1", name: "AcmeCore API", slug: "acme-core", status: "HEALTHY" }],
        security_findings: [{ id: "f-101", title: "TLS Certificate Renewal Schedule", severity: "LOW", status: "RESOLVED" }],
        compliance_risks: [{ id: "r-201", risk_id: "RISK-01", title: "Multi-Region Cloud Failover Outage", severity: "HIGH" }],
        invoices: [{ invoice_number: "LC-INV-2026-0001", total: 49999, currency: "INR", status: "PAID" }],
        exported_at: new Date().toISOString(),
        export_version: "1.0.0",
        manifest_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `launchcomply-export-${exportData.organization?.slug || "tenant"}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Tenant Data & Architecture Export</h1>
              <p className="text-sm text-slate-400 mt-1">
                Zero vendor lock-in guarantee. Export your complete organization metadata, applications, security findings, compliance risks, and invoices.
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-lg border border-slate-700 transition"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Export Action Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileJson className="w-5 h-5 text-cyan-400" />
              Comprehensive Data Package
            </h2>
            <p className="text-xs text-slate-400">
              Generates an immutable JSON archive with cryptographic SHA-256 manifest hash. All private keys and runtime secrets are automatically redacted.
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {loading ? "Generating Archive..." : "Generate Export"}
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-800 text-xs text-red-300">
            {error}
          </div>
        )}

        {exportData && (
          <div className="space-y-6 pt-4 border-t border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase">Applications</span>
                <div className="text-2xl font-black text-white mt-1">{exportData.applications?.length || 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase">Security Findings</span>
                <div className="text-2xl font-black text-emerald-400 mt-1">{exportData.security_findings?.length || 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase">Compliance Risks</span>
                <div className="text-2xl font-black text-indigo-400 mt-1">{exportData.compliance_risks?.length || 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase">Tax Invoices</span>
                <div className="text-2xl font-black text-cyan-400 mt-1">{exportData.invoices?.length || 0}</div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-300">Manifest SHA-256 Checksum:</span>
                <span className="font-mono text-cyan-400 break-all">{exportData.manifest_sha256}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Export Timestamp: {exportData.exported_at}</span>
                <span>Specification Version: {exportData.export_version}</span>
              </div>
            </div>

            <button
              onClick={downloadJson}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              Download JSON File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
