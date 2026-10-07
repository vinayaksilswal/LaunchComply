"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  HeartHandshake,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  Calendar,
  User,
  ShieldAlert,
  Sparkles,
  FileCheck
} from "lucide-react";
import { platformAdminApi } from "@/lib/api/modules";

export default function PlatformAdminCustomerSuccessPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"HEALTHY" | "NEEDS_ATTENTION" | "AT_RISK" | "RENEWALS">("AT_RISK");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskOrgId, setTaskOrgId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDaysDue, setTaskDaysDue] = useState(3);
  const [taskOwner, setTaskOwner] = useState("Customer Success Lead");
  const [submittingTask, setSubmittingTask] = useState(false);

  const fetchSuccessData = async () => {
    try {
      setLoading(true);
      const res = await platformAdminApi.getCustomerSuccessOverview();
      setData(res);
      if (res?.at_risk_count === 0 && res?.needs_attention_count > 0) {
        setActiveTab("NEEDS_ATTENTION");
      }
    } catch (err) {
      console.error("Failed to load customer success data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuccessData();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskOrgId || !taskTitle) return;
    try {
      setSubmittingTask(true);
      await platformAdminApi.createCustomerSuccessTask({
        organization_id: taskOrgId,
        title: taskTitle,
        days_due: taskDaysDue,
        owner: taskOwner,
      });
      setShowTaskModal(false);
      setTaskTitle("");
      await fetchSuccessData();
    } catch (err) {
      console.error("Failed to create CS task:", err);
      alert("Failed to create task.");
    } finally {
      setSubmittingTask(false);
    }
  };

  const getActiveList = () => {
    if (activeTab === "HEALTHY") return data?.healthy_customers || [];
    if (activeTab === "NEEDS_ATTENTION") return data?.needs_attention_customers || [];
    if (activeTab === "AT_RISK") return data?.at_risk_customers || [];
    return data?.renewal_upcoming_customers || [];
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                <HeartHandshake className="w-4 h-4" />
                <span>Customer Success & Retention Operations</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">
                Customer Success Center
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Explainable customer health monitoring, retention risk alerts, and tactical intervention tasks (§62–65).
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchSuccessData}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowTaskModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Success Task</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Health Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <button
            onClick={() => setActiveTab("AT_RISK")}
            className={`text-left rounded-xl p-5 border transition shadow-sm bg-white ${
              activeTab === "AT_RISK"
                ? "border-rose-400 ring-2 ring-rose-100"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">At Risk</span>
              <AlertOctagon className="w-5 h-5 text-rose-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {data?.at_risk_count || 0}
              </span>
              <span className="text-xs text-rose-600 font-semibold">Immediate Action</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Unresolved urgent tickets or critical security findings.
            </p>
          </button>

          <button
            onClick={() => setActiveTab("NEEDS_ATTENTION")}
            className={`text-left rounded-xl p-5 border transition shadow-sm bg-white ${
              activeTab === "NEEDS_ATTENTION"
                ? "border-amber-400 ring-2 ring-amber-100"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Needs Attention</span>
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {data?.needs_attention_count || 0}
              </span>
              <span className="text-xs text-amber-600 font-semibold">Monitoring</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Trial expiring soon (&lt;3d) or no applications deployed.
            </p>
          </button>

          <button
            onClick={() => setActiveTab("HEALTHY")}
            className={`text-left rounded-xl p-5 border transition shadow-sm bg-white ${
              activeTab === "HEALTHY"
                ? "border-emerald-400 ring-2 ring-emerald-100"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Healthy</span>
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {data?.healthy_count || 0}
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Score 80-100</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Active deployments and zero blocking support issues.
            </p>
          </button>

          <button
            onClick={() => setActiveTab("RENEWALS")}
            className={`text-left rounded-xl p-5 border transition shadow-sm bg-white ${
              activeTab === "RENEWALS"
                ? "border-indigo-400 ring-2 ring-indigo-100"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Renewals (7 Days)</span>
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">
                {data?.renewal_upcoming_count || 0}
              </span>
              <span className="text-xs text-indigo-600 font-semibold">Upcoming</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Annual or monthly renewals requiring confirmation.
            </p>
          </button>
        </div>

        {/* Selected Category Customers List */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {activeTab === "HEALTHY" ? "Healthy Customers" : activeTab === "NEEDS_ATTENTION" ? "Customers Needing Attention" : activeTab === "AT_RISK" ? "At Risk Customers" : "Upcoming Renewals"} ({getActiveList().length})
            </h2>
            <span className="text-xs text-slate-500">
              Explainable Rule-Based Health Scoring (§63)
            </span>
          </div>

          {getActiveList().length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              No customer organizations in this status.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {getActiveList().map((c: any) => (
                <div key={c.id} className="p-6 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 text-base">{c.name}</span>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {c.plan}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        c.status === "HEALTHY" ? "bg-emerald-50 text-emerald-700" : c.status === "NEEDS_ATTENTION" ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"
                      }`}>
                        Score: {c.health_score}/100
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Organization ID: <span className="font-mono">{c.id}</span> · Slug: {c.slug}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setTaskOrgId(c.id);
                        setShowTaskModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-sm transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Assign Task</span>
                    </button>
                    <Link
                      href={`/platform-admin/customers/${c.id}/health`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                    >
                      <span>Explain Score</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actionable Customer Success Tasks (§65) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Active Customer Success Action Tasks ({data?.tasks?.length || 0})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Representative assignments: onboarding assistance, trial conversion follow-up, and architecture reviews.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {(data?.tasks || []).map((t: any) => (
              <div key={t.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50/50 transition">
                <div className="space-y-0.5">
                  <div className="font-semibold text-sm text-slate-900">{t.title}</div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>Owner: {t.owner}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Due: {new Date(t.due_date).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Task Creation Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <form onSubmit={handleCreateTask} className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Create Customer Success Action Item
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Organization ID
                  </label>
                  <input
                    type="text"
                    required
                    value={taskOrgId}
                    onChange={(e) => setTaskOrgId(e.target.value)}
                    placeholder="e.g. org_123 or select customer"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Task Title / Objective
                  </label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g. Assist with AWS IAM Role Setup"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Days Until Due
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={taskDaysDue}
                      onChange={(e) => setTaskDaysDue(parseInt(e.target.value) || 3)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Task Owner
                    </label>
                    <input
                      type="text"
                      value={taskOwner}
                      onChange={(e) => setTaskOwner(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition disabled:opacity-50"
                >
                  {submittingTask ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
