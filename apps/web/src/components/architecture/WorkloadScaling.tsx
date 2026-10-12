"use client";
import { useState } from "react";
import { Gauge, Trash2 } from "lucide-react";
import type { ArchitectureGraph } from "./CloudDiagram";
import type { DeploymentRequirements, WorkloadPolicy } from "./ProductionDiagram";

export const scalableWorkload = (node: ArchitectureGraph["nodes"][number]) => node.zone === "APPLICATION" && /\becs\b|\bfargate\b/i.test(node.service);
export const scalingLabel = (policy: WorkloadPolicy) => `${policy.min_tasks}–${policy.max_tasks} tasks · ${policy.metric === "ALB_REQUESTS" ? `${policy.target} req/target/min` : `${policy.metric} ${policy.target}%`}`;

export function ScalingSummary({ graph, requirements }: { graph: ArchitectureGraph; requirements?: DeploymentRequirements }) {
  const policies = requirements?.workload_policies || [];
  const workloads = graph.nodes.filter(scalableWorkload);
  return <section aria-label="Workload scaling plans" className="mt-5 rounded-xl border bg-white p-4">
    <h3 className="flex items-center gap-2 text-sm font-semibold"><Gauge className="h-4 w-4 text-cyan-700" />Autoscaling & load balancing</h3>
    <p className="mt-2 text-xs leading-5 text-slate-500">Set policies in Architecture settings → Scaling & load balancing. These are saved plans; configure and load-test them in AWS before use.</p>
    <div className="mt-3 divide-y">{workloads.map(node => {
      const policy = policies.find(item => item.node_id === node.id);
      const alb = policy && graph.nodes.find(item => item.id === policy.alb_id);
      const routePresent = alb && graph.edges.some(edge => edge.source === alb.id && edge.target === node.id);
      return <article key={node.id} className="py-3 text-xs leading-5"><strong className="text-sm">{node.label}</strong>
        {policy ? <><p className="mt-1 text-cyan-800">{scalingLabel(policy)} · {policy.deployment_strategy.replaceAll("_", " ").toLowerCase()}</p><p className="text-slate-600">Cooldowns: out {policy.scale_out_cooldown_seconds}s / in {policy.scale_in_cooldown_seconds}s.</p><p className="text-slate-600">{policy.alb_id ? `${alb?.label || "Missing ALB"} → dedicated IP target group → HTTPS:${policy.target_port} · health ${policy.health_check_path}` : "No ALB selected · worker/container health and queue metrics require review."}</p>{policy.alb_id && !routePresent && <p className="text-amber-800">The saved ALB route changed. Remap this policy before deployment.</p>}{requirements?.availability !== "SINGLE_AZ" && policy.min_tasks < 2 && <p className="text-amber-800">Fewer than two baseline tasks cannot span two AZs simultaneously.</p>}</> : <p className="mt-1 text-amber-800">Scaling limits, metric and deployment policy still need decisions.</p>}
      </article>;
    })}</div>
    {policies.filter(policy => !workloads.some(node => node.id === policy.node_id)).map(policy => <p key={policy.node_id} className="mt-2 text-xs text-amber-800">Policy {policy.node_id} needs remapping: its ECS/Fargate workload is missing or changed.</p>)}
    {!workloads.length && <p className="mt-3 text-xs text-slate-500">No ECS/Fargate workload is selected. Resolve hosting before planning ECS scaling.</p>}
  </section>;
}

export function WorkloadScalingForm({ graph, requirements, disabled, blockedReason, onSave, onTargets }: { graph: ArchitectureGraph; requirements?: DeploymentRequirements; disabled: boolean; blockedReason?: string; onSave: (value: DeploymentRequirements) => Promise<boolean>; onTargets: () => void }) {
  const [nodeId, setNodeId] = useState("");
  const [minimum, setMinimum] = useState(""); const [maximum, setMaximum] = useState("");
  const [metric, setMetric] = useState<WorkloadPolicy["metric"] | "">(""); const [target, setTarget] = useState("");
  const [scaleOut, setScaleOut] = useState(""); const [scaleIn, setScaleIn] = useState("");
  const [strategy, setStrategy] = useState<WorkloadPolicy["deployment_strategy"] | "">("");
  const [albId, setAlbId] = useState(""); const [port, setPort] = useState(""); const [path, setPath] = useState("");
  const [error, setError] = useState(""); const [receipt, setReceipt] = useState("");
  const policies = requirements?.workload_policies || [];
  const workloads = graph.nodes.filter(scalableWorkload);
  const albs = graph.nodes.filter(node => node.zone === "EDGE" && /application load balancer|\balb\b/i.test(node.service) && graph.edges.some(edge => edge.source === node.id && edge.target === nodeId));
  const control = "mt-1 block w-full rounded-lg border bg-white p-2.5 text-sm disabled:opacity-50";
  const selectWorkload = (id: string) => {
    setNodeId(id); setError(""); setReceipt("");
    const policy = policies.find(item => item.node_id === id);
    setMinimum(policy?.min_tasks.toString() || ""); setMaximum(policy?.max_tasks.toString() || ""); setMetric(policy?.metric || ""); setTarget(policy?.target.toString() || "");
    setScaleOut(policy?.scale_out_cooldown_seconds.toString() ?? ""); setScaleIn(policy?.scale_in_cooldown_seconds.toString() ?? ""); setStrategy(policy?.deployment_strategy || "");
    setAlbId(policy?.alb_id || ""); setPort(policy?.target_port?.toString() || ""); setPath(policy?.health_check_path || "");
  };
  if (!requirements) return <div className="rounded-xl border p-4 text-sm leading-6"><p>Set traffic, region and availability before saving workload policies.</p><button type="button" onClick={onTargets} className="mt-3 font-semibold text-cyan-700">Set traffic & availability</button></div>;
  return <div className="space-y-4">
    <p className="text-sm leading-6 text-slate-600">Plan each ECS service independently. Limits and targets are customer choices, not measured capacity. Frontend proxy, API and workers can need different policies.</p>
    <form aria-label="Workload scaling policy" className="space-y-4 rounded-xl border p-4" onSubmit={event => {
      event.preventDefault(); setError(""); setReceipt("");
      if (disabled || blockedReason || !nodeId || !metric || !strategy) return;
      if (Number(maximum) < Number(minimum)) { setError("Maximum tasks must be at least the minimum."); return; }
      if (metric === "ALB_REQUESTS" && (!albId || strategy === "BLUE_GREEN")) { setError("ALB request-count tracking requires a connected ALB and rolling deployment."); return; }
      if (albId && !albs.some(node => node.id === albId)) { setError("Choose an ALB with a current diagram route to this workload."); return; }
      const policy: WorkloadPolicy = { node_id: nodeId, min_tasks: Number(minimum), max_tasks: Number(maximum), metric, target: Number(target), scale_out_cooldown_seconds: Number(scaleOut), scale_in_cooldown_seconds: Number(scaleIn), deployment_strategy: strategy, alb_id: albId || null, target_port: albId ? Number(port) : null, health_check_path: albId ? path : null };
      void onSave({ ...requirements, workload_policies: [...policies.filter(item => item.node_id !== nodeId), policy] }).then(ok => { if (ok) setReceipt("Workload policy saved in a new architecture version. AWS configuration is still required."); });
    }}>
      <label className="block text-sm font-medium">ECS workload<select required value={nodeId} disabled={disabled} onChange={event => selectWorkload(event.target.value)} className={control}><option value="">Choose a workload</option>{workloads.map(node => <option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
      {!!nodeId && <>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Minimum tasks<input required type="number" min="1" max="10000" value={minimum} disabled={disabled} onChange={event => setMinimum(event.target.value)} className={control} /></label><label className="text-sm font-medium">Maximum tasks<input required type="number" min={minimum || 1} max="10000" value={maximum} disabled={disabled} onChange={event => setMaximum(event.target.value)} className={control} /></label></div>
        <label className="block text-sm font-medium">Scaling metric<select required value={metric} disabled={disabled} onChange={event => { setMetric(event.target.value as WorkloadPolicy["metric"]); setTarget(""); }} className={control}><option value="">Choose a metric</option><option value="CPU">Average ECS CPU utilization</option><option value="MEMORY">Average ECS memory utilization</option><option value="ALB_REQUESTS">ALB requests per target per minute</option></select></label>
        <label className="block text-sm font-medium">{metric === "ALB_REQUESTS" ? "Target requests / target / minute" : "Target utilization (%)"}<input required type="number" min="0.001" step="any" max={metric === "ALB_REQUESTS" ? 100000000 : 100} value={target} disabled={disabled || !metric} onChange={event => setTarget(event.target.value)} className={control} /></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium">Scale-out cooldown (s)<input required type="number" min="0" max="86400" value={scaleOut} disabled={disabled} onChange={event => setScaleOut(event.target.value)} className={control} /></label><label className="text-sm font-medium">Scale-in cooldown (s)<input required type="number" min="0" max="86400" value={scaleIn} disabled={disabled} onChange={event => setScaleIn(event.target.value)} className={control} /></label></div>
        <label className="block text-sm font-medium">Deployment strategy<select required value={strategy} disabled={disabled} onChange={event => setStrategy(event.target.value as WorkloadPolicy["deployment_strategy"])} className={control}><option value="">Choose a strategy</option><option value="ROLLING">Rolling deployment · health checks & rollback required</option><option value="BLUE_GREEN">Blue/green · separate target groups & traffic-shift plan required</option></select></label>
        <label className="block text-sm font-medium">Connected Application Load Balancer<select required={metric === "ALB_REQUESTS"} value={albId} disabled={disabled} onChange={event => setAlbId(event.target.value)} className={control}><option value="">No ALB · worker or health strategy to review</option>{albs.map(node => <option key={node.id} value={node.id}>{node.label} · {node.service}</option>)}</select></label>
        {!!albId && <><p className="text-xs leading-5 text-slate-500">Each Fargate service needs its own IP target group. This plan uses HTTPS targets and health checks; configure the endpoint and certificate on the workload. ALB does not validate target certificates; SG restrictions and application authentication remain required.</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">HTTPS target port<input required type="number" min="1" max="65535" value={port} disabled={disabled} onChange={event => setPort(event.target.value)} className={control} /></label><label className="text-sm font-medium">Health-check path<input required maxLength={160} pattern={"/[a-zA-Z0-9\\/_.\\-]*"} value={path} disabled={disabled} placeholder="Path implemented by this workload" onChange={event => setPath(event.target.value)} className={control} /></label></div></>}
        {requirements.availability !== "SINGLE_AZ" && minimum && Number(minimum) < 2 && <p className="text-sm text-amber-800">A multi-AZ workload needs at least two baseline tasks to occupy two zones. Actual placement and surviving-zone capacity require validation.</p>}
        {metric === "ALB_REQUESTS" && strategy === "BLUE_GREEN" && <p className="text-sm text-amber-800">AWS does not support ALB request-count target tracking for this blue/green deployment type. Choose CPU/memory or rolling deployment.</p>}
        {blockedReason && <p className="text-sm text-amber-800">{blockedReason}</p>}
        <button disabled={disabled || !!blockedReason} className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Save workload policy</button>
      </>}
    </form>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{receipt && <p role="status" className="text-sm text-cyan-800">{receipt}</p>}
    <ScalingSummary graph={graph} requirements={requirements} />
    {!!policies.length && <div className="space-y-2">{policies.map(policy => <div key={policy.node_id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-xs"><span>{graph.nodes.find(node => node.id === policy.node_id)?.label || policy.node_id}</span><button type="button" aria-label={`Remove scaling policy for ${policy.node_id}`} disabled={disabled || !!blockedReason} onClick={() => { void onSave({ ...requirements, workload_policies: policies.filter(item => item.node_id !== policy.node_id) }); }} className="rounded border p-2 text-slate-500 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></div>)}</div>}
    <p className="text-xs leading-5 text-slate-500">Before deployment: benchmark the request mix, verify stateless sessions and DB connection budgets, register capacity bounds/metric targets, configure health grace/draining and rollback, spread tasks across selected AZs, and test load and zone failure. Saving changes the plan only.</p>
  </div>;
}
