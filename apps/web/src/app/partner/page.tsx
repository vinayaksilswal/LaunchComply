"use client";

import React, { useState } from "react";
import {
  Briefcase,
  Building2,
  ShieldAlert,
  Target,
  FileCheck2,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Users,
  Lock,
  Plus,
  Sliders,
  DollarSign,
  Palette,
  ExternalLink,
  ShieldCheck,
  Check,
  XCircle,
} from "lucide-react";

export default function PartnerControlPlanePage() {
  const [activePartner] = useState({
    name: "SecureOps Consulting",
    tier: "PREMIER PARTNER",
    brandName: "SecureOps Cyber Assurance",
    primaryAccent: "#06B6D4",
    authorizedCustomersCount: 12,
  });

  const [selectedCustomer, setSelectedCustomer] = useState<string>("Acme Health SaaS");

  const [managedCustomers, setManagedCustomers] = useState([
    {
      id: "cust-1",
      name: "Acme Health SaaS",
      tier: "Enterprise",
      status: "ACTIVE",
      criticalFindings: 0,
      openIncidents: 0,
      complianceStatus: "SOC 2 (94%)",
      delegatedScopes: ["managed.security.read", "managed.vapt.manage", "managed.compliance.manage"],
      lastAudit: "Today 10:14 UTC",
    },
    {
      id: "cust-2",
      name: "FinTech Global Payments",
      tier: "Enterprise Plus",
      status: "ACTIVE",
      criticalFindings: 2,
      openIncidents: 1,
      complianceStatus: "ISO 27001 (78%)",
      delegatedScopes: ["managed.security.read", "managed.deployment.execute"],
      lastAudit: "Yesterday 18:30 UTC",
    },
    {
      id: "cust-3",
      name: "LogisticsCloud India",
      tier: "Growth",
      status: "PENDING_CUSTOMER_APPROVAL",
      criticalFindings: 0,
      openIncidents: 0,
      complianceStatus: "DPDP Readiness",
      delegatedScopes: ["managed.compliance.manage"],
      lastAudit: "Invited 3 days ago",
    },
  ]);

  const [servicesCatalog] = useState([
    { name: "Continuous Cloud Deployment & IaC", active: true, clients: 8 },
    { name: "Managed VAPT & Penetration Testing", active: true, clients: 12 },
    { name: "SOC 2 Type II Readiness & Assurance", active: true, clients: 10 },
    { name: "ISO 27001 ISMS Implementation", active: true, clients: 6 },
    { name: "24/7 Managed Incident Response (SOC)", active: true, clients: 9 },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Persistent Managing Banner */}
      <div className="bg-slate-900 text-white px-6 py-2 text-xs flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-cyan-400">MSP Partner Control Plane:</span>
          <span>Managing tenant</span>
          <span className="font-bold bg-slate-800 px-2.5 py-0.5 rounded text-white border border-slate-700">
            {selectedCustomer}
          </span>
          <span className="text-slate-400">via</span>
          <span className="font-semibold text-slate-200">{activePartner.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">Delegated Scope: Security & VAPT Managed</span>
          <button className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium">
            Switch Managed Tenant
          </button>
        </div>
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-cyan-600" />
                MSP & Security Partner Control Plane
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-300">
                {activePartner.tier}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Multi-tenant customer oversight, delegated administrative access, and specialized compliance service delivery.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-3.5 py-2 text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
              <Plus className="w-4 h-4" />
              Invite Customer Tenant
            </button>
          </div>
        </div>

        {/* Aggregate Command Center Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <span className="text-xs text-slate-500 font-medium">Authorized Managed Customers</span>
            <span className="text-2xl font-bold text-slate-900 block">{managedCustomers.length}</span>
            <span className="text-[11px] text-emerald-600 font-semibold">100% Customer Consented</span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <span className="text-xs text-slate-500 font-medium">Critical Security Findings</span>
            <span className="text-2xl font-bold text-rose-600 block">2</span>
            <span className="text-[11px] text-slate-500">Across 1 customer tenant</span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <span className="text-xs text-slate-500 font-medium">Active Production Incidents</span>
            <span className="text-2xl font-bold text-amber-600 block">1</span>
            <span className="text-[11px] text-slate-500">FinTech Global Payments</span>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
            <span className="text-xs text-slate-500 font-medium">Active Service Engagements</span>
            <span className="text-2xl font-bold text-cyan-600 block">5</span>
            <span className="text-[11px] text-slate-500">VAPT, SOC 2, ISO 27001</span>
          </div>
        </div>

        {/* Managed Customers Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Authorized Managed Tenants</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Each relationship requires explicit customer consent. Access can be revoked by the customer at any time.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {managedCustomers.map((c) => (
              <div key={c.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">{c.tier}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {c.delegatedScopes.map((scope, sidx) => (
                      <span key={sidx} className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 font-mono text-[10px] border border-cyan-200">
                        {scope}
                      </span>
                    ))}
                  </div>

                  <div className="text-[11px] text-slate-500 pt-0.5">Compliance: {c.complianceStatus}</div>
                </div>

                <div className="flex items-center gap-3">
                  {c.status === "ACTIVE" ? (
                    <button
                      onClick={() => setSelectedCustomer(c.name)}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1 shadow-2xs"
                    >
                      Switch To Tenant <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Awaiting Customer Approval</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Service Catalog & White-Label Foundation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Services Catalog */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-600" />
              Partner Service Catalog Offerings
            </h3>
            <p className="text-xs text-slate-500">Service packages you deliver to managed customer tenants.</p>

            <div className="divide-y divide-slate-100">
              {servicesCatalog.map((svc, sidx) => (
                <div key={sidx} className="py-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{svc.name}</span>
                  <span className="text-slate-500">{svc.clients} Active Clients</span>
                </div>
              ))}
            </div>
          </div>

          {/* White-Label Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-600" />
              White-Label Branding Foundation
            </h3>
            <p className="text-xs text-slate-500">
              For eligible partner plans, configure branded customer portal headers and accent styles.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Brand Name Displayed to Customer</label>
                <input
                  defaultValue={activePartner.brandName}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Primary Accent Color</label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg border border-slate-300"
                    style={{ backgroundColor: activePartner.primaryAccent }}
                  />
                  <input
                    defaultValue={activePartner.primaryAccent}
                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500">
                Audit records and technical evidence hashes preserve cryptographic platform provenance.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
