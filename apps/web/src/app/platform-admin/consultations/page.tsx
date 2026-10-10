"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RefreshCw, Building2, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Sidebar } from "@/components/layout/Sidebar";
import { apiClient } from "@/lib/api";

interface Inquiry { id: string; name: string; email: string; company: string; status: string; notes: string; created_at: string }
interface Inbox { inquiries: Inquiry[]; has_more: boolean; offset: number }

export default function ConsultationInbox() {
  const [data, setData] = useState<Inbox | null>(null);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [review, setReview] = useState<Inquiry | null>(null);
  const [nextStatus, setNextStatus] = useState("QUALIFIED");
  const [note, setNote] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null); setError("");
    apiClient<Inbox>("/platform-admin/consultations", { params: { offset } }).then(result => { if (active) setData(result); })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Unable to load inquiries."); });
    return () => { active = false; };
  }, [offset, refresh]);
  return <div className="min-h-screen bg-white text-slate-900"><Sidebar /><main className="max-w-[1600px] space-y-6 p-6 pt-20 lg:ml-64 lg:pt-8">
    <Link href="/platform-admin" className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Business service queue</Link>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">Internal operations</p><h1 className="mt-2 text-3xl font-semibold">Business inquiries</h1><p className="mt-2 text-sm text-slate-500">Actual consultation requests from the public website.</p></div><button onClick={() => setRefresh(value => value + 1)} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm"><RefreshCw className="h-4 w-4" />Refresh inquiries</button></header>
    <aside className="rounded-xl border border-cyan-100 bg-cyan-50 p-5 text-sm leading-7 text-slate-600">Review the business goals and agree what can be delivered before quoting. These inquiries are not paid engagements or assessment authorizations. Follow-up is manual; no email notification or automatic outreach is claimed. After the customer creates a workspace, keep scoped work in the business service queue.</aside>
    {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div> : !data ? <p role="status" className="text-sm text-slate-500">Loading the operations inbox…</p> : <>
      {!data.inquiries.length ? <div className="rounded-2xl border p-8"><Building2 className="h-8 w-8 text-slate-400" /><h2 className="mt-4 font-semibold">No inquiries on this page</h2><p className="mt-2 text-sm text-slate-500">Saved requests from the consultation form will appear here.</p><Link href="/contact#consultation" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700">View public consultation form <ArrowRight className="h-4 w-4" /></Link></div> : <div className="space-y-4">{data.inquiries.map(inquiry => <article key={inquiry.id} className="rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-wrap justify-between gap-4"><div><h2 className="font-semibold">{inquiry.company}</h2><p className="mt-2 text-sm text-slate-600">{inquiry.name} · {inquiry.email}</p></div><span className="h-fit rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-600">{inquiry.status.toLowerCase()}</span></div>
        <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{inquiry.notes}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-4 text-xs text-slate-500"><div className="space-y-2"><time dateTime={inquiry.created_at}>{new Date(inquiry.created_at).toLocaleString()}</time><p className="break-all">Reference: {inquiry.id}</p></div><button onClick={() => { setReview(inquiry); setNextStatus(inquiry.status === "QUALIFIED" ? "UNQUALIFIED" : "QUALIFIED"); setNote(""); setReviewError(""); }} className="rounded-lg border px-4 py-2 text-sm font-semibold text-cyan-700">Review inquiry</button></div>
      </article>)}</div>}
      <nav aria-label="Inquiry pages" className="flex items-center justify-between gap-3"><button disabled={offset === 0} onClick={() => setOffset(value => Math.max(0, value - 50))} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-xs text-slate-500">Page {offset / 50 + 1}</span><button disabled={!data.has_more} onClick={() => setOffset(value => value + 50)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">Next</button></nav>
    </>}
  </main>{review && <Dialog label="Review business inquiry" busy={busy} onDismiss={() => setReview(null)}>
    <form className="space-y-5 rounded-2xl bg-white p-6" onSubmit={async event => {
      event.preventDefault(); if (busy) return;
      setBusy(true); setReviewError("");
      try { await apiClient(`/platform-admin/consultations/${review.id}`, { method: "PATCH", body: JSON.stringify({ expected_status: review.status, status: nextStatus, note }) }); setReview(null); setRefresh(value => value + 1); }
      catch (failure) { setReviewError(failure instanceof Error ? failure.message : "Unable to save review."); }
      finally { setBusy(false); }
    }}><header className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">Review business inquiry</h2><button type="button" disabled={busy} onClick={() => setReview(null)} aria-label="Close inquiry review"><X className="h-5 w-5 text-slate-500" /></button></header>
      <p className="text-sm text-slate-600">{review.company} · {review.name}</p>
      <label className="block text-sm font-medium">Review outcome<select value={nextStatus} onChange={event => setNextStatus(event.target.value)} disabled={busy} className="mt-2 block w-full rounded-lg border bg-white px-3 py-2.5"><option value="QUALIFIED">Fit for a scope review</option><option value="UNQUALIFIED">Not a current fit / browser review</option><option value="NEW">Return to new</option></select></label>
      <label className="block text-sm font-medium">Internal review note<textarea required minLength={5} maxLength={1000} rows={3} value={note} disabled={busy} onChange={event => setNote(event.target.value)} className="mt-2 block w-full rounded-lg border px-3 py-2.5" /></label>
      <p className="text-xs leading-6 text-slate-500">Records an internal qualification decision and operator audit entry. It does not contact the business, accept a contract, charge money, or start work.</p>
      {reviewError && <p role="alert" className="text-sm text-rose-700">{reviewError} Close the review and refresh the inbox if another operator changed it.</p>}
      <button disabled={busy || nextStatus === review.status} className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Saving review…" : "Save inquiry review"}</button>
    </form>
  </Dialog>}</div>;
}
