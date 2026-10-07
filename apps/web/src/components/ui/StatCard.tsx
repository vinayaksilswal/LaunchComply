"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  status?: "default" | "success" | "warning" | "danger";
  action?: React.ReactNode;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  status = "default",
  action,
  className = "",
}: StatCardProps) {
  const statusBorder = {
    default: "border-slate-200",
    success: "border-emerald-200 bg-emerald-50/20",
    warning: "border-amber-200 bg-amber-50/20",
    danger: "border-rose-200 bg-rose-50/20",
  }[status];

  return (
    <div
      className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow duration-150 flex flex-col justify-between ${statusBorder} ${className}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-50 text-slate-700 border border-slate-100">
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <div className="text-2xl font-bold tracking-tight text-slate-900">
          {value}
        </div>
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              trend.isPositive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {(subtitle || action) && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {subtitle && <span>{subtitle}</span>}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
    </div>
  );
}
