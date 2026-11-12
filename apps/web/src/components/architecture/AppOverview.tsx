"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Database, ExternalLink, Globe, ImageIcon, Loader2, Server } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api";

type Role = "frontend" | "backend" | "database" | "media";
interface Part {
  id: string; role: Role; provider: "VERCEL" | "RENDER" | "NEON" | "CLOUDINARY"; explanation: string; framework_label?: string;
  repo: string | null; root_dir: string | null;
  live: { name: string; status: string; status_detail?: string; urls: string[]; uptime_24h?: { percent: number | null; checks: number } | null } | null;
}
interface Plan { application: { id: string; name: string }; step: "analyze" | "accounts" | "create" | "live"; parts: Part[]; source_changed: boolean;
  accounts: { provider: string; label: string; connected: boolean }[] }
interface Alert { severity: "critical" | "warning" | "info"; resource: string; message: string }

const ROLE: Record<Role, { title: string; icon: typeof Globe }> = {
  frontend: { title: "Website", icon: Globe }, backend: { title: "Backend server", icon: Server },
  database: { title: "Database", icon: Database }, media: { title: "Images & files", icon: ImageIcon },
};
const PROVIDER = { VERCEL: "Vercel", RENDER: "Render", NEON: "Neon", CLOUDINARY: "Cloudinary" } as const;

function state(part: Part): { label: string; tone: string } {
  if (!part.live) return { label: "Not online yet", tone: "bg-slate-100 text-slate-600" };
  if (part.live.status === "HEALTHY") return { label: "Working", tone: "bg-emerald-100 text-emerald-800" };
  if (part.live.status === "DEPLOYING") return { label: "Updating…", tone: "bg-sky-100 text-sky-800" };
  if (part.live.status === "SUSPENDED") return { label: "Paused", tone: "bg-slate-200 text-slate-700" };
  return { label: "Needs attention", tone: "bg-amber-100 text-amber-900" };
}

/** Plain-language summary of one app: what it is made of, whether it works, and what to do next. */
export function AppOverview({ active, onOpenDiagram, onOpenHosting }: { active: boolean; onOpenDiagram: () => void; onOpenHosting: () => void }) {
  const [apps, setApps] = useState<{ id: string; name: string }[] | null>(null);
  const [appId, setAppId] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || apps) return;
    apiClient<{ id: string; name: string }[]>("/applications/").then(list => {
      setApps(list);
      const wanted = new URLSearchParams(window.location.search).get("application");
      setAppId(list.find(a => a.id === wanted)?.id ?? list[0]?.id ?? "");
    }).catch(e => setError(e instanceof ApiError || e instanceof Error ? e.message : "Could not load your apps."));
  }, [active, apps]);

  const load = useCallback(async () => {
    if (!appId) return;
    try {
      const [next, hosting] = await Promise.all([apiClient<Plan>(`/launch/${appId}`, { timeout: 60000 }),
        apiClient<{ alerts: Alert[] }>("/hosting/overview").catch(() => ({ alerts: [] as Alert[] }))]);
      setPlan(next); setError(null);
      const names = new Set(next.parts.map(p => p.live?.name).filter(Boolean));
      setAlerts(hosting.alerts.filter(a => a.severity !== "info" && names.has(a.resource)));
    } catch (e) { setError(e instanceof ApiError || e instanceof Error ? e.message : "Could not load this app."); }
  }, [appId]);
  useEffect(() => { if (active) void load(); }, [active, load]);

  if (apps && !apps.length) {
    return <div className="mx-auto max-w-3xl p-8"><h2 className="text-xl font-semibold">Let&apos;s add your first app</h2>
      <p className="mt-2 text-slate-600">Connect the GitHub repository where your app&apos;s code lives. LaunchComply reads it and shows you, in plain words, what your app needs to go online.</p>
      <Link href="/onboarding" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Connect my code <ArrowRight className="h-4 w-4" /></Link></div>;
  }

  const runnable = plan?.parts.filter(p => p.role !== "media") ?? [];
  const online = runnable.filter(p => p.live).length;
  const broken = (plan?.parts ?? []).filter(p => p.live && !["HEALTHY", "DEPLOYING"].includes(p.live.status));
  const website = plan?.parts.find(p => p.role === "frontend" && p.live?.urls[0]);
  const headline = !plan ? "" : !plan.parts.length ? "LaunchComply hasn't read this app's code yet."
    : broken.length || alerts.some(a => a.severity === "critical") ? "Your app is online, but something needs your attention."
    : online === runnable.length && runnable.length ? "Your app is online and working."
    : online ? `Part of your app is online (${online} of ${runnable.length}).` : "Your app isn't online yet.";

  const next: { text: string; href?: string; action?: () => void }[] = [];
  if (plan) {
    if (!plan.parts.length) next.push({ text: "Let LaunchComply read your code", href: `/dashboard/launch?application=${plan.application.id}` });
    else if (plan.source_changed) next.push({ text: "Your code changed. Let LaunchComply read it again so everything matches", action: onOpenDiagram });
    for (const a of alerts.filter(a => a.severity === "critical").slice(0, 3)) next.push({ text: `Fix: ${a.resource}: ${a.message}`, action: onOpenHosting });
    if (plan.parts.length && plan.accounts.some(a => !a.connected)) next.push({ text: `Connect your free ${plan.accounts.filter(a => !a.connected).map(a => a.label).join(", ")} account${plan.accounts.filter(a => !a.connected).length > 1 ? "s" : ""}`, href: `/dashboard/launch?application=${plan.application.id}` });
    else if (online < runnable.length) next.push({ text: "Put the rest of your app online", href: `/dashboard/launch?application=${plan.application.id}` });
    if (website) { next.push({ text: "Share your website link with customers", href: website.live!.urls[0] }); next.push({ text: "Use your own domain name (e.g. yourshop.com)", action: onOpenHosting }); }
  }

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">Your app at a glance</p>
            {apps && apps.length > 1 ? (
              <select aria-label="Choose an app" value={appId} onChange={e => setAppId(e.target.value)} className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-semibold">
                {apps.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            ) : <h2 className="mt-1 text-2xl font-bold text-slate-950">{plan?.application.name ?? "…"}</h2>}
          </div>
          {website && <a href={website.live!.urls[0]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Open my website <ExternalLink className="h-4 w-4" /></a>}
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
        {!plan && !error && <p className="mt-8 inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading your app…</p>}

        {plan && <>
          <div className={`mt-5 flex items-center gap-3 rounded-2xl border p-4 ${broken.length || alerts.some(a => a.severity === "critical") ? "border-amber-200 bg-amber-50" : online === runnable.length && runnable.length ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
            {broken.length || alerts.some(a => a.severity === "critical") ? <AlertTriangle className="h-6 w-6 text-amber-600" /> : online === runnable.length && runnable.length ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Circle className="h-6 w-6 text-slate-400" />}
            <p className="text-base font-semibold text-slate-900">{headline}</p>
          </div>

          {plan.parts.length > 0 && <section className="mt-6" aria-label="What your app is made of">
            <h3 className="text-sm font-semibold text-slate-700">What your app is made of</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {plan.parts.map(part => {
                const Icon = ROLE[part.role].icon, s = state(part), uptime = part.live?.uptime_24h;
                return <article key={part.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex items-center gap-2 font-semibold text-slate-900"><Icon className="h-5 w-5 text-cyan-700" />{ROLE[part.role].title}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">{part.explanation}</p>
                  <p className="mt-2 text-xs text-slate-500">{part.live ? `Runs on ${PROVIDER[part.provider]} as “${part.live.name}”` : `Will run on ${PROVIDER[part.provider]}`}{part.framework_label ? ` · built with ${part.framework_label}` : ""}</p>
                  {part.live?.urls[0] && <a href={part.live.urls[0]} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 underline">{part.live.urls[0].replace("https://", "")}<ExternalLink className="h-3 w-3" /></a>}
                  {uptime && uptime.checks > 0 && uptime.percent != null && <p className="mt-1 text-xs text-slate-500">Answered {uptime.percent.toFixed(uptime.percent === 100 ? 0 : 1)}% of {uptime.checks} checks in the last 24 hours</p>}
                </article>;
              })}
            </div>
          </section>}

          {next.length > 0 && <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4" aria-label="What to do next">
            <h3 className="text-sm font-semibold text-slate-700">What to do next</h3>
            <ol className="mt-2 space-y-1.5">{next.map((item, i) => <li key={i}>
              {item.href ? <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="group inline-flex items-center gap-2 text-sm text-slate-800 hover:text-cyan-700"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-50 text-xs font-bold text-cyan-800">{i + 1}</span>{item.text}<ArrowRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" /></a>
                : <button onClick={item.action} className="group inline-flex items-center gap-2 text-left text-sm text-slate-800 hover:text-cyan-700"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-50 text-xs font-bold text-cyan-800">{i + 1}</span>{item.text}<ArrowRight className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100" /></button>}
            </li>)}</ol>
          </section>}

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <button onClick={onOpenDiagram} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700">See the technical diagram</button>
            <button onClick={onOpenHosting} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700">Manage hosting</button>
          </div>
        </>}
      </div>
    </div>
  );
}
