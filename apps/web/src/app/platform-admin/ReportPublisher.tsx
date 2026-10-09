"use client";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

interface PublishedReport { id: string; title: string; content: string; created_at: string; }
interface ReportPublisherProps {
  requestId: string;
  onPublished: () => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}

export function ReportPublisher({ requestId, onPublished, disabled = false, onBusyChange }: ReportPublisherProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [id, setId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reports, setReports] = useState<PublishedReport[]>([]);
  const locked = busy || disabled;
  useEffect(() => {
    let active = true;
    apiClient<{ reports: PublishedReport[] }>(`/admin/operations-queue/${requestId}/reports`)
      .then(result => { if (active) setReports(result.reports); })
      .catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [requestId]);

  async function publish() {
    if (locked || title.trim().length < 3 || content.trim().length < 20) return;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      await apiClient(`/admin/operations-queue/${requestId}/reports`, {
        method: "POST",
        body: JSON.stringify({ report_id: id, title: title.trim(), content: content.trim() }),
      });
      onPublished();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to publish report.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return <section aria-label="Customer reports" className="border-t border-slate-200 pt-4 space-y-3">
    {reports.map(report => <details key={report.id} className="rounded-lg border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-semibold">{report.title}</summary>
      <p className="text-xs text-slate-500 mt-2">Published {new Date(report.created_at).toLocaleString()}</p>
      <p className="text-sm whitespace-pre-wrap break-words leading-6 mt-3">{report.content}</p>
    </details>)}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <button type="button" disabled={locked} onClick={() => {
      setOpen(value => !value);
      if (!id) setId(crypto.randomUUID());
    }} className="text-sm font-semibold text-cyan-700 disabled:opacity-40">
      {open ? "Hide report editor" : "Publish service report"}
    </button>
    {open && <>
      <p className="text-xs text-slate-500 leading-5">Publish the actual delivered work. The customer will see it in their service page. Publishing records the report and marks the request delivered.</p>
      <label className="block text-sm">Report title
        <input maxLength={255} disabled={locked} value={title}
          onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }}
          onChange={event => { setTitle(event.target.value); setId(crypto.randomUUID()); }}
          className="mt-1 w-full border rounded-lg p-2" />
      </label>
      <label className="block text-sm">Report content
        <textarea rows={6} maxLength={20000} disabled={locked} value={content}
          onChange={event => { setContent(event.target.value); setId(crypto.randomUUID()); }}
          className="mt-1 w-full border rounded-lg p-2" />
      </label>
      <button type="button" disabled={locked || title.trim().length < 3 || content.trim().length < 20}
        onClick={publish} className="w-full bg-cyan-700 text-white px-4 py-3 rounded-lg text-sm font-semibold disabled:opacity-40">
        {busy ? "Publishing…" : "Publish to customer"}
      </button>
    </>}
  </section>;
}
