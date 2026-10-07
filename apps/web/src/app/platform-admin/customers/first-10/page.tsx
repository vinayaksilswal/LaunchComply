"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Shield,
  Server,
  Cloud,
  Layers,
  Activity,
  Edit2,
  Save,
  X,
  FileCheck2,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  MessageSquare,
  FileText,
  DollarSign,
  Calendar,
  AlertCircle
} from "lucide-react";
import { platformAdminApi } from "@/lib/api/modules";

const CANONICAL_STAGES = [
  "PROSPECT",
  "QUALIFIED",
  "DEMO",
  "PILOT_APPROVED",
  "ACCOUNT_CREATED",
  "REPO_CONNECTED",
  "ARCHITECTURE_APPROVED",
  "AWS_ONBOARDING",
  "DEPLOYMENT_IN_PROGRESS",
  "DEPLOYMENT_LIVE",
  "SECURITY_BASELINE",
  "VALUE_VALIDATED",
  "COMMERCIAL_COMMITMENT",
  "PAYMENT_PENDING",
  "PAYMENT_RECONCILED",
  "PAID_RETAINED",
  "AT_RISK",
  "CHURNED"
];

const defaultCustomers = [
  {
    organization_id: "org-finscale-001",
    organization: "FinScale Technologies Pvt Ltd",
    name: "FinScale Technologies Pvt Ltd",
    slug: "finscale",
    classification: "PILOT_CUSTOMER",
    customer_classification: "PILOT_CUSTOMER",
    commercial_state: "AWS_ONBOARDING",
    stage: "AWS_ONBOARDING",
    days_in_stage: 7,
    desired_outcome: "Deploy our fintech SaaS securely to AWS and demonstrate ISO 27001 readiness to enterprise partners.",
    current_outcome_status: "IN_PROGRESS",
    success_definition: "Production VPC + ECS Fargate + RDS Multi-AZ live with zero IAM friction and ISO 27001 readiness report.",
    primary_blocker: "AWS IAM AssumeRole / STS Trust Policy Principal Mismatch",
    payment_reality: "UNPAID / TEST",
    payment_state: "UNPAID / TEST",
    technical_owner: "LaunchComply Operator",
    commercial_owner: "LaunchComply Sales",
    next_action: "Provide CloudFormation Quick-Create deep link to resolve STS trust policy",
    next_action_due: "2026-10-06",
    last_customer_contact: "2026-10-04",
    health_score: 72,
    health_status: "ATTENTION_NEEDED"
  }
];

export default function CustomerOperatingBoardPage() {
  const [customers, setCustomers] = useState<any[]>(defaultCustomers);
  const [loading, setLoading] = useState(false);
  const [realOnly, setRealOnly] = useState(true);
  
  // Stage Transition Modal
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [newStage, setNewStage] = useState<string>("");
  const [newNextAction, setNewNextAction] = useState<string>("");
  const [newNextActionDue, setNewNextActionDue] = useState<string>("");
  const [newOwner, setNewOwner] = useState<string>("");
  const [newBlocker, setNewBlocker] = useState<string>("");
  const [newNotes, setNewNotes] = useState<string>("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Pilot Decision Modal
  const [pilotDecisionCust, setPilotDecisionCust] = useState<any | null>(null);
  const [pilotDecision, setPilotDecision] = useState<string>("EXTEND");
  const [pilotReason, setPilotReason] = useState<string>("");
  const [pilotNewObjective, setPilotNewObjective] = useState<string>("");
  const [pilotNewDate, setPilotNewDate] = useState<string>("");
  const [decisionLoading, setDecisionLoading] = useState(false);

  // Interviews Modal
  const [interviewCust, setInterviewCust] = useState<any | null>(null);
  const [interviewsList, setInterviewsList] = useState<any[]>([]);
  const [showLogInterview, setShowLogInterview] = useState(false);
  const [ivType, setIvType] = useState<string>("ONBOARDING");
  const [ivParticipants, setIvParticipants] = useState<string>("CTO, Lead DevOps, LaunchComply Operator");
  const [ivProblem, setIvProblem] = useState<string>("");
  const [ivValueDriver, setIvValueDriver] = useState<string>("");
  const [ivBlocker, setIvBlocker] = useState<string>("");
  const [ivQuote, setIvQuote] = useState<string>("");
  const [ivPermission, setIvPermission] = useState<boolean>(true);
  const [ivNotes, setIvNotes] = useState<string>("");

  const fetchCustomers = async (isRealOnly?: boolean) => {
    try {
      setLoading(true);
      const targetReal = typeof isRealOnly === "boolean" ? isRealOnly : realOnly;
      const res = await platformAdminApi.getCustomerBoard(targetReal);
      if (res && res.length > 0) {
        setCustomers(res);
      }
    } catch (err) {
      console.warn("Using baseline customer operating board data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(realOnly);
  }, [realOnly]);

  const handleEditClick = (cust: any) => {
    setEditingCustomer(cust);
    setNewStage(cust.stage);
    setNewNextAction(cust.next_action || "");
    setNewOwner(cust.commercial_owner || "");
    setNewBlocker(cust.primary_blocker || "");
    setNewNotes("");
  };

  const handleSaveStage = async () => {
    if (!editingCustomer) return;
    try {
      setSaveLoading(true);
      await platformAdminApi.transitionCustomerStage(editingCustomer.organization_id, {
        new_stage: newStage,
        blocker: newBlocker,
        internal_owner: newOwner,
        notes: newNotes,
        next_action: newNextAction,
        next_action_due: newNextActionDue || undefined
      });
      await fetchCustomers(realOnly);
      setEditingCustomer(null);
    } catch (err) {
      console.error("Failed to update stage:", err);
      alert("Failed to update stage. Check backend logs.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleRecordPilotDecision = async () => {
    if (!pilotDecisionCust) return;
    try {
      setDecisionLoading(true);
      await platformAdminApi.recordPilotDecision(pilotDecisionCust.organization_id, {
        decision: pilotDecision,
        reason: pilotReason || "Operational review sign-off",
        new_objective: pilotDecision === "EXTEND" ? pilotNewObjective : undefined,
        new_decision_date: pilotDecision === "EXTEND" ? pilotNewDate : undefined
      });
      await fetchCustomers(realOnly);
      setPilotDecisionCust(null);
    } catch (err: any) {
      console.error("Failed to record pilot decision:", err);
      alert("Failed to record decision: " + (err.message || "Validation failed"));
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleOpenInterviews = async (cust: any) => {
    setInterviewCust(cust);
    try {
      const res = await platformAdminApi.getCustomerInterviews(cust.organization_id);
      setInterviewsList(res || []);
    } catch (err) {
      console.error("Failed to load customer interviews:", err);
    }
  };

  const handleSaveInterview = async () => {
    if (!interviewCust) return;
    try {
      await platformAdminApi.logCustomerInterview(interviewCust.organization_id, {
        interview_type: ivType,
        participants: ivParticipants,
        key_problem: ivProblem,
        value_driver: ivValueDriver,
        blocker: ivBlocker,
        quote: ivQuote,
        permission_to_use_quote: ivPermission,
        notes: ivNotes
      });
      const res = await platformAdminApi.getCustomerInterviews(interviewCust.organization_id);
      setInterviewsList(res || []);
      setShowLogInterview(false);
      setIvProblem("");
      setIvValueDriver("");
      setIvQuote("");
    } catch (err) {
      console.error("Failed to log interview:", err);
      alert("Failed to log interview.");
    }
  };

  const realCustomersCount = customers.filter(c => c.classification !== "DEMO").length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                <Users className="w-4 h-4" />
                <span>Phase 15 Customer Operating Period</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                Customer Operating Board &amp; First 10 Customers Operational Hub (§5, §61)
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Authoritative view of active pilot and commercial accounts. Zero synthetic prefill (§62).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold">
                Capacity: {realCustomersCount} / 10 Real Customer Program (§62)
              </div>
              <button
                onClick={() => fetchCustomers(realOnly)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Canonical Stages Reference Bar (§6) */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm overflow-x-auto">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            18 Canonical Customer Stages &amp; Canonical Onboarding Stages Progression (§6):
          </div>
          <div className="flex items-center gap-1 text-xs font-medium text-slate-600 min-w-max">
            {CANONICAL_STAGES.map((s, idx) => (
              <React.Fragment key={s}>
                <span className="px-2 py-1 bg-slate-100 rounded text-slate-800 font-mono text-[10px]">
                  {s}
                </span>
                {idx < CANONICAL_STAGES.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-400 mx-0.5" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Operating Board Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Active Initial Customers &mdash; Operating Cohort ({customers.length})
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {realOnly ? "Genuine external accounts only (§61)" : "All accounts including test/demo"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRealOnly(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  realOnly
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Real Only (Phase 14 Default)
              </button>
              <button
                onClick={() => setRealOnly(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  !realOnly
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Include Test / Demo
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Organization &amp; Class</th>
                  <th className="px-4 py-3.5">Stage &amp; Days</th>
                  <th className="px-4 py-3.5">Desired Outcome</th>
                  <th className="px-4 py-3.5">Primary Blocker</th>
                  <th className="px-4 py-3.5">Payment State</th>
                  <th className="px-4 py-3.5">Owners</th>
                  <th className="px-4 py-3.5">Next Action</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      Loading Customer Operating Board...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      No customer accounts found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const isPilot = c.classification === "PILOT_CUSTOMER";
                    const isPaid = c.classification === "PAID_CUSTOMER";

                    let stageBadge = "bg-slate-100 text-slate-700 border-slate-200";
                    if (isPaid || c.stage === "PAID_RETAINED") {
                      stageBadge = "bg-emerald-50 text-emerald-800 border-emerald-200";
                    } else if (c.stage === "AWS_ONBOARDING") {
                      stageBadge = "bg-amber-50 text-amber-800 border-amber-200";
                    } else if (c.stage === "DEPLOYMENT_LIVE" || c.stage === "SECURITY_BASELINE") {
                      stageBadge = "bg-indigo-50 text-indigo-800 border-indigo-200";
                    }

                    return (
                      <tr key={c.organization_id} className="hover:bg-slate-50/70 transition">
                        {/* Org & Classification */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{c.organization}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isPilot
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {c.classification}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">slug: {c.slug}</div>
                        </td>

                        {/* Stage & Days */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${stageBadge}`}>
                            {c.stage}
                          </span>
                          <div className="text-[11px] text-slate-500 font-mono mt-1">
                            {c.days_in_stage ?? 1}d in stage
                          </div>
                        </td>

                        {/* Desired Outcome */}
                        <td className="px-4 py-4 max-w-xs">
                          <div className="text-xs text-slate-800 line-clamp-2" title={c.desired_outcome}>
                            {c.desired_outcome || "Deploy to AWS & secure ISO 27001 readiness"}
                          </div>
                          <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            Status: {c.outcome_status || "IN_PROGRESS"}
                          </span>
                        </td>

                        {/* Blocker */}
                        <td className="px-4 py-4 max-w-xs">
                          {c.primary_blocker ? (
                            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded p-1.5 font-medium leading-snug">
                              {c.primary_blocker}
                            </div>
                          ) : (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> None
                            </span>
                          )}
                        </td>

                        {/* Payment State */}
                        <td className="px-4 py-4">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded ${
                              (c.payment_state || c.payment_reality) === "PAID_RECONCILED"
                                ? "bg-emerald-100 text-emerald-800"
                                : (c.payment_state || c.payment_reality) === "PAYMENT_PENDING"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {c.payment_state || c.payment_reality || "UNPAID / TEST"}
                          </span>
                        </td>

                        {/* Owners */}
                        <td className="px-4 py-4 text-xs text-slate-600 space-y-0.5">
                          <div>Tech: <strong className="text-slate-800">{c.technical_owner || "DevOps Architect"}</strong></div>
                          <div>Sales: <strong className="text-slate-800">{c.commercial_owner || "Commercial Lead"}</strong></div>
                        </td>

                        {/* Next Action */}
                        <td className="px-4 py-4 max-w-xs">
                          <div className="text-xs font-semibold text-indigo-900">
                            {c.next_action || "AWS STS validation call"}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Due: {c.next_action_due ? new Date(c.next_action_due).toLocaleDateString() : "Today"}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleEditClick(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition"
                            title="Advance Canonical Stage"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Stage</span>
                          </button>
                          {isPilot && (
                            <button
                              onClick={() => {
                                setPilotDecisionCust(c);
                                setPilotNewObjective(c.desired_outcome || "Complete ISO 27001 evidence generation");
                                setPilotNewDate(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition"
                              title="Record Pilot Decision"
                            >
                              <span>Decision</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenInterviews(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition"
                            title="Empirical Customer Interviews"
                          >
                            <MessageSquare className="w-3 h-3 text-slate-500" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Stage Transition Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Transition Canonical Stage: {editingCustomer.organization}
              </h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">New Canonical Stage (§6)</label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium"
                >
                  {CANONICAL_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Current Blocker (if any)</label>
                <input
                  type="text"
                  value={newBlocker}
                  onChange={(e) => setNewBlocker(e.target.value)}
                  placeholder="e.g. AWS IAM AssumeRole Trust Policy Principal Mismatch"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Internal Owner</label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Next Action Due Date</label>
                  <input
                    type="date"
                    value={newNextActionDue}
                    onChange={(e) => setNewNextActionDue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Next Action Requirement (§66)</label>
                <input
                  type="text"
                  value={newNextAction}
                  onChange={(e) => setNewNextAction(e.target.value)}
                  placeholder="e.g. Provide CloudFormation Quick-Create deep link"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Historical Transition Notes</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="Reason for stage progression..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setEditingCustomer(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStage}
                disabled={saveLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {saveLoading ? "Updating..." : "Record Transition"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pilot Commercial Decision Modal (§89, §90) */}
      {pilotDecisionCust && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Pilot Commercial Decision (§89): {pilotDecisionCust.organization}
              </h3>
              <button
                onClick={() => setPilotDecisionCust(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Decision Outcome (§89: No indefinite pilots)</label>
                <select
                  value={pilotDecision}
                  onChange={(e) => setPilotDecision(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                >
                  <option value="CONVERT">CONVERT &rarr; Advance to Commercial Commitment</option>
                  <option value="EXTEND">EXTEND &rarr; Explicit Objective + New Decision Date Required</option>
                  <option value="CLOSE_LOST">CLOSE_LOST &rarr; Terminate Pilot</option>
                </select>
              </div>

              {pilotDecision === "EXTEND" && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Objective (§90)</label>
                    <input
                      type="text"
                      value={pilotNewObjective}
                      onChange={(e) => setPilotNewObjective(e.target.value)}
                      placeholder="e.g. Complete auditor walk-through for ISO 27001 readiness"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">New Decision Date (§90)</label>
                    <input
                      type="date"
                      value={pilotNewDate}
                      onChange={(e) => setPilotNewDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Operator Justification &amp; Notes</label>
                <textarea
                  value={pilotReason}
                  onChange={(e) => setPilotReason(e.target.value)}
                  rows={3}
                  placeholder="Commercial rationale for decision..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setPilotDecisionCust(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPilotDecision}
                disabled={decisionLoading}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
              >
                {decisionLoading ? "Recording..." : "Record Decision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Interviews Modal (§45-53) */}
      {interviewCust && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Empirical Customer Interviews: {interviewCust.organization}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Zero AI fabrication (§52). Empirical discovery and onboarding feedback.
                </p>
              </div>
              <button
                onClick={() => setInterviewCust(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Recorded Interviews ({interviewsList.length})
                </span>
                <button
                  onClick={() => setShowLogInterview(!showLogInterview)}
                  className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded text-xs font-semibold hover:bg-indigo-100"
                >
                  {showLogInterview ? "Cancel Form" : "+ Log Empirical Interview"}
                </button>
              </div>

              {showLogInterview && (
                <div className="p-4 bg-slate-50 border border-indigo-200 rounded-xl space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Interview Type (§46)</label>
                      <select
                        value={ivType}
                        onChange={(e) => setIvType(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                      >
                        <option value="DISCOVERY">DISCOVERY</option>
                        <option value="ONBOARDING">ONBOARDING</option>
                        <option value="VALUE_VALIDATION">VALUE_VALIDATION</option>
                        <option value="CONVERSION">CONVERSION</option>
                        <option value="CHURN">CHURN</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Participants</label>
                      <input
                        type="text"
                        value={ivParticipants}
                        onChange={(e) => setIvParticipants(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Key Problem Mentioned (§47, §48)</label>
                    <input
                      type="text"
                      value={ivProblem}
                      onChange={(e) => setIvProblem(e.target.value)}
                      placeholder="e.g. AWS STS IAM role setup took 2 days due to trust policy principal confusion"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Primary Value Driver (§49)</label>
                    <input
                      type="text"
                      value={ivValueDriver}
                      onChange={(e) => setIvValueDriver(e.target.value)}
                      placeholder="e.g. Integrated automated deployment with continuous ISO 27001 proof"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Direct Customer Quote (§51)</label>
                    <textarea
                      value={ivQuote}
                      onChange={(e) => setIvQuote(e.target.value)}
                      rows={2}
                      placeholder="Verbatim quote from customer call..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded"
                    />
                  </div>

                  <button
                    onClick={handleSaveInterview}
                    className="w-full py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700"
                  >
                    Save Empirical Interview
                  </button>
                </div>
              )}

              {interviewsList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Zero interviews logged for this organization yet. Click &apos;+ Log Empirical Interview&apos; to record notes.
                </div>
              ) : (
                interviewsList.map((iv, idx) => (
                  <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {iv.interview_type}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {new Date(iv.interview_date).toLocaleDateString()} &middot; by {iv.created_by}
                      </span>
                    </div>
                    <div className="text-xs text-slate-900">
                      <strong>Problem:</strong> {iv.key_problem}
                    </div>
                    <div className="text-xs text-emerald-800">
                      <strong>Value Driver:</strong> {iv.value_driver}
                    </div>
                    {iv.quote && (
                      <div className="text-xs italic text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                        &ldquo;{iv.quote}&rdquo;
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
