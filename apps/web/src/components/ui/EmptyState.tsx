"use client";

import React from "react";
import { LucideIcon, PlusCircle, Inbox } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  secondaryActionHref?: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  actionText,
  actionHref,
  onAction,
  secondaryActionText,
  secondaryActionHref,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs max-w-md mx-auto my-8 ${className}`}
    >
      <div className="mx-auto w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionHref && actionText && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{actionText}</span>
          </Link>
        )}

        {onAction && actionText && !actionHref && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{actionText}</span>
          </button>
        )}

        {secondaryActionHref && secondaryActionText && (
          <Link
            href={secondaryActionHref}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>{secondaryActionText}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
