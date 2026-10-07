"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Lock,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
  ShieldCheck,
  FileCheck2,
  ExternalLink,
  Search,
} from "lucide-react";

interface WorkpaperItem {
  id: string;
  number: string;
  framework: string;
  controlCode: string;
  controlTitle: string;
  auditorEmail: string;
  status: "NOT_REVIEWED" | "IN_REVIEW" | "ACCEPTED" | "REJECTED" | "NEEDS_MORE_INFO";
  samplingNotes: string;
  findingsNotes: string;
  period: string;
  evidenceRefs: string[];
}

const INITIAL_WORKPAPERS: WorkpaperItem[] = [
  {
    id: "wp-1",
    number: "WP-2026-SOC2-CC6.1",
    framework: "SOC 2 Type II",
    controlCode: "LC-CR-001",
    controlTitle: "Cryptographic Protection & Encryption at Rest",
    auditorEmail: "sarah.jenkins@deloitte-audit.example",
    status: "ACCEPTED",
    samplingNotes: "Sampled 100% of production RDS PostgreSQL clusters and S3 object datastores.",
    findingsNotes: "KMS Customer Managed Key rotation verified active. No unencrypted storage volumes observed.",
    period: "2026-07-01 to 2026-09-30 (Q3)",
    evidenceRefs: ["EVD-AWS-RDS-20261003", "KMS-KEY-STATUS-OK"],
  },
  {
    id: "wp-2",
    number: "WP-2026-SOC2-CC8.1",
    framework: "SOC 2 Type II",
    controlCode: "LC-CH-001",
    controlTitle: "Production Change Authorization & PR Approvals",
    auditorEmail: "sarah.jenkins@deloitte-audit.example",
    status: "ACCEPTED",
    samplingNotes: "Sampled 25 deployment pull requests out of 114 master branch commits across evaluation window.",
    findingsNotes: "All 25 sampled deployments demonstrated 2 peer approvals and automated SAST/container security test gates passing prior to merge.",
    period: "2026-07-01 to 2026-09-30 (Q3)",
    evidenceRefs: ["GITHUB-BRANCH-RULE-EVD", "RELEASE-APPROVAL-SAMPLE-25"],
  },
  {
    id: "wp-3",
    number: "WP-2026-SOC2-A1.2",
    framework: "SOC 2 Type II",
    controlCode: "LC-DR-001",
    controlTitle: "Disaster Recovery Testing & Secondary Region Restoration",
    auditorEmail: "sarah.jenkins@deloitte-audit.example",
    status: "IN_REVIEW",
    samplingNotes: "Sampled Q3 warm standby drill telemetry.",
    findingsNotes: "Observed RTO of 42 seconds satisfies target RTO of 30 minutes. Awaiting clarification on DNS failover replication logs.",
    period: "2026-07-01 to 2026-09-30 (Q3)",
    evidenceRefs: ["DR-DRILL-REPORT-Q3"],
  },
];

export default function AuditorWorkpapersPage() {
  const [workpapers, setWorkpapers] = useState<WorkpaperItem[]>(INITIAL_WORKPAPERS);
  const [selectedWp, setSelectedWp] = useState<WorkpaperItem>(INITIAL_WORKPAPERS[2]);
  const [messages, setMessages] = useState([
    {
      author: "Sarah Jenkins, CPA (Auditor)",
      role: "AUDITOR",
      time: "Yesterday at 14:10",
      text: "Please provide DNS failover Route 53 health check logs corresponding to the Q3 restore drill evidence.",
    },
    {
      author: "Vikram Malhotra (Compliance Manager)",
      role: "AUDITEE",
      time: "Yesterday at 16:45",
      text: "Route 53 health check logs attached in EVD-DR-DRILL-R53-LOGS. Failover threshold was reached in 12s.",
    },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        author: "Sarah Jenkins, CPA (Auditor)",
        role: "AUDITOR",
        time: "Just now",
        text: newMessage,
      },
    ]);
    setNewMessage("");
  };

  const handleStatusChange = (newStatus: any) => {
    setWorkpapers((prev) =>
      prev.map((wp) => (wp.id === selectedWp.id ? { ...wp, status: newStatus } : wp))
    );
    setSelectedWp((prev) => ({ ...prev, status: newStatus }));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 text-slate-100">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/audit" className="hover:text-cyan-400 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Auditor Portal
        </Link>
        <span>/</span>
        <span className="text-white font-medium">Independent Auditor Workpapers</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            Auditor Examination Workpapers & Collaboration
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Audit Grant: Active
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Independent sampling workpapers, threaded evidence inquiries, and evaluation review tracking for active assurance audits.
          </p>
        </div>

        <div className="text-right text-xs text-slate-400">
          <span className="block font-semibold text-slate-200">Sarah Jenkins, CPA</span>
          <span>Deloitte & Touche LLP</span>
        </div>
      </div>

      {/* Main Grid: Workpapers List vs Threaded Workpaper Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Workpapers List */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">SOC 2 Workpapers (3)</h2>
          <div className="space-y-2">
            {workpapers.map((wp) => (
              <div
                key={wp.id}
                onClick={() => setSelectedWp(wp)}
                className={`p-4 bg-slate-900/80 border rounded-xl cursor-pointer transition ${
                  selectedWp.id === wp.id ? "border-cyan-500 bg-slate-800/60" : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-cyan-400">{wp.number}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                      wp.status === "ACCEPTED"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : wp.status === "IN_REVIEW"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {wp.status}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-white mt-1.5">{wp.controlTitle}</h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">{wp.controlCode} • {wp.period}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Columns: Workpaper Detail & Collaboration Thread */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                  {selectedWp.number}
                </span>
                <span className="text-xs text-slate-400 font-mono">{selectedWp.controlCode}</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-2">{selectedWp.controlTitle}</h3>
              <p className="text-xs text-slate-400">Framework: {selectedWp.framework} • Evaluation Period: {selectedWp.period}</p>
            </div>

            {/* Auditor Review Status Action */}
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Auditor Decision</span>
              <select
                value={selectedWp.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-white font-semibold focus:outline-none focus:border-cyan-500"
              >
                <option value="NOT_REVIEWED">NOT_REVIEWED</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="ACCEPTED">ACCEPTED (Satisfactory)</option>
                <option value="NEEDS_MORE_INFO">NEEDS_MORE_INFO</option>
                <option value="REJECTED">REJECTED (Exception)</option>
              </select>
            </div>
          </div>

          {/* Sampling & Findings Info */}
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1.5">
              <span className="font-semibold text-slate-300 block uppercase tracking-wider text-[11px]">Auditor Sampling Methodology:</span>
              <p className="text-slate-300 leading-relaxed">{selectedWp.samplingNotes}</p>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1.5">
              <span className="font-semibold text-slate-300 block uppercase tracking-wider text-[11px]">Auditor Observation & Finding Notes:</span>
              <p className="text-slate-300 leading-relaxed">{selectedWp.findingsNotes}</p>
            </div>
          </div>

          {/* Threaded Discussion Area */}
          <div className="space-y-4 border-t border-slate-800 pt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              Auditor / Auditee Collaboration Discussion
            </h4>

            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                    msg.role === "AUDITOR"
                      ? "bg-cyan-950/30 border border-cyan-800/30 ml-4"
                      : "bg-slate-800/60 border border-slate-700 mr-4"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{msg.author}</span>
                    <span className="text-[11px] text-slate-500">{msg.time}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Post Message Input Form */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Reply to auditor or ask for evidence clarification..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Reply
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
