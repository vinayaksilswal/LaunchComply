"use client";

import { useState } from "react";
import {
  LifeBuoy,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Shield,
  Send,
  X,
  Sparkles,
  ArrowRight
} from "lucide-react";

interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  category: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED";
  createdAt: string;
  slaTarget: string;
  messages: Array<{
    id: string;
    sender: string;
    content: string;
    time: string;
    isStaff: boolean;
  }>;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: "tck-1",
      ticketNumber: "LC-TCK-2026-0001",
      title: "Production AWS KMS Key Rotation and CloudTrail integration",
      category: "AWS",
      priority: "NORMAL",
      status: "RESOLVED",
      createdAt: "2026-09-28 10:14",
      slaTarget: "SLA Met (First response: 42m)",
      messages: [
        {
          id: "m1",
          sender: "Alex Mercer",
          content: "We have configured automatic AWS KMS key rotation for the RDS database. How do we ensure continuous evidence is verified by LaunchComply?",
          time: "2026-09-28 10:14",
          isStaff: false
        },
        {
          id: "m2",
          sender: "LaunchComply Cloud Support",
          content: "Hello Alex. LaunchComply continuously ingests KMS key metadata every 6 hours via your read-only STS assume role. You can view the fresh evidence artifact in /dashboard/compliance/iso27001 under control LC-CR-001.",
          time: "2026-09-28 10:56",
          isStaff: true
        }
      ]
    },
    {
      id: "tck-2",
      ticketNumber: "LC-TCK-2026-0002",
      title: "SOC 2 Type II Evidence export clarification for auditor",
      category: "COMPLIANCE",
      priority: "HIGH",
      status: "IN_PROGRESS",
      createdAt: "2026-10-02 14:30",
      slaTarget: "SLA Target: 2h (Response within 35m)",
      messages: [
        {
          id: "m3",
          sender: "Alex Mercer",
          content: "Our KPMG auditor requested an immutable SHA-256 package manifest covering the Q3 evaluation period. Can we generate this directly from the audit readiness center?",
          time: "2026-10-02 14:30",
          isStaff: false
        }
      ]
    }
  ]);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(tickets[1]);
  const [replyText, setReplyText] = useState("");
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("DEPLOYMENT");
  const [newPriority, setNewPriority] = useState<Ticket["priority"]>("NORMAL");
  const [newMessage, setNewMessage] = useState("");

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    const updated = {
      ...selectedTicket,
      messages: [
        ...selectedTicket.messages,
        {
          id: Date.now().toString(),
          sender: "Alex Mercer",
          content: replyText,
          time: "Just now",
          isStaff: false
        }
      ]
    };
    setSelectedTicket(updated);
    setTickets(tickets.map(t => t.id === updated.id ? updated : t));
    setReplyText("");
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const newTck: Ticket = {
      id: Date.now().toString(),
      ticketNumber: `LC-TCK-2026-000${tickets.length + 1}`,
      title: newTitle,
      category: newCategory,
      priority: newPriority,
      status: "OPEN",
      createdAt: "Just now",
      slaTarget: "SLA Due in 2h (Priority Tier)",
      messages: [
        {
          id: "m_init",
          sender: "Alex Mercer",
          content: newMessage,
          time: "Just now",
          isStaff: false
        }
      ]
    };
    setTickets([newTck, ...tickets]);
    setSelectedTicket(newTck);
    setIsNewTicketModalOpen(false);
    setNewTitle("");
    setNewMessage("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <LifeBuoy className="w-4 h-4" />
            <span>Enterprise SLA Operations</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Customer Support Center</h1>
          <p className="text-sm text-slate-400 mt-1">
            Direct communication with LaunchComply cloud engineers, security consultants, and compliance advisors.
          </p>
        </div>

        <button
          onClick={() => setIsNewTicketModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Support Case</span>
        </button>
      </div>

      {/* Main Grid: Ticket List + Selected Conversation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tickets List */}
        <div className="space-y-3 lg:col-span-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Your Cases ({tickets.length})
          </div>
          {tickets.map((t) => {
            const isSelected = selectedTicket?.id === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-500/10"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-cyan-400">{t.ticketNumber}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    t.status === "RESOLVED"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  }`}>
                    {t.status}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-white leading-snug line-clamp-2">
                  {t.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2">
                  <span>{t.category}</span>
                  <span>•</span>
                  <span className="text-amber-400 font-semibold">{t.priority}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>{t.slaTarget}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Ticket Detail & Messages */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[580px] shadow-lg">
              {/* Ticket Top bar */}
              <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                    <span>{selectedTicket.ticketNumber}</span>
                    <span className="text-slate-500">•</span>
                    <span>{selectedTicket.category}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-0.5">{selectedTicket.title}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Priority: {selectedTicket.priority}
                  </span>
                </div>
              </div>

              {/* Message thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedTicket.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-xl text-xs space-y-1.5 max-w-xl ${
                      m.isStaff
                        ? "bg-cyan-950/40 border border-cyan-500/30 text-cyan-100 mr-auto"
                        : "bg-slate-800 text-slate-200 ml-auto"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-[11px]">
                      <span className={m.isStaff ? "text-cyan-400" : "text-slate-400"}>{m.sender}</span>
                      <span className="text-[10px] text-slate-500">{m.time}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-slate-800 bg-slate-950/60 flex gap-2">
                <input
                  type="text"
                  placeholder="Type your response to the support team..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl h-[580px] flex items-center justify-center text-slate-500 text-xs">
              Select a support case to view the conversation.
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isNewTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Open Support Case</h3>
              <button onClick={() => setIsNewTicketModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question regarding multi-region backup restore verification"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="DEPLOYMENT">Deployment & IaC</option>
                    <option value="AWS">AWS Infrastructure</option>
                    <option value="SECURITY">Security & VAPT</option>
                    <option value="COMPLIANCE">Compliance & Audits</option>
                    <option value="BILLING">Billing & Subscriptions</option>
                    <option value="BUG">Platform Bug</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="LOW">Low (General guidance)</option>
                    <option value="NORMAL">Normal (Standard question)</option>
                    <option value="HIGH">High (Production blocked)</option>
                    <option value="URGENT">Urgent (Service outage)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Detailed Description</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide environment IDs, reproduction steps, or relevant error codes..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTicketModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
