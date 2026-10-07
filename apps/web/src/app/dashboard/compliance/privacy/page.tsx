"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FolderLock,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowLeft,
  Search,
  Database,
  Lock,
  Building2
} from "lucide-react";

export default function PrivacyOperationsPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "ropa" | "requests">("inventory");
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);

  const [requests, setRequests] = useState([
    { id: "DSR-2026-001", type: "ERASURE", name: "Rahul Sharma", email: "rahul.sharma@example.com", status: "IN_PROGRESS", daysRemaining: 26, notes: "Identity verified via OTP. Scoping retention exemptions." },
    { id: "DSR-2026-002", type: "ACCESS", name: "Ananya Iyer", email: "ananya.iyer@example.com", status: "RECEIVED", daysRemaining: 30, notes: "Awaiting government ID / OTP verification confirmation." }
  ]);

  const [newRequest, setNewRequest] = useState({
    type: "ACCESS",
    name: "",
    email: ""
  });

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.name || !newRequest.email) return;
    const req = {
      id: `DSR-2026-${String(requests.length + 1).padStart(3, "0")}`,
      type: newRequest.type,
      name: newRequest.name,
      email: newRequest.email,
      status: "RECEIVED",
      daysRemaining: 30,
      notes: "Newly registered customer data principal request."
    };
    setRequests([req, ...requests]);
    setShowNewRequestModal(false);
    setNewRequest({ type: "ACCESS", name: "", email: "" });
  };

  const inventory = [
    { system: "RDS PostgreSQL Production", dataset: "User Profiles & Auth", category: "IDENTIFIER", classification: "PERSONAL", purpose: "Authentication & profile lifecycle", retention: "Active + 3 years", deletion: "Row purge with RDS drop overwrite", encryption: "KMS AES-256" },
    { system: "Stripe Vault", dataset: "Customer Payment & GSTIN", category: "FINANCIAL", classification: "SENSITIVE_PERSONAL", purpose: "Subscription billing & tax invoice generation", retention: "7 years (Statutory GST)", deletion: "Stripe Customer Redaction API", encryption: "PCI-DSS Level 1 / AES-256" },
    { system: "AWS CloudWatch Logs", dataset: "API Request Telemetry & IP", category: "TECHNICAL", classification: "PERSONAL", purpose: "Security auditing & CERT-In compliance", retention: "365 days (Mandatory)", deletion: "CloudWatch retention expiry", encryption: "KMS AES-256" },
  ];

  const ropa = [
    { name: "Customer Onboarding & Account Creation", purpose: "Tenant provisioning and authentication", basis: "CONTRACTUAL_NECESSITY", categories: "Name, Work Email, Hashed Password", subprocessors: "AWS, SendGrid", retention: "Active account + 3 years" },
    { name: "Subscription Billing & Tax Invoicing", purpose: "Recurring payment collection & compliant GST invoices", basis: "LEGAL_OBLIGATION", categories: "Billing Name, GSTIN, Company Address", subprocessors: "Stripe Payments", retention: "7 years" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/dashboard/compliance" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Compliance Command Center
        </Link>
        <span>/</span>
        <span className="text-white font-medium">India DPDP Privacy Operations</span>
      </div>

      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
              INDIA DPDP ACT (2023)
            </span>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              Data Fiduciary Readiness
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FolderLock className="w-6 h-6 text-emerald-400" />
            Digital Personal Data Protection (DPDP) Operations
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Operational privacy compliance covering personal data inventory, lawful processing basis,
            subprocessor registry, and data principal rights fulfillment (DSR).
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-3xl font-black text-emerald-400 font-mono">81%</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Privacy Readiness</div>
          </div>
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-slate-950 transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" /> Register DSR Request
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "inventory" ? "border-emerald-400 text-emerald-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Database className="w-4 h-4" />
          Data Inventory ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab("ropa")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "ropa" ? "border-emerald-400 text-emerald-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          Processing Activities (ROPA)
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === "requests" ? "border-emerald-400 text-emerald-400" : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <Clock className="w-4 h-4" />
          Privacy Requests (DSR) ({requests.length})
        </button>
      </div>

      {activeTab === "inventory" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Personal Data Element Inventory & Retention Schedule
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-4">System & Dataset</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4">Retention Period</th>
                  <th className="py-3 px-4">Deletion Method</th>
                  <th className="py-3 px-4">Encryption</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {inventory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-850/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{item.dataset}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.system}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        item.classification === "SENSITIVE_PERSONAL"
                          ? "text-rose-400 bg-rose-950/60 border-rose-500/30"
                          : "text-blue-400 bg-blue-950/60 border-blue-500/30"
                      }`}>
                        {item.classification}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-xs">{item.purpose}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{item.retention}</td>
                    <td className="py-3 px-4 text-slate-400">{item.deletion}</td>
                    <td className="py-3 px-4 font-mono text-cyan-300">{item.encryption}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "ropa" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ropa.map((r, i) => (
            <div key={i} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  BASIS: {r.basis}
                </span>
                <span className="text-xs text-slate-400 font-mono">Retention: {r.retention}</span>
              </div>
              <h4 className="font-bold text-white text-sm">{r.name}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{r.purpose}</p>
              <div className="pt-2 border-t border-slate-800/80 space-y-1 text-xs">
                <div>Data Categories: <span className="text-slate-300 font-medium">{r.categories}</span></div>
                <div>Subprocessors: <span className="text-cyan-400 font-medium">{r.subprocessors}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "requests" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Data Principal Rights (DSR) Requests Log
            </h3>
            <span className="text-xs text-slate-400">Configured SLA: 30 Calendar Days</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Right Requested</th>
                  <th className="py-3 px-4">Data Principal</th>
                  <th className="py-3 px-4">SLA Countdown</th>
                  <th className="py-3 px-4">Notes & Verification</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-850/40">
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{req.id}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                        {req.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{req.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{req.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-amber-400 font-bold">
                      {req.daysRemaining} days remaining
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-sm">{req.notes}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New DSR Modal */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Register Data Principal Request (DSR)</h3>
            <p className="text-xs text-slate-400">
              Records an official request under the India DPDP Act. Initiates 30-day fulfillment SLA countdown.
            </p>
            <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Right Requested</label>
                <select
                  value={newRequest.type}
                  onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="ACCESS">Right to Access Summary & Identity</option>
                  <option value="CORRECTION">Right to Correction & Updating</option>
                  <option value="ERASURE">Right to Erasure / Deletion</option>
                  <option value="WITHDRAWAL">Right to Withdraw Consent</option>
                  <option value="GRIEVANCE">Right of Grievance Redressal</option>
                </select>
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Data Principal Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Sharma"
                  value={newRequest.name}
                  onChange={(e) => setNewRequest({ ...newRequest, name: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Contact Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="priya@example.com"
                  value={newRequest.email}
                  onChange={(e) => setNewRequest({ ...newRequest, email: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-slate-950 font-bold"
                >
                  Record Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
