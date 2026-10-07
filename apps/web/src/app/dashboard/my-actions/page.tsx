"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckSquare,
  AlertCircle,
  Clock,
  Shield,
  FileText,
  Users,
  Building2,
  ChevronRight,
  Filter,
  CheckCircle2,
  ArrowUpRight,
  Search,
  Sparkles,
  ExternalLink,
  Flame,
  ShieldAlert,
} from "lucide-react";
import { dashboardApi } from "@/lib/api";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

interface ActionItem {
  id: string;
  title: string;
  category: string;
  framework: string;
  priority: string;
  due_date: string;
  owner: string;
  description: string;
  action_url: string;
  action_label: string;
  status: string;
  source: string;
}

export default function MyActionsPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [completedNotification, setCompletedNotification] = useState<string | null>(null);

  const fetchActions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getMyActions();
      setActions(res.actions || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load active action items.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, []);

  const markCompleted = (id: string, title: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "COMPLETED" } : a))
    );
    setCompletedNotification(`"${title}" marked completed.`);
    setTimeout(() => setCompletedNotification(null), 4000);
  };

  const filtered = actions.filter((item) => {
    const matchesSource =
      filterSource === "ALL" || item.source === filterSource;
    const matchesPriority =
      filterPriority === "ALL" || item.priority === filterPriority;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.framework.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesPriority && matchesSearch;
  });

  const pendingCount = actions.filter((a) => a.status !== "COMPLETED").length;
  const criticalCount = actions.filter(
    (a) => a.priority === "CRITICAL" && a.status !== "COMPLETED"
  ).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          { label: "Organization", href: "/dashboard" },
          { label: "My Actions" },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <CheckSquare className="w-4 h-4 text-slate-700" />
            <span>Unified Action Center</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Actions
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Prioritized actions unified across Security findings, Compliance tasks, Continuous Assurance, and Architecture.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-4 text-xs shadow-2xs">
            <div>
              <span className="text-slate-500">Pending Actions:</span>{" "}
              <strong className="text-slate-900 font-bold text-sm">
                {pendingCount}
              </strong>
            </div>
            {criticalCount > 0 && (
              <span className="bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                {criticalCount} Critical
              </span>
            )}
          </div>
        </div>
      </div>

      {completedNotification && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{completedNotification}</span>
          </div>
          <button
            onClick={() => setCompletedNotification(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "CRITICAL", "SECURITY", "COMPLIANCE", "ASSURANCE", "BUILD"].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => {
                  if (cat === "CRITICAL") {
                    setFilterPriority("CRITICAL");
                    setFilterSource("ALL");
                  } else {
                    setFilterPriority("ALL");
                    setFilterSource(cat);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterSource === cat ||
                  (cat === "CRITICAL" && filterPriority === "CRITICAL")
                    ? "bg-slate-900 text-white font-semibold shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>

        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search actions, frameworks, owners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <ErrorState
          title="Could not load actions"
          message={error}
          onRetry={fetchActions}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && filtered.length === 0 && (
        <EmptyState
          title="No pending actions found"
          description={
            searchQuery || filterSource !== "ALL"
              ? "No actions match your current filters. Try resetting the filters."
              : "All action items have been addressed. Your security and compliance posture is up to date."
          }
          actionText={searchQuery ? "Clear Search" : "View Compliance Hub"}
          actionHref={searchQuery ? undefined : "/dashboard/compliance"}
          onAction={searchQuery ? () => setSearchQuery("") : undefined}
        />
      )}

      {/* Action Items List */}
      {!isLoading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isDone = item.status === "COMPLETED";
            return (
              <div
                key={item.id}
                className={`bg-white border rounded-xl p-5 shadow-2xs transition-all duration-150 ${
                  isDone
                    ? "border-slate-200 opacity-60 bg-slate-50"
                    : item.priority === "CRITICAL"
                    ? "border-rose-200 hover:border-rose-300"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : item.priority === "CRITICAL" ? (
                        <ShieldAlert className="w-5 h-5 text-rose-600" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono font-semibold text-slate-500">
                          {item.id}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {item.framework}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-100">
                          {item.category}
                        </span>
                        <StatusBadge status={item.priority} size="sm" />
                      </div>

                      <h3
                        className={`text-sm font-semibold ${
                          isDone
                            ? "text-slate-400 line-through"
                            : "text-slate-900"
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2.5">
                        <span>
                          Owner:{" "}
                          <strong className="text-slate-700">{item.owner}</strong>
                        </span>
                        <span>
                          Due Date:{" "}
                          <strong className="text-slate-700">
                            {item.due_date}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                    {!isDone && (
                      <button
                        onClick={() => markCompleted(item.id, item.title)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors"
                      >
                        Mark Done
                      </button>
                    )}
                    <Link
                      href={item.action_url}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs"
                    >
                      <span>{item.action_label}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safety Notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-900">Compliance & Security Human Gate:</strong>{" "}
          LaunchComply automated bots monitor infrastructure continuously. However, formal approvals, policy acknowledgements, risk acceptances, and audit workpapers require human authorization to maintain regulatory validity.
        </div>
      </div>
    </div>
  );
}
