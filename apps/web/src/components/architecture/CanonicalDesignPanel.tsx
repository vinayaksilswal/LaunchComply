"use client";
import { useEffect, useState } from "react";
import { Download, FileJson, X } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { Dialog } from "@/components/ui/Dialog";
import type { CanonicalDesign } from "./canonical-types";

interface SavedDesignData {
  architecture_id: string;
  version: string;
  read_only: boolean;
  native_writes_enabled: boolean;
  design: CanonicalDesign;
  eligibility: { is_current: boolean; source_changed: boolean };
  fingerprints: { semantic_hash: string; layout_hash: string; artifact_input_hash: string; artifact_status: "INPUT_IDENTITY_ONLY" };
  notices: string[];
}

export function CanonicalDesignPanel({ applicationId, savedId, versionId, disabled, unsaved = false }: {
  applicationId: string; savedId: string; versionId?: string; disabled?: boolean; unsaved?: boolean;
}) {
  const [open, setOpen] = useState(false), [data, setData] = useState<SavedDesignData | null>(null);
  const [error, setError] = useState(""), [loading, setLoading] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => { setOpen(false); setData(null); }, [applicationId, savedId, versionId]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError(""); setData(null);
    const params: Record<string, string> = versionId ? { version_id: versionId } : { expected_id: savedId };
    apiClient<SavedDesignData>(`/architecture/designs/${applicationId}`, { params })
      .then(result => { if (active) setData(result); })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Unable to inspect this saved design."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, applicationId, savedId, versionId, retry]);
  const download = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(data.design, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url;
    anchor.download = `launchcomply-design-${data.version}.json`; anchor.click(); URL.revokeObjectURL(url);
  };
  return <>
    <button disabled={disabled} onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40"><FileJson className="h-4 w-4" />Inspect saved design data</button>
    {open && <Dialog label="Saved design data" onDismiss={() => setOpen(false)} className="max-w-3xl">
      <div className="space-y-4 p-5">
        <header className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Saved design data</h2><p className="mt-1 text-xs text-slate-500">Inspect or download the saved architecture. Unsaved edits are not included.</p></div><button aria-label="Close saved design data" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></header>
        {loading && <p role="status" className="text-sm text-slate-500">Reading saved design…</p>}
        {error && <div role="alert" className="space-y-2 text-sm text-rose-700"><p>{error}</p><button onClick={() => setRetry(value => value + 1)} className="font-semibold underline">Retry saved design</button></div>}
        {data && <>
          <p className="text-sm font-semibold">{data.version} · {data.eligibility.is_current ? "Current saved version" : "Historical version"} · Read only</p>
          {(unsaved || data.eligibility.source_changed) && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{unsaved ? "Save your changes before comparing them with this snapshot. " : ""}{data.eligibility.source_changed ? "Source links changed. This snapshot keeps the previous source findings." : ""}</p>}
          <div className="grid gap-3 sm:grid-cols-2">{([
            ["Infrastructure intent", "semantic_hash"], ["Diagram layout", "layout_hash"],
          ] as const).map(([label, key]) => <div key={key} className="rounded-lg border p-3"><h3 className="text-xs font-semibold">{label}</h3><output aria-label={`${label} fingerprint`} className="mt-2 block break-all font-mono text-xs text-slate-600">{data.fingerprints[key]}</output></div>)}</div>
          <p className="text-xs leading-5 text-slate-600">Moving or renaming components changes the diagram identity. Saved resource properties, targets, connections and source identity determine infrastructure intent.</p>
          <div className="max-h-64 overflow-auto rounded-lg border"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-3">Component</th><th className="p-3">Configuration</th><th className="p-3">Cloud ownership</th></tr></thead><tbody>{Object.values(data.design.resources_by_id).map(resource => <tr key={resource.id} className="border-t"><td className="p-3"><strong>{resource.label}</strong><span className="mt-1 block text-slate-500">{resource.catalog_type || resource.legacy_service}</span></td><td className="p-3">{resource.configuration ? "Typed properties saved" : "Planning only"}</td><td className="p-3">{resource.ownership?.replaceAll("_", " ").toLowerCase()}</td></tr>)}</tbody></table></div>
          <p className="text-xs text-slate-500">{Object.values(data.design.connections_by_id).filter(connection => connection.purpose === "UNKNOWN").length} legacy connections still need protocol, authentication and execution confirmation. Property references are projections of saved settings.</p>
          <p className="text-xs text-slate-500">This export contains design data. It is not an AWS deployment artifact or deployment approval.</p>
          <button onClick={download} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"><Download className="h-4 w-4" />Download design JSON</button>
        </>}
      </div>
    </Dialog>}
  </>;
}
