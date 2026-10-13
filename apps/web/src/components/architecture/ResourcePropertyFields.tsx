"use client";
import type { ArchitectureGraph } from "./CloudDiagram";

export type PropertyValue = string | number | boolean | string[];
export interface FieldSchema {
  title?: string; description?: string; type: string; default?: PropertyValue;
  enum?: (number | string)[]; reference_type?: string;
  reference_by?: { field: string; types: Record<string, string> };
  maxLength?: number; minimum?: number; maximum?: number; minItems?: number; maxItems?: number;
}
export interface ResourceConfiguration { resource_type: string; properties: Record<string, PropertyValue> }
export interface ResourceSchema {
  resource_type: string; label: string; documentation: string; limitations: string;
  service_aliases: string[]; schema: { properties: Record<string, FieldSchema>; required?: string[] };
}

export function ResourcePropertyFields({ definition, values, configurations, graph, disabled, onChange }: {
  definition: ResourceSchema; values: Record<string, PropertyValue>;
  configurations: Record<string, ResourceConfiguration>; graph: ArchitectureGraph; disabled: boolean;
  onChange: (values: Record<string, PropertyValue>) => void;
}) {
  const change = (key: string, value: PropertyValue) => {
    const next = { ...values, [key]: value };
    for (const [dependent, field] of Object.entries(definition.schema.properties)) {
      if (field.reference_by?.field === key) next[dependent] = "";
    }
    onChange(next);
  };
  return <>{Object.entries(definition.schema.properties).map(([key, field]) => {
    const referenceType = field.reference_by ? field.reference_by.types[String(values[field.reference_by.field] || "")] : field.reference_type;
    const candidates = graph.nodes.filter(node => configurations[node.id]?.resource_type === referenceType);
    const required = definition.schema.required?.includes(key);
    const controlStyle = "mt-1 block w-full rounded-lg border p-2 text-sm font-normal disabled:bg-slate-50";
    if (field.type === "array" && referenceType) {
      const selected = Array.isArray(values[key]) ? values[key] as string[] : [];
      return <fieldset key={key} disabled={disabled} className="rounded-lg border p-3"><legend className="px-1 text-xs font-semibold">{field.title || key}</legend><div className="max-h-40 space-y-2 overflow-auto">{candidates.map(node => <label key={node.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(node.id)} onChange={event => change(key, event.target.checked ? [...selected, node.id] : selected.filter(id => id !== node.id))} />{node.label}</label>)}{!candidates.length && <p className="text-xs text-slate-500">Configure a {referenceType} component first.</p>}</div>{field.description && <p className="mt-2 text-xs text-slate-500">{field.description}</p>}</fieldset>;
    }
    return <label key={key} className="block text-xs font-semibold">{field.title || key}
      {referenceType ? <select required={required} disabled={disabled} value={String(values[key] || "")} onChange={event => change(key, event.target.value)} className={controlStyle}><option value="">Select {referenceType.replace("AWS::", "")}</option>{candidates.map(node => <option key={node.id} value={node.id}>{node.label}</option>)}</select>
        : field.enum ? <select required={required} disabled={disabled} value={String(values[key] ?? field.default ?? "")} onChange={event => change(key, field.type === "integer" ? Number(event.target.value) : event.target.value)} className={controlStyle}><option value="" disabled>Choose an option</option>{field.enum.map(value => <option key={value} value={value}>{String(value).replaceAll("_", " ")}</option>)}</select>
        : field.type === "boolean" ? <input type="checkbox" disabled={disabled} checked={values[key] === true} onChange={event => change(key, event.target.checked)} className="ml-3 align-middle" />
        : <input type={field.type === "integer" ? "number" : "text"} step={field.type === "integer" ? 1 : undefined} min={field.minimum} max={field.maximum} required={required} disabled={disabled} maxLength={field.maxLength} value={String(values[key] ?? "")} onChange={event => change(key, field.type === "integer" && event.target.value !== "" ? Number(event.target.value) : event.target.value)} className={controlStyle} />}
      {field.description && <span className="mt-1 block text-xs font-normal text-slate-500">{field.description}</span>}
    </label>;
  })}</>;
}
