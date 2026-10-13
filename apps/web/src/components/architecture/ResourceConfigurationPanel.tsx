"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Settings2, X } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import type { ArchitectureGraph } from "./CloudDiagram";

export interface ResourceConfiguration { resource_type: string; properties: Record<string, string | number | boolean> }
interface FieldSchema { title?: string; description?: string; type: string; default?: string | number | boolean; enum?: number[]; reference_type?: string; maxLength?: number; pattern?: string }
interface ResourceSchema { resource_type: string; label: string; documentation: string; limitations: string; service_aliases: string[]; schema: { properties: Record<string, FieldSchema>; required?: string[] } }
interface ExportResult { template: object; sha256: string; version: string; architecture_id: string; included_node_ids: string[]; omitted_node_ids: string[]; generated_resource_count: number; notes: string[] }
interface Review { issues: { node_id: string; message: string }[]; unconfigured_node_ids: string[] }
const EMPTY_CONFIGURATIONS: Record<string, ResourceConfiguration> = {};

export function ResourceConfigurationPanel({ appId, draftId, graph, configurations = EMPTY_CONFIGURATIONS, review, region, disabled, canEdit, selectedId, errorMessage, onSave }: {
  appId: string; draftId: string; graph: ArchitectureGraph; configurations?: Record<string, ResourceConfiguration>;
  review?: Review; region?: string; disabled: boolean; canEdit: boolean; selectedId?: string | null;
  errorMessage?: string | null;
  onSave: (nodeId: string, configuration: ResourceConfiguration | null) => Promise<boolean>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [schemas, setSchemas] = useState<ResourceSchema[]>([]);
  const [nodeId, setNodeId] = useState(selectedId || graph.nodes[0]?.id || "");
  const [type, setType] = useState("");
  const [values, setValues] = useState<ResourceConfiguration["properties"]>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const [subset, setSubset] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const node = graph.nodes.find(item => item.id === nodeId);
  const definition = schemas.find(item => item.resource_type === type);
  useEffect(() => { setResult(null); }, [draftId, region]);
  useEffect(() => {
    let active = true;
    apiClient<{ resources: ResourceSchema[] }>("/architecture/workspace/resource-schemas").then(data => { if (active) setSchemas(data.resources); }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [appId]);
  useEffect(() => {
    const config = configurations[nodeId];
    const matched = config?.resource_type || schemas.find(item => item.resource_type === node?.service || item.service_aliases.includes(node?.service || ""))?.resource_type || "";
    setType(matched);
    setValues(config?.properties || Object.fromEntries(Object.entries(schemas.find(item => item.resource_type === matched)?.schema.properties || {}).filter(([, field]) => field.default !== undefined).map(([key, field]) => [key, field.default!] )));
    setResult(null);
  }, [nodeId, node?.service, schemas, configurations]);
  const locked = disabled || working;
  const known = Object.keys(configurations).filter(id => graph.nodes.some(item => item.id === id));
  const doSave = async (configuration: ResourceConfiguration | null) => {
    setWorking(true); setError(""); setNotice("");
    try { if (await onSave(nodeId, configuration)) { setNotice(configuration ? "Configuration saved as a new architecture revision." : "Configuration removed from the new revision."); setResult(null); } }
    finally { setWorking(false); }
  };
  const prepare = async () => {
    setWorking(true); setResult(null); setError("");
    try { setResult(await apiClient<ExportResult>(`/architecture/workspace/${appId}/cloudformation-export`, { method: "POST", body: JSON.stringify({ expected_id: draftId, ...(subset ? { resource_ids: known } : {}) }) })); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to generate the infrastructure definitions."); }
    finally { setWorking(false); }
  };
  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(result.template, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `cloudformation-${result.version}${result.omitted_node_ids.length ? "-selected-resources" : ""}.json`; link.click(); URL.revokeObjectURL(url);
  };
  return <>
    <button onClick={() => { if (selectedId) setNodeId(selectedId); dialog.current?.showModal(); }} className="px-3 py-1.5 text-xs font-semibold text-slate-600 inline-flex items-center gap-1"><Settings2 className="h-3.5 w-3.5" />Resource configuration</button>
    <dialog ref={dialog} aria-labelledby="resource-config-title" className="m-auto w-[calc(100%_-_2rem)] max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-900/40">
      <div className="flex justify-between gap-3"><div><h2 id="resource-config-title" className="text-lg font-bold">Resource configuration & infrastructure export</h2><p className="mt-1 text-xs text-slate-500">Saved resource properties · {region || "Choose an AWS region in architecture settings"}</p></div><button aria-label="Close resource configuration" onClick={() => dialog.current?.close()}><X className="h-5 w-5" /></button></div>
      {(error || errorMessage) && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800">{error || errorMessage}</p>}
      {disabled && <p className="mt-3 text-xs text-amber-800">Save diagram edits and resolve pending AI proposals before configuring or exporting resources.</p>}
      {notice && <p role="status" className="mt-3 text-xs text-emerald-800">{notice}</p>}
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        <section className="rounded-xl border p-4 space-y-3">
          <label className="block text-xs font-semibold">Component<select aria-label="Configured component" value={nodeId} onChange={event => { setNodeId(event.target.value); setNotice(""); }} className="mt-1 w-full rounded-lg border p-2 font-normal">{graph.nodes.map(item => <option key={item.id} value={item.id}>{item.label} · {item.service}</option>)}</select></label>
          {definition ? <form onSubmit={event => { event.preventDefault(); void doSave({ resource_type: type, properties: values }); }} className="space-y-3">
            <strong className="block text-sm">{definition.label}</strong><p className="text-xs text-slate-500">{definition.resource_type}</p>
            {Object.entries(definition.schema.properties).map(([key, field]) => <label key={key} className="block text-xs font-semibold">{field.title || key}
              {field.reference_type ? <select required disabled={locked || !canEdit} value={String(values[key] || "")} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} className="mt-1 block w-full rounded-lg border p-2 font-normal"><option value="">Select configured VPC</option>{graph.nodes.filter(item => configurations[item.id]?.resource_type === field.reference_type).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
                : field.enum ? <select disabled={locked || !canEdit} value={String(values[key] ?? field.default ?? "")} onChange={event => setValues(current => ({ ...current, [key]: Number(event.target.value) }))} className="mt-1 block w-full rounded-lg border p-2 font-normal">{field.enum.map(value => <option key={value} value={value}>{value}</option>)}</select>
                : field.type === "boolean" ? <input type="checkbox" disabled={locked || !canEdit} checked={values[key] === true} onChange={event => setValues(current => ({ ...current, [key]: event.target.checked }))} className="ml-3 align-middle" />
                : <input required={definition.schema.required?.includes(key)} disabled={locked || !canEdit} maxLength={field.maxLength} value={String(values[key] ?? "")} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} className="mt-1 block w-full rounded-lg border p-2 font-normal" />}
              {field.description && <span className="mt-1 block text-[11px] font-normal text-slate-500">{field.description}</span>}
            </label>)}
            <p className="text-xs leading-5 text-slate-600">{definition.limitations}</p><a href={definition.documentation} target="_blank" rel="noreferrer" className="block text-xs text-cyan-800 underline">AWS property reference</a>
            <button type="submit" disabled={locked || !canEdit} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Save resource configuration</button>
          </form> : <p className="text-sm leading-6 text-slate-600">This service currently supports visual modeling. Validated properties and CloudFormation export are available for VPC, Subnet, S3 Bucket and Logs LogGroup resource types. Add the exact resource type from the AWS catalog to configure it.</p>}
          {configurations[nodeId] && <button disabled={locked || !canEdit} onClick={() => void doSave(null)} className="text-xs text-red-700 underline disabled:opacity-40">Remove saved configuration</button>}
        </section>
        <section className="rounded-xl border p-4 space-y-3"><h3 className="text-sm font-semibold">CloudFormation resource definitions</h3><p className="text-xs leading-5 text-slate-600">{known.length} of {graph.nodes.length} components configured. This creates an offline template for the selected resources. Account permissions, AWS validation and actual deployment remain separate.</p>
          {!!review?.issues.length && <ul className="space-y-2 text-xs text-red-800">{review.issues.map((issue, index) => <li key={index}>{graph.nodes.find(item => item.id === issue.node_id)?.label || issue.node_id}: {issue.message}</li>)}</ul>}
          <label className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" checked={subset} onChange={event => { setSubset(event.target.checked); setResult(null); }} />Explicitly export configured resources only. Other components and application flows will be omitted.</label>
          {subset && <p className="text-xs text-amber-800">{graph.nodes.length - known.length} components will be omitted. This is a resource subset, not the complete application infrastructure.</p>}
          <button disabled={locked || !region || !graph.nodes.length || (subset && !known.length)} onClick={() => void prepare()} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40">{working ? "Working…" : "Validate & prepare export"}</button>
          {result && <div className="space-y-3 rounded-lg bg-slate-50 p-3"><strong className="block text-xs">{result.version} · {result.generated_resource_count} CloudFormation resources · AWS validation not run</strong><p className="break-all text-[10px] text-slate-500">SHA-256: {result.sha256}</p>{result.notes.map(note => <p key={note} className="text-xs leading-5 text-slate-600">{note}</p>)}{!!result.omitted_node_ids.length && <details className="text-xs"><summary>Omitted components ({result.omitted_node_ids.length})</summary><ul className="mt-2 space-y-1">{result.omitted_node_ids.map(id => <li key={id}>{graph.nodes.find(item => item.id === id)?.label || id}</li>)}</ul></details>}<details className="text-xs"><summary>Inspect exact template</summary><pre className="mt-2 max-h-56 overflow-auto text-[10px]">{JSON.stringify(result.template, null, 2)}</pre></details><button onClick={download} className="inline-flex items-center gap-2 rounded-lg bg-cyan-800 px-3 py-2 text-xs font-semibold text-white"><Download className="h-4 w-4" />Download CloudFormation JSON</button></div>}
        </section>
      </div>
    </dialog>
  </>;
}
