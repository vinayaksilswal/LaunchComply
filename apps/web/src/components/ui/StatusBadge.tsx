"use client";

import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Lock,
} from "lucide-react";

export type StatusType =
  | "PASS"
  | "HEALTHY"
  | "LIVE"
  | "ACTIVE"
  | "RESOLVED"
  | "COMPLETED"
  | "VERIFIED"
  | "PARTIAL"
  | "AT_RISK"
  | "EXPIRING"
  | "PENDING"
  | "IN_PROGRESS"
  | "WARNING"
  | "SCOPING"
  | "FAIL"
  | "CRITICAL"
  | "BLOCKED"
  | "ERROR"
  | "HIGH"
  | "FAILED"
  | "REVOKED"
  | "DRAFT"
  | "UNKNOWN"
  | "NOT_CONFIGURED"
  | "MEDIUM"
  | "LOW"
  | "INFO"
  | "NEUTRAL"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusBadge({
  status,
  label,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const norm = String(status || "UNKNOWN").toUpperCase();

  let style = "bg-slate-100 text-slate-700 border-slate-200";
  let Icon = HelpCircle;
  let accessibleLabel = label || norm;

  // Success variants
  if (
    [
      "PASS",
      "HEALTHY",
      "LIVE",
      "ACTIVE",
      "RESOLVED",
      "COMPLETED",
      "VERIFIED",
      "PASSING",
    ].includes(norm)
  ) {
    style = "bg-emerald-50 text-emerald-800 border-emerald-200";
    Icon = CheckCircle2;
  }
  // Warning variants
  else if (
    [
      "PARTIAL",
      "AT_RISK",
      "EXPIRING",
      "PENDING",
      "IN_PROGRESS",
      "WARNING",
      "SCOPING",
      "PROVISIONING",
    ].includes(norm)
  ) {
    style = "bg-amber-50 text-amber-800 border-amber-200";
    Icon = AlertTriangle;
  }
  // Failure / Critical variants
  else if (
    [
      "FAIL",
      "CRITICAL",
      "BLOCKED",
      "ERROR",
      "HIGH",
      "FAILED",
      "REVOKED",
      "FAILING",
    ].includes(norm)
  ) {
    style = "bg-rose-50 text-rose-800 border-rose-200";
    Icon = XCircle;
  }
  // Info / Medium variants
  else if (["MEDIUM", "INFO", "TESTING"].includes(norm)) {
    style = "bg-sky-50 text-sky-800 border-sky-200";
    Icon = Radio;
  }
  // Draft / Low variants
  else if (["DRAFT", "LOW", "UNKNOWN", "NOT_CONFIGURED"].includes(norm)) {
    style = "bg-slate-100 text-slate-600 border-slate-200";
    Icon = Clock;
  }

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs font-semibold gap-1.5",
    lg: "px-3 py-1.5 text-sm font-semibold gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <span
      role="status"
      aria-label={accessibleLabel}
      className={`inline-flex items-center rounded-full border transition-colors ${sizeClasses[size]} ${style} ${className}`}
    >
      <Icon className={`${iconSizes[size]} shrink-0`} aria-hidden="true" />
      <span className="tracking-wide">{label || norm}</span>
    </span>
  );
}
