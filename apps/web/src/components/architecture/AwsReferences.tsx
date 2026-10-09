"use client";

import { BookOpen, ExternalLink, Loader2 } from "lucide-react";

export interface AwsReferenceReview {
  provider: string;
  checked_at: string;
  scope: string;
  services: {
    service: string;
    status: string;
    sources: { title: string; url: string; excerpt: string }[];
  }[];
  omitted_services: string[];
}

export function AwsReferences({ review, enabled, canEdit, busy, fetching, unsaved, preview, onFind }: {
  review?: AwsReferenceReview;
  enabled: boolean;
  canEdit: boolean;
  busy: boolean;
  fetching: boolean;
  unsaved: boolean;
  preview: boolean;
  onFind: () => void;
}) {
  const reason = unsaved ? "Save your changes before finding references."
    : preview ? "Apply the proposal before finding references for it."
    : !enabled ? "Your platform administrator needs to enable AWS references."
    : !canEdit ? "A business owner or administrator can retrieve references."
    : "Searches official guidance using public AWS service names. Your application code and business details are not sent to AWS.";
  return (
    <section aria-label="AWS documentation references" className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-4">
      <div className="flex items-center gap-2 text-cyan-800">
        <BookOpen className="h-4 w-4" />
        <h3 className="text-sm font-semibold">AWS guidance</h3>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        Find references for the services in your saved design. The assistant can use them when proposing changes.
      </p>
      <button type="button" onClick={onFind}
        disabled={busy || unsaved || preview || !enabled || !canEdit}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-800 disabled:opacity-50">
        {fetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {fetching ? "Finding references…" : review ? "Refresh AWS references" : "Find AWS references"}
      </button>
      <p className="mt-2 text-[11px] leading-4 text-slate-500">{reason}</p>
      {review && !unsaved && !preview && (
        <details className="mt-4 border-t border-cyan-100 pt-3" open>
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">
            References for {review.services.length} services
          </summary>
          <p className="mt-2 text-[10px] text-slate-500">
            Retrieved {new Date(review.checked_at).toLocaleString()} · {review.provider}
          </p>
          <ul className="mt-3 space-y-4">
            {review.services.map((item) => (
              <li key={item.service}>
                <p className="text-xs font-semibold text-slate-800">{item.service}</p>
                {item.sources.length ? item.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"
                    className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-cyan-800 underline underline-offset-2">
                    <span>{source.title}</span><ExternalLink className="mt-1 h-3 w-3 shrink-0" />
                  </a>
                )) : <p className="mt-1 text-xs text-slate-500">No references returned.</p>}
              </li>
            ))}
          </ul>
          {!!review.omitted_services.length && (
            <p className="mt-3 text-xs leading-5 text-amber-800">
              This lookup covers up to six services. Still to review: {review.omitted_services.join(", ")}.
            </p>
          )}
          <p className="mt-4 text-[11px] leading-4 text-slate-500">{review.scope}</p>
        </details>
      )}
    </section>
  );
}
