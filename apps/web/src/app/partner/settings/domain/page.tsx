"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Globe,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Copy,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export default function PartnerCustomDomainPage() {
  const [domainName, setDomainName] = useState("compliance.secureops.example");
  const [verificationToken, setVerificationToken] = useState("lc-verify-8f4b1e9c20a67d51");
  const [isVerifying, setIsVerifying] = useState(false);
  const [tlsStatus, setTlsStatus] = useState<"PENDING_VERIFICATION" | "ACTIVE">("ACTIVE");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setTlsStatus("ACTIVE");
    }, 800);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/partner" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Partner Control Plane
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Custom Vanity Domain & TLS</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Custom Domain & Automated TLS Provisioning
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {tlsStatus === "ACTIVE" ? "TLS ACTIVE & ENFORCED" : "VERIFICATION PENDING"}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Host managed-customer security and compliance workspaces on your own vanity DNS domain with automated certificate lifecycle management.
          </p>
        </div>

        <Link
          href="/partner/settings/branding"
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm font-medium transition text-slate-200"
        >
          Portal Branding Suite →
        </Link>
      </div>

      {/* Step Wizard Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Setup Steps & DNS Instructions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Domain Name */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">1</span>
              Configure Vanity Domain
            </h2>

            <div>
              <label className="block text-xs text-slate-300 font-medium mb-1.5">Custom Fully Qualified Domain Name (FQDN)</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  placeholder="e.g. compliance.yourbrand.com"
                  className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold shadow transition flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
                  {isVerifying ? "Verifying..." : "Verify DNS"}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: DNS Records Table */}
          <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">2</span>
              Required DNS Configuration
            </h2>
            <p className="text-xs text-slate-400">
              Add the following DNS records at your DNS registrar (Cloudflare, Route 53, GoDaddy) to prove ownership and route incoming HTTPS traffic.
            </p>

            <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 text-xs">
              {/* CNAME Record */}
              <div className="p-4 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold">CNAME</span>
                    <span className="text-slate-300">{domainName}</span>
                  </div>
                  <p className="text-slate-400 font-mono text-[11px]">Points to: cname.launchcomply.com</p>
                </div>
                <button
                  onClick={() => handleCopy("cname.launchcomply.com", "cname")}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-medium flex items-center gap-1.5 transition self-start sm:self-auto"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedField === "cname" ? "Copied!" : "Copy Target"}
                </button>
              </div>

              {/* TXT Record */}
              <div className="p-4 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">TXT</span>
                    <span className="text-slate-300">_launchcomply-challenge.{domainName}</span>
                  </div>
                  <p className="text-slate-400 font-mono text-[11px] truncate max-w-sm">Value: {verificationToken}</p>
                </div>
                <button
                  onClick={() => handleCopy(verificationToken, "txt")}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-medium flex items-center gap-1.5 transition self-start sm:self-auto"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedField === "txt" ? "Copied!" : "Copy Token"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Hostname Routing & TLS Details */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            Security & Certificate Status
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400">DNS Verification:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400">TLS Encryption:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> TLS 1.3 Active
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400">Certificate Authority:</span>
              <span className="text-slate-200 font-mono text-[11px]">AWS ACM (Auto-Renewing)</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-slate-400">Routing Policy:</span>
              <span className="text-cyan-400 font-semibold">Strict Hostname Isolation</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs text-slate-400 space-y-1.5 leading-relaxed">
            <span className="font-semibold text-slate-200 block">Hostname Isolation Protection:</span>
            Unregistered or unverified Host headers are rejected at the edge gateway. Only verified active partner domains map to managed customer views.
          </div>
        </div>
      </div>
    </div>
  );
}
