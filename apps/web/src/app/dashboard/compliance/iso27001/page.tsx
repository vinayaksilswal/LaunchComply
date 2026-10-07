"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Download,
  Check,
  ChevronRight,
  ArrowLeft,
  Building2,
  Users,
  Target,
  FileSpreadsheet
} from "lucide-react";

export default function ISO27001WorkspacePage() {
  const [activeTab, setActiveTab] = useState<"soa" | "scope" | "objectives" | "review">("soa");
  const [soaApproved, setSoaApproved] = useState(true);

  const soaEntries = [
    { code: "A.5.1", title: "Policies for information security", applicable: true, justification: "Required for baseline governance and annual employee review.", owner: "ciso@acmecloud.io", status: "IMPLEMENTED" },
    { code: "A.5.2", title: "Information security roles & responsibilities", applicable: true, justification: "Defines RACI roles for engineering, security, and executive sponsors.", owner: "ciso@acmecloud.io", status: "IMPLEMENTED" },
    { code: "A.5.3", title: "Segregation of duties", applicable: true, justification: "Separates code commit from production deployment approval.", owner: "devops@acmecloud.io", status: "IMPLEMENTED" },
    { code: "A.5.15", title: "Access control", applicable: true, justification: "Mandatory least-privilege RBAC and MFA on cloud infrastructure.", owner: "devops@acmecloud.io", status: "EFFECTIVE" },
    { code: "A.5.18", title: "Access rights", applicable: true, justification: "Quarterly privileged access certification campaigns.", owner: "ciso@acmecloud.io", status: "IMPLEMENTED" },
    { code: "A.5.19", title: "Information security in supplier relationships", applicable: true, justification: "Vendor risk assessment and executed bilateral DPAs.", owner: "legal@acmecloud.io", status: "PARTIAL" },
    { code: "A.5.24", title: "Incident management planning", applicable: true, justification: "Incident triage matrix with 24/7 on-call paging and CERT-In 6-hour SLA.", owner: "security@acmecloud.io", status: "IMPLEMENTED" },
    { code: "A.5.34", title: "Privacy and protection of PII", applicable: true, justification: "Statutory requirement under India DPDP Act (2023).", owner: "privacy@acmecloud.io", status: "EFFECTIVE" },
    { code: "A.7.4", title: "Physical security monitoring", applicable: false, justification: "Cloud-native SaaS hosting exclusively in AWS SOC 2 certified data centers.", exclusion: "No on-premises physical servers owned or operated.", owner: "ciso@acmecloud.io", status: "NOT_APPLICABLE" },
    { code: "A.8.8", title: "Management of technical vulnerabilities", applicable: true, justification: "Automated CI/CD container CVE and dependency scanners.", owner: "security@acmecloud.io", status: "EFFECTIVE" },
    { code: "A.8.13", title: "Information backup", applicable: true, justification: "Continuous WAL archiving and daily automated RDS backups.", owner: "devops@acmecloud.io", status: "EFFECTIVE" },
    { code: "A.8.14", title: "Redundancy of information facilities", applicable: true, justification: "Multi-AZ RDS and cross-region warm standby replication.", owner: "devops@acmecloud.io", status: "EFFECTIVE" },
    { code: "A.8.15", title: "Logging", applicable: true, justification: "AWS CloudTrail multi-region immutable log aggregation.", owner: "devops@acmecloud.io", status: "EFFECTIVE" },
    { code: "A.8.20", title: "Network security", applicable: true, justification: "Isolated private VPC subnets, AWS WAF, and ALB security groups.", owner: "devops@acmecloud.io", status: "EFFECTIVE" },
    { code: "A.8.24", title: "Use of cryptography", applicable: true, justification: "KMS AES-256 storage encryption and TLS 1.3 enforced.", owner: "devops@acmecloud.io", status: "EFFECTIVE" },
    { code: "A.9.2", title: "Internal audit", applicable: true, justification: "Annual internal management system audit requirements.", owner: "ciso@acmecloud.io", status: "IMPLEMENTED" },
    { code: "A.9.3", title: "Management review", applicable: true, justification: "Annual executive management review meeting.", owner: "ciso@acmecloud.io", status: "IMPLEMENTED" },
  ];

  const objectives = [
    { title: "Critical Vulnerability SLA", metric: "MTTR for Critical CVEs <= 24 hours", target: "100%", actual: "100%", status: "ON_TRACK" },
    { title: "Privileged Access MFA", metric: "100% of IAM and GitHub admins enforce hardware/TOTP MFA", target: "100%", actual: "98%", status: "ON_TRACK" },
    { title: "DR Restore Drill RTO", metric: "Observed RTO during quarterly restore drill <= 30 minutes", target: "< 30m", actual: "12m 22s", status: "ACHIEVED" },
    { title: "Security Awareness Training", metric: "Annual employee cybersecurity training completion", target: "> 95%", actual: "92%", status: "AT_RISK" }
  ];

  const handleApproveSoa = () => {
    setSoaApproved(true);
    alert("Statement of Applicability (SoA) v1.0 successfully approved by CISO. Immutable hash logged in audit trail.");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/dashboard/compliance" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Compliance Command Center
        </Link>
        <span>/</span>
        <span className="text-white font-medium">ISO 27001 ISMS</span>
      </div>

      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
              ISO/IEC 27001:2022 ISMS
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              SoA Approved v1.0
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-blue-400" />
            ISO 27001 ISMS Command Workspace
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Operating environment for ISO/IEC 27001:2022 clauses 4–10, Annex A control applicability,
            measurable objectives, and executive management system oversight.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-3xl font-black text-cyan-400 font-mono">74%</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Readiness Score</div>
          </div>
          <button
            onClick={handleApproveSoa}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/20"
          >
            <Check className="w-4 h-4" /> Approve SoA
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("soa")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "soa" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Statement of Applicability ({soaEntries.length})
        </button>
        <button
          onClick={() => setActiveTab("scope")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "scope" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Building2 className="w-4 h-4" />
          ISMS Scope & Context (Clause 4)
        </button>
        <button
          onClick={() => setActiveTab("objectives")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "objectives" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Target className="w-4 h-4" />
          Security Objectives (Clause 6.2)
        </button>
        <button
          onClick={() => setActiveTab("review")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "review" ? "border-cyan-400 text-cyan-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          Management Review (Clause 9.3)
        </button>
      </div>

      {activeTab === "soa" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Statement of Applicability (SoA) Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Annex A control applicability determinations, justifications, and implementation owners.
              </p>
            </div>
            <button
              onClick={() => alert("Exported Statement of Applicability Manifest (SHA-256 Signed JSON)")}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <Download className="w-3.5 h-3.5" /> Export SoA Document
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-4">Control</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Applicable?</th>
                  <th className="py-3 px-4">Justification & Scope</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4 text-right">Implementation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {soaEntries.map((e) => (
                  <tr key={e.code} className="hover:bg-slate-850/40">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{e.code}</td>
                    <td className="py-3 px-4 font-medium text-white">{e.title}</td>
                    <td className="py-3 px-4">
                      {e.applicable ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                          YES
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                          NO (EXCLUDED)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-sm">
                      {e.justification}
                      {e.exclusion && <div className="text-[11px] text-amber-400/90 mt-0.5">Exclusion: {e.exclusion}</div>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{e.owner}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        e.status === "EFFECTIVE"
                          ? "text-emerald-400 bg-emerald-950/60 border-emerald-500/30"
                          : e.status === "IMPLEMENTED"
                          ? "text-cyan-400 bg-cyan-950/60 border-cyan-500/30"
                          : e.status === "PARTIAL"
                          ? "text-amber-400 bg-amber-950/60 border-amber-500/30"
                          : "text-slate-400 bg-slate-800/80 border-slate-700"
                      }`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "scope" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              Approved ISMS Scope Statement (Clause 4.3)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-lg border border-slate-800">
              The Information Security Management System (ISMS) covers the architecture, development, deployment,
              maintenance, and monitoring of LaunchComply cloud platforms and customer infrastructure automation services,
              hosted across primary AWS Region ap-south-1 (Mumbai) and disaster recovery standby Region ap-southeast-1.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Business Units</div>
                <div className="text-white font-medium mt-1">Engineering, Cloud Ops, Security, Support</div>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-bold">AWS Accounts</div>
                <div className="text-white font-medium mt-1">012345678901 (ap-south-1 & ap-southeast-1)</div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Interested Parties & Expectations (Clause 4.2)
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 flex items-start justify-between">
                <div>
                  <div className="font-bold text-white">Enterprise SaaS Customers</div>
                  <div className="text-slate-400 mt-0.5">High availability (99.9%), zero credential leakage, SOC 2 / ISO 27001 compliance.</div>
                </div>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">HIGH</span>
              </div>
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 flex items-start justify-between">
                <div>
                  <div className="font-bold text-white">Statutory Regulators (CERT-In / DPDP Board)</div>
                  <div className="text-slate-400 mt-0.5">6-hour mandatory cyber incident reporting and reasonable security safeguards.</div>
                </div>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">STATUTORY</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "objectives" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {objectives.map((obj, i) => (
            <div key={i} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm">{obj.title}</h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  obj.status === "ACHIEVED"
                    ? "text-emerald-400 bg-emerald-950/60 border-emerald-500/30"
                    : obj.status === "ON_TRACK"
                    ? "text-cyan-400 bg-cyan-950/60 border-cyan-500/30"
                    : "text-amber-400 bg-amber-950/60 border-amber-500/30"
                }`}>
                  {obj.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">{obj.metric}</p>
              <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-slate-800/80">
                <span className="text-slate-400">Target: <strong className="text-white">{obj.target}</strong></span>
                <span className="text-cyan-400 font-bold">Observed: {obj.actual}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "review" && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm">Executive Management Review (Clause 9.3)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Approved minutes and continual improvement decisions.</p>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30 font-bold">
              STATUS: APPROVED
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-3 font-mono leading-relaxed">
            <div><strong>Chairperson:</strong> Alex Mercer (CTO & Acting CISO)</div>
            <div><strong>Attendees:</strong> Vikram Patel (Engineering), Priya Nair (Compliance), Siddharth Rao (Security)</div>
            <div><strong>Key Decisions:</strong></div>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Verified MTTR for critical vulnerabilities meets 24h SLA.</li>
              <li>Confirmed CAPA-2026-001 action plan for transactional subprocessor DPA terms.</li>
              <li>Approved Q4 cloud budget allocation for multi-region warm standby automated failover drill.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
