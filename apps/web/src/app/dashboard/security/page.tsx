"use client";

import { useState } from "react";
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Search, Filter, Sparkles, Lock } from "lucide-react";

interface ControlItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: "PASS" | "FAIL" | "PARTIAL" | "MANUAL_REVIEW";
  frameworks: string[];
}

const CONTROLS: ControlItem[] = [
  { id: "SEC-01", category: "Network Exposure", title: "Public Subnet Ingress Restricted to ALB & CloudFront", description: "VPC security groups strictly forbid direct 0.0.0.0/0 ingress to compute or databases.", status: "PASS", frameworks: ["ISO 27001 A.8.20", "SOC 2 CC6.6"] },
  { id: "SEC-02", category: "Database Security", title: "RDS Isolated in Dedicated Database Subnets", description: "Database cluster has no public IP allocations and communicates strictly across private subnets.", status: "PARTIAL", frameworks: ["ISO 27001 A.8.24", "DPDP Sec 8"] },
  { id: "SEC-03", category: "Identity & RBAC", title: "MFA Enforced for All Administrative Console Access", description: "AWS IAM and LaunchComply accounts enforce hardware or TOTP multi-factor authentication.", status: "PASS", frameworks: ["ISO 27001 A.5.17", "SOC 2 CC6.1"] },
  { id: "SEC-04", category: "Encryption", title: "AWS KMS Customer Managed Keys for All Data at Rest", description: "RDS storage, S3 buckets, and EBS container volumes encrypted using dedicated AES-256 KMS CMKs.", status: "PASS", frameworks: ["ISO 27001 A.8.24", "DPDP Sec 8", "SOC 2 CC6.7"] },
  { id: "SEC-05", category: "API Security", title: "CORS Restrictions on Sensitive Authentication Endpoints", description: "Strictly disallow Access-Control-Allow-Origin: * on credentials and token exchange routes.", status: "FAIL", frameworks: ["OWASP Top 10", "SOC 2 CC6.6"] },
  { id: "SEC-06", category: "Secrets Management", title: "Zero Plaintext Credentials in Repositories or Images", description: "All database passwords, JWT secrets, and API tokens injected via AWS Secrets Manager at runtime.", status: "PASS", frameworks: ["ISO 27001 A.8.9", "SOC 2 CC6.1"] },
  { id: "SEC-07", category: "Logging & Audit", title: "AWS CloudTrail Multi-Region Log Integrity Validation", description: "Immutable S3 bucket with Object Lock enabled storing signed management and data event trails.", status: "PASS", frameworks: ["ISO 27001 A.8.15", "SOC 2 CC7.2"] },
  { id: "SEC-08", category: "Container Security", title: "ECR Image Vulnerability Scanning on Push", description: "Container images analyzed via AWS Inspector/Clair prior to ECS Fargate task deployment.", status: "PASS", frameworks: ["ISO 27001 A.8.28", "SOC 2 CC7.1"] },
  { id: "SEC-09", category: "TLS Configuration", title: "TLS 1.3 Strict Cipher Suites on Edge CloudFront", description: "Deprecated SSLv3, TLS 1.0, and TLS 1.1 disabled. HSTS preload header enabled with 1-year max-age.", status: "PASS", frameworks: ["ISO 27001 A.8.20", "SOC 2 CC6.7"] },
  { id: "SEC-10", category: "Disaster Recovery", title: "Continuous PostgreSQL WAL Archiving & Point-In-Time Restore", description: "5-minute RPO with automated daily snapshots retained across 35 calendar days.", status: "PASS", frameworks: ["ISO 27001 A.8.14", "SOC 2 A1.2"] },
];

export default function SecurityCenterPage() {
  const [filterCategory, setFilterCategory] = useState<string>("ALL");

  const filteredControls = filterCategory === "ALL" 
    ? CONTROLS 
    : CONTROLS.filter(c => c.category === filterCategory);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            Security Center & Continuous Controls
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time compliance and security posture baseline mapped across AWS infrastructure, containers, and code.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            Security Posture: <strong className="text-blue-400">81% PASS</strong>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="text-slate-400 font-medium">Passing Controls</div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">8 Controls</div>
        </div>
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="text-slate-400 font-medium">Failed Controls</div>
          <div className="text-2xl font-extrabold text-rose-400 mt-1">1 Control</div>
        </div>
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="text-slate-400 font-medium">Partial / In Progress</div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">1 Control</div>
        </div>
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800">
          <div className="text-slate-400 font-medium">Last Automated Scan</div>
          <div className="text-sm font-bold text-slate-200 mt-2 font-mono">Today at 10:30 UTC</div>
        </div>
      </div>

      {/* Controls Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="text-xs font-bold text-white uppercase tracking-wider">
            Verified Security Controls ({filteredControls.length})
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5"
            >
              <option value="ALL">All Categories</option>
              <option value="Network Exposure">Network Exposure</option>
              <option value="Database Security">Database Security</option>
              <option value="Identity & RBAC">Identity & RBAC</option>
              <option value="Encryption">Encryption</option>
              <option value="API Security">API Security</option>
              <option value="Secrets Management">Secrets Management</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-800/80">
          {filteredControls.map((c) => (
            <div key={c.id} className="p-4 hover:bg-slate-850/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-3xl">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {c.id}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {c.category}
                  </span>
                  <span className="text-xs font-bold text-white">{c.title}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pl-1">{c.description}</p>
                <div className="flex flex-wrap gap-1.5 pt-1 pl-1">
                  {c.frameworks.map((f, i) => (
                    <span key={i} className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    c.status === "PASS"
                      ? "bg-emerald-950/70 text-emerald-400 border border-emerald-500/30"
                      : c.status === "FAIL"
                      ? "bg-rose-950/70 text-rose-400 border border-rose-500/30"
                      : "bg-amber-950/70 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {c.status === "PASS" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
