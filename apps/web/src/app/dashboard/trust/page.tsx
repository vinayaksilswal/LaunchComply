"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Globe,
  Lock,
  FileText,
  CheckCircle2,
  ExternalLink,
  Building2,
  FileSpreadsheet,
  Download,
  Eye,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  HelpCircle
} from "lucide-react";

export default function TrustCenterPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "questionnaires" | "subprocessors">("overview");
  const [publicEnabled, setPublicEnabled] = useState(true);

  const questionnaires = [
    {
      id: "caiq-1",
      framework: "CSA CAIQ-Lite",
      question: "Is all customer data encrypted in transit using industry-standard protocols?",
      answer: "Yes. TLS 1.3 is enforced on all public and internal service boundaries. Plaintext HTTP is permanently rejected with HSTS enabled.",
      control: "CC6.6",
      status: "APPROVED",
    },
    {
      id: "caiq-2",
      framework: "CSA CAIQ-Lite",
      question: "Is customer data encrypted at rest across all storage layers?",
      answer: "Yes. All databases (Aurora PostgreSQL), object storage buckets (S3), and block storage volumes (EBS) are encrypted with AES-256 via AWS KMS customer-managed keys.",
      control: "CC6.7",
      status: "APPROVED",
    },
    {
      id: "caiq-3",
      framework: "CSA CAIQ-Lite",
      question: "Is multi-factor authentication (MFA) mandated for privileged administrative access?",
      answer: "Yes. MFA is strictly enforced across identity providers and cloud console access via SAML/OIDC and hardware security keys.",
      control: "CC6.1",
      status: "APPROVED",
    },
    {
      id: "caiq-4",
      framework: "CSA CAIQ-Lite",
      question: "What are your RTO and RPO targets for disaster recovery?",
      answer: "Target RPO is <= 15 minutes via automated continuous replication. Target RTO is <= 30 minutes via automated multi-region warm standby failover.",
      control: "A1.2",
      status: "APPROVED",
    },
  ];

  const subprocessors = [
    { name: "Amazon Web Services (AWS)", purpose: "Cloud Infrastructure & Primary Database", country: "India / USA", dpaStatus: "EXECUTED", risk: "LOW" },
    { name: "GitHub Inc. (Microsoft)", purpose: "Source Code Management & CI/CD", country: "USA", dpaStatus: "EXECUTED", risk: "LOW" },
    { name: "Stripe Inc.", purpose: "Payment Processing & Billing", country: "USA", dpaStatus: "EXECUTED", risk: "LOW" },
    { name: "Datadog Inc.", purpose: "Application Performance Monitoring", country: "USA", dpaStatus: "EXECUTED", risk: "LOW" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-cyan-600" />
            Enterprise Trust Center & Security Questionnaire Vault
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Publish enterprise security postures, share vetted CAIQ/SIG questionnaires with enterprise procurement, and manage third-party auditor trust.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
            <span className="text-slate-600 font-medium">Public Trust Center:</span>
            <button
              onClick={() => setPublicEnabled(!publicEnabled)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                publicEnabled ? "bg-emerald-600 text-white" : "bg-slate-400 text-white"
              }`}
            >
              {publicEnabled ? "LIVE" : "DISABLED"}
            </button>
          </div>
          <a
            href="/audit"
            target="_blank"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            Auditor Trust Portal
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 transition-colors ${
            activeTab === "overview"
              ? "text-cyan-700 border-b-2 border-cyan-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Trust Center Configuration & Preview
        </button>
        <button
          onClick={() => setActiveTab("questionnaires")}
          className={`pb-3 transition-colors ${
            activeTab === "questionnaires"
              ? "text-cyan-700 border-b-2 border-cyan-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Security Questionnaires (CAIQ & SIG)
        </button>
        <button
          onClick={() => setActiveTab("subprocessors")}
          className={`pb-3 transition-colors ${
            activeTab === "subprocessors"
              ? "text-cyan-700 border-b-2 border-cyan-700"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Subprocessor Directory ({subprocessors.length})
        </button>
      </div>

      {/* Tab 1: Overview & Preview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Form */}
          <div className="lg:col-span-2 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 text-xs">
            <h2 className="text-sm font-bold text-slate-900">Trust Center Settings</h2>
            
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Company Name</label>
              <input
                type="text"
                defaultValue="AcmeCloud Technologies Inc."
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Security Team Contact Email</label>
              <input
                type="email"
                defaultValue="security@acmecloud.io"
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Executive Security & Compliance Summary</label>
              <textarea
                rows={3}
                defaultValue="AcmeCloud provides secure, compliant SaaS infrastructure with continuous automated compliance monitoring, SOC 2 Type II readiness, and multi-region business continuity resilience."
                className="w-full p-2.5 rounded-lg border border-slate-200 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Encryption Assurances</label>
                <input
                  type="text"
                  defaultValue="TLS 1.3 in-transit • AES-256 KMS at-rest"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Business Continuity Targets</label>
                <input
                  type="text"
                  defaultValue="15-min RPO • 30-min RTO (Warm Standby)"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={() => alert("Trust Center configuration updated successfully!")}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>

          {/* Customer-Facing Live Preview */}
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Customer View Preview</span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">LIVE</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
                <div className="font-bold text-slate-900 text-sm">AcmeCloud Security Portal</div>
                <p className="text-slate-500 text-[11px]">SOC 2 Type II &amp; ISO 27001 Security Assurance</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Zero Trust IAM with Mandatory MFA</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>End-to-End Encryption with AES-256 KMS</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Continuous 15-Minute RPO Multi-Region DR</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Annual Independent Third-Party VAPT</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-900 text-[11px]">
                <strong>Auditor Notice:</strong> Formal ISO/SOC reports require an active NDA and can be accessed through the time-bound Auditor Portal.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Questionnaires */}
      {activeTab === "questionnaires" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Pre-approved security answers for enterprise security questionnaires (CSA CAIQ, Standard Information Gathering SIG Lite).
            </p>
            <button
              onClick={() => alert("Exporting all approved questionnaire answers to JSON...")}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export Questionnaire (.json)
            </button>
          </div>

          <div className="space-y-3">
            {questionnaires.map((q) => (
              <div key={q.id} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded text-[11px] font-bold">
                    {q.framework} • Control {q.control}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                    {q.status}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900">{q.question}</h3>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed font-sans">
                  {q.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Subprocessors */}
      {activeTab === "subprocessors" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
          <div className="p-4 border-b border-slate-200 font-bold text-slate-800">
            Approved Enterprise Subprocessors &amp; Cloud Vendors
          </div>
          <div className="divide-y divide-slate-100">
            {subprocessors.map((sp) => (
              <div key={sp.name} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                <div>
                  <div className="font-bold text-slate-900">{sp.name}</div>
                  <div className="text-slate-500 text-[11px]">{sp.purpose} • Location: {sp.country}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-semibold">
                    DPA {sp.dpaStatus}
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 font-mono text-[11px]">
                    Risk: {sp.risk}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
