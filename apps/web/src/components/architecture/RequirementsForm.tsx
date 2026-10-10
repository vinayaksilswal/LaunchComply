"use client";
import { useState } from "react";
import type { DeploymentRequirements } from "./ProductionDiagram";
export const regions = [
  ["ap-south-1", "Mumbai"], ["ap-south-2", "Hyderabad"], ["us-east-1", "N. Virginia"], ["us-east-2", "Ohio"], ["us-west-2", "Oregon"],
  ["eu-west-1", "Ireland"], ["eu-west-2", "London"], ["eu-central-1", "Frankfurt"], ["ap-southeast-1", "Singapore"], ["ap-southeast-2", "Sydney"],
  ["ap-northeast-1", "Tokyo"], ["ca-central-1", "Canada Central"], ["sa-east-1", "São Paulo"],
];
export function RequirementsForm({ value, disabled, saving, saveBlockedReason, onSave }: { value?: DeploymentRequirements; disabled: boolean; saving: boolean; saveBlockedReason?: string; onSave: (requirements: DeploymentRequirements) => void }) {
  const [peak, setPeak] = useState(value?.peak_requests_per_minute?.toString() || "");
  const [users, setUsers] = useState(value?.concurrent_users?.toString() || "");
  const [region, setRegion] = useState(value?.region || "");
  const [availability, setAvailability] = useState<DeploymentRequirements["availability"]>(value?.availability || "MULTI_AZ");
  const [secondary, setSecondary] = useState(value?.secondary_region || "");
  const control = "mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-900 disabled:opacity-50";
  return <form aria-label="Deployment requirements" className="rounded-xl border border-cyan-200 bg-cyan-50/30 p-4 space-y-3" onSubmit={event => {
    event.preventDefault(); if (disabled || saveBlockedReason) return;
    onSave({ peak_requests_per_minute: Number(peak), concurrent_users: Number(users), region, availability, secondary_region: availability === "MULTI_REGION" ? secondary : null });
  }}>
    <h3 className="text-sm font-semibold">Plan for your users</h3>
    <p className="text-xs leading-5 text-slate-500">Tell us what you expect at your busiest time. These are planning targets; exact instance sizes need load testing.</p>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-xs text-slate-600">Peak requests / minute<input required type="number" min="1" max="100000000" step="1" value={peak} onChange={event => setPeak(event.target.value)} disabled={disabled} className={control} placeholder="e.g. 1,000" /></label>
      <label className="text-xs text-slate-600">Concurrent users<input required type="number" min="1" max="10000000" step="1" value={users} onChange={event => setUsers(event.target.value)} disabled={disabled} className={control} placeholder="e.g. 100" /></label>
    </div>
    <label className="block text-xs text-slate-600">Primary AWS region<select required value={region} onChange={event => setRegion(event.target.value)} disabled={disabled} className={control}><option value="">Choose near your users</option>{regions.map(([id, label]) => <option key={id} value={id}>{label} · {id}</option>)}</select></label>
    <label className="block text-xs text-slate-600">Availability<select value={availability} onChange={event => setAvailability(event.target.value as DeploymentRequirements["availability"])} disabled={disabled} className={control}>
      <option value="SINGLE_AZ">One availability zone · lower redundancy</option><option value="MULTI_AZ">Multiple availability zones · one region</option><option value="MULTI_REGION">Multiple regions · recovery design required</option>
    </select></label>
    {availability === "MULTI_REGION" && <label className="block text-xs text-slate-600">Recovery AWS region<select required value={secondary === region ? "" : secondary} onChange={event => setSecondary(event.target.value)} disabled={disabled} className={control}><option value="">Choose a different region</option>{regions.filter(([id]) => id !== region).map(([id, label]) => <option key={id} value={id}>{label} · {id}</option>)}</select></label>}
    <p className="text-[10px] leading-4 text-slate-500">Saving creates a new design version and clears its approval. Each card represents a service, not a measured instance count. Failover, subnet allocation and scaling policies need review.</p>
    {saveBlockedReason && <p role="status" className="rounded-lg bg-amber-50 p-2 text-xs leading-5 text-amber-900">{saveBlockedReason} You can enter your targets now; they stay here while you resolve the design changes.</p>}
    {disabled && !saving && <p className="text-xs leading-5 text-slate-600">Editing requires an owner or administrator and current source findings.</p>}
    <button disabled={disabled || !!saveBlockedReason} className="w-full rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{saving ? "Saving requirements…" : "Save deployment requirements"}</button>
  </form>;
}
