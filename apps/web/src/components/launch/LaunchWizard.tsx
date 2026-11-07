"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Circle, Database, ExternalLink, Globe, ImageIcon, Loader2, Plug, Rocket, Server, Sparkles } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api";
import { useAccount } from "@/components/auth/AccountProvider";
import { ProvidersDialog, type Catalog, type Connection, type Provider } from "@/components/architecture/HostingWorkspace";

type Role = "frontend" | "backend" | "database" | "media";
type Step = "analyze" | "accounts" | "create" | "live";
interface Live { resource_id: string; name: string; status: string; status_detail?: string; urls: string[]; uptime_24h?: { percent: number | null; checks: number } | null }
interface Part {
  id: string; role: Role; provider: Provider; explanation: string; framework_label?: string; repo: string | null; root_dir: string | null;
  branch: string | null; env_keys: string[]; runtime?: string; build_command?: string | null; start_command?: string | null;
  api_url_key?: string | null; database_url_key?: string | null; suggested_name: string; live: Live | null;
  fingerprint: string; connection_id: string | null; blockers: string[]; warnings: string[];
  step: { status: "CREATING" | "CREATED" | "FAILED" | "AMBIGUOUS"; name: string; error: string | null } | null;
}
interface Account { provider: Provider; label: string; connected: boolean; account: string | null; signup_url: string; github_access_url?: string | null;
  connections: { id: string; label: string; account: string }[] }
interface Plan { application: { id: string; name: string }; step: Step; source_changed: boolean; accounts: Account[]; parts: Part[]; repositories: string[]; scope: string;
  regions: { RENDER: string[]; NEON: string[] }; free_plan_note: string }

const ROLE: Record<Role, { title: string; icon: typeof Globe }> = {
  frontend: { title: "Website", icon: Globe }, backend: { title: "Backend server", icon: Server },
  database: { title: "Database", icon: Database }, media: { title: "Images & files", icon: ImageIcon },
};
const PROVIDER: Record<Provider, string> = { VERCEL: "Vercel", RENDER: "Render", NEON: "Neon", CLOUDINARY: "Cloudinary" };
const REGION_LABEL: Record<string, string> = {
  singapore: "Singapore (closest to India)", oregon: "Oregon, USA", ohio: "Ohio, USA", virginia: "Virginia, USA", frankfurt: "Frankfurt, Europe",
  "aws-ap-southeast-1": "Singapore (closest to India)", "aws-us-east-1": "Virginia, USA", "aws-us-east-2": "Ohio, USA", "aws-us-west-2": "Oregon, USA",
  "aws-eu-central-1": "Frankfurt, Europe", "aws-eu-west-2": "London, Europe", "aws-ap-southeast-2": "Sydney, Australia", "aws-sa-east-1": "São Paulo, Brazil",
};
const STEPS: { id: Step; label: string }[] = [
  { id: "analyze", label: "Understand your code" }, { id: "accounts", label: "Connect free accounts" },
  { id: "create", label: "Put it online" }, { id: "live", label: "Connect & go live" },
];

function message(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : "Something went wrong."; }

export function LaunchWizard() {
  const { organization } = useAccount();
  const canManage = ["OWNER", "ADMIN"].includes(organization?.role?.toUpperCase() ?? "");
  const [apps, setApps] = useState<{ id: string; name: string }[] | null>(null);
  const [appId, setAppId] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Provider | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);

  useEffect(() => {
    apiClient<{ id: string; name: string }[]>("/applications/").then(list => {
      setApps(list);
      const wanted = new URLSearchParams(window.location.search).get("application");
      setAppId(list.find(a => a.id === wanted)?.id ?? list[0]?.id ?? "");
    }).catch(e => setError(message(e)));
  }, []);

  const load = useCallback(async () => {
    if (!appId) return;
    try { setPlan(await apiClient<Plan>(`/launch/${appId}`, { timeout: 60000 })); setError(null); }
    catch (e) { setError(message(e)); }
  }, [appId]);
  useEffect(() => { setPlan(null); void load(); }, [load]);

  // While anything is still building, check again every 15 seconds.
  const building = !!plan?.parts.some(p => p.live && p.live.status === "DEPLOYING");
  useEffect(() => {
    if (!building) return;
    const timer = window.setInterval(async () => { await apiClient("/hosting/refresh", { method: "POST", timeout: 180000 }).catch(() => undefined); await load(); }, 15000);
    return () => window.clearInterval(timer);
  }, [building, load]);

  const openAccounts = async (provider: Provider) => {
    try {
      const [cat, overview] = await Promise.all([catalog ? Promise.resolve(catalog) : apiClient<Catalog>("/hosting/providers"), apiClient<{ connections: Connection[] }>("/hosting/overview")]);
      setCatalog(cat); setConnections(overview.connections); setDialog(provider);
    } catch (e) { setError(message(e)); }
  };

  const analyze = async () => {
    setBusy("analyze"); setError(null);
    try { await apiClient(`/architecture/workspace/${appId}/analyze`, { method: "POST", timeout: 180000 }); await load(); }
    catch (e) { setError(message(e)); }
    finally { setBusy(null); }
  };

  if (apps && !apps.length) {
    return <Shell><Card><h2 className="text-lg font-semibold">First, connect your app&apos;s code</h2>
      <p className="mt-1 text-sm text-slate-600">Connect the GitHub repository where your AI tool saved your app. LaunchComply reads it to work out what your app needs.</p>
      <Link href="/onboarding" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">Connect GitHub <ArrowUpRight className="h-4 w-4" /></Link></Card></Shell>;
  }

  const current = plan?.step ?? "analyze";
  const index = STEPS.findIndex(s => s.id === current);
  const runnable = plan?.parts.filter(p => p.role !== "media") ?? [];
  const website = plan?.parts.find(p => p.role === "frontend" && p.live);

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-sm text-slate-600">App to launch
          <select aria-label="App to launch" value={appId} onChange={e => setAppId(e.target.value)} className="mt-1 block min-w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {(apps ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        {website?.live?.urls[0] && <a href={website.live.urls[0]} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-700 underline">Open your live site <ExternalLink className="h-4 w-4" /></a>}
      </div>

      <ol aria-label="Launch steps" className="mt-6 grid gap-2 sm:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.id} aria-current={i === index ? "step" : undefined} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${i === index ? "border-cyan-500 bg-cyan-50 font-semibold text-cyan-900" : i < index ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-500"}`}>
            {i < index ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Circle className="h-4 w-4 shrink-0" />}<span>{i + 1}. {step.label}</span>
          </li>
        ))}
      </ol>

      {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>}
      {!plan && !error && <p className="mt-8 inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Reading your app…</p>}

      {plan && <div className="mt-6 space-y-5">
        <Card>
          <h2 className="text-lg font-semibold">1. What your app is made of</h2>
          {plan.source_changed && <div role="alert" className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Your code changed since LaunchComply last read it, so the plan may be out of date.
            {canManage && <button disabled={busy === "analyze"} onClick={() => void analyze()} className="font-semibold underline">{busy === "analyze" ? "Reading…" : "Read my code again"}</button>}
          </div>}
          {!plan.parts.length ? <>
            <p className="mt-1 text-sm text-slate-600">LaunchComply needs to look at your code first. It reads which frameworks you use and which settings your code expects. Your code is not run or changed.</p>
            {canManage ? <button disabled={busy === "analyze"} onClick={() => void analyze()} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy === "analyze" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{busy === "analyze" ? "Looking at your code…" : "Look at my code"}</button>
              : <p className="mt-3 text-sm text-slate-500">Ask your business owner or an administrator to start this.</p>}
            {plan.step === "analyze" && plan.repositories.length === 0 && <p className="mt-3 text-sm text-slate-500">No repository is linked yet. <Link href="/onboarding" className="font-semibold text-cyan-700 underline">Connect GitHub</Link></p>}
          </> : <>
            <p className="mt-1 text-sm text-slate-600">We found {plan.parts.length} part{plan.parts.length === 1 ? "" : "s"}. Each goes to a service built for it, with a free plan to start on.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{plan.parts.map(part => { const Icon = ROLE[part.role].icon; return (
              <div key={part.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="flex items-center gap-2 font-semibold"><Icon className="h-4 w-4 text-cyan-700" />{ROLE[part.role].title}</p>
                <p className="mt-1 text-slate-600">{part.explanation}</p>
                <p className="mt-2 text-xs text-slate-500">{part.framework_label}{part.repo ? ` · ${part.repo}${part.root_dir ? "/" + part.root_dir : ""}` : ""}</p>
                <p className="mt-1 text-xs font-semibold text-slate-700">Goes to {PROVIDER[part.provider]}</p>
              </div>); })}</div>
            <p className="mt-3 text-xs text-slate-500">{plan.scope}</p>
          </>}
        </Card>

        {plan.parts.length > 0 && <Card>
          <h2 className="text-lg font-semibold">2. Connect your free accounts</h2>
          <p className="mt-1 text-sm text-slate-600">Your app runs in your own accounts, so you always own it. Create each free account, then connect it here with a key from that account.</p>
          <ul className="mt-4 space-y-2">{plan.accounts.map(account => (
            <li key={account.provider} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
              {account.connected ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Circle className="h-5 w-5 text-slate-300" />}
              <span className="font-semibold">{account.label}</span>
              <span className="text-slate-500">{account.connected ? `Connected · ${account.account ?? ""}` : "Not connected"}</span>
              <span className="ml-auto flex flex-wrap gap-3">
                {!account.connected && <a href={account.signup_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-cyan-700 underline">Create free account <ExternalLink className="h-3.5 w-3.5" /></a>}
                {account.github_access_url && <a href={account.github_access_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-600 underline" title="The provider must be allowed to read your GitHub repository to build it.">Let {account.label} read GitHub <ExternalLink className="h-3.5 w-3.5" /></a>}
                {canManage && <button onClick={() => void openAccounts(account.provider)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 font-semibold"><Plug className="h-3.5 w-3.5" />{account.connected ? "Manage" : "Connect"}</button>}
              </span>
            </li>))}</ul>
          <p className="mt-3 text-xs text-slate-500">Not sure where a key is? In Business architecture → Current hosting → Providers, each field says what it needs. Never paste keys into chats or emails.</p>
        </Card>}

        {plan.parts.length > 0 && index >= 2 && <Card>
          <h2 className="text-lg font-semibold">3. Put each part online</h2>
          <p className="mt-1 text-sm text-slate-600">Do them in this order: database, backend, then website. {plan.free_plan_note}</p>
          <div className="mt-4 space-y-3">{runnable.map(part => <PartStep key={part.id} appId={plan.application.id} part={part} plan={plan} canManage={canManage}
            accountReady={!!plan.accounts.find(a => a.provider === part.provider)?.connected} onDone={load} onError={setError} />)}</div>
        </Card>}

        {plan.parts.length > 0 && index >= 3 && <ConnectStep plan={plan} canManage={canManage} onDone={load} onError={setError} />}
      </div>}

      {dialog && catalog && <ProvidersDialog catalog={catalog} connections={connections} canManage={canManage} initialProvider={dialog}
        onClose={() => { setDialog(null); void load(); }} onChanged={() => void openAccounts(dialog)} onConnected={() => void load()} />}
    </Shell>
  );
}

function PartStep({ appId, part, plan, canManage, accountReady, onDone, onError }: { appId: string; part: Part; plan: Plan; canManage: boolean; accountReady: boolean; onDone: () => Promise<void>; onError: (m: string | null) => void }) {
  const Icon = ROLE[part.role].icon;
  const regions = part.role === "backend" ? plan.regions.RENDER : part.role === "database" ? plan.regions.NEON : [];
  const [name, setName] = useState(part.suggested_name);
  const [region, setRegion] = useState(regions[0] ?? "");
  const [build, setBuild] = useState(part.build_command ?? "");
  const [start, setStart] = useState(part.start_command ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const choices = plan.accounts.find(a => a.provider === part.provider)?.connections ?? [];
  const [connectionId, setConnectionId] = useState(part.connection_id ?? "");
  const portMissing = part.role === "backend" && part.runtime !== "docker" && !!start && !/\$\{?PORT\}?/.test(start);
  const blockers = [...part.blockers.filter(b => !b.includes("$PORT")), ...(portMissing ? ["Render tells your app which port to use in $PORT. Your start command must listen on it, for example “--port $PORT”."] : [])];

  const check = async () => {
    setRunning(true); onError(null); setNote(null);
    try {
      const result = await apiClient<{ message: string }>(`/launch/${appId}/parts/${part.id}/check`, { method: "POST", timeout: 60000 });
      setNote(result.message); await onDone();
    } catch (e) { onError(message(e)); }
    finally { setRunning(false); }
  };

  const create = async () => {
    setRunning(true); onError(null); setNote(null);
    try {
      const body: Record<string, unknown> = { confirm: true, name, fingerprint: part.fingerprint };
      if (connectionId) body.connection_id = connectionId;
      if (regions.length) body.region = region;
      if (part.role === "backend" && part.runtime !== "docker") { body.build_command = build; body.start_command = start; }
      const result = await apiClient<{ message: string; status?: string }>(`/launch/${appId}/parts/${part.id}`, { method: "POST", body: JSON.stringify(body), timeout: 180000 });
      setNote(result.message); setConfirmed(false); await onDone();
    } catch (e) { onError(message(e)); }
    finally { setRunning(false); }
  };

  if (part.live) {
    const ok = part.live.status === "HEALTHY";
    return <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm">
      <Icon className="h-5 w-5 text-emerald-700" /><span className="font-semibold">{ROLE[part.role].title}</span>
      <span className="text-slate-600">{PROVIDER[part.provider]} · {part.live.name}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? "bg-emerald-100 text-emerald-800" : part.live.status === "DEPLOYING" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>
        {ok ? "Online" : part.live.status === "DEPLOYING" ? "Building… (a few minutes)" : part.live.status_detail || part.live.status.toLowerCase()}</span>
      {part.live.urls[0] && <a href={part.live.urls[0]} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-cyan-700 underline">{part.live.urls[0].replace("https://", "")}<ExternalLink className="h-3.5 w-3.5" /></a>}
    </div>;
  }
  return <div className="rounded-xl border border-slate-200 p-4 text-sm">
    <p className="flex items-center gap-2 font-semibold"><Icon className="h-5 w-5 text-cyan-700" />{ROLE[part.role].title} → {PROVIDER[part.provider]}
      <span className="font-normal text-slate-500">{part.repo ? `${part.repo}${part.root_dir ? "/" + part.root_dir : ""}` : ""}</span></p>
    {part.step?.status === "AMBIGUOUS" && <div role="status" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
      We asked {PROVIDER[part.provider]} to create “{part.step.name}” but did not get a clear answer, so it may already exist. Nothing will be created again until we check.
      {canManage && <button disabled={running} onClick={() => void check()} className="ml-2 font-semibold underline">{running ? "Checking…" : "Check again"}</button>}
    </div>}
    {part.step?.status === "CREATING" && <p role="status" className="mt-3 text-sky-800">Creating “{part.step.name}”… reload in a moment.</p>}
    {part.step?.status === "FAILED" && part.step.error && <p className="mt-3 text-rose-700">Last try did not work: {part.step.error} You can fix it and try again.</p>}
    {!accountReady ? <p className="mt-2 text-slate-500">Connect your {PROVIDER[part.provider]} account in step 2 first.</p> : !canManage ? <p className="mt-2 text-slate-500">An owner or administrator can put this online.</p> : part.step?.status === "AMBIGUOUS" || part.step?.status === "CREATING" ? null : <>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {choices.length > 1 && <label className="text-xs text-slate-600 sm:col-span-2">Which {PROVIDER[part.provider]} account<select value={connectionId} onChange={e => setConnectionId(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
          <option value="">Choose an account…</option>{choices.map(c => <option key={c.id} value={c.id}>{c.label} · {c.account}</option>)}</select></label>}
        <label className="text-xs text-slate-600">Name<input value={name} onChange={e => setName(e.target.value.toLowerCase())} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-sm" /></label>
        {regions.length > 0 && <label className="text-xs text-slate-600">Where it runs<select value={region} onChange={e => setRegion(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
          {regions.map(r => <option key={r} value={r}>{REGION_LABEL[r] ?? r}</option>)}</select></label>}
        {part.role === "backend" && part.runtime !== "docker" && <>
          <label className="text-xs text-slate-600">Install command<input value={build} onChange={e => setBuild(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-sm" /></label>
          <label className="text-xs text-slate-600">Start command<input value={start} onChange={e => setStart(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-sm" /></label>
          <p className="text-xs text-slate-500 sm:col-span-2">We guessed these from your code. If your AI tool gave you different commands, use those.</p>
        </>}
        {part.role === "backend" && part.runtime === "docker" && <p className="text-xs text-slate-500 sm:col-span-2">Your backend has a Dockerfile, so Render builds it from that.</p>}
      </div>
      {blockers.length > 0 && <ul className="mt-3 space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800">{blockers.map(b => <li key={b}>Fix first: {b}</li>)}</ul>}
      {part.warnings.length > 0 && <ul className="mt-3 space-y-1 text-amber-800">{part.warnings.map(w => <li key={w}>Check: {w}</li>)}</ul>}
      <label className="mt-3 flex items-start gap-2 text-slate-700"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5" />
        Create “{name}” on my {PROVIDER[part.provider]} account, on its free plan where one is available.</label>
      <button disabled={!confirmed || running || name.length < 2 || blockers.length > 0 || (choices.length > 1 && !connectionId)} onClick={() => void create()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white disabled:opacity-40">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}{running ? "Creating…" : "Put it online"}</button>
      {note && <p role="status" className="mt-2 text-emerald-700">{note}</p>}
    </>}
  </div>;
}

function ConnectStep({ plan, canManage, onDone, onError }: { plan: Plan; canManage: boolean; onDone: () => Promise<void>; onError: (m: string | null) => void }) {
  const backend = plan.parts.find(p => p.role === "backend");
  const frontend = plan.parts.find(p => p.role === "frontend");
  const [apiUrl, setApiUrl] = useState(backend?.live?.urls[0] ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ done: string[]; skipped: string[] } | null>(null);
  const items = [
    backend && plan.parts.some(p => p.role === "database") && `Give your backend the database address (${backend.database_url_key ?? "DATABASE_URL"})`,
    backend && plan.parts.some(p => p.role === "media" && p.live) && "Give your backend its Cloudinary settings",
    frontend?.api_url_key && backend && `Tell your website where the backend is (${frontend.api_url_key})`,
  ].filter(Boolean) as string[];

  const run = async () => {
    setRunning(true); onError(null);
    try {
      const body: Record<string, unknown> = { confirm: true };
      if (apiUrl && apiUrl !== backend?.live?.urls[0]) body.api_url = apiUrl;
      setResult(await apiClient(`/launch/${plan.application.id}/connect`, { method: "POST", body: JSON.stringify(body), timeout: 180000 }));
      setConfirmed(false); await onDone();
    } catch (e) { onError(message(e)); }
    finally { setRunning(false); }
  };

  return <Card>
    <h2 className="text-lg font-semibold">4. Connect the parts and go live</h2>
    <p className="mt-1 text-sm text-slate-600">LaunchComply passes the private addresses between your accounts for you. Secrets go straight from one provider to the other and are never shown or stored.</p>
    {items.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">{items.map(i => <li key={i}>{i}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Nothing needs connecting for this app.</p>}
    {frontend?.api_url_key && backend?.live && <label className="mt-3 block max-w-xl text-xs text-slate-600">Backend address your website should use
      <input value={apiUrl} onChange={e => setApiUrl(e.target.value)} className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-sm" />
      <span className="mt-0.5 block text-slate-500">If your code expects a path such as /api or /api/v1 after the address, add it here.</span></label>}
    {canManage && items.length > 0 && <>
      <label className="mt-3 flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5" />Update these settings and redeploy my app.</label>
      <button disabled={!confirmed || running} onClick={() => void run()} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}{running ? "Connecting…" : "Connect and redeploy"}</button>
    </>}
    {result && <div role="status" className="mt-3 space-y-1 text-sm">{result.done.map(d => <p key={d} className="text-emerald-700">✓ {d}</p>)}{result.skipped.map(s => <p key={s} className="text-amber-700">• {s}</p>)}</div>}
    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <p className="font-semibold">After you are live</p>
      <ul className="mt-2 space-y-1 text-slate-600">
        <li>• LaunchComply checks your app every 5 minutes and tells you in Notifications if visitors cannot reach it.</li>
        <li>• Add your own domain name from <Link href="/dashboard/architecture" className="text-cyan-700 underline">Business architecture → Current hosting</Link> (choose your website → Add domain).</li>
        <li>• See where everything runs on the <Link href="/dashboard" className="text-cyan-700 underline">dashboard map</Link>.</li>
      </ul>
    </div>
  </Card>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950"><Rocket className="h-6 w-6 text-cyan-700" />Launch your app</h1>
    <p className="mt-1 max-w-3xl text-sm text-slate-600">Put your AI-built app online in four guided steps, in accounts you own. New parts start on each provider&apos;s free plan where one exists. Check its limits before relying on it for paying customers. LaunchComply keeps checking your app after launch.</p>
    <div className="mt-6">{children}</div>
  </div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{children}</section>;
}
