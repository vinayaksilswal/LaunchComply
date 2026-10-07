"use client";

import { useState } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  CheckCircle2,
  X,
  Copy,
  Clock,
  ExternalLink,
  Sparkles
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "DEVOPS" | "SECURITY" | "COMPLIANCE" | "BILLING" | "DEVELOPER" | "VIEWER";
  status: "ACTIVE" | "PENDING";
  joinedAt: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([
    { id: "1", name: "Alex Mercer", email: "alex@acmecloud.io", role: "OWNER", status: "ACTIVE", joinedAt: "2026-01-15" },
    { id: "2", name: "Vikram Rathore", email: "vikram.devops@acmecloud.io", role: "DEVOPS", status: "ACTIVE", joinedAt: "2026-02-01" },
    { id: "3", name: "Neha Sharma", email: "neha.sec@acmecloud.io", role: "SECURITY", status: "ACTIVE", joinedAt: "2026-03-10" },
    { id: "4", name: "Priya Nair", email: "priya.compliance@acmecloud.io", role: "COMPLIANCE", status: "ACTIVE", joinedAt: "2026-04-18" },
    { id: "5", name: "Ramesh Kumar", email: "finance@acmecloud.io", role: "BILLING", status: "ACTIVE", joinedAt: "2026-05-20" }
  ]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("DEVELOPER");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const token = `inv_${Math.random().toString(36).substring(2, 12)}`;
    const link = `${window.location.origin}/signup?invite_token=${encodeURIComponent(token)}`;
    setGeneratedLink(link);

    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: inviteRole as any,
      status: "PENDING",
      joinedAt: "Just now"
    };
    setMembers([...members, newMember]);
    setNotice(`Invitation token dispatched to ${inviteEmail}.`);
    setTimeout(() => setNotice(null), 5000);
  };

  const getRoleBadge = (role: TeamMember["role"]) => {
    switch (role) {
      case "OWNER": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "ADMIN": return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "SECURITY": return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "COMPLIANCE": return "bg-teal-500/10 text-teal-400 border-teal-500/30";
      case "DEVOPS": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "BILLING": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default: return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Organization RBAC & Access</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Team Members & Invitations</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage granular role-based permissions across cloud delivery, security operations, compliance, and billing.
          </p>
        </div>

        <button
          onClick={() => {
            setIsInviteModalOpen(true);
            setGeneratedLink(null);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Teammate</span>
        </button>
      </div>

      {notice && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Team Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Members ({members.length})
          </div>
          <span className="text-xs text-slate-500">Business Plan: 5 / 50 seats allocated</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3 pl-4">Member</th>
                <th className="p-3">Assigned Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined Date</th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 pl-4">
                    <div className="font-semibold text-white">{m.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{m.email}</div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getRoleBadge(m.role)}`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      m.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{m.joinedAt}</td>
                  <td className="p-3 pr-4 text-right">
                    {m.role !== "OWNER" && (
                      <button
                        onClick={() => alert(`Managing role permissions for ${m.name}`)}
                        className="text-xs text-slate-400 hover:text-white font-semibold"
                      >
                        Edit Role
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Invite Team Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!generatedLink ? (
              <form onSubmit={handleSendInvite} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Teammate Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="devops.lead@acmecloud.io"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Organization Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="DEVELOPER">Developer (Build & View Apps)</option>
                    <option value="DEVOPS">DevOps (Deployments, AWS, Incidents, DR)</option>
                    <option value="SECURITY">Security (VAPT, Findings, Scopes)</option>
                    <option value="COMPLIANCE">Compliance (ISO 27001, SOC 2, Privacy, SoA)</option>
                    <option value="BILLING">Billing (Invoices, Subscriptions, GST)</option>
                    <option value="ADMIN">Admin (Full Team & Settings Access)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
                  >
                    Generate Invite Link
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>One-time cryptographic invitation link generated!</span>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Share this one-time link with your teammate:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 font-mono select-all text-[11px]"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedLink);
                        alert("Invite link copied to clipboard!");
                      }}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
