"use client";

import React from "react";
import { AlertCircle, ShieldAlert, WifiOff, ServerCrash, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ErrorStateProps {
  title?: string;
  message?: string;
  type?: "general" | "permission_denied" | "not_found" | "offline" | "provider_unavailable";
  requestId?: string;
  onRetry?: () => void;
  actionText?: string;
  actionHref?: string;
  className?: string;
}

export function ErrorState({
  title,
  message,
  type = "general",
  requestId,
  onRetry,
  actionText,
  actionHref,
  className = "",
}: ErrorStateProps) {
  const configs = {
    general: {
      defaultTitle: "Unable to load data",
      defaultMessage: "An unexpected error occurred while fetching information. Please try again.",
      icon: AlertCircle,
      iconColor: "text-rose-600 bg-rose-50 border-rose-100",
    },
    permission_denied: {
      defaultTitle: "Access Restricted",
      defaultMessage: "You do not have the required permissions to access this enterprise resource or perform this action.",
      icon: ShieldAlert,
      iconColor: "text-amber-600 bg-amber-50 border-amber-100",
    },
    not_found: {
      defaultTitle: "Resource Not Found",
      defaultMessage: "The requested object or environment could not be found. It may have been removed or migrated.",
      icon: AlertCircle,
      iconColor: "text-slate-600 bg-slate-50 border-slate-100",
    },
    offline: {
      defaultTitle: "Connection Lost",
      defaultMessage: "Cannot reach LaunchComply services. Please check your network connection and try again.",
      icon: WifiOff,
      iconColor: "text-sky-600 bg-sky-50 border-sky-100",
    },
    provider_unavailable: {
      defaultTitle: "Upstream Provider Unavailable",
      defaultMessage: "The external cloud provider (AWS/GitHub/IdP) is temporarily unreachable or rate limited.",
      icon: ServerCrash,
      iconColor: "text-purple-600 bg-purple-50 border-purple-100",
    },
  };

  const config = configs[type] || configs.general;
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm max-w-lg mx-auto ${className}`}
    >
      <div className={`mx-auto w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${config.iconColor}`}>
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>

      <h3 className="text-base font-semibold text-slate-900 mb-2">
        {title || config.defaultTitle}
      </h3>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
        {message || config.defaultMessage}
      </p>

      {requestId && (
        <div className="mb-6 p-2 rounded bg-slate-50 border border-slate-100 font-mono text-xs text-slate-500">
          Request ID: <span className="font-semibold text-slate-700">{requestId}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-slate-900"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        )}

        {actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{actionText || "Return to Dashboard"}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
