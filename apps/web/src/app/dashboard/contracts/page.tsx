"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Shield,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  Plus,
  Search,
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
  Download,
  Flame,
  FileCheck2
} from "lucide-react";

interface ContractRecord {
  id: string;
  contractNumber: string;
  title: string;
  type: "MSA" | "DPA" | "SECURITY_ADDENDUM" | "SLA" | "NDA" | "VAPT_ROE" | "ORDER_FORM";
  counterparty: string;
  counterpartyType: "CUSTOMER" | "VENDOR" | "PARTNER";
  version: string;
  status: "ACTIVE" | "SIGNED" | "LEGAL_REVIEW" | "EXPIRING" | "EXPIRED" | "DRAFT";
  effectiveDate: string;
  expiryDate: string;
  owner: string;
  slaTarget?: string;
  observedSla?: string;
  slaStatus?: "MET" | "AT_RISK" | "BREACH";
  linkedService?: string;
}

const INITIAL_CONTRACTS: ContractRecord[] = [
  {
    id: "CTR-01",
    contractNumber: "MSA-2026-089",
    title: "Master Services Agreement & SaaS Terms",
    type: "MSA",
    counterparty: "FinFlow Enterprise Systems",
    counterpartyType: "CUSTOMER",
    version: "v2.1",
    status: "ACTIVE",
    effectiveDate: "2026-01-15",
    expiryDate: "2027-01-14",
    owner: "Legal / Alex Mercer",
    slaTarget: "99.9% Uptime",
    observedSla: "99.98%",
    slaStatus: "MET",
    linkedService: "AcmeCloud Production Cluster"
  },
  {
    id: "CTR-02",
    contractNumber: "DPA-2026-042",
    title: "Data Processing Addendum (DPDP & GDPR Standard Clauses)",
    type: "DPA",
    counterparty: "FinFlow Enterprise Systems",
    counterpartyType: "CUSTOMER",
    version: "v1.2",
    status: "ACTIVE",
    effectiveDate: "2026-01-15",
    expiryDate: "2027-01-14",
    owner: "Privacy Officer",
    linkedService: "DPDP Data Inventory (Customer Records)"
  },
  {
    id: "CTR-03",
    contractNumber: "SEC-2026-018",
    title: "Enterprise Information Security Addendum",
    type: "SECURITY_ADDENDUM",
    counterparty: "FinFlow Enterprise Systems",
    counterpartyType: "CUSTOMER",
    version: "v3.0",
    status: "ACTIVE",
    effectiveDate: "2026-01-15",
    expiryDate: "2027-01-14",
    owner: "CISO",
    slaTarget: "P1 Incident Communication < 1hr",
    observedSla: "24m Avg Response",
    slaStatus: "MET",
    linkedService: "Security Incident Response Plan"
  },
  {
    id: "CTR-04",
    contractNumber: "VND-AWS-2024",
    title: "AWS Customer Agreement & Enterprise BAA/DPA",
    type: "DPA",
    counterparty: "Amazon Web Services Inc.",
    counterpartyType: "VENDOR",
    version: "v4.0",
    status: "ACTIVE",
    effectiveDate: "2024-03-01",
    expiryDate: "2027-03-01",
    owner: "DevOps Lead",
    slaTarget: "99.99% Availability",
    observedSla: "100.0%",
    slaStatus: "MET",
    linkedService: "ap-south-1 Infrastructure"
  },
  {
    id: "CTR-05",
    contractNumber: "VND-RESEND-2025",
    title: "Resend SaaS Terms & Data Processing Agreement",
    type: "DPA",
    counterparty: "Resend Inc.",
    counterpartyType: "VENDOR",
    version: "v1.0",
    status: "EXPIRING",
    effectiveDate: "2025-10-20",
    expiryDate: "2026-10-20",
    owner: "Security Lead",
    linkedService: "Transactional Email Subprocessor"
  },
  {
    id: "CTR-06",
    contractNumber: "ROE-2026-004",
    title: "Authorized VAPT Rules of Engagement Agreement",
    type: "VAPT_ROE",
    counterparty: "RedTeam CyberAssure Labs",
    counterpartyType: "PARTNER",
    version: "v1.0",
    status: "SIGNED",
    effectiveDate: "2026-09-01",
    expiryDate: "2026-12-31",
    owner: "Alex Mercer",
    linkedService: "Phase 6 Authorized VAPT Scope"
  }
];

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractRecord[]>(INITIAL_CONTRACTS);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterParty, setFilterParty] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = contracts.filter((c) => {
    const matchesType = filterType === "ALL" || c.type === filterType;
    const matchesParty = filterParty === "ALL" || c.counterpartyType === filterParty;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.counterparty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contractNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesParty && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Commercial & Compliance Contracts</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Contract & Security Document Workspace</h1>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise customer MSAs, DPAs, vendor agreements, and contractual SLA monitoring linked to live production telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => alert("Contract draft workflow initiated. Integration with DocuSign/AdobeSign abstraction prepared.")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Agreement</span>
          </button>
        </div>
      </div>

      {/* SLA Telemetry Highlight (Phase 5 + Phase 7 integration) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>SaaS Uptime SLA</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">99.98%</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1">
            Contractual Target: 99.9% (Exceeded by +0.08%)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Observed RTO (Recovery)</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">12m 22s</div>
          <div className="text-[11px] text-cyan-400 font-medium mt-1">
            Contractual Target: &lt; 4 Hours (Met)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>P1 Security Response</span>
            <Shield className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">24 Mins</div>
          <div className="text-[11px] text-indigo-400 font-medium mt-1">
            Contractual Target: &lt; 1 Hour (Met)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Agreements Monitored</span>
            <FileCheck2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-white">{contracts.length} Active</div>
          <div className="text-[11px] text-amber-400 font-medium mt-1">
            1 Vendor DPA Expiring in 17 Days
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "CUSTOMER", "VENDOR", "PARTNER"].map((party) => (
            <button
              key={party}
              onClick={() => setFilterParty(party)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterParty === party
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {party}
            </button>
          ))}
          <span className="text-slate-700">|</span>
          {["ALL", "MSA", "DPA", "SECURITY_ADDENDUM", "VAPT_ROE"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === t
                  ? "bg-slate-800 text-cyan-400 font-bold border border-cyan-500/30"
                  : "bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search agreement, counterparty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Contract Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 pl-4">Agreement / ID</th>
                <th className="p-3">Counterparty</th>
                <th className="p-3">Type & Version</th>
                <th className="p-3">Status</th>
                <th className="p-3">SLA / Operational Telemetry</th>
                <th className="p-3">Term & Expiry</th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((c) => {
                const isExpiring = c.status === "EXPIRING";
                return (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 pl-4">
                      <div className="font-semibold text-white">{c.title}</div>
                      <div className="text-[11px] font-mono text-cyan-400 mt-0.5">{c.contractNumber}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-200 font-medium">{c.counterparty}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{c.counterpartyType}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {c.type}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-2 font-mono">{c.version}</span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          c.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : c.status === "SIGNED"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                            : isExpiring
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {c.slaTarget ? (
                        <div>
                          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Observed: {c.observedSla}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">Target: {c.slaTarget}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">N/A</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-slate-300 text-[11px]">{c.effectiveDate} to {c.expiryDate}</div>
                      {isExpiring && (
                        <div className="text-[10px] text-amber-400 font-medium mt-0.5 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          Renewal required
                        </div>
                      )}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={() => alert(`Viewing document details for ${c.contractNumber}`)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Legal Telemetry Principle:</strong> LaunchComply correlates live production telemetry (CloudWatch alarms, restore drills, incident response timestamps) against contractual SLA commitments to assist operational reviews. LaunchComply does not automatically declare legal breach or render legal advice.
        </div>
      </div>
    </div>
  );
}
