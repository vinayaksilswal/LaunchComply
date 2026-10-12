"use client";
import { useEffect, useRef, useState } from "react";
import { Search, Sparkles, X, ExternalLink, Plus } from "lucide-react";
import catalog from "./awsResourceCatalog.json";
import type { ArchitectureNode, ArchitectureZone } from "./CloudDiagram";

const services = [
  ["Amazon ECS on Fargate", "Compute", "Run separate frontend, API and worker containers. Public frontend subnets and private backend subnets can share a regional VPC; restrict task access to ingress security groups.", "AmazonECS/latest/developerguide/fargate-task-networking.html"],
  ["Application Load Balancer", "Networking", "HTTPS ingress and host/path routing to workload target groups. Backend tasks can stay private. Review TLS, ports and health checks.", "elasticloadbalancing/latest/application/introduction.html"],
  ["AWS WAF", "Security", "Web request filtering associated with CloudFront or an ALB. WAF is not a network bridge, and does not replace TLS, authentication or security groups.", "waf/latest/developerguide/how-aws-waf-works.html"],
  ["Amazon VPC", "Networking", "A regional network with public frontend, private application and isolated data subnet tiers. Review CIDRs, routing, AZ allocation and security groups.", "vpc/latest/userguide/what-is-amazon-vpc.html"],
  ["S3 gateway VPC endpoint", "Networking", "Route-table access to same-region S3 without a NAT path. Review endpoint and bucket policy. S3 remains outside the VPC.", "vpc/latest/privatelink/vpc-endpoints-s3.html"],
  ["NAT gateway", "Networking", "Outbound internet access for private workloads when required. Review zonal resilience, routing, endpoint alternatives and cost.", "vpc/latest/userguide/vpc-nat-gateway.html"],
  ["Amazon CloudFront", "Delivery", "Global CDN with HTTPS origins and cache policies. Managed outside VPC subnets. Review routing, authenticated API caching and origin restrictions.", "AmazonCloudFront/latest/DeveloperGuide/Introduction.html"],
  ["Amazon Route 53", "Delivery", "DNS records, domain routing and health-check decisions. Global service outside subnet boundaries; verify domain ownership and record targets.", "Route53/latest/DeveloperGuide/Welcome.html"],
  ["AWS Certificate Manager", "Security", "Certificate management for supported ingress services. Certificate region, domain validation and target TLS configuration require review.", "acm/latest/userguide/acm-overview.html"],
  ["Amazon RDS PostgreSQL", "Data", "Managed relational persistence in isolated data subnets. Review actual consumer, engine version, TLS, backups, failover and migrations.", "AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html"],
  ["Amazon Aurora", "Data", "Managed relational clusters with explicit replica and recovery choices. Select only when application compatibility and workload needs justify it.", "AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html"],
  ["Amazon ElastiCache", "Data", "Private cache services. Confirm actual cache/session/queue usage, access, compatibility, encryption and failure behavior.", "AmazonElastiCache/latest/dg/WhatIs.html"],
  ["Amazon S3", "Data", "Private managed object storage outside the VPC. Review Block Public Access, workload IAM, encryption, bucket region and gateway access.", "AmazonS3/latest/userguide/Welcome.html"],
  ["Amazon DynamoDB", "Data", "Managed NoSQL persistence outside subnet boundaries. Review access patterns, keys, capacity mode, consistency and backup/recovery.", "amazondynamodb/latest/developerguide/Introduction.html"],
  ["Amazon SQS", "Messaging", "Managed queue outside subnet boundaries. Requires producers, consumers, retries, visibility timeouts, IAM and dead-letter handling.", "AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html"],
  ["Amazon EventBridge", "Messaging", "Event routing with explicit producers and targets. Review delivery, retries, schema, permissions and failure handling.", "eventbridge/latest/userguide/eb-what-is.html"],
  ["AWS Lambda", "Compute", "Functions for suitable event-driven workloads. VPC attachment is optional; review triggers, limits, networking and runtime compatibility.", "lambda/latest/dg/welcome.html"],
  ["Amazon EKS", "Compute", "Managed Kubernetes control plane with customer workload networking. Use only when orchestration requirements justify its operational complexity.", "eks/latest/userguide/what-is-eks.html"],
  ["Amazon EC2", "Compute", "Virtual machines when workloads need host-level control. Review images, patching, scaling, IAM and public/private network placement.", "AWSEC2/latest/UserGuide/concepts.html"],
  ["AWS Secrets Manager", "Operations", "Workload secret references and rotation. No secret value belongs in the diagram or AI prompt. Review task role and injection configuration.", "secretsmanager/latest/userguide/intro.html"],
  ["AWS IAM", "Security", "Least-privilege workload and deployment roles. Policies must be reviewed against actual resources and tenant access requirements.", "IAM/latest/UserGuide/introduction.html"],
  ["Amazon ECR", "Operations", "Container image registry. Configure build, image scanning, access and delivery separately from application request traffic.", "AmazonECR/latest/userguide/what-is-ecr.html"],
  ["Amazon CloudWatch", "Operations", "Logs, metrics, alarms and dashboards. Show separately from application request traffic. Configure emitters, retention, access and alarm ownership.", "AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html"],
  ["AWS CloudTrail", "Operations", "AWS API activity records. Review account scope, storage, access, retention and alerting. Separate from application request routing.", "awscloudtrail/latest/userguide/cloudtrail-user-guide.html"],
  ["ECS Service Auto Scaling", "Operations", "Target tracking based on a selected metric and target. Throughput benchmarks inform planning; scaling limits and policy need actual configuration.", "AmazonECS/latest/developerguide/service-autoscaling-targettracking.html"],
] as const;

type Entry = { name: string; category: string; description: string; documentation: string; resources?: { type: string; documentation: string }[] };
const entries: Entry[] = [
  ...services.map(([name, category, description, path]) => ({ name, category, description, documentation: `https://docs.aws.amazon.com/${path}` })),
  ...catalog.families.map(family => ({ name: `AWS ${family.name}`, category: "Resource families", description: "CloudFormation resource family. Choose a resource type and review its properties, regional availability, permissions and integration before implementation.", documentation: family.resources[0].documentation, resources: family.resources })),
];

export function AwsServiceCatalog({ aiDisabled, addDisabled, onAsk, onAdd, openKey = 0 }: {
  aiDisabled: boolean; addDisabled: boolean; onAsk: (request: string) => void;
  onAdd: (node: Pick<ArchitectureNode, "label" | "service" | "zone" | "description">) => void; openKey?: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<Entry>(entries[0]);
  const [resource, setResource] = useState("");
  const [label, setLabel] = useState(entries[0].name);
  const [zone, setZone] = useState<ArchitectureZone>("APPLICATION");
  const [notice, setNotice] = useState("");
  useEffect(() => { if (openKey) dialog.current?.showModal(); }, [openKey]);
  const choose = (entry: Entry) => {
    setSelected(entry); setResource(entry.resources?.[0].type || ""); setLabel(entry.name); setNotice("");
    setZone(entry.category === "Compute" ? "APPLICATION" : ["Data", "Messaging"].includes(entry.category) ? "DATA" : ["Networking", "Delivery"].includes(entry.category) ? "EDGE" : "SUPPORT");
  };
  const matches = entries.filter(entry => (category === "All" || entry.category === category) &&
    `${entry.name} ${entry.category} ${entry.description} ${entry.resources?.map(item => item.type).join(" ") || ""}`.toLowerCase().includes(query.toLowerCase()));
  const service = resource || selected.name;
  const documentation = selected.resources?.find(item => item.type === resource)?.documentation || selected.documentation;
  return <>
    <button onClick={() => dialog.current?.showModal()} className="px-4 py-2 text-xs font-semibold text-slate-600">AWS services</button>
    <dialog ref={dialog} aria-labelledby="aws-services-title" className="m-auto w-[calc(100%_-_2rem)] max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-900/40">
      <div className="flex justify-between gap-3"><div><h2 id="aws-services-title" className="text-lg font-bold">AWS service catalog</h2><p className="mt-1 text-xs text-slate-500">{catalog.families.length} resource families · {catalog.families.reduce((count, family) => count + family.resources.length, 0).toLocaleString()} resource types · common deployment services</p></div><button aria-label="Close AWS services" onClick={() => dialog.current?.close()}><X className="h-5 w-5" /></button></div>
      <div className="mt-4 grid gap-4 md:grid-cols-[280px_1fr]">
        <div><label className="flex items-center gap-2 rounded-lg border p-2"><Search className="h-4 w-4 text-slate-400" /><input aria-label="Search AWS services" value={query} onChange={event => setQuery(event.target.value)} placeholder="Service, category or resource type" className="w-full text-sm outline-none" /></label>
          <select aria-label="AWS service category" value={category} onChange={event => setCategory(event.target.value)} className="mt-2 w-full rounded-lg border p-2 text-xs">{["All", ...Array.from(new Set(entries.map(entry => entry.category)))].map(item => <option key={item}>{item}</option>)}</select>
          <p className="mt-2 text-xs text-slate-500">{matches.length} matches</p>
          <div className="mt-2 max-h-[50vh] overflow-y-auto space-y-1">{matches.map(entry => <button key={`${entry.category}:${entry.name}`} aria-pressed={selected === entry} onClick={() => choose(entry)} className={`block w-full rounded-lg p-3 text-left text-xs ${selected === entry ? "bg-cyan-50 text-cyan-900" : "hover:bg-slate-50"}`}><strong>{entry.name}</strong><span className="mt-1 block text-slate-500">{entry.resources ? `${entry.resources.length} resource types` : entry.category}</span></button>)}{!matches.length && <p className="p-3 text-sm text-slate-500">No matches. Search another name or choose All categories.</p>}</div>
        </div>
        <section className="rounded-xl border p-4 space-y-3"><span className="text-xs font-semibold text-cyan-700">{selected.category} · planning component</span><h3 className="text-xl font-bold">{selected.name}</h3><p className="text-sm leading-6 text-slate-600">{selected.description}</p>
          {selected.resources && <label className="block text-xs font-semibold">Resource type<select aria-label="AWS resource type" value={resource} onChange={event => { setResource(event.target.value); setLabel(event.target.value.split("::").slice(1).join(" ")); }} className="mt-1 block w-full rounded-lg border p-2 font-normal">{selected.resources.map(item => <option key={item.type}>{item.type}</option>)}</select></label>}
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Component name<input aria-label="Catalog component name" maxLength={100} value={label} onChange={event => setLabel(event.target.value)} className="mt-1 block w-full rounded-lg border p-2 font-normal" /></label><label className="text-xs font-semibold">Architecture layer<select aria-label="Catalog architecture layer" value={zone} onChange={event => setZone(event.target.value as ArchitectureZone)} className="mt-1 block w-full rounded-lg border p-2 font-normal"><option value="EDGE">Entry & networking</option><option value="APPLICATION">Application services</option><option value="DATA">Data & messaging</option><option value="SUPPORT">Operations & security</option></select></label></div>
          <p className="text-xs leading-5 text-slate-500">Inserts one unconnected component. Existing services, connections and positions stay unchanged. Select it on the diagram to configure placement and connections.</p>
          <button disabled={addDisabled || !label.trim()} onClick={() => { onAdd({ label: label.trim(), service: service.slice(0, 100), zone, description: `Manually selected ${service}. Purpose, placement, permissions and connections require review. CloudFormation type is a planning reference, not an implemented resource.`.slice(0, 500) }); setNotice(`${label.trim()} added to your draft. Close this catalog to configure it or undo.`); }} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 p-3 text-sm font-semibold text-white disabled:opacity-40"><Plus className="h-4 w-4" />Add to architecture</button>
          {notice && <p role="status" className="rounded-lg bg-cyan-50 p-2 text-xs text-cyan-900">{notice}</p>}
          <details className="rounded-lg border p-3 text-xs leading-5"><summary className="cursor-pointer font-semibold">Implementation checklist</summary><ol className="mt-2 list-decimal space-y-1 pl-4"><li>Define purpose, consumers and connection direction.</li><li>Select region, availability, placement and scaling needs.</li><li>Review resource properties, IAM, encryption, TLS, secrets and costs.</li><li>Prepare infrastructure configuration and review the actual plan.</li><li>Deploy through an authorized workflow; verify health, isolation and rollback.</li></ol></details>
          <a href={documentation} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan-700 underline">AWS resource documentation <ExternalLink className="h-3 w-3" /></a>
          <button disabled={aiDisabled} onClick={() => { onAsk(`Review how to implement ${service} in this AWS architecture. Assess its fit and ask up to three essential questions about purpose, consumers, configuration and connections. Explain the implementation steps. Preserve the graph; I will choose an edit scope before requesting changes. WAF is an association with ingress, not a VPC bridge.`); dialog.current?.close(); }} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-200 p-3 text-xs font-semibold text-cyan-800 disabled:opacity-40"><Sparkles className="h-4 w-4" />Prepare AI implementation review</button>
        </section>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">AWS CloudFormation specification {catalog.version} · Mumbai snapshot {catalog.checked_at}. This list covers supported resource families, not every AWS product. Availability and account access need checking. Automatic provisioning is not available.</p>
    </dialog>
  </>;
}
