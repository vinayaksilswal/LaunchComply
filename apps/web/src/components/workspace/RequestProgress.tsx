"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Send } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";
import { DesignReview, type SavedDesignReview } from "@/components/architecture/DesignReview";
import Link from "next/link";
import { DeliveredReports, type ReportRecord, type DeliveryAcceptance } from "./DeliveredReports";

interface Progress {
  submitted_design?: { architecture_id: string; version: string; application_id: string; review: SavedDesignReview } | null;
  request: { id: string; title: string; status: string; notes: string; estimated_delivery: string; created_at: string };
  events: { id: string; action: string; created_at: string; status?: string; message: string; report_id?: string }[];
  reports?: ReportRecord[]; reports_truncated?: boolean; quote_id?: string | null;
  delivery_acceptance?: DeliveryAcceptance | null;
  truncated: boolean;
}
const readable = (value: string) => value.toLowerCase().replaceAll("_", " ");
const explanations: Record<string, string> = {
  REQUESTED: "Your application is saved. The team will review your goals and agree the scope before starting work.",
  REVIEWING: "The team is reviewing the scope and information supplied. Any quote will appear on your service application.",
  IN_PROGRESS: "The operations team has recorded that work is in progress. Assessment results need supporting evidence and a published report.",
  WAITING_CUSTOMER: "The team needs information from you. Read the latest update and reply below to return the request for review.",
  DELIVERED: "The team has published delivered work. Review the latest report, reply about anything missing, or record your acceptance. Delivery alone is not certification.",
  CLOSED: "This request is closed. Apply for another service for additional work.",
};
export function RequestProgress({ requestId, admin = false, fullPage = false, refreshKey = 0, onUpdated }: {
  requestId: string; admin?: boolean; fullPage?: boolean; refreshKey?: number; onUpdated?: () => void;
}) {
  const { organization } = useAccount();
  const [data, setData] = useState<Progress | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState("");
  const [replyId, setReplyId] = useState("");
  const [busy, setBusy] = useState(false);
  const canReply = !admin && ["OWNER", "ADMIN"].includes(organization?.role.toUpperCase() || "");
  useEffect(() => {
    let active = true;
    setError(""); setData(null);
    apiClient<Progress>(`${admin ? "/admin/operations-queue" : "/business-requests"}/${requestId}${fullPage && !admin ? "" : "/activity"}`)
      .then(result => { if (active) setData(result); })
      .catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [requestId, admin, fullPage, refresh, refreshKey, organization]);
  return <section aria-label="Service progress and conversation" className="space-y-4">
    <header className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Progress & conversation</h3>
      <button type="button" disabled={busy} aria-label="Refresh request progress" onClick={() => setRefresh(value => value + 1)} className="rounded-lg border p-2"><RefreshCw className="h-4 w-4" /></button></header>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {!data && !error && <p role="status" className="text-sm text-slate-500">Loading request progress…</p>}
    {data && <>
      {fullPage && <header className="space-y-2"><h1 className="text-2xl font-semibold">{data.request.title}</h1><p className="break-all text-xs text-slate-500">Request reference: {data.request.id} · Submitted {new Date(data.request.created_at).toLocaleString()}</p></header>}
      <div className="rounded-xl bg-cyan-50 p-4 text-sm leading-6 text-cyan-950"><p className="font-semibold capitalize">{readable(data.request.status)}</p><p>{explanations[data.request.status] || "Review the recorded progress below."}</p></div>
      {!fullPage && data.delivery_acceptance && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Customer acceptance recorded for the latest report · {new Date(data.delivery_acceptance.accepted_at).toLocaleString()}. A new report requires a new acceptance.</p>}
      {fullPage && data.quote_id && <Link href={`/dashboard/billing#quote-${data.quote_id}`} className="inline-block text-sm font-semibold text-cyan-700">Review scope, quote & payment</Link>}
      {fullPage && <DeliveredReports requestId={requestId} reports={data.reports || []} status={data.request.status} acceptance={data.delivery_acceptance || null} truncated={!!data.reports_truncated} onAccepted={() => { setRefresh(value => value + 1); onUpdated?.(); }} />}
      {!admin && data.request.notes && <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-semibold">Your application details</summary><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{data.request.notes}</p></details>}
      {data.submitted_design && <details className="rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-semibold">Submitted design checklist · {data.submitted_design.version}</summary>
        <p className="mt-3 text-xs leading-5 text-slate-500">Captured when this request was submitted. Later design changes do not update this snapshot. Agree the scope and any revised design with the team before work begins.</p>
        <DesignReview review={data.submitted_design.review} version={data.submitted_design.version} saved={true} assetId={data.submitted_design.application_id} actionable={false} />
      </details>}
      <ol className="space-y-3 border-l-2 border-slate-100 pl-4">
        {data.events.map(event => <li key={event.id} className="rounded-lg border border-slate-100 p-3">
          <p className="text-xs font-semibold text-slate-700">{event.action === "BUSINESS_REQUEST_SUBMITTED" ? "Application submitted" : event.action === "SERVICE_REPORT_PUBLISHED" ? "Report published" : event.action === "BUSINESS_REQUEST_DELIVERY_ACCEPTED" ? "Customer accepted a delivered report" : event.action === "BUSINESS_REQUEST_CUSTOMER_REPLIED" ? "Customer reply" : `Team update${event.status ? ` · ${readable(event.status)}` : ""}`}</p>
          <time className="mt-1 block text-xs text-slate-500">{new Date(event.created_at).toLocaleString()}</time>
          {event.message && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{event.message}</p>}
          {!admin && event.report_id && <Link href={`/dashboard/services/${requestId}#report-${event.report_id}`} className="mt-2 inline-block text-xs font-semibold text-cyan-700">Open this report</Link>}
        </li>)}
      </ol>
      {data.truncated && <p className="text-xs text-slate-500">Showing the latest 100 activity entries.</p>}
      {canReply && data.request.status !== "CLOSED" && <form className="space-y-3" onSubmit={async event => {
        event.preventDefault(); if (busy || message.trim().length < 3) return;
        setBusy(true); setError("");
        const id = replyId || crypto.randomUUID(); setReplyId(id);
        try {
          await apiClient(`/business-requests/${requestId}/replies`, { method: "POST", body: JSON.stringify({ reply_id: id, expected_status: data.request.status, message: message.trim() }) });
          setMessage(""); setReplyId(""); setRefresh(value => value + 1); onUpdated?.();
          window.dispatchEvent(new Event("launchcomply:service-request-submitted"));
        } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to send reply."); }
        finally { setBusy(false); }
      }}><label className="block text-sm font-medium">Reply to the operations team<textarea rows={3} maxLength={1000} disabled={busy} value={message} onChange={event => { setMessage(event.target.value); setReplyId(crypto.randomUUID()); }} placeholder="Share the information requested. Do not include passwords, keys or sensitive customer data." className="mt-2 w-full resize-none rounded-lg border p-3 text-sm" /></label>
        <button disabled={busy || message.trim().length < 3} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"><Send className="h-4 w-4" />{busy ? "Sending…" : "Send reply"}</button></form>}
    </>}
  </section>;
}
