"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calculator } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";

const fields = [
  { key: "price", label: "Proposed service price", required: true, max: 10000000 },
  { key: "hours", label: "Total delivery & support hours", required: true, max: 10000 },
  { key: "rate", label: "Operator cost per hour", required: true, max: 100000 },
  { key: "feePercent", label: "Payment fee (%)", max: 100 },
  { key: "feeFixed", label: "Fixed payment fee", max: 1000000 },
  { key: "tools", label: "AI, hosting & other project costs", max: 1000000 },
  { key: "acquisition", label: "Acquisition cost per customer", max: 1000000 },
  { key: "rework", label: "Rework / refund allowance", max: 1000000 },
  { key: "margin", label: "Target contribution margin (%)", max: 99 },
  { key: "available", label: "Delivery hours available per month", max: 10000 },
  { key: "overhead", label: "Monthly fixed overhead", max: 10000000 },
] as const;
type Key = typeof fields[number]["key"];

export default function Page() {
  const [currency, setCurrency] = useState("USD");
  const [values, setValues] = useState<Partial<Record<Key, string>>>({});
  const numbers = Object.fromEntries(fields.map(field => [field.key, Number(values[field.key] || 0)])) as Record<Key, number>;
  const incomplete = fields.some(field => "required" in field && field.required && !values[field.key]?.trim());
  const valid = fields.every(field => Number.isFinite(numbers[field.key]) && numbers[field.key] >= 0 && numbers[field.key] <= field.max) && numbers.price > 0 && numbers.hours > 0;
  const ready = !incomplete && valid;
  const costs = numbers.hours * numbers.rate + numbers.feeFixed + numbers.tools + numbers.acquisition + numbers.rework;
  const fees = numbers.price * numbers.feePercent / 100 + numbers.feeFixed;
  const contribution = numbers.price * (1 - numbers.feePercent / 100) - costs;
  const denominator = 1 - (numbers.feePercent + numbers.margin) / 100;
  const minimumPrice = denominator > 0 ? costs / denominator : null;
  const capacity = numbers.available > 0 && numbers.hours > 0 ? Math.floor(numbers.available / numbers.hours) : null;
  const breakEven = contribution > 0 && numbers.overhead > 0 ? Math.ceil(numbers.overhead / contribution) : null;
  const format = (amount: number) => new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  return <div className="min-h-screen bg-white text-slate-900"><Sidebar /><main className="mx-auto max-w-[1500px] space-y-6 p-5 pt-20 lg:ml-64 lg:p-8">
    <Link href="/platform-admin" className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" />Business service queue</Link>
    <header><p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">Internal planning</p><h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold"><Calculator className="h-7 w-7 text-cyan-700" />Service economics</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">Check a proposed assisted engagement before quoting. Enter costs in one currency. These are your assumptions, not revenue, provider fees, a customer quote or a profitability forecast. Nothing is saved or charged.</p></header>
    <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section aria-label="Engagement assumptions" className="rounded-2xl border p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Your assumptions</h2><label className="text-xs text-slate-500">Currency<select aria-label="Planning currency" value={currency} onChange={event => setCurrency(event.target.value)} className="ml-2 rounded-lg border bg-white p-2"><option>USD</option><option>INR</option><option>EUR</option><option>GBP</option></select></label></div>
        <p className="mt-3 text-xs leading-6 text-slate-500">Include scoping, review, implementation, handover and expected support in delivery hours. Optional cost fields count as zero until filled. Use your provider’s actual fee schedule; no exchange conversion or tax calculation is included.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map(field => <label key={field.key} className="text-sm font-medium">{field.label}{"required" in field && field.required && <span className="text-cyan-700"> *</span>}<input type="number" min={0} max={field.max} step="any" inputMode="decimal" value={values[field.key] || ""} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} className="mt-2 block w-full rounded-lg border bg-white px-3 py-2.5 text-sm" /></label>)}</div>
        <button type="button" onClick={() => setValues({})} className="mt-5 text-sm font-semibold text-cyan-700">Clear assumptions</button>
      </section>
      <section aria-label="Calculated engagement economics" aria-live="polite" className="rounded-2xl border bg-slate-50 p-5 sm:p-6">
        <h2 className="font-semibold">Calculated from your inputs</h2>
        {!ready ? <p className="mt-5 text-sm leading-7 text-slate-500">{incomplete ? "Enter a proposed price, total hours and operator cost to calculate." : "Enter valid non-negative values within the input limits. Price and delivery hours must be greater than zero."}</p> : <>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-3"><dt>Operator effort cost</dt><dd>{format(numbers.hours * numbers.rate)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Payment fees</dt><dd>{format(fees)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Other costs, acquisition & allowance</dt><dd>{format(numbers.tools + numbers.acquisition + numbers.rework)}</dd></div>
            <div className="flex justify-between gap-3 border-t pt-4 font-semibold"><dt>Contribution before tax & overhead</dt><dd className={contribution > 0 ? "text-emerald-700" : "text-rose-700"}>{format(contribution)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Contribution margin</dt><dd>{(contribution / numbers.price * 100).toFixed(1)}%</dd></div>
            <div className="flex justify-between gap-3"><dt>Price for your {numbers.margin}% target margin</dt><dd>{minimumPrice === null ? "Not achievable" : format(minimumPrice)}</dd></div>
            <div className="flex justify-between gap-3"><dt>Monthly capacity from available hours</dt><dd>{capacity === null ? "Hours not entered" : `${capacity} engagements`}</dd></div>
            <div className="flex justify-between gap-3"><dt>Engagements to cover monthly overhead</dt><dd>{numbers.overhead === 0 ? "Overhead not entered" : breakEven === null ? "No positive contribution" : breakEven}</dd></div>
          </dl>
          {(contribution <= 0 || minimumPrice === null || (capacity !== null && breakEven !== null && breakEven > capacity)) && <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{contribution <= 0 ? "This scope has no positive contribution at the proposed price. Recheck price, effort and costs before quoting." : minimumPrice === null ? "Payment fees and target margin leave no room to cover delivery costs. Recheck the percentages." : "The available delivery hours cannot cover the entered monthly overhead at this price and scope."}</p>}
          <p className="mt-5 text-xs leading-6 text-slate-500">Contribution = price − payment fees − operator effort − project costs − acquisition − allowance. Capacity uses the delivery hours you enter after reserving time for sales and administration. No paid customers or bookings are assumed.</p>
        </>}
      </section>
    </div>
  </main></div>;
}
