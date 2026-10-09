"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, ArrowLeft, Activity } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { apiClient } from "@/lib/api";

interface Check { category: string; item: string; status: string; details: string }
interface Readiness { evaluated_at: string; readiness_state: string; passed_checks: number; total_checks: number; checklist: Check[]; launch_summary: string }
interface Attempt { requested_models: string[]; selected_model: string | null; http_status: number | null; kind: string; elapsed_ms: number }
interface Routing { configured: boolean; provider: string; models: string[]; free_only: boolean; data_collection: string; scope: string; events: { id: string; business_name: string; created_at: string; action: string; request_id: string | null; code: string | null; model: string | null; attempts: Attempt[] }[] }
const words = (text: string) => text.toLowerCase().replaceAll("_", " ");
const remedies: Record<string, string> = {
  PRIVACY_FILTER: "Select a model with endpoints that support the current business privacy policy.",
  NO_ENDPOINT: "Check that the configured model is still available and has an eligible endpoint.",
  RATE_LIMIT: "Check the provider's free allowance and retry after its limit resets.",
  CREDIT_LIMIT: "Review account or key limits in the provider console.",
  AUTH_FAILED: "Check backend provider credentials privately in Render.",
  REQUEST_REJECTED: "Review configured model IDs and provider routing parameters.",
  INVALID_RESPONSE: "The response did not match the architecture schema. No proposal was saved.",
  TRUNCATED_RESPONSE: "The response was incomplete. Review the output budget and model choice.",
  CONTEXT_LIMIT: "Choose a model that supports the source and design context size.",
  TIMEOUT: "The model did not complete within the request deadline.",
};
export default function SystemOperations() {
  const [data, setData] = useState<{ readiness: Readiness; routing: Routing } | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setError(""); setData(null);
    Promise.all([apiClient<Readiness>("/platform-admin/launch-readiness", { timeout: 30000 }), apiClient<Routing>("/platform-admin/architecture-ai")])
      .then(([readiness, routing]) => { if (active) setData({ readiness, routing }); })
      .catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [refresh]);
  return <div className="bg-white min-h-screen text-slate-900"><Sidebar /><main className="lg:ml-64 p-6 pt-20 lg:pt-8 max-w-[1600px] space-y-7">
    <Link href="/platform-admin" className="inline-flex items-center gap-2 text-sm text-slate-500"><ArrowLeft className="w-4 h-4" />Business service queue</Link>
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-cyan-700 font-semibold uppercase tracking-widest">Internal operations</p><h1 className="text-3xl font-semibold mt-2">System operations</h1><p className="mt-2 text-sm text-slate-500">Actual launch gates and architecture request outcomes.</p></div><button onClick={() => setRefresh(value => value + 1)} className="border rounded-lg px-4 py-2.5 text-sm inline-flex gap-2 items-center"><RefreshCw className="w-4 h-4" />Refresh observations</button></header>
    {error ? <p role="alert" className="p-4 border border-rose-200 bg-rose-50 rounded-xl text-rose-800">{error}</p> : !data ? <p role="status" className="text-sm text-slate-500">Loading recorded observations…</p> : <>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="font-semibold">Launch acceptance: {words(data.readiness.readiness_state)}</h2><p className="text-sm mt-2 text-slate-700">{data.readiness.launch_summary}</p><p className="text-xs mt-3 text-slate-500">{data.readiness.passed_checks} observed checks passed out of {data.readiness.total_checks} gates · evaluated {new Date(data.readiness.evaluated_at).toLocaleString()}</p></section>
      <section className="border rounded-2xl overflow-hidden"><h2 className="font-semibold p-5 border-b">Configuration and delivery gates</h2><div className="divide-y">{data.readiness.checklist.map(check => <div key={check.item} className="p-5 flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><p className="text-xs uppercase tracking-wide text-slate-500">{check.category}</p><h3 className="text-sm font-semibold mt-1">{check.item}</h3><p className="text-sm text-slate-500 mt-2">{check.details}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${check.status === "PASS" ? "bg-emerald-50 text-emerald-700" : check.status === "CONFIGURED" ? "bg-cyan-50 text-cyan-700" : "bg-amber-50 text-amber-800"}`}>{words(check.status)}</span></div>)}</div></section>
      <section className="border rounded-2xl p-5 space-y-4"><h2 className="font-semibold flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-700" />Architecture model routing</h2><p className="text-sm text-slate-500">{data.routing.scope}</p><div className="flex flex-wrap gap-3 text-sm"><span>Provider: {data.routing.provider}</span><span>Configuration: {data.routing.configured ? "present" : "missing"}</span><span>Free only: {data.routing.free_only ? "yes" : "no"}</span><span>Provider data collection: {data.routing.data_collection}</span></div><ul className="flex flex-wrap gap-2">{data.routing.models.map(model => <li key={model} className="text-xs border rounded-lg p-2 break-all">{model}</li>)}</ul></section>
      <section className="border rounded-2xl overflow-hidden"><h2 className="font-semibold p-5 border-b">Recorded AI requests</h2>{!data.routing.events.length ? <p className="p-5 text-sm text-slate-500">No routing outcomes have been recorded yet. Requests from the business architecture workspace will appear here.</p> : <div className="divide-y">{data.routing.events.map(event => <article key={event.id} className="p-5 space-y-3"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold text-sm">{event.business_name}</h3><p className="text-xs text-slate-500 mt-1">{new Date(event.created_at).toLocaleString()} · {event.request_id ? `Reference ${event.request_id.slice(0, 8)}` : "Recorded before detailed routing diagnostics"}</p></div><span className={`text-xs rounded-full px-3 py-1 h-fit ${event.action === "ARCHITECTURE_AI_PROPOSAL_CREATED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{event.action === "ARCHITECTURE_AI_PROPOSAL_CREATED" ? "Proposal returned" : event.action === "ARCHITECTURE_AI_REQUEST_DISCARDED" ? "Design changed; response discarded" : "Request failed"}</span></div>{event.code && <p className="text-xs text-slate-500">{event.code}</p>}{event.attempts.map((attempt, index) => <div key={index} className="bg-slate-50 border rounded-xl p-3 space-y-2"><p className="text-sm font-medium">Attempt {index + 1}: {words(attempt.kind)} · {attempt.http_status ? `provider HTTP ${attempt.http_status}` : "no HTTP response"} · {(attempt.elapsed_ms / 1000).toFixed(1)}s</p><p className="text-xs text-slate-500 break-all">Requested: {attempt.requested_models.join(", ") || "Overall request deadline"}</p><p className="text-xs text-slate-500">Selected model: {attempt.selected_model || "Not reported"}</p>{remedies[attempt.kind] && <p className="text-sm text-slate-700">{remedies[attempt.kind]}</p>}</div>)}</article>)}</div>}</section>
    </>}
  </main></div>;
}
