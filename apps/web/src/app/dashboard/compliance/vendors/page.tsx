"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Shield,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Search,
  ExternalLink,
  Lock,
  FileCheck2
} from "lucide-react";

export default function VendorRiskPage() {
  const vendors = [
    {
      id: "v-01",
      name: "Amazon Web Services (AWS)",
      category: "INFRASTRUCTURE",
      service: "Cloud hosting, multi-AZ database, object storage, KMS encryption, VPC networking.",
      criticality: "CRITICAL",
      riskLevel: "LOW",
      status: "APPROVED",
      dpa: "EXECUTED",
      country: "India (ap-south-1) / USA",
      owner: "devops@acmecloud.io",
      certifications: "SOC 2 Type II, ISO 27001, PCI-DSS Level 1, FedRAMP High",
      score: 97,
      scores: { security: 98, privacy: 95, availability: 99 }
    },
    {
      id: "v-02",
      name: "Stripe Payments Inc.",
      category: "PAYMENT_GATEWAY",
      service: "Payment processing, customer credit card vault, and B2B subscription billing.",
      criticality: "CRITICAL",
      riskLevel: "LOW",
      status: "APPROVED",
      dpa: "EXECUTED",
      country: "USA / India",
      owner: "finance@acmecloud.io",
      certifications: "PCI-DSS Level 1, SOC 2 Type II",
      score: 95,
      scores: { security: 95, privacy: 92, availability: 99 }
    },
    {
      id: "v-03",
      name: "Resend Technologies Inc.",
      category: "COMMUNICATION",
      service: "Transactional email API for user onboarding, alerts, and OTP verification.",
      criticality: "MEDIUM",
      riskLevel: "MEDIUM",
      status: "CONDITIONAL",
      dpa: "PENDING_REVIEW",
      country: "USA",
      owner: "engineering@acmecloud.io",
      certifications: "SOC 2 Type II in progress",
      score: 83,
      scores: { security: 82, privacy: 78, availability: 90 },
      warning: "Conditional approval: Bilateral DPA with DPDP SCC clauses pending counter-signature (CAPA-2026-001 opened)."
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/dashboard/compliance" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Compliance Command Center
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Vendor & Subprocessor Risk</span>
      </div>

      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              SUPPLIER RISK GOVERNANCE
            </span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              3 Evaluated Vendors
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-slate-300" />
            Vendor & Subprocessor Risk Management
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Evaluate third-party cloud service providers, verify security certifications (SOC 2, ISO 27001),
            and enforce bilateral Data Processing Addendums (DPA).
          </p>
        </div>
      </div>

      {/* Vendor Cards */}
      <div className="grid grid-cols-1 gap-5">
        {vendors.map((v) => (
          <div key={v.id} className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">{v.name}</h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {v.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
                    {v.country}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{v.service}</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-black text-cyan-400 font-mono">{v.score} / 100</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Assessment Score</div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded border ${
                  v.status === "APPROVED"
                    ? "text-emerald-400 bg-emerald-950/60 border-emerald-500/30"
                    : "text-amber-400 bg-amber-950/60 border-amber-500/30"
                }`}>
                  {v.status}
                </span>
              </div>
            </div>

            {v.warning && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>{v.warning}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">DPA Status</div>
                <div className={`font-bold mt-0.5 ${v.dpa === "EXECUTED" ? "text-emerald-400" : "text-amber-400"}`}>
                  {v.dpa}
                </div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Security Score</div>
                <div className="text-cyan-400 font-bold mt-0.5">{v.scores.security}%</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Privacy Score</div>
                <div className="text-teal-400 font-bold mt-0.5">{v.scores.privacy}%</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Availability Score</div>
                <div className="text-emerald-400 font-bold mt-0.5">{v.scores.availability}%</div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <div>Assurance Certifications: <strong className="text-slate-200">{v.certifications}</strong></div>
              <div>Owner: <span className="font-mono text-slate-300">{v.owner}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
