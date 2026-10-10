"use client";
import Link from "next/link";
import { ClipboardList, Download, ArrowRight } from "lucide-react";

export interface SavedDesignReview {
  format: string;
  graph_fingerprint: string;
  source_snapshot: string | null;
  evaluated_at: string;
  status: string;
  scope: string;
  items: { code: string; title: string; state: "RECORDED" | "MISSING" | "REVIEW"; detail: string; node_ids: string[] }[];
  services: { node_id: string; label: string; service: string; placement: string }[];
  references: { title: string; url: string }[];
}

export function DesignReview({ review, version, saved, assetId, actionable = true }: {
  review?: SavedDesignReview; version: string; saved: boolean; assetId: string; actionable?: boolean;
}) {
  if (!review) return <p className="mt-5 text-sm text-slate-500">The saved design review is unavailable. Reload after the latest API release is available.</p>;
  const missing = review.items.filter(item => item.state === "MISSING");
  const labels = new Map(review.services.map(service => [service.node_id, service.label]));
  const download = () => {
    if (!saved) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ business_asset_id: assetId, design_version: version, ...review }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `business-design-review-${version.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return <section aria-label="Engineering planning review" className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-cyan-700" />Engineering planning review</h3>
        <p className="mt-1 text-xs text-slate-500">Saved design {version} · {missing.length ? `${missing.length} planning areas need decisions` : "Engineering review required"}</p>
      </div>
      <button onClick={download} disabled={!saved} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"><Download className="h-4 w-4" />Download checklist</button>
    </div>
    <p className="mt-3 text-xs leading-5 text-slate-500">{review.scope}</p>
    {!saved && <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">This review describes the saved version. Save your changes or finish reviewing the AI proposal to refresh it. Download is available when the current design matches the saved version.</p>}
    <div className="mt-4 divide-y divide-slate-100">
      {review.items.map(item => <details key={item.code} open={item.state === "MISSING"} className="py-3">
        <summary className="cursor-pointer text-sm font-medium">
          {item.title}<span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-normal ${item.state === "MISSING" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{item.state === "MISSING" ? "Decision needed" : item.state === "RECORDED" ? "Planning record present" : "Engineering review needed"}</span>
        </summary>
        <p className="mt-2 text-xs leading-5 text-slate-600">{item.detail}</p>
        {item.node_ids.length > 0 && <p className="mt-2 text-xs leading-5 text-slate-500">Components: {item.node_ids.map(id => labels.get(id) || id).join("; ")}</p>}
        {actionable && item.code === "TARGETS" && item.state === "MISSING" && <Link href={`/dashboard/architecture?application=${encodeURIComponent(assetId)}&step=targets`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700">Set traffic and availability <ArrowRight className="h-3 w-3" /></Link>}
      </details>)}
    </div>
    <p className="mt-3 break-all text-[11px] leading-5 text-slate-400">Evaluated {new Date(review.evaluated_at).toLocaleString()} · Design fingerprint {review.graph_fingerprint}</p>
    <div className="mt-2 flex flex-wrap gap-3">{review.references.map(reference => <a key={reference.url} href={reference.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-700 underline">{reference.title}</a>)}</div>
  </section>;
}
