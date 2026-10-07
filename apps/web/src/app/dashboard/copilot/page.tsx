"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  FileCheck2,
  Cloud,
  Target,
  AlertTriangle,
  Lock,
  Send,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  Check,
  X,
  FileSpreadsheet,
  Download,
  Building,
  Layers,
  ChevronRight,
} from "lucide-react";

interface CopilotMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  confidence: "SUPPORTED" | "PARTIALLY_SUPPORTED" | "INSUFFICIENT_EVIDENCE";
  citations: {
    type: string;
    code: string;
    summary: string;
  }[];
  proposal?: {
    id: string;
    type: string;
    description: string;
    status: "PROPOSED" | "APPROVED" | "EXECUTED" | "REJECTED";
  };
}

export default function AICopilotPage() {
  const [selectedMode, setSelectedMode] = useState<
    "COMPLIANCE" | "SECURITY" | "CLOUD" | "VAPT" | "INCIDENT" | "AUDIT" | "EXECUTIVE"
  >("COMPLIANCE");

  const [inputQuery, setInputQuery] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: "msg-1",
      role: "USER",
      content: "What is blocking our ISO 27001 readiness?",
      confidence: "SUPPORTED",
      citations: [],
    },
    {
      id: "msg-2",
      role: "ASSISTANT",
      content:
        "Based on verified real tenant compliance evidence, full readiness for ISO 27001 is currently constrained by three items:\n\n1. Control LC-AC-001 (Privileged Access Review) evidence expired 8 days ago.\n2. Vendor security assessment for Resend (Subprocessor) is overdue.\n3. Restore drill rehearsal evidence requires sign-off before audit submission.\n\nI have prepared action proposals to create the remediation tasks for your confirmation.",
      confidence: "SUPPORTED",
      citations: [
        { type: "CONTROL", code: "LC-AC-001", summary: "Access review and revocation evidence" },
        { type: "VENDOR", code: "VND-RESEND", summary: "Annual vendor security review overdue" },
        { type: "EVIDENCE", code: "EVD-RESTORE-Q3", summary: "Database restore drill rehearsal log" },
      ],
      proposal: {
        id: "prop-1",
        type: "CREATE_TASK",
        description: "Create 3 urgent compliance remediation tasks assigned to Security Team",
        status: "PROPOSED",
      },
    },
  ]);

  const [questionnaireItems, setQuestionnaireItems] = useState([
    {
      id: "q-1",
      question: "How is customer data encrypted in transit and at rest?",
      draftedAnswer:
        "All customer data is encrypted in transit using TLS 1.3 with strong ciphers and at rest using AES-256 via AWS KMS customer-managed keys.",
      evidence: "AWS KMS Key ARN: arn:aws:kms:ap-south-1:..., Control LC-CR-001",
      status: "APPROVED",
      confidence: "SUPPORTED",
    },
    {
      id: "q-2",
      question: "Do you enforce Multi-Factor Authentication (MFA) for administrative access?",
      draftedAnswer:
        "MFA is strictly enforced across all employees, developers, and platform administrators via TOTP or hardware security keys (FIDO2).",
      evidence: "Access Policy v2, Control LC-AC-002",
      status: "HUMAN_REVIEW",
      confidence: "SUPPORTED",
    },
    {
      id: "q-3",
      question: "What is your backup retention policy and tested RTO / RPO?",
      draftedAnswer:
        "Encrypted database snapshots are executed every 24 hours with cross-region replication. Verified RTO is < 60 minutes and RPO is < 15 minutes.",
      evidence: "Disaster Recovery Plan v1.4, Restore Drill 2026-Q1",
      status: "HUMAN_REVIEW",
      confidence: "SUPPORTED",
    },
  ]);

  const handleSendMessage = () => {
    if (!inputQuery.trim()) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      role: "USER",
      content: inputQuery,
      confidence: "SUPPORTED",
      citations: [],
    };

    let replyContent = "";
    let citations: any[] = [];
    let proposal: any = undefined;

    if (selectedMode === "SECURITY" || inputQuery.toLowerCase().includes("finding")) {
      replyContent =
        "Analyzed 1 active High severity finding in your production container image:\n\n- Finding: `CVE-2026-4421` (OpenSSL Buffer Overflow)\n- Location: `apps/api/Dockerfile:14`\n- Remediation: Bump base image to `python:3.11-slim-bookworm` or apply patch PR.";
      citations = [{ type: "FINDING", code: "SEC-FIND-042", summary: "CVE-2026-4421 in container runtime" }];
      proposal = {
        id: `prop-${Date.now()}`,
        type: "GENERATE_REMEDIATION_PR",
        description: "Draft automated Dependabot/Remediation pull request to bump base image",
        status: "PROPOSED",
      };
    } else {
      replyContent =
        "Inspected current environment data: 42 canonical controls are active, SOC 2 Type II evidence coverage is at 94%, and 0 critical VAPT issues remain open.";
      citations = [{ type: "FRAMEWORK", code: "SOC-2-TYPE-2", summary: "Annual operating period controls" }];
    }

    const assistantMsg: CopilotMessage = {
      id: `ast-${Date.now()}`,
      role: "ASSISTANT",
      content: replyContent,
      confidence: "SUPPORTED",
      citations,
      proposal,
    };

    setMessages([...messages, userMsg, assistantMsg]);
    setInputQuery("");
  };

  const handleApproveProposal = (propId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.proposal && m.proposal.id === propId) {
          return {
            ...m,
            proposal: {
              ...m.proposal,
              status: "EXECUTED",
            },
          };
        }
        return m;
      })
    );
  };

  const handleApproveQuestionnaire = (itemId: string) => {
    setQuestionnaireItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: "APPROVED" } : item))
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-600" />
              AI Compliance & Security Copilot
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 border border-cyan-300">
              EVIDENCE-GROUNDED
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Grounded assistant operating exclusively on your organization&apos;s structured data. Strictly cites evidence and requires human approval for all mutations.
          </p>
        </div>

        {/* Safety Warning */}
        <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>AI will NOT autonomously deploy, accept risks, or approve audits without human confirmation.</span>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex flex-wrap gap-2">
        {[
          { mode: "COMPLIANCE", label: "Compliance Copilot", icon: FileCheck2 },
          { mode: "SECURITY", label: "Security Copilot", icon: ShieldAlert },
          { mode: "CLOUD", label: "Cloud Copilot", icon: Cloud },
          { mode: "VAPT", label: "VAPT Copilot", icon: Target },
          { mode: "INCIDENT", label: "Incident Copilot", icon: AlertTriangle },
          { mode: "AUDIT", label: "Audit Copilot", icon: Lock },
          { mode: "EXECUTIVE", label: "Executive Copilot", icon: Building },
        ].map((m) => {
          const Icon = m.icon;
          const isSelected = selectedMode === m.mode;
          return (
            <button
              key={m.mode}
              onClick={() => setSelectedMode(m.mode as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                isSelected
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-cyan-400" : "text-slate-400"}`} />
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chat / Assistant Thread (2 Cols) */}
        <div className="lg:col-span-2 flex flex-col h-[650px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === "USER" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    msg.role === "USER"
                      ? "bg-cyan-600 text-white font-medium"
                      : "bg-slate-50 border border-slate-200 text-slate-800 shadow-sm"
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>

                  {/* Citations (Evidence References) */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-1.5">
                      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-cyan-600" />
                        Grounded Citations
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((c, cidx) => (
                          <span
                            key={cidx}
                            title={c.summary}
                            className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-mono text-cyan-800 flex items-center gap-1 shadow-2xs"
                          >
                            <span className="font-bold text-slate-600">[{c.type}]</span> {c.code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Proposal Gate */}
                  {msg.proposal && (
                    <div className="mt-4 p-3 bg-white border border-cyan-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-cyan-900 uppercase">
                          Action Proposal: {msg.proposal.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            msg.proposal.status === "EXECUTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {msg.proposal.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{msg.proposal.description}</p>
                      {msg.proposal.status === "PROPOSED" && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleApproveProposal(msg.proposal!.id)}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg text-xs flex items-center gap-1 shadow-sm"
                          >
                            <Check className="w-3 h-3" />
                            Confirm & Execute
                          </button>
                          <button className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs">
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Prompt Input */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
            <input
              type="text"
              placeholder={`Ask ${selectedMode.toLowerCase()} copilot (e.g. 'What policies expire this month?')`}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1 text-xs px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            <button
              onClick={handleSendMessage}
              className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </div>
        </div>

        {/* Security Questionnaire Assistant Drawer (1 Col) */}
        <div className="flex flex-col h-[650px] bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-cyan-600" />
                Vendor Questionnaire Drafter
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Approved Answer Library Matching</p>
            </div>
            <button className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg flex items-center gap-1">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pt-4">
            {questionnaireItems.map((item) => (
              <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-slate-900">{item.question}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      item.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed bg-white p-2 rounded-lg border border-slate-200/60">
                  {item.draftedAnswer}
                </p>
                <div className="text-[10px] font-mono text-cyan-800 flex items-center gap-1">
                  <span>Evidence:</span> {item.evidence}
                </div>
                {item.status === "HUMAN_REVIEW" && (
                  <button
                    onClick={() => handleApproveQuestionnaire(item.id)}
                    className="w-full mt-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-[11px] flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <Check className="w-3 h-3" /> Approve Draft Response
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
