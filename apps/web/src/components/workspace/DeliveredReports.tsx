"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, FileText } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";

export interface ReportRecord { id: string; title: string; created_at: string; sha256: string; }
export interface DeliveryAcceptance { report_id: string; sha256: string; accepted_at: string; }
interface ReportContent extends ReportRecord { request_id: string; content: string; }

function ReportReader({ record, requestId, open, latest, status, acceptance, onAccepted }: {
  record: ReportRecord; requestId: string; open: boolean; latest: boolean; status: string;
  acceptance: DeliveryAcceptance | null; onAccepted: () => void;
}) {
  const { organization } = useAccount();
  const [report, setReport] = useState<ReportContent | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const canAccept = ["OWNER", "ADMIN"].includes(organization?.role.toUpperCase() || "");
  useEffect(() => {
    if (!open) return;
    let active = true;
    setError(""); setReport(null); setReviewed(false);
    apiClient<ReportContent>(`/business-requests/reports/${record.id}`).then(result => {
      if (!active) return;
      if (result.request_id !== requestId || result.sha256 !== record.sha256) {
        setError("This report changed. Refresh the request before reviewing delivery."); return;
      }
      setReport(result);
    }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [open, record.id, record.sha256, requestId, refresh]);
  const accepted = acceptance?.report_id === record.id && acceptance.sha256 === record.sha256;
  return <div className="space-y-4 border-t p-5">
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {!report && !error && <p role="status" className="text-sm text-slate-500">Loading published report…</p>}
    {!report && error && <button type="button" onClick={() => setRefresh(value => value + 1)} className="text-sm font-semibold text-cyan-700">Retry report</button>}
    {report && <>
      <p className="whitespace-pre-wrap break-words text-sm leading-7">{report.content}</p>
      <button type="button" onClick={() => {
        const url = URL.createObjectURL(new Blob([
          `${report.title}\nRequest: ${requestId}\nReport: ${report.id}\nPublished: ${report.created_at}\n\n${report.content}\n\nContent SHA-256: ${report.sha256}`,
        ], { type: "text/plain;charset=utf-8" }));
        const a = document.createElement("a"); a.href = url; a.download = `service-report-${report.id}.txt`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }} className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700"><Download className="h-4 w-4" />Download report</button>
      <p className="break-all text-xs leading-5 text-slate-500">Content checksum: {report.sha256}. This identifies the report content; it is not an assessor’s digital signature.</p>
      {latest && accepted ? <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />Delivery accepted · {new Date(acceptance.accepted_at).toLocaleString()}</p>
        : latest && status === "DELIVERED" ? <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
          <h3 className="text-sm font-semibold">Review the delivered work</h3>
          <p className="text-xs leading-5 text-slate-600">Accept only after checking the agreed deliverables. Acceptance records this report version; it does not certify security or compliance, prove a cloud deployment, or authorize new work. Reply below if anything is missing.</p>
          {canAccept ? <>
            <label className="flex items-start gap-2 text-sm leading-6"><input type="checkbox" className="mt-1" disabled={busy} checked={reviewed} onChange={event => setReviewed(event.target.checked)} /><span>I reviewed this report and accept the delivered work for this request.</span></label>
            <button type="button" disabled={!reviewed || busy} onClick={async () => {
              if (!reviewed || busy) return;
              setBusy(true); setError("");
              try {
                await apiClient(`/business-requests/${requestId}/acceptance`, { method: "POST", body: JSON.stringify({ report_id: report.id, content_sha256: report.sha256, reviewed_delivery: true }) });
                onAccepted();
                window.dispatchEvent(new Event("launchcomply:service-request-submitted"));
              } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to record acceptance."); }
              finally { setBusy(false); }
            }} className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Recording…" : "Accept delivered work"}</button>
          </> : <p className="text-xs text-slate-500">A business owner or administrator can record delivery acceptance.</p>}
        </div> : !latest ? <p className="text-xs text-slate-500">Earlier report. Review the latest report for current delivery acceptance.</p> : null}
    </>}
  </div>;
}

export function DeliveredReports({ requestId, reports, status, acceptance, truncated, onAccepted }: {
  requestId: string; reports: ReportRecord[]; status: string; acceptance: DeliveryAcceptance | null;
  truncated: boolean; onAccepted: () => void;
}) {
  const [selected, setSelected] = useState(reports[0]?.id || "");
  useEffect(() => {
    const selectLinked = () => {
      const linked = window.location.hash.replace("#report-", "");
      if (reports.some(report => report.id === linked)) setSelected(linked);
    };
    selectLinked(); window.addEventListener("hashchange", selectLinked);
    return () => window.removeEventListener("hashchange", selectLinked);
  }, [reports]);
  return <section aria-label="Published delivery reports" className="space-y-3">
    <h2 className="flex items-center gap-2 text-base font-semibold"><FileText className="h-4 w-4 text-cyan-700" />Reports & handover</h2>
    {!reports.length && <p className="rounded-xl border p-5 text-sm leading-6 text-slate-500">No report has been published. The team will publish actual delivered work here after review.</p>}
    {reports.map((record, index) => <article key={record.id} id={`report-${record.id}`} className="scroll-mt-20 overflow-hidden rounded-xl border bg-white">
      <button type="button" aria-expanded={selected === record.id} onClick={() => setSelected(selected === record.id ? "" : record.id)} className="w-full p-5 text-left">
        <p className="text-sm font-semibold">{record.title}</p><p className="mt-1 text-xs text-slate-500">{index === 0 ? "Latest report" : "Earlier report"} · Published {new Date(record.created_at).toLocaleString()}</p>
      </button>
      {selected === record.id && <ReportReader record={record} requestId={requestId} open={true} latest={index === 0} status={status} acceptance={acceptance} onAccepted={onAccepted} />}
    </article>)}
    {truncated && <p className="text-xs text-slate-500">Showing the latest 100 reports. Contact operations for earlier history.</p>}
  </section>;
}
