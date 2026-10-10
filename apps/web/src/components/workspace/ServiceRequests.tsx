"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, RefreshCw, ArrowRight } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";

interface RequestItem {
  id: string; title: string; status: string; created_at: string; estimated_delivery: string;
  quote?: { id: string; amount_minor: number; currency: string; is_real_payment_verified: boolean } | null;
  reports: { id: string; title: string; created_at: string }[];
}
export function ServiceRequests({ code, family, compact = false }: {
  code?: string; family?: "security" | "compliance"; compact?: boolean;
}) {
  const { organization } = useAccount();
  const [items, setItems] = useState<RequestItem[] | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    if (!organization) return;
    let active = true;
    setError(""); setItems(null);
    apiClient<{ requests: RequestItem[]; truncated?: boolean }>("/business-requests", {
      params: { service_code: code, service_family: family },
    }).then(result => {
      if (active) { setItems(result.requests); setTruncated(!!result.truncated); }
    }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [organization, code, family, refresh]);
  useEffect(() => {
    const update = () => setRefresh(value => value + 1);
    window.addEventListener("launchcomply:service-request-submitted", update);
    return () => window.removeEventListener("launchcomply:service-request-submitted", update);
  }, []);
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    <header className="flex items-center justify-between border-b border-slate-100 p-5">
      <h2 className="text-sm font-semibold">Service applications & reports</h2>
      <button type="button" onClick={() => setRefresh(value => value + 1)} aria-label="Refresh service applications" className="p-1.5 text-slate-500"><RefreshCw className="h-4 w-4" /></button>
    </header>
    {error ? <p role="alert" className="p-5 text-sm text-rose-700">{error}</p>
      : !items ? <p role="status" className="p-6 text-sm text-slate-500">Loading your service applications…</p>
      : !items.length ? <div className="p-8 text-center"><FileText className="mx-auto h-7 w-7 text-slate-300" /><h3 className="mt-3 text-sm font-semibold">Apply to get started</h3><p className="mt-2 text-sm leading-6 text-slate-500">Your submitted requests, delivery status, and published reports will appear here.</p></div>
      : (compact ? items.slice(0, 3) : items).map(item => <article key={item.id} className="border-b border-slate-100 p-5 last:border-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-sm font-semibold"><Link href={`/dashboard/services/${item.id}`} className="hover:text-cyan-700">{item.title}</Link></h3><p className="mt-1 text-xs text-slate-500">Submitted {new Date(item.created_at).toLocaleString()} · Reference {item.id.slice(0, 8)}</p></div>
          <span className="rounded-md border border-slate-200 px-2.5 py-1 text-xs capitalize text-slate-600">{item.status.toLowerCase().replaceAll("_", " ")}</span>
        </div>
        {!["DELIVERED", "CLOSED"].includes(item.status.toUpperCase()) && item.estimated_delivery && <p className="mt-3 text-xs text-slate-500">Delivery: {item.estimated_delivery}</p>}
        {item.reports.length ? <div className="mt-4 flex flex-wrap gap-3">{item.reports.map(record => <Link key={record.id} href={`/dashboard/services/${item.id}#report-${record.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-700"><FileText className="h-4 w-4" />View {record.title}</Link>)}</div>
          : <p className="mt-3 text-xs text-slate-400">Report available after the operations team publishes it.</p>}
        {item.quote && <Link href={`/dashboard/billing#quote-${item.quote.id}`} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-cyan-700">{item.quote.is_real_payment_verified ? "Payment verified · View quote" : "Review service quote"} · {new Intl.NumberFormat(undefined, { style: "currency", currency: item.quote.currency }).format(item.quote.amount_minor / 100)}</Link>}
        <Link href={`/dashboard/services/${item.id}`} className="mt-3 flex w-fit items-center gap-2 text-sm font-semibold text-cyan-700">View progress & reply<ArrowRight className="h-4 w-4" /></Link>
      </article>)}
    {truncated && <p className="border-t p-4 text-xs text-slate-500">Showing the latest 100 applications. Older request links still work; contact your operations team for earlier history.</p>}
    {compact && <div className="border-t border-slate-100 p-5"><Link href="/dashboard/services" className="text-sm font-semibold text-cyan-700">View all service requests</Link></div>}
  </section>;
}
