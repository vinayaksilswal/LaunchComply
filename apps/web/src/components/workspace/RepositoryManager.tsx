"use client";
import { useState } from "react";
import Link from "next/link";
import { Github, Plus, Loader2, GitBranch, Unlink } from "lucide-react";
import { apiClient } from "@/lib/api";
import { RepositoryPicker, type RepositoryOption } from "./RepositoryPicker";
export function RepositoryManager({ assetId, repositories, canEdit, onSaved }: { assetId: string; repositories: RepositoryOption[]; canEdit: boolean; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [choices, setChoices] = useState<RepositoryOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function add() {
    setBusy(true); setError(null);
    try {
      const available = await apiClient<RepositoryOption[]>("/source-control/repositories");
      const all = new Map([...repositories, ...available.filter(repo => !repo.archived)].map(repo => [repo.id, repo]));
      setChoices([...all.values()]); setSelected(repositories.map(repo => repo.id)); setEditing(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to load repositories."); }
    finally { setBusy(false); }
  }
  async function save(ids: string[]) {
    setBusy(true); setError(null);
    try {
      await apiClient(`/applications/${assetId}/repositories`, { method: "PUT", body: JSON.stringify({ repository_ids: ids, expected_repository_ids: repositories.map(repo => repo.id) }) });
      setEditing(false); onSaved();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to save repository links."); }
    finally { setBusy(false); }
  }
  async function connect() {
    setBusy(true); setError(null);
    try {
      sessionStorage.setItem("lc_github_return_asset", assetId);
      const result = await apiClient<{ authorization_url: string }>("/source-control/github/authorize", { method: "POST" });
      const destination = new URL(result.authorization_url);
      if (destination.origin !== "https://github.com" || destination.pathname !== "/login/oauth/authorize") throw new Error("Unable to start GitHub authorization.");
      window.location.assign(destination.href);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to connect GitHub."); setBusy(false); }
  }
  return <section className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5" aria-label="Linked repositories">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-bold inline-flex items-center gap-2"><Github className="w-5 h-5 text-cyan-700" />Connected repositories</h2><p className="text-sm text-slate-500 mt-2">One business asset can include up to six code repositories.</p></div>{canEdit && !editing && <button onClick={add} disabled={busy} className="inline-flex gap-2 items-center rounded-lg bg-slate-900 text-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Add repository</button>}</header>
    {error && <p role="alert" className="p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">{error}</p>}
    {editing ? <div className="space-y-4"><RepositoryPicker repositories={choices} selected={selected} onChange={setSelected} disabled={busy} />{!choices.length && <p className="text-sm text-slate-500">Connect GitHub below to make repositories available.</p>}<div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => save(selected)} className="px-4 py-2.5 rounded-lg bg-cyan-700 text-white text-sm font-semibold disabled:opacity-50">{busy ? "Saving…" : "Save repository links"}</button><button disabled={busy} onClick={() => setEditing(false)} className="px-4 py-2.5 border rounded-lg text-sm">Cancel</button></div></div> : repositories.length ? <div className="divide-y divide-slate-100">{repositories.map(repo => <div key={repo.id} className="py-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-slate-900 break-all">{repo.full_name}</p><p className="text-xs text-slate-500 inline-flex items-center gap-1.5 mt-2"><GitBranch className="w-3.5 h-3.5" />{repo.branch} · {repo.visibility}{repo.accessible === false ? " · reconnect required" : ""}</p></div>{canEdit && <button disabled={busy} aria-label={`Remove repository ${repo.full_name}`} onClick={() => save(repositories.filter(item => item.id !== repo.id).map(item => item.id))} className="inline-flex items-center gap-2 text-sm text-slate-600 border rounded-lg px-3 py-2 hover:bg-slate-50 disabled:opacity-50"><Unlink className="w-4 h-4" />Remove repository</button>}</div>)}</div> : <p className="text-sm text-slate-500">No repositories linked. Add your frontend and backend repositories to start.</p>}
    <footer className="border-t border-slate-100 pt-4 flex flex-wrap gap-4 justify-between items-center"><p className="text-xs text-slate-500 max-w-lg">Removing a link leaves your GitHub code intact. Repository changes clear design approval; refresh findings before continuing.</p><div className="flex flex-wrap gap-4">{canEdit && <button disabled={busy} onClick={connect} className="text-sm font-semibold text-cyan-700 disabled:opacity-50">Connect GitHub account</button>}<Link href={`/dashboard/architecture?application=${assetId}`} className="text-sm font-semibold text-cyan-700">Open business architecture →</Link></div></footer>
  </section>;
}
