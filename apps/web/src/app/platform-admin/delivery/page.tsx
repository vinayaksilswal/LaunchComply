"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Rocket,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Shield,
  DollarSign,
  FileCheck,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Activity,
  Layers,
  CreditCard,
  Eye,
  PlayCircle,
  Send,
  Building2,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Users
} from "lucide-react";
import { platformAdminApi } from "@/lib/api/modules";

function EvidenceBadge({ level }: { level: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    LIVE:             { cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", label: "LIVE" },
    VERIFIED:         { cls: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", label: "VERIFIED" },
    SIMULATED:        { cls: "bg-amber-500/20 text-amber-300 border-amber-500/30", label: "SIMULATED" },
    PENDING:          { cls: "bg-slate-500/20 text-slate-400 border-slate-600/30", label: "PENDING" },
    CUSTOMER_PENDING: { cls: "bg-orange-500/20 text-orange-300 border-orange-500/30", label: "CUST PENDING" },
    BLOCKED:          { cls: "bg-rose-500/20 text-rose-300 border-rose-500/30", label: "BLOCKED" },
  };
  const { cls, label } = cfg[level] ?? { cls: "bg-slate-700 text-slate-300 border-slate-600", label: level };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${cls}`}>
      {label}
    </span>
  );
}

function StatusIcon({ passed }: { passed: boolean }) {
  return passed
    ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
    : <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
}

function SectionCard({
  icon: Icon, title, badge, children, accent = "cyan",
}: { icon: any; title: string; badge?: React.ReactNode; children: React.ReactNode; accent?: string }) {
  const accentMap: Record<string, string> = {
    cyan: "text-cyan-400", emerald: "text-emerald-400", amber: "text-amber-400",
    violet: "text-violet-400", rose: "text-rose-400", indigo: "text-indigo-400",
  };
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${accentMap[accent] ?? "text-cyan-400"}`} />
          <h2 className="text-sm font-bold text-white">{title}</h2>
        </div>
        {badge && <div>{badge}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function ProductionDeliveryBoardPage() {
  const FINSCALE_ORG_ID = "org-finscale-001";

  const [board, setBoard] = useState<any>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [preconditions, setPreconditions] = useState<any>(null);
  const [precondLoading, setPrecondLoading] = useState(false);
  const [precondExpanded, setPrecondExpanded] = useState(false);
  const [readiness, setReadiness] = useState<any>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessExpanded, setReadinessExpanded] = useState(false);
  const [secBaseline, setSecBaseline] = useState<any>(null);
  const [secBaselineLoading, setSecBaselineLoading] = useState(false);

  // Acceptance modal
  const [showAccModal, setShowAccModal] = useState(false);
  const [accOrgId, setAccOrgId] = useState(FINSCALE_ORG_ID);
  const [accContact, setAccContact] = useState("cto@finscale.in");
  const [accOwner, setAccOwner] = useState("LaunchComply Onboarding Lead");
  const [accTechnical, setAccTechnical] = useState(true);
  const [accSecurity, setAccSecurity] = useState(true);
  const [accOutcome, setAccOutcome] = useState(true);
  const [accCommercial, setAccCommercial] = useState(false);
  const [accOpenItems, setAccOpenItems] = useState("Subscription invoice to be raised post pilot sign-off");
  const [accSubmitting, setAccSubmitting] = useState(false);

  // Interview modal
  const [showIvModal, setShowIvModal] = useState(false);
  const [ivOrgId, setIvOrgId] = useState(FINSCALE_ORG_ID);
  const [ivParticipants, setIvParticipants] = useState("CTO, Lead DevOps, LaunchComply Operator");
  const [ivDeployEff, setIvDeployEff] = useState(true);
  const [ivAwsOnboard, setIvAwsOnboard] = useState(true);
  const [ivSecEv, setIvSecEv] = useState(true);
  const [ivIso, setIvIso] = useState(true);
  const [ivContinue, setIvContinue] = useState(true);
  const [ivBuy, setIvBuy] = useState(false);
  const [ivMissing, setIvMissing] = useState("");
  const [ivQuote, setIvQuote] = useState("");
  const [ivSubmitting, setIvSubmitting] = useState(false);

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState("INV-2026-FINSCALE-001");
  const [payUTR, setPayUTR] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payCurrency, setPayCurrency] = useState("INR");
  const [payVerifier, setPayVerifier] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payResult, setPayResult] = useState<any>(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg); setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 7000);
  };
  const showError = (msg: string) => {
    setErrorMsg(msg); setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 9000);
  };

  const fetchBoard = useCallback(async () => {
    try {
      setBoardLoading(true);
      const res = await platformAdminApi.getDeliveryBoard();
      setBoard(res);
    } catch (err) {
      console.error("Delivery board load failed:", err);
    } finally {
      setBoardLoading(false);
    }
  }, []);

  const fetchPreconditions = useCallback(async () => {
    try {
      setPrecondLoading(true);
      const res = await platformAdminApi.getDeliveryPreconditions(FINSCALE_ORG_ID);
      setPreconditions(res);
      setPrecondExpanded(true);
    } catch (err) {
      console.error("Preconditions load failed:", err);
    } finally {
      setPrecondLoading(false);
    }
  }, []);

  const fetchReadiness = useCallback(async () => {
    try {
      setReadinessLoading(true);
      const res = await platformAdminApi.getReadinessReport(FINSCALE_ORG_ID);
      setReadiness(res);
      setReadinessExpanded(true);
    } catch (err) {
      console.error("Readiness report load failed:", err);
    } finally {
      setReadinessLoading(false);
    }
  }, []);

  const fetchSecBaseline = useCallback(async () => {
    try {
      setSecBaselineLoading(true);
      const res = await platformAdminApi.getSecurityBaseline(FINSCALE_ORG_ID, true);
      setSecBaseline(res);
    } catch (err) {
      console.error("Security baseline load failed:", err);
    } finally {
      setSecBaselineLoading(false);
    }
  }, []);

  useEffect(() => { fetchBoard(); fetchSecBaseline(); }, [fetchBoard, fetchSecBaseline]);

  const handleSubmitAcceptance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAccSubmitting(true);
      const res = await platformAdminApi.submitCustomerAcceptance({
        organization_id: accOrgId,
        application_id: "app-finscale-001",
        customer_contact: accContact,
        internal_owner: accOwner,
        technical_accepted: accTechnical,
        security_accepted: accSecurity,
        outcome_accepted: accOutcome,
        commercial_accepted: accCommercial,
        open_items: accOpenItems ? [accOpenItems] : [],
      });
      showSuccess(`Acceptance recorded — ${res.status} · ${res.acceptance_id}`);
      setShowAccModal(false);
      fetchBoard();
    } catch (err: any) {
      showError("Acceptance failed: " + (err.message || "Check backend logs"));
    } finally {
      setAccSubmitting(false);
    }
  };

  const handleSubmitInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIvSubmitting(true);
      const res = await platformAdminApi.recordValueInterview({
        organization_id: ivOrgId,
        participants: ivParticipants,
        reduce_deployment_effort: ivDeployEff,
        aws_onboarding_easier: ivAwsOnboard,
        security_evidence_useful: ivSecEv,
        iso_readiness_valuable: ivIso,
        continue_using_platform: ivContinue,
        buy_saas_subscription: ivBuy,
        missing_features: ivMissing,
        quote: ivQuote,
      });
      showSuccess(`Interview recorded — ${res.interview_id}`);
      setShowIvModal(false);
    } catch (err: any) {
      showError("Interview failed: " + (err.message || "Check backend logs"));
    } finally {
      setIvSubmitting(false);
    }
  };

  const handleReconcilePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payUTR.trim()) {
      showError("UTR number required. Do not reconcile without real bank-transfer evidence.");
      return;
    }
    try {
      setPaySubmitting(true);
      const res = await platformAdminApi.reconcileBankPayment({
        invoice_number: payInvoice,
        utr_number: payUTR.trim(),
        received_amount: parseFloat(payAmount),
        currency: payCurrency,
        finance_verifier: payVerifier,
        notes: payNotes,
      });
      setPayResult(res);
      showSuccess(`Reconciled — UTR: ${payUTR} · Status: ${res.status} · ${res.revenue_type}`);
      setShowPayModal(false);
      fetchBoard();
    } catch (err: any) {
      showError("Reconciliation failed: " + (err.message || "Check backend logs"));
    } finally {
      setPaySubmitting(false);
    }
  };

  const stageColor = (stage: string) => {
    if (["PAID_RETAINED", "PAYMENT_RECONCILED"].includes(stage)) return "text-emerald-400";
    if (["DEPLOYMENT_LIVE", "VALUE_VALIDATED", "COMMERCIAL_COMMITMENT"].includes(stage)) return "text-cyan-400";
    if (["DEPLOYMENT_IN_PROGRESS", "AWS_ONBOARDING"].includes(stage)) return "text-amber-400";
    return "text-slate-400";
  };

  const milestoneStatusCls = (status: string) => {
    if (status === "COMPLETED") return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    if (status === "IN_PROGRESS") return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
    if (status === "BLOCKED") return "bg-rose-500/20 text-rose-300 border-rose-500/30";
    if (status === "CUSTOMER_PENDING") return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    return "bg-slate-700/50 text-slate-400 border-slate-600/30";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1">
            <Rocket className="w-4 h-4" />
            <span>Phase 17 — Production Delivery</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Customer Delivery &amp; Reconciliation Board</h1>
          <p className="text-sm text-slate-400 mt-1">
            Deployment preconditions · Customer acceptance · Value interview · Payment reconciliation · First-10 milestones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchBoard(); fetchSecBaseline(); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <Link href="/platform-admin/customers/first-10"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition">
            <Users className="w-3.5 h-3.5" /> Customer Board
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-300 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-start gap-2 p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/60 text-rose-300 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {errorMsg}
        </div>
      )}

      {/* Delivery Time Metrics Strip */}
      {board?.delivery_time_metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Account → AWS", value: board.delivery_time_metrics.account_to_aws },
            { label: "AWS → Infra", value: board.delivery_time_metrics.aws_to_infra },
            { label: "Infra → Deploy", value: board.delivery_time_metrics.infra_to_deployment },
            { label: "Deploy → Accept", value: board.delivery_time_metrics.deployment_to_acceptance },
            { label: "Accept → Payment", value: board.delivery_time_metrics.acceptance_to_payment },
          ].map(m => (
            <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{m.label}</div>
              <div className="text-xs font-bold text-cyan-300 leading-tight">{m.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* First-10 Delivery Board */}
      <SectionCard icon={Layers} title="First-10 Repeatable Delivery Board" accent="violet"
        badge={<span className="text-[10px] font-mono px-2.5 py-0.5 rounded border border-violet-500/30 bg-violet-500/10 text-violet-300">
          {board?.cohort ?? "First 10 Customers Program"}
        </span>}
      >
        {boardLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading delivery board…
          </div>
        ) : (
          <div className="space-y-5">
            {(board?.customers ?? []).map((cust: any) => (
              <div key={cust.organization_id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-4">
                {/* Customer header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-bold text-white">{cust.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">{cust.classification}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 pl-6">{cust.outcome}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${stageColor(cust.stage)}`}>{cust.stage}</span>
                    {cust.commercial?.payment_state && (
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        cust.commercial.payment_state === "RECONCILED" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : cust.commercial.payment_state === "PENDING_RECONCILIATION" ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : "bg-slate-700/50 text-slate-400 border-slate-600/30"
                      }`}>{cust.commercial.payment_state}</span>
                    )}
                  </div>
                </div>

                {/* Milestones */}
                {cust.milestones && cust.milestones.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Milestones ({cust.milestones.filter((m: any) => m.status === "COMPLETED").length}/{cust.milestones.length} completed)
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cust.milestones.map((ms: any) => (
                        <div key={ms.key} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/60">
                          <div className="mt-0.5">
                            {ms.status === "COMPLETED" ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            : ms.status === "BLOCKED" ? <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            : ms.status === "IN_PROGRESS" ? <Activity className="w-3.5 h-3.5 text-cyan-400" />
                            : <Clock className="w-3.5 h-3.5 text-slate-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-semibold text-slate-200 truncate">{ms.title}</div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <EvidenceBadge level={ms.evidence_level || "PENDING"} />
                              {ms.blocker_description && (
                                <span className="text-[10px] text-rose-400 truncate">⚠ {ms.blocker_description}</span>
                              )}
                            </div>
                          </div>
                          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border ${milestoneStatusCls(ms.status)}`}>
                            {ms.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blocker / Next Action */}
                {(cust.active_blocker || cust.next_action) && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    {cust.active_blocker && (
                      <div className="flex-1 p-2.5 rounded-lg bg-rose-950/20 border border-rose-800/40 text-xs">
                        <div className="text-[10px] font-semibold text-rose-500 uppercase mb-0.5">Active Blocker</div>
                        <div className="text-rose-200">{cust.active_blocker}</div>
                      </div>
                    )}
                    {cust.next_action && (
                      <div className="flex-1 p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-xs">
                        <div className="text-[10px] font-semibold text-cyan-500 uppercase mb-0.5">Next Action</div>
                        <div className="text-cyan-200">{cust.next_action}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Commercial */}
                {cust.commercial?.invoice_number && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/50 text-xs text-slate-400">
                    <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono">{cust.commercial.invoice_number}</span>
                    <span className="text-white font-bold">{cust.commercial.amount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Production Preconditions */}
      <SectionCard icon={Shield} title="Production Deployment Preconditions — FinScale" accent="amber"
        badge={preconditions ? (
          preconditions.proceed
            ? <span className="text-[10px] font-bold px-2.5 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">PROCEED</span>
            : <span className="text-[10px] font-bold px-2.5 py-0.5 rounded border border-rose-500/30 bg-rose-500/15 text-rose-300">BLOCKED</span>
        ) : null}
      >
        <div className="space-y-3">
          {!preconditions && (
            <button onClick={fetchPreconditions} disabled={precondLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition disabled:opacity-60">
              {precondLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {precondLoading ? "Evaluating…" : "Evaluate 12 Production Preconditions"}
            </button>
          )}
          {preconditions && (
            <>
              <button onClick={() => setPrecondExpanded(!precondExpanded)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition">
                {precondExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                {precondExpanded ? "Collapse" : "Expand"} precondition checks
              </button>
              {precondExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(preconditions.checks || {}).map(([key, check]: [string, any]) => (
                    <div key={key} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                      <StatusIcon passed={check.passed} />
                      <div>
                        <div className="text-[11px] font-bold text-slate-200">{key.replace(/_/g, " ")}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{check.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 pt-1 text-xs text-slate-400">
                <span>Passed: <strong className="text-emerald-400">{preconditions.passed_count}</strong></span>
                <span>Blocked: <strong className="text-rose-400">{preconditions.blocked_count}</strong></span>
                {preconditions.proceed && (
                  <span className="text-emerald-300 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for production apply
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </SectionCard>

      {/* Security Baseline */}
      <SectionCard icon={ShieldCheck} title="Security Baseline — Production Environment" accent="emerald"
        badge={secBaseline ? (
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${
            secBaseline.overall_status === "PASS"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/15 text-rose-300"
          }`}>{secBaseline.overall_status}</span>
        ) : null}
      >
        {secBaselineLoading ? (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : secBaseline ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(secBaseline.checks || {}).map(([key, check]: [string, any]) => (
              <div key={key} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <StatusIcon passed={check.passed} />
                <div>
                  <div className="text-[11px] font-bold text-slate-200">{key.replace(/_/g, " ")}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{check.detail}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <button onClick={fetchSecBaseline} className="text-xs text-slate-400 hover:text-white transition">
            Load security baseline
          </button>
        )}
      </SectionCard>

      {/* Production Readiness Report */}
      <SectionCard icon={FileCheck} title="Production Readiness Report (Customer-Facing)" accent="indigo"
        badge={readiness ? (
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${
            readiness.overall_status === "PRODUCTION_READY"
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
              : "border-amber-500/30 bg-amber-500/15 text-amber-300"
          }`}>{readiness.overall_status}</span>
        ) : null}
      >
        <div className="space-y-3">
          {!readiness && (
            <button onClick={fetchReadiness} disabled={readinessLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition disabled:opacity-60">
              {readinessLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              {readinessLoading ? "Generating…" : "Generate FinScale Readiness Report"}
            </button>
          )}
          {readiness && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Org: <span className="text-white font-semibold">{readiness.organization}</span>
                  {" · "}Generated: <span className="font-mono">{new Date(readiness.generated_at).toLocaleString()}</span>
                </div>
                <button onClick={() => setReadinessExpanded(!readinessExpanded)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition">
                  {readinessExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  {readinessExpanded ? "Collapse" : "Expand"}
                </button>
              </div>
              {readinessExpanded && (
                <div className="space-y-2">
                  {(readiness.sections || []).map((sec: any) => (
                    <div key={sec.title} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-white">{sec.title}</div>
                        <EvidenceBadge level={sec.evidence_level} />
                      </div>
                      {(sec.items || []).map((item: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400 pl-1">
                          <CheckCircle className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                          {item}
                        </div>
                      ))}
                      {sec.note && (
                        <div className="text-[10px] text-amber-300 italic flex items-center gap-1 pl-1">
                          <Info className="w-3 h-3 shrink-0" /> {sec.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {readiness.customer_communication && (
                <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-800/40 text-xs text-indigo-200 italic">
                  {readiness.customer_communication}
                </div>
              )}
            </>
          )}
        </div>
      </SectionCard>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: ShieldCheck, title: "Customer Acceptance", color: "cyan",
            desc: "Record formal go-live sign-off across Technical, Security, Outcome, Commercial dimensions",
            onClick: () => setShowAccModal(true),
          },
          {
            icon: MessageSquare, title: "Value Interview", color: "violet",
            desc: "Log 7-question empirical VALUE_VALIDATION interview. Honest observed responses only.",
            onClick: () => setShowIvModal(true),
          },
          {
            icon: DollarSign, title: "Payment Reconciliation", color: "emerald",
            desc: "Reconcile bank wire with real UTR. MRR unchanged. Professional-services revenue only.",
            onClick: () => setShowPayModal(true),
          },
        ].map(card => {
          const colorMap: Record<string, { bg: string; border: string; text: string; hoverBorder: string }> = {
            cyan:    { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", hoverBorder: "hover:border-cyan-700" },
            violet:  { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", hoverBorder: "hover:border-violet-700" },
            emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", hoverBorder: "hover:border-emerald-700" },
          };
          const c = colorMap[card.color];
          return (
            <button key={card.title} onClick={card.onClick}
              className={`flex flex-col items-start gap-2 p-4 rounded-2xl bg-slate-900 border border-slate-800 ${c.hoverBorder} transition group text-left`}>
              <div className={`p-2 rounded-lg ${c.bg} border ${c.border} ${c.text} group-hover:scale-110 transition-transform`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{card.title}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{card.desc}</div>
              </div>
              <ArrowRight className={`w-4 h-4 text-slate-600 group-hover:${c.text} transition`} />
            </button>
          );
        })}
      </div>

      {/* Revenue Reality Panel */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold text-white">Revenue Reality</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
            Phase 17 Empirical
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: "Live MRR", value: "₹0", note: "No recurring subscription active", color: "text-rose-400" },
            { label: "ARR", value: "₹0", note: "Derived from Live MRR", color: "text-rose-400" },
            { label: "FinScale Invoice", value: "₹1,49,000", note: "Professional services — one-time", color: "text-amber-400" },
            {
              label: "Payment Status",
              value: payResult?.status ?? "PENDING",
              note: payResult ? `UTR: ${payResult.utr_number ?? "—"}` : "Awaiting real bank wire + UTR",
              color: payResult?.status === "RECONCILED" ? "text-emerald-400" : "text-slate-400",
            },
          ].map(m => (
            <div key={m.label} className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{m.label}</div>
              <div className={`text-base font-black ${m.color}`}>{m.value}</div>
              <div className="text-[10px] text-slate-500 leading-tight">{m.note}</div>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-slate-500 italic flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-amber-500" />
          Professional-services revenue does NOT count as MRR. MRR is only incremented when a paid recurring subscription invoice is RECONCILED.
        </div>
      </div>

      {/* ── Customer Acceptance Modal ── */}
      {showAccModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-white">Customer Go-Live Acceptance</h2>
              </div>
              <button onClick={() => setShowAccModal(false)} className="text-slate-500 hover:text-white text-xs font-semibold transition">✕ Close</button>
            </div>
            <form onSubmit={handleSubmitAcceptance} className="p-5 space-y-4">
              <div className="text-xs text-slate-400 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                Records formal sign-off across four acceptance dimensions (§62–§70). Open items are tracked explicitly.
                This does NOT auto-mark the customer as paid or change MRR.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Organization ID</label>
                  <input value={accOrgId} onChange={e => setAccOrgId(e.target.value)} required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Customer Contact</label>
                  <input type="email" value={accContact} onChange={e => setAccContact(e.target.value)} required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Internal Onboarding Owner</label>
                <input value={accOwner} onChange={e => setAccOwner(e.target.value)} required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Acceptance Dimensions</div>
                {[
                  { label: "Technical (deployment health, TLS, endpoints)", val: accTechnical, set: setAccTechnical },
                  { label: "Security (IAM least-privilege, KMS, backup)", val: accSecurity, set: setAccSecurity },
                  { label: "Outcome (success definition met by customer)", val: accOutcome, set: setAccOutcome },
                  { label: "Commercial (invoice raised and agreed)", val: accCommercial, set: setAccCommercial },
                ].map(dim => (
                  <label key={dim.label} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <input type="checkbox" checked={dim.val} onChange={e => dim.set(e.target.checked)} className="w-3.5 h-3.5 accent-cyan-500" />
                    <span className="text-xs text-slate-300">{dim.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Open Items</label>
                <textarea value={accOpenItems} onChange={e => setAccOpenItems(e.target.value)} rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 resize-none" />
              </div>
              <button type="submit" disabled={accSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition disabled:opacity-60">
                {accSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {accSubmitting ? "Recording…" : "Record Customer Acceptance"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Value Interview Modal ── */}
      {showIvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-violet-400" />
                <h2 className="text-base font-bold text-white">Value Validation Interview</h2>
              </div>
              <button onClick={() => setShowIvModal(false)} className="text-slate-500 hover:text-white text-xs font-semibold transition">✕ Close</button>
            </div>
            <form onSubmit={handleSubmitInterview} className="p-5 space-y-4">
              <div className="text-xs text-slate-400 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                7-question empirical VALUE_VALIDATION interview (§71–§73). Record honest observed responses only — not projected or assumed answers.
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Organization</label>
                  <input value={ivOrgId} onChange={e => setIvOrgId(e.target.value)} required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Participants</label>
                  <input value={ivParticipants} onChange={e => setIvParticipants(e.target.value)} required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">7 Validation Questions</div>
                {[
                  { label: "Did LaunchComply reduce deployment effort?", val: ivDeployEff, set: setIvDeployEff },
                  { label: "Was AWS onboarding easier than expected?", val: ivAwsOnboard, set: setIvAwsOnboard },
                  { label: "Was the security evidence useful to stakeholders?", val: ivSecEv, set: setIvSecEv },
                  { label: "Was ISO 27001 readiness report valuable?", val: ivIso, set: setIvIso },
                  { label: "Would you continue using the platform?", val: ivContinue, set: setIvContinue },
                  { label: "Would you buy a SaaS subscription (vs one-time)?", val: ivBuy, set: setIvBuy },
                ].map(q => (
                  <label key={q.label} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                    <input type="checkbox" checked={q.val} onChange={e => q.set(e.target.checked)} className="w-3.5 h-3.5 accent-violet-500" />
                    <span className="text-xs text-slate-300">{q.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Missing features / friction (observed)</label>
                <textarea value={ivMissing} onChange={e => setIvMissing(e.target.value)} rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 resize-none"
                  placeholder="e.g. 'Would like multi-account support, no other blockers'" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Customer Quote (with permission)</label>
                <textarea value={ivQuote} onChange={e => setIvQuote(e.target.value)} rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500 resize-none"
                  placeholder='"Onboarding was faster than expected and our banking partner approved the security evidence immediately."' />
              </div>
              <button type="submit" disabled={ivSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold transition disabled:opacity-60">
                {ivSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {ivSubmitting ? "Recording…" : "Record Value Interview"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Payment Reconciliation Modal ── */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Payment Reconciliation</h2>
              </div>
              <button onClick={() => setShowPayModal(false)} className="text-slate-500 hover:text-white text-xs font-semibold transition">✕ Close</button>
            </div>
            <form onSubmit={handleReconcilePayment} className="p-5 space-y-4">
              <div className="text-xs text-amber-300 p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>UTR is mandatory.</strong> Only reconcile when a real bank transfer has occurred and you have a verified UTR from your finance team.
                  This records one-time professional-services revenue. <strong>MRR remains ₹0.</strong>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Invoice Number</label>
                  <input value={payInvoice} onChange={e => setPayInvoice(e.target.value)} required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">UTR Number *</label>
                  <input value={payUTR} onChange={e => setPayUTR(e.target.value)} required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. SBIN26101234567" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Received Amount</label>
                  <input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    placeholder="149000" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Currency</label>
                  <select value={payCurrency} onChange={e => setPayCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Finance Verifier (name + role)</label>
                <input value={payVerifier} onChange={e => setPayVerifier(e.target.value)} required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Priya Sharma, Finance Lead" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">Reconciliation Notes</label>
                <textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                  placeholder="e.g. NEFT from FinScale Technologies A/C ending 4521, matches invoice amount" />
              </div>
              <button type="submit" disabled={paySubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition disabled:opacity-60">
                {paySubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {paySubmitting ? "Reconciling…" : "Reconcile Payment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

