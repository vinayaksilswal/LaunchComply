"use client";
export interface RepositoryOption { id: string; full_name: string; default_branch?: string; branch?: string; visibility?: string; archived?: boolean; accessible?: boolean; }
export function RepositoryPicker({ repositories, selected, onChange, disabled = false }: { repositories: RepositoryOption[]; selected: string[]; onChange: (values: string[]) => void; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="space-y-2"><legend className="text-sm font-semibold mb-2">Select repositories · {selected.length} of 6</legend>
    <p className="text-xs text-slate-500 mb-3">Choose the frontend, backend, and other services that belong to this business asset.</p>
    <div className="max-h-72 overflow-y-auto space-y-2">{repositories.map(repo => <label key={repo.id} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${selected.includes(repo.id) ? "border-cyan-600 bg-cyan-50/40" : "border-slate-200 bg-white"}`}>
      <input type="checkbox" aria-label={`Select ${repo.full_name}`} checked={selected.includes(repo.id)} disabled={disabled || (!selected.includes(repo.id) && (selected.length >= 6 || repo.archived || repo.accessible === false))} onChange={event => onChange(event.target.checked ? [...selected, repo.id] : selected.filter(id => id !== repo.id))} className="mt-1 accent-cyan-700" />
      <span className="min-w-0"><span className="block text-sm font-semibold break-all">{repo.full_name}</span><span className="text-xs text-slate-500">{repo.default_branch || repo.branch} · {repo.visibility}{repo.accessible === false || repo.archived ? " · unavailable" : ""}</span></span>
    </label>)}</div>
  </fieldset>;
}
