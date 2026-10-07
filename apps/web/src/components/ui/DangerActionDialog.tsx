"use client";

import React, { useState } from "react";
import { AlertTriangle, X, ShieldAlert } from "lucide-react";

interface DangerActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  impactDetails?: string[];
  confirmText?: string;
  requiredTypedConfirmation?: string;
  isSubmitting?: boolean;
}

export function DangerActionDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  impactDetails = [],
  confirmText = "Delete Permanently",
  requiredTypedConfirmation,
  isSubmitting = false,
}: DangerActionDialogProps) {
  const [typedInput, setTypedInput] = useState("");

  if (!isOpen) return null;

  const isConfirmedValid = requiredTypedConfirmation
    ? typedInput.trim() === requiredTypedConfirmation
    : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmedValid || isSubmitting) return;
    await onConfirm();
    setTypedInput("");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl border border-rose-200 max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider mt-0.5">
                Destructive Enterprise Action
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>

        {impactDetails.length > 0 && (
          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-xs text-rose-900 space-y-1.5">
            <div className="font-semibold flex items-center gap-1.5 mb-1 text-rose-800">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Consequences & Impact:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1">
              {impactDetails.map((detail, idx) => (
                <li key={idx}>{detail}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {requiredTypedConfirmation && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">
                Please type{" "}
                <span className="font-mono font-bold text-rose-600 select-all">
                  {requiredTypedConfirmation}
                </span>{" "}
                to confirm:
              </label>
              <input
                type="text"
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={requiredTypedConfirmation}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono"
                autoFocus
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmedValid || isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              {isSubmitting ? "Processing..." : confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
