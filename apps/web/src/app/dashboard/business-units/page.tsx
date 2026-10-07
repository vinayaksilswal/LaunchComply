"use client";

import React, { useState } from "react";
import {
  Building2,
  Globe,
  Layers,
  ShieldCheck,
  Webhook,
  Plus,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  FileCode,
  Lock,
} from "lucide-react";

export default function BusinessUnitsPage() {
  const [businessUnits, setBusinessUnits] = useState([
    {
      id: "bu-1",
      name: "GlobalCorp Enterprise Root",
      code: "GLOBAL-ROOT",
      region: "GLOBAL",
      owner: "vp-security@globalcorp.com",
      complianceFrameworks: ["ISO 27001 ISMS", "SOC 2 Type II"],
      isRoot: true,
      children: ["bu-2", "bu-3"],
    },
    {
      id: "bu-2",
      name: "India Operations Division",
      code: "BU-INDIA",
      region: "APAC (ap-south-1)",
      owner: "india-ciso@globalcorp.com",
      complianceFrameworks: ["DPDP Privacy Operations", "ISO 27001"],
      isRoot: false,
      parent: "GlobalCorp Enterprise Root",
    },
    {
      id: "bu-3",
      name: "Americas Cloud Services",
      code: "BU-AMER",
      region: "US (us-east-1)",
      owner: "us-lead@globalcorp.com",
      complianceFrameworks: ["SOC 2 Type II", "HIPAA Security"],
      isRoot: false,
      parent: "GlobalCorp Enterprise Root",
    },
  ]);

  const [inheritedControls] = useState([
    {
      code: "LC-AC-001",
      title: "Central Enterprise IAM & SSO Enforcement",
      model: "CENTRAL",
      inherited: true,
      status: "EFFECTIVE",
      evidence: "Inherited from GlobalCorp Okta SAML Connection",
    },
    {
      code: "LC-CR-001",
      title: "KMS Customer-Managed Encryption Keys",
      model: "CENTRAL",
      inherited: true,
      status: "EFFECTIVE",
      evidence: "Inherited from AWS Root KMS Key Policy",
    },
    {
      code: "LC-OPS-004",
      title: "Local Database Snapshot Rehearsals",
      model: "LOCAL",
      inherited: false,
      status: "PARTIAL",
      evidence: "Must be evidenced independently by India DB cluster",
    },
    {
      code: "LC-SEC-012",
      title: "Vulnerability Remediation & Patch SLAs",
      model: "SHARED",
      inherited: false,
      status: "EFFECTIVE",
      evidence: "Shared governance: Central scans, Local engineering fixes",
    },
  ]);

  const [webhooks] = useState([
    {
      id: "wh-1",
      name: "Corporate Datadog SIEM Integration",
      url: "https://http-intake.logs.datadoghq.com/v1/input/launchcomply",
      events: ["security.finding.created", "incident.created"],
      status: "DELIVERED",
      lastDelivery: "14 minutes ago",
    },
    {
      id: "wh-2",
      name: "Slack Security Alerts Channel",
      url: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXX",
      events: ["compliance.control.failed", "audit.package.ready"],
      status: "DELIVERED",
      lastDelivery: "1 hour ago",
    },
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-cyan-600" />
              Business Units & Global Scale
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-300">
              HIERARCHY & INHERITANCE
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Parent-child enterprise divisions, regional regulatory frameworks (DPDP, SOC 2, ISO 27001), and inherited control evidence.
          </p>
        </div>

        <button className="px-3.5 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
          <Plus className="w-4 h-4" />
          Create Business Unit
        </button>
      </div>

      {/* Business Units Tree / Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-600" />
          Enterprise Division Hierarchy
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {businessUnits.map((bu) => (
            <div key={bu.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 text-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{bu.name}</h4>
                  <span className="text-[10px] font-mono text-slate-500">{bu.code}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    bu.isRoot ? "bg-purple-100 text-purple-800" : "bg-cyan-50 text-cyan-800 border border-cyan-200"
                  }`}
                >
                  {bu.region}
                </span>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-slate-500 text-[11px] block">Lead Administrator:</span>
                <span className="font-medium text-slate-700">{bu.owner}</span>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 text-[11px] block mb-1">Active Compliance Scopes:</span>
                <div className="flex flex-wrap gap-1">
                  {bu.complianceFrameworks.map((fw, fidx) => (
                    <span key={fidx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                      {fw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Control Inheritance Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-600" />
            Central Control Inheritance Matrix (Shared Responsibility)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Controls marked CENTRAL are verified once at the parent enterprise root and automatically inherited by child business units without redundant duplicate audits.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {inheritedControls.map((ctrl, cidx) => (
            <div key={cidx} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800">{ctrl.code}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ctrl.model === "CENTRAL"
                        ? "bg-purple-100 text-purple-800"
                        : ctrl.model === "LOCAL"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-cyan-100 text-cyan-800"
                    }`}
                  >
                    {ctrl.model}
                  </span>
                  {ctrl.inherited && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                      Inherited from Root
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-slate-900">{ctrl.title}</h4>
                <p className="text-slate-500 text-[11px]">{ctrl.evidence}</p>
              </div>

              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 shrink-0">
                {ctrl.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Outbound Webhooks */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Webhook className="w-5 h-5 text-cyan-600" />
              Outbound Signed Webhooks (HMAC-SHA256)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time cryptographic event notifications dispatched to your enterprise SIEM, SOAR, or incident management webhooks.
            </p>
          </div>
          <button className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-2xs">
            Add Webhook
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {webhooks.map((wh) => (
            <div key={wh.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1 max-w-xl">
                <span className="font-bold text-slate-900 text-sm">{wh.name}</span>
                <div className="font-mono text-slate-500 text-[11px] truncate">{wh.url}</div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {wh.events.map((ev, eidx) => (
                    <span key={eidx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  {wh.status}
                </span>
                <span className="text-slate-400 text-[11px]">{wh.lastDelivery}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <Lock className="w-4 h-4 text-cyan-600 shrink-0" />
          <span>
            Every outbound HTTP delivery carries an <code>X-LaunchComply-Signature</code> computed using HMAC-SHA256 with timestamp replay protection.
          </span>
        </div>
      </div>
    </div>
  );
}
