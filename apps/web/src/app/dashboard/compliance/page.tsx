"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Shield,
  Lock,
  Building2,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  FolderLock,
  Layers,
  FileText,
  Users,
  Calendar,
  Sparkles,
  ArrowRight,
  Search,
  ExternalLink,
  Briefcase
} from "lucide-react";

export default function ComplianceHubPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const metrics = [
    { label: "ISO 27001:2022 ISMS", value: "74%", subtitle: "Readiness Program Active", color: "from-blue-500 to-cyan-400", href: "/dashboard/compliance/iso27001" },
    { label: "SOC 2 Type II", value: "68%", subtitle: "Operating Evidence Window", color: "from-cyan-500 to-teal-400", href: "/dashboard/compliance/soc2" },
    { label: "India DPDP Act (2023)", value: "81%", subtitle: "Privacy Operations Ready", color: "from-emerald-500 to-teal-400", href: "/dashboard/compliance/privacy" },
    { label: "Continuous Evidence", value: "91%", subtitle: "Verified Current", color: "from-indigo-500 to-blue-400", href: "/dashboard/operations" },
    { label: "Open High Risks", value: "3", subtitle: "2 Treated • 1 Accepted", color: "from-amber-500 to-orange-400", href: "/dashboard/compliance/risks" },
    { label: "Overdue CAPA", value: "1", subtitle: "Remediation in Progress", color: "from-rose-500 to-pink-400", href: "/dashboard/compliance/audits" },
  ];

  const workspaces = [
    {
      title: "ISO/IEC 27001 ISMS Workspace",
      desc: "Clause 4–10 management system, ISMS Scope, Objectives, and Statement of Applicability (SoA).",
      icon: Shield,
      href: "/dashboard/compliance/iso27001",
      badge: "83 Applicable Controls",
      color: "border-blue-500/30 hover:border-blue-500/60"
    },
    {
      title: "SOC 2 Type II Operating Center",
      desc: "90-day evaluation period, recurring automated control testing, deviations, and sample tracking.",
      icon: Layers,
      href: "/dashboard/compliance/soc2",
      badge: "Operating Window Active",
      color: "border-cyan-500/30 hover:border-cyan-500/60"
    },
    {
      title: "India DPDP Privacy Operations",
      desc: "Personal data inventory, processing activities (ROPA), consent notices, and DSR request workflows.",
      icon: FolderLock,
      href: "/dashboard/compliance/privacy",
      badge: "DSR SLA Tracking",
      color: "border-emerald-500/30 hover:border-emerald-500/60"
    },
    {
      title: "Enterprise Risk Register & Heatmap",
      desc: "5x5 risk scoring matrix, inherent vs residual risk calculation, treatments, and acceptance gates.",
      icon: AlertTriangle,
      href: "/dashboard/compliance/risks",
      badge: "5 Tracked Risks",
      color: "border-amber-500/30 hover:border-amber-500/60"
    },
    {
      title: "Policy Center & Acknowledgements",
      desc: "Information security policy suite, version control, sign-offs, and employee acknowledgement tracking.",
      icon: FileText,
      href: "/dashboard/compliance/policies",
      badge: "5 Published Policies",
      color: "border-purple-500/30 hover:border-purple-500/60"
    },
    {
      title: "Vendor & Subprocessor Risk",
      desc: "Third-party risk scoring (AWS, Stripe, Resend), security certifications, and bilateral DPAs.",
      icon: Building2,
      href: "/dashboard/compliance/vendors",
      badge: "3 Evaluated Vendors",
      color: "border-slate-700 hover:border-slate-500"
    },
    {
      title: "Internal Audits & Centralized CAPA",
      desc: "Annual management system audits, root-cause corrective actions, and executive review minutes.",
      icon: CheckCircle2,
      href: "/dashboard/compliance/audits",
      badge: "1 Audit • 2 CAPA",
      color: "border-teal-500/30 hover:border-teal-500/60"
    },
    {
      title: "Audit Readiness & Evidence Packages",
      desc: "Audit blocker inspector and immutable package generator with Zero-Knowledge credential redaction.",
      icon: Lock,
      href: "/dashboard/compliance/audit-readiness",
      badge: "SHA256 Manifest Export",
      color: "border-rose-500/30 hover:border-rose-500/60"
    },
    {
      title: "Customer & Vendor Contracts",
      desc: "Master Services Agreements, DPAs, SLAs with live operational uptime & DR RTO verification.",
      icon: Briefcase,
      href: "/dashboard/contracts",
      badge: "SLA Targets Met",
      color: "border-indigo-500/30 hover:border-indigo-500/60"
    }
  ];

  const canonicalControls = [
    { code: "LC-AC-001", title: "Multi-factor Authentication for Privileged Access", cat: "ACCESS_CONTROL", type: "AUTOMATED", iso: "A.5.15", soc: "CC6.1", dpdp: "SEC-01", status: "EFFECTIVE" },
    { code: "LC-CR-001", title: "TLS 1.3 Transport Encryption with Strict HSTS", cat: "CRYPTOGRAPHY", type: "AUTOMATED", iso: "A.8.24", soc: "CC6.6", dpdp: "SEC-03", status: "EFFECTIVE" },
    { code: "LC-CR-002", title: "Data Encryption at Rest with Customer Managed KMS", cat: "CRYPTOGRAPHY", type: "AUTOMATED", iso: "A.8.24", soc: "CC6.7", dpdp: "SEC-04", status: "EFFECTIVE" },
    { code: "LC-OP-001", title: "Automated SAST, SCA, and Container CVE Auditing", cat: "OPERATIONS", type: "AUTOMATED", iso: "A.8.8", soc: "CC7.1", dpdp: "SEC-05", status: "IMPLEMENTED" },
    { code: "LC-BC-001", title: "Continuous Automated Backup & Quarterly Restore Drills", cat: "CONTINUITY", type: "AUTOMATED", iso: "A.8.14", soc: "A1.2", dpdp: "SEC-08", status: "EFFECTIVE" },
    { code: "LC-BC-002", title: "Multi-Region Warm Standby DR Resilience", cat: "CONTINUITY", type: "HYBRID", iso: "A.8.13", soc: "A1.3", dpdp: "SEC-09", status: "IMPLEMENTED" },
    { code: "LC-SR-001", title: "Vendor Security Assessment & Executed DPA", cat: "SUPPLIERS", type: "MANUAL", iso: "A.5.19", soc: "CC9.2", dpdp: "SEC-10", status: "PARTIAL" },
    { code: "LC-PR-001", title: "DPDP Data Inventory & Processing Register", cat: "PRIVACY", type: "HYBRID", iso: "A.5.34", soc: "P1.1", dpdp: "PRV-01", status: "EFFECTIVE" },
    { code: "LC-GV-001", title: "Information Security Policy Suite Publication", cat: "GOVERNANCE", type: "MANUAL", iso: "A.5.1", soc: "CC1.1", dpdp: "GOV-01", status: "EFFECTIVE" },
    { code: "LC-GV-002", title: "Annual Internal Management Systems Audit & CAPA", cat: "GOVERNANCE", type: "MANUAL", iso: "A.9.2", soc: "CC2.1", dpdp: "GOV-02", status: "EFFECTIVE" }
  ];

  const filteredControls = canonicalControls.filter((c) => {
    const matchesCat = selectedCategory === "ALL" || c.cat === selectedCategory;
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Notice Banner */}
      <div className="p-4 bg-slate-900 border border-cyan-800/40 rounded-xl flex items-start gap-3 shadow-lg">
        <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white">Compliance Operating System Baseline:</strong> LaunchComply operates your
          active compliance program with continuous technical evidence mapping, risk registers, policy management, and
          auditor assurance packages. Statuses reflect real operational readiness and evidence coverage. External formal
          ISO/SOC certification is gated strictly by verified accredited registrar audit records.
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              PHASE 7 COMPLIANCE OS
            </span>
            <span className="text-[11px] text-slate-400 font-mono">Organization: AcmeCloud SaaS</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FileCheck2 className="w-7 h-7 text-cyan-400" />
            Enterprise Compliance Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Framework-neutral control engine powering ISO 27001, SOC 2, DPDP Privacy, Risk Management, and Auditor Packages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/compliance/actions"
            className="px-3.5 py-2 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            My Actions (4 Due)
          </Link>
          <Link
            href="/dashboard/compliance/audit-readiness"
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-semibold text-slate-950 transition-colors shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
          >
            <Lock className="w-4 h-4" />
            Audit Readiness Pack
          </Link>
        </div>
      </div>

      {/* High-Level Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((m, idx) => (
          <Link
            key={idx}
            href={m.href}
            className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl hover:border-slate-700 transition-all hover:scale-[1.02] flex flex-col justify-between"
          >
            <div className="text-[11px] font-semibold text-slate-400 truncate">{m.label}</div>
            <div className={`text-2xl font-extrabold bg-gradient-to-r ${m.color} bg-clip-text text-transparent my-1`}>
              {m.value}
            </div>
            <div className="text-[10px] text-slate-400 truncate">{m.subtitle}</div>
          </Link>
        ))}
      </div>

      {/* Compliance Workspaces Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Active Compliance Workspaces
          </h2>
          <span className="text-xs text-slate-400">9 integrated operational programs</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {workspaces.map((w, idx) => {
            const Icon = w.icon;
            return (
              <Link
                key={idx}
                href={w.href}
                className={`p-5 bg-slate-900/80 border ${w.color} rounded-xl transition-all hover:bg-slate-850/60 flex flex-col justify-between group shadow-sm`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-cyan-400 group-hover:text-cyan-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {w.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">
                    {w.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {w.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-400 font-semibold">
                  <span>Open Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Canonical Control Library Explorer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-cyan-400" />
              Canonical Control Library & Cross-Framework Mapping
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              1 canonical implementation satisfies multiple requirements across ISO 27001, SOC 2, and DPDP.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search controls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 w-48"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="ACCESS_CONTROL">Access Control</option>
              <option value="CRYPTOGRAPHY">Cryptography</option>
              <option value="OPERATIONS">Operations</option>
              <option value="CONTINUITY">Business Continuity</option>
              <option value="SUPPLIERS">Suppliers</option>
              <option value="PRIVACY">Privacy</option>
              <option value="GOVERNANCE">Governance</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Control ID</th>
                <th className="py-3 px-4">Canonical Control Title</th>
                <th className="py-3 px-4">Execution Type</th>
                <th className="py-3 px-4">ISO 27001</th>
                <th className="py-3 px-4">SOC 2</th>
                <th className="py-3 px-4">India DPDP</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredControls.map((c) => (
                <tr key={c.code} className="hover:bg-slate-850/40">
                  <td className="py-3 px-4 font-mono font-bold text-cyan-400">{c.code}</td>
                  <td className="py-3 px-4 font-medium text-white max-w-xs truncate">{c.title}</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                      {c.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-cyan-300">{c.iso}</td>
                  <td className="py-3 px-4 font-mono text-teal-300">{c.soc}</td>
                  <td className="py-3 px-4 font-mono text-emerald-300">{c.dpdp}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      c.status === "EFFECTIVE"
                        ? "text-emerald-400 bg-emerald-950/60 border-emerald-500/30"
                        : c.status === "IMPLEMENTED"
                        ? "text-cyan-400 bg-cyan-950/60 border-cyan-500/30"
                        : "text-amber-400 bg-amber-950/60 border-amber-500/30"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
