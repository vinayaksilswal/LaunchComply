"use client";

import { useState } from "react";
import {
  Lock,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  ExternalLink,
  Eye,
  Key,
  Calendar,
  Send,
  HelpCircle,
  FileCheck
} from "lucide-react";

export default function AuditorPortalPage() {
  const [tokenInput, setTokenInput] = useState("lc_aud_demo_token_acmecloud_pwc_2026");
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activeTab, setActiveTab] = useState<"evidence" | "requests">("evidence");

  // Evidence Request State
  const [requestTitle, setRequestTitle] = useState("");
  const [requestControl, setRequestControl] = useState("SOC2-CC6.1");
  const [requestNotes, setRequestNotes] = useState("");
  const [submittedRequests, setSubmittedRequests] = useState([
    {
      id: "req-1",
      title: "Request for AWS RDS KMS Customer Managed Key Policy & Rotation Evidence",
      control: "SOC2-CC6.1",
      status: "FULFILLED",
      responseNotes: "Attached JSON snapshot showing KMS Key Rotation enabled (KeyId: arn:aws:kms:ap-south-1:012345678901:key/acme-rds-prod).",
      date: "Oct 03, 2026 09:30 UTC",
    },
  ]);

  const evidenceItems = [
    {
      id: "ev-01",
      title: "AWS RDS PostgreSQL Storage Encryption with KMS Customer Managed Key",
      framework: "SOC 2 CC6.1 • ISO 27001 A.8.24",
      controlCode: "CC6.1-ENCRYPTION-AT-REST",
      sha256: "d41d8cd98f00b204e9800998ecf8427e5a7b8e912b3c4d5e6f7a8b9c0d1e2f3a",
      timestamp: "Today at 08:00 UTC",
      data: {
        engine: "postgres",
        storage_encrypted: true,
        kms_key_id: "arn:aws:kms:ap-south-1:012345678901:key/acme-rds-prod",
        master_password: "[REDACTED_AUDITOR_SAFE]",
        connection_url: "postgresql://app:[REDACTED_AUDITOR_SAFE]@db.internal:5432/prod",
      },
    },
    {
      id: "ev-02",
      title: "AWS S3 Vault Public Access Block & Object Lock Verification",
      framework: "SOC 2 CC6.6 • ISO 27001 A.8.20",
      controlCode: "CC6.6-BOUNDARY-PROTECTION",
      sha256: "9b74c9897bac770ffc029102a200c5deac54f2c0065791f01fc617154228b3f7",
      timestamp: "Today at 08:00 UTC",
      data: {
        bucket: "launchcomply-acme-saas-production-vault",
        block_public_acls: true,
        ignore_public_acls: true,
        block_public_policy: true,
        restrict_public_buckets: true,
        kms_cmk_arn: "arn:aws:kms:ap-south-1:012345678901:key/acme-s3-prod",
      },
    },
    {
      id: "ev-03",
      title: "Multi-Region Warm Standby DR Simulation Drill Verification (RTO: 12m 22s)",
      framework: "SOC 2 A1.2 • ISO 27001 A.8.14",
      controlCode: "A1.2-DR-RESILIENCE",
      sha256: "4a8a08f09d37b73795649038408b5f330fc1184f09119e73ab3a450ff552a1cd",
      timestamp: "Oct 02, 2026 14:15 UTC",
      data: {
        primary_region: "ap-south-1",
        standby_region: "ap-southeast-1",
        target_rto_seconds: 1800,
        measured_rto_seconds: 742,
        rto_sla_met: true,
        measured_rpo_minutes: 4.1,
        production_traffic_affected: false,
      },
    },
    {
      id: "ev-04",
      title: "Zero Plaintext Credentials in Repository (Gitleaks Pre-Commit Guard)",
      framework: "SOC 2 CC6.1 • ISO 27001 A.8.9",
      controlCode: "CC6.1-SECRET-HYGIENE",
      sha256: "3b712f5a892b0c1e8432a1040db3815eac816402fc7329184510fe01928374a5",
      timestamp: "Oct 01, 2026 11:20 UTC",
      data: {
        pre_commit_hook_active: true,
        secret_scanner_status: "PASSED",
        runtime_injection_method: "AWS Secrets Manager Task Definition",
      },
    },
  ];

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTitle) return;
    const newReq = {
      id: `req-${submittedRequests.length + 1}`,
      title: requestTitle,
      control: requestControl,
      status: "REQUESTED",
      responseNotes: "Request queued for internal compliance officer review.",
      date: "Just Now",
    };
    setSubmittedRequests([newReq, ...submittedRequests]);
    setRequestTitle("");
    setRequestNotes("");
    alert("Evidence request submitted successfully to AcmeCloud compliance team!");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Banner */}
      <header className="bg-slate-950 text-white px-8 py-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-white shadow-md">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight leading-tight flex items-center gap-2">
              <span>LaunchComply Auditor Trust Portal</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                READ-ONLY VERIFIED
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Strictly Read-Only Access • Time-Bound Grant: PwC Cyber Assurance (Arthur Vance)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="text-slate-400">
            Grant Expires: <strong className="text-white">October 17, 2026 (14 Days)</strong>
          </div>
          <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
            NDA Ref: NDA-PWC-2026-0914
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-8 space-y-6">
        {/* Redaction Notice Alert */}
        <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-900 flex items-start gap-3 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-cyan-700 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-cyan-950 font-semibold">Automated Redaction Protocol Active:</strong>
            <p className="mt-0.5 text-cyan-800 leading-relaxed">
              In accordance with Zero-Knowledge Auditor Privacy Standards, all production customer secrets, database passwords, private encryption keys, and session tokens have been permanently masked with <code className="font-mono font-bold bg-cyan-100 px-1 py-0.5 rounded text-cyan-900">[REDACTED_AUDITOR_SAFE]</code> prior to portal rendering.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("evidence")}
            className={`pb-3 transition-colors ${
              activeTab === "evidence"
                ? "text-cyan-700 border-b-2 border-cyan-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Compliance Evidence Vault ({evidenceItems.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-3 transition-colors ${
              activeTab === "requests"
                ? "text-cyan-700 border-b-2 border-cyan-700"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Auditor Evidence Requests ({submittedRequests.length})
          </button>
        </div>

        {/* Tab 1: Evidence Vault */}
        {activeTab === "evidence" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Showing tamper-evident compliance evidence snapshots signed with SHA-256 integrity hashes.</span>
              <button
                onClick={() => alert("Downloading all evidence snapshots in signed JSON-LD format...")}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-semibold flex items-center gap-1.5 hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Evidence Package (.zip)
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {evidenceItems.map((item) => (
                <div key={item.id} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <span className="font-mono text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 text-[11px]">
                        {item.framework}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">{item.title}</h3>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Verified: {item.timestamp}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 text-cyan-400 font-mono text-[11px] rounded-xl overflow-x-auto whitespace-pre">
                    {JSON.stringify(item.data, null, 2)}
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
                    <span className="truncate">
                      SHA256: <strong>{item.sha256}</strong>
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200 flex-shrink-0">
                      INTEGRITY VERIFIED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Auditor Requests */}
        {activeTab === "requests" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Submit Request Form */}
            <form onSubmit={handleCreateRequest} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 text-xs">
              <h3 className="font-bold text-sm text-slate-900">Submit New Evidence Request</h3>
              <p className="text-slate-500">
                Auditors can formally request additional control proof, configuration exports, or log samples.
              </p>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Target Framework Control</label>
                <select
                  value={requestControl}
                  onChange={(e) => setRequestControl(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-800"
                >
                  <option value="SOC2-CC6.1">SOC 2 CC6.1 - Logical Access Controls</option>
                  <option value="SOC2-CC6.6">SOC 2 CC6.6 - Network Boundary Protection</option>
                  <option value="SOC2-CC7.2">SOC 2 CC7.2 - Security Event Monitoring</option>
                  <option value="ISO-A.8.24">ISO 27001 A.8.24 - Use of Cryptography</option>
                  <option value="ISO-A.8.14">ISO 27001 A.8.14 - Redundancy of Processing</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Request Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS WAF Core Rule Set Configuration Export"
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Auditor Notes & Specific Queries</label>
                <textarea
                  rows={3}
                  placeholder="Specify sampling period, cloud resources, or audit criteria needed..."
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Formal Evidence Request
              </button>
            </form>

            {/* Request Tracker List */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Request Tracking History</h3>
              <div className="space-y-3">
                {submittedRequests.map((req) => (
                  <div key={req.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded text-[11px] font-bold">
                        Control: {req.control}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          req.status === "FULFILLED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm">{req.title}</h4>
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <strong>Response:</strong> {req.responseNotes}
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono pt-1">
                      Submitted: {req.date} • Auditor: Arthur Vance (PwC)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
