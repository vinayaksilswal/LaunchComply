"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { primaryLink, signupFor } from "./PublicShell";

const input = "mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-700 disabled:bg-slate-50";

export function ConsultationForm({ agency = false }: { agency?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  return <section id="consultation" aria-labelledby="consultation-title" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
    <h2 id="consultation-title" className="text-2xl font-semibold tracking-tight">{agency ? "Discuss your next client launch" : "Plan your first business launch"}</h2>
    <p className="mt-3 text-sm leading-7 text-slate-600">Tell us what you built and where you need help. No account or cloud credentials needed for this inquiry.</p>
    {reference ? <div role="status" className="mt-6 space-y-4 rounded-xl border border-cyan-200 bg-cyan-50 p-5">
      <CheckCircle2 className="h-7 w-7 text-cyan-700" />
      <h3 className="font-semibold">Your inquiry is saved</h3>
      <p className="text-sm leading-6 text-slate-600">The operations inbox has your request for review. A delivery date, price, or engagement has not been agreed yet. Keep this reference if you contact support.</p>
      <p className="break-all text-xs text-slate-600">Reference: {reference}</p>
      <Link href={signupFor("/onboarding")} className={primaryLink}>Start your business workspace <ArrowRight className="h-4 w-4" /></Link>
      <p className="text-xs text-slate-500">You can connect repositories and prepare a design while your inquiry is reviewed.</p>
    </div> : <form aria-label="Business consultation inquiry" className="mt-6 space-y-5" onSubmit={async event => {
      event.preventDefault();
      if (busy) return;
      const form = event.currentTarget;
      const values = new FormData(form);
      const body = { name: String(values.get("name") || "").trim(), email: String(values.get("email") || "").trim(), company: String(values.get("company") || "").trim(), interest: String(values.get("interest")), message: String(values.get("message") || "").trim(), contact_permission: values.get("contact_permission") === "on", website: String(values.get("website") || ""), source_page: agency ? "AGENCIES" : "CONTACT", business_type: String(values.get("business_type") || "UNSPECIFIED"), timeline: String(values.get("timeline") || "UNSPECIFIED"), aws_status: String(values.get("aws_status") || "UNSPECIFIED") };
      setBusy(true); setError("");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(body))))).map(byte => byte.toString(16).padStart(2, "0")).join("");
        let saved: { digest?: string; id?: string } = {};
        try { saved = JSON.parse(sessionStorage.getItem("lc_consultation_request") || "{}"); } catch { /* Storage is optional; the receipt is returned by the server. */ }
        const requestId = saved.digest === digest && saved.id ? saved.id : crypto.randomUUID();
        try { sessionStorage.setItem("lc_consultation_request", JSON.stringify({ digest, id: requestId })); } catch { /* Keep the form available when storage is disabled. */ }
        const response = await fetch(`${API_BASE_URL}/commercial/consultations`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ ...body, request_id: requestId }), signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 429 ? "The inbox is receiving too many requests. Please try again later." : response.status === 422 ? "Check your email and enter at least 10 characters about what you need." : "Your inquiry could not be confirmed. Your details are still in the form; please try again.");
        const result = await response.json();
        if (result.status !== "SAVED" || result.reference !== requestId) throw new Error("We could not confirm the saved inquiry. Please try again with the same details.");
        setReference(result.reference);
      } catch (failure) { setError(failure instanceof Error && failure.name !== "AbortError" ? failure.message : "The service took too long to respond. Please retry with the same details; the request reference prevents a duplicate."); }
      finally { clearTimeout(timer); setBusy(false); }
    }}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-medium">Your name<input name="name" required minLength={2} maxLength={120} autoComplete="name" disabled={busy} className={input} /></label>
        <label className="text-sm font-medium">Business email<input name="email" type="email" required maxLength={255} autoComplete="email" disabled={busy} className={input} /></label>
        <label className="text-sm font-medium">Business name<input name="company" required minLength={2} maxLength={160} autoComplete="organization" disabled={busy} className={input} /></label>
        <label className="text-sm font-medium">What do you need?<select name="interest" defaultValue={agency ? "DEPLOYMENT" : "ARCHITECTURE"} disabled={busy} className={input}><option value="ARCHITECTURE">Review cloud architecture</option><option value="DEPLOYMENT">Launch my SaaS</option><option value="SECURITY">Security assessment</option><option value="COMPLIANCE">Compliance preparation</option><option value="CLOUD_OPERATIONS">Manage existing cloud infrastructure</option></select></label>
      </div>
      <details className="rounded-xl border border-slate-200 p-4" open={agency}>
        <summary className="cursor-pointer text-sm font-semibold">Project context <span className="font-normal text-slate-400">Optional</span></summary>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">Your business<select name="business_type" defaultValue={agency ? "AGENCY" : "UNSPECIFIED"} disabled={busy} className={input}><option value="UNSPECIFIED">Prefer to discuss</option><option value="AGENCY">Development agency</option><option value="FOUNDER">Founder / solo builder</option><option value="TEAM">Product or cloud team</option></select></label>
          <label className="text-sm font-medium">Target timeline<select name="timeline" disabled={busy} className={input}><option value="UNSPECIFIED">Not decided</option><option value="WITHIN_30_DAYS">Within 30 days</option><option value="WITHIN_60_DAYS">Within 60 days</option><option value="LATER">Later</option><option value="EXPLORING">Exploring</option></select></label>
          <label className="text-sm font-medium">Customer AWS account<select name="aws_status" disabled={busy} className={input}><option value="UNSPECIFIED">Prefer to discuss</option><option value="EXISTING_ACCOUNT">Account already exists</option><option value="NO_ACCOUNT">Account not created</option><option value="UNDECIDED">Cloud choice undecided</option></select></label>
        </div>
      </details>
      <label className="block text-sm font-medium">Tell us about your business<textarea name="message" required minLength={10} maxLength={1000} rows={4} disabled={busy} placeholder="What does your product do? What is blocking your launch?" className={`${input} resize-y`} /><span className="mt-2 block text-xs font-normal leading-5 text-slate-500">Include goals and timelines. Keep passwords, keys, customer records, and confidential code out of this form.</span></label>
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="flex items-start gap-3 text-xs leading-6 text-slate-600"><input type="checkbox" name="contact_permission" required disabled={busy} className="mt-1.5 accent-cyan-700" /><span>LaunchComply may store these details and contact me about this inquiry. This does not subscribe me to marketing or authorize an assessment, payment, or deployment.</span></label>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <button type="submit" disabled={busy} className={`${primaryLink} disabled:opacity-50`}>{busy ? <><Loader2 className="h-4 w-4 animate-spin" />Saving inquiry…</> : <>Request a scope review <ArrowRight className="h-4 w-4" /></>}</button>
      <p className="text-xs leading-5 text-slate-500">Your request is reviewed before any service commitment. For ongoing work and reports, use your business workspace.</p>
    </form>}
  </section>;
}
