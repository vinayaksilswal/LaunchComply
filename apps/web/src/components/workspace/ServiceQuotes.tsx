"use client";
import { useEffect, useState } from "react";
import { CreditCard, RefreshCw, X, CheckCircle2, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { useAccount } from "@/components/auth/AccountProvider";
import { apiClient } from "@/lib/api";

export interface ServiceQuote {
  id: string; request_id: string; title: string; scope: string; amount_minor: number;
  currency: string; status: string; delivery_mode: string; created_at: string;
  checkout: { provider: string; mode: string; status: string; is_real_payment_verified: boolean; paid_at: string | null } | null;
}
type Provider = { provider: "STRIPE" | "RAZORPAY"; available: boolean; mode: string; reason: string };
const money = (quote: ServiceQuote) => new Intl.NumberFormat(undefined, { style: "currency", currency: quote.currency }).format(quote.amount_minor / 100);

export function ServiceQuotes() {
  const { organization } = useAccount();
  const [data, setData] = useState<{ quotes: ServiceQuote[]; providers: Provider[] } | null>(null);
  const [selected, setSelected] = useState<ServiceQuote | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [refresh, setRefresh] = useState(0);
  const canPay = ["OWNER", "ADMIN"].includes(organization?.role.toUpperCase() || "");
  useEffect(() => {
    if (!organization) return;
    let active = true;
    setData(null); setSelected(null); setError("");
    apiClient<{ quotes: ServiceQuote[]; providers: Provider[] }>("/service-payments/quotes")
      .then((result) => { if (active) setData(result); })
      .catch((failure) => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [organization, refresh]);
  const verify = async (quote: ServiceQuote) => {
    setBusy(quote.id); setError("");
    try {
      const result = await apiClient<ServiceQuote>(`/service-payments/quotes/${quote.id}/refresh`, { method: "POST", timeout: 45000 });
      setData((current) => current ? { ...current, quotes: current.quotes.map((item) => item.id === result.id ? result : item) } : current);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to verify payment."); }
    finally { setBusy(""); }
  };
  return (
    <section aria-label="Service quotes and payments" className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <header className="flex justify-between gap-3 border-b border-slate-100 p-5">
        <div><h2 className="flex items-center gap-2 text-base font-semibold"><CreditCard className="h-4 w-4 text-cyan-700" />Quotes & payments</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">Review the agreed service scope and total before paying. AWS usage is billed separately by AWS.</p></div>
        <button aria-label="Refresh quotes" disabled={!!busy} onClick={() => setRefresh((value) => value + 1)} className="self-start p-2"><RefreshCw className="h-4 w-4 text-slate-500" /></button>
      </header>
      {error && !selected && <p role="alert" className="m-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {!data && !error ? <p role="status" className="p-8 text-sm text-slate-500">Loading quotes…</p>
        : data?.quotes.length ? data.quotes.map((quote) => (
          <article id={`quote-${quote.id}`} key={quote.id} className="border-b border-slate-100 p-5 last:border-0">
            <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{quote.title}</h3><p className="mt-1 text-xs text-slate-500">Assisted service · Quoted {new Date(quote.created_at).toLocaleDateString()}</p></div>
              <p className="text-lg font-semibold">{money(quote)} <span className="text-xs font-normal text-slate-500">total</span></p></div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{quote.scope}</p>
            {quote.checkout?.is_real_payment_verified ? <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Payment verified · Operations will continue the agreed service</p>
              : quote.status === "TEST_PAID" ? <p className="mt-4 text-sm text-amber-700">Test payment verified. This does not pay for or activate a real service.</p>
              : <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button disabled={!canPay || !!busy || quote.checkout?.status === "EXPIRED" || !data.providers.some((item) => item.available)}
                    onClick={() => { setSelected(quote); setAccepted(false); setError(""); }} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Review & pay</button>
                  {quote.checkout && <button disabled={!canPay || !!busy} onClick={() => verify(quote)} className="text-sm font-semibold text-cyan-700">{busy === quote.id ? "Checking provider…" : "Check payment status"}</button>}
                  <span className="text-xs text-slate-500">{quote.checkout?.status === "EXPIRED" ? "Checkout expired. Contact operations to review the quote." : "Payment is confirmed by the provider, not by the return page."}</span>
                </div>}
          </article>
        )) : <p className="p-8 text-sm leading-6 text-slate-500">No quote has been issued yet. Apply for a service; operations reviews your requirements before quoting.</p>}
      {data && !data.providers.some((item) => item.available) && <p className="border-t p-5 text-xs text-slate-500">Online payments are awaiting platform configuration. No checkout or charge is available.</p>}
      {selected && <Dialog label="Review quote and pay" busy={!!busy} onDismiss={() => setSelected(null)} className="max-w-xl">
        <section className="max-h-[85vh] overflow-auto rounded-2xl bg-white p-6 space-y-4">
          <header className="flex justify-between gap-3"><h2 className="text-lg font-semibold">{selected.title}</h2><button aria-label="Close payment review" disabled={!!busy} onClick={() => setSelected(null)}><X className="h-5 w-5" /></button></header>
          <p className="text-2xl font-semibold">{money(selected)} total</p>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.scope}</p>
          <p className="text-xs leading-5 text-slate-500">This payment covers the quoted assisted service. It does not automatically deploy resources or grant AWS access. Cloud usage is paid to AWS separately.</p>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={accepted} disabled={!!busy} onChange={(event) => setAccepted(event.target.checked)} /><span>I accept the scope and total for this service.</span></label>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <div className="flex flex-wrap gap-2">{data?.providers.map((provider) => (
            <button key={provider.provider} disabled={!accepted || !!busy || !provider.available || (!!selected.checkout && selected.checkout.provider !== provider.provider)}
              onClick={async () => {
                setBusy(provider.provider); setError("");
                try {
                  const result = await apiClient<{ checkout_url: string }>(`/service-payments/quotes/${selected.id}/checkout`, { method: "POST", timeout: 45000, body: JSON.stringify({ provider: provider.provider, accepted_scope: true }) });
                  const url = new URL(result.checkout_url);
                  const allowed = provider.provider === "STRIPE" ? ["checkout.stripe.com"] : ["rzp.io", "pages.razorpay.com"];
                  if (url.protocol !== "https:" || !allowed.includes(url.hostname) || url.username || url.password || (url.port && url.port !== "443")) throw new Error("Unsupported checkout address.");
                  window.location.assign(result.checkout_url);
                } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to open checkout."); setBusy(""); }
              }} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold disabled:opacity-40">
              {busy === provider.provider && <Loader2 className="h-4 w-4 animate-spin" />}
              {provider.mode === "test" ? "Test checkout with " : "Pay with "}{provider.provider === "STRIPE" ? "Stripe" : "Razorpay"}
            </button>
          ))}</div>
        </section>
      </Dialog>}
    </section>
  );
}
