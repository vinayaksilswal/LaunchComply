"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api";
import type { ServiceQuote } from "@/components/workspace/ServiceQuotes";

export function QuotePublisher({ requestId, disabled, onBusyChange }: { requestId: string; disabled: boolean; onBusyChange: (busy: boolean) => void }) {
  const [quote, setQuote] = useState<ServiceQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [quoteId] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    apiClient<{ quote: ServiceQuote | null }>(`/admin/operations-queue/${requestId}/quote`)
      .then((data) => { if (active) setQuote(data.quote); })
      .catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [requestId]);
  const issue = async () => {
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(amount)) { setError("Enter a total with at most two decimal places."); return; }
    const [whole, fraction = ""] = amount.split(".");
    const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    if (minor < 100 || minor > 100000000) { setError("Quote total must be between 1 and 1,000,000 currency units."); return; }
    setBusy(true); onBusyChange(true); setError("");
    try {
      setQuote(await apiClient<ServiceQuote>(`/admin/operations-queue/${requestId}/quote`, { method: "POST", body: JSON.stringify({ quote_id: quoteId, title, scope, amount_minor: minor, currency, delivery_ready: ready }) }));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to publish quote."); }
    finally { setBusy(false); onBusyChange(false); }
  };
  return <fieldset disabled={busy || disabled} className="border-t border-slate-100 pt-5 space-y-3">
    <legend className="text-sm font-semibold">Service quote & payment</legend>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {loading ? <p className="text-xs text-slate-500">Loading quote…</p> : quote ? <div className="rounded-lg bg-slate-50 p-4 text-sm space-y-2">
      <p className="font-semibold">{quote.title} · {new Intl.NumberFormat(undefined, { style: "currency", currency: quote.currency }).format(quote.amount_minor / 100)}</p>
      <p className="whitespace-pre-wrap text-xs leading-5">{quote.scope}</p>
      <p className="text-xs font-semibold">{quote.checkout?.is_real_payment_verified ? "Real payment verified" : quote.checkout?.status || quote.status}</p>
      <p className="text-xs text-slate-500">Quotes are immutable. Payment does not automatically start infrastructure execution.</p>
    </div> : <>
      <p className="text-xs leading-5 text-slate-500">Review the request first. Publish only a scope your team can deliver. Deployment quotes require an approved design and verified AWS access. Total must include all agreed charges and applicable taxes.</p>
      <label className="block text-xs">Quote title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <label className="block text-xs">Scope, deliverables, exclusions and refund terms<textarea value={scope} onChange={(event) => setScope(event.target.value)} maxLength={5000} rows={4} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-xs">Total<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
        <label className="text-xs">Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"><option>INR</option><option>USD</option></select></label></div>
      <label className="flex gap-2 text-xs leading-5"><input type="checkbox" checked={ready} onChange={(event) => setReady(event.target.checked)} /><span>I reviewed the scope and confirmed our team can deliver this assisted service.</span></label>
      <button type="button" disabled={!ready || title.trim().length < 3 || scope.trim().length < 30 || !amount} onClick={issue} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Publishing…" : "Publish fixed quote"}</button>
    </>}
  </fieldset>;
}
