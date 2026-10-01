"use client";

import { useState } from "react";
import {
  Globe,
  Shield,
  Layers,
  Server,
  Database,
  HardDrive,
  Cpu,
  Key,
  Eye,
  Archive,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ExternalLink,
  Code2,
  FileText
} from "lucide-react";

interface NodeData {
  id: string;
  name: string;
  service: string;
  category: string;
  tier: "PUBLIC_EDGE" | "PUBLIC_SUBNET" | "PRIVATE_APP" | "DATABASE_ISOLATED" | "SECURITY_SERVICES";
  ports: string;
  status: string;
  cost: string;
  icon: any;
  purpose: string;
  region: string;
  visibility: "Public" | "Private" | "Isolated";
  encryption: string;
  backup: string;
  securityGroups: string[];
  findingsCount: number;
  compliance: string[];
}

const NODES: NodeData[] = [
  // PUBLIC EDGE
  {
    id: "node-dns",
    name: "Route 53 Managed DNS",
    service: "Amazon Route 53",
    category: "DNS & Routing",
    tier: "PUBLIC_EDGE",
    ports: "53/UDP, 53/TCP",
    status: "HEALTHY",
    cost: "₹450 / mo",
    icon: Globe,
    purpose: "Latency-based DNS routing with health-check failover for app.acmecloud.io",
    region: "Global Edge",
    visibility: "Public",
    encryption: "DNSSEC Signed",
    backup: "Zone Alias Sync",
    securityGroups: ["Edge Route 53 Resolver"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.20", "SOC 2 CC6.6"]
  },
  {
    id: "node-cdn",
    name: "CloudFront CDN Distribution",
    service: "Amazon CloudFront",
    category: "Content Delivery",
    tier: "PUBLIC_EDGE",
    ports: "443/HTTPS (TLS 1.3)",
    status: "HEALTHY",
    cost: "₹1,800 / mo",
    icon: Layers,
    purpose: "Edge caching, HTTP/3 & Brotli compression, SNI SSL termination via ACM",
    region: "Global (450+ PoPs)",
    visibility: "Public",
    encryption: "TLS 1.3 Strict, ACM Certificate",
    backup: "Origin Group Failover",
    securityGroups: ["CloudFront Security Profile"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.24", "SOC 2 CC6.7", "DPDP Sec 8"]
  },
  {
    id: "node-waf",
    name: "AWS WAF Web ACL",
    service: "AWS WAF",
    category: "Edge Protection",
    tier: "PUBLIC_EDGE",
    ports: "Inline Inspection",
    status: "ACTIVE",
    cost: "₹2,500 / mo",
    icon: Shield,
    purpose: "OWASP Top 10 rule enforcement, rate-limiting (100 req/min per IP), bot mitigation",
    region: "Global / ap-south-1",
    visibility: "Public",
    encryption: "Edge Token Validation",
    backup: "CloudFormation State",
    securityGroups: ["WAF IP Rate Ruleset"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.23", "SOC 2 CC6.6", "DPDP Sec 8"]
  },

  // PUBLIC SUBNET
  {
    id: "node-alb",
    name: "Application Load Balancer",
    service: "AWS ALB",
    category: "Traffic Distribution",
    tier: "PUBLIC_SUBNET",
    ports: "80->443 Redirect, 443/HTTPS",
    status: "HEALTHY",
    cost: "₹2,200 / mo",
    icon: Server,
    purpose: "Reverse proxy routing to ECS Fargate private target groups with health checks",
    region: "ap-south-1 (Mumbai)",
    visibility: "Public",
    encryption: "ELBSecurityPolicy-TLS13-1-2-2021-06",
    backup: "Multi-AZ redundancy (2 AZs)",
    securityGroups: ["sg-0a4b92c (Inbound 443 from CloudFront Prefix List)"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.20", "SOC 2 CC6.6"]
  },

  // PRIVATE APP VPC
  {
    id: "node-ecs",
    name: "ECS Fargate (FastAPI API)",
    service: "Amazon ECS Fargate",
    category: "Container Compute",
    tier: "PRIVATE_APP",
    ports: "8000/TCP (Private)",
    status: "HEALTHY",
    cost: "₹12,400 / mo",
    icon: Cpu,
    purpose: "Serverless container cluster running FastAPI API tasks with auto-scaling (2-8 tasks)",
    region: "ap-south-1a / ap-south-1b",
    visibility: "Private",
    encryption: "AWS KMS Ephemeral Storage",
    backup: "ECR Immutable Image Tags",
    securityGroups: ["sg-0ec82f (Inbound 8000 only from ALB)"],
    findingsCount: 1, // CORS finding
    compliance: ["ISO 27001 A.8.28", "SOC 2 CC6.8", "DPDP Sec 8"]
  },
  {
    id: "node-redis",
    name: "ElastiCache Redis",
    service: "Amazon ElastiCache",
    category: "In-Memory Cache",
    tier: "PRIVATE_APP",
    ports: "6379/TCP (Private)",
    status: "HEALTHY",
    cost: "₹2,800 / mo",
    icon: HardDrive,
    purpose: "Distributed session cache, API rate limiting counters, and background job queue",
    region: "ap-south-1a",
    visibility: "Private",
    encryption: "At Rest (KMS) & In Transit (AUTH Token)",
    backup: "Daily Snapshot Retention 7d",
    securityGroups: ["sg-0c58e1 (Inbound 6379 only from ECS Tasks)"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.24", "SOC 2 CC6.1"]
  },

  // DATABASE ISOLATED
  {
    id: "node-rds",
    name: "RDS PostgreSQL Multi-AZ",
    service: "Amazon RDS",
    category: "Relational Database",
    tier: "DATABASE_ISOLATED",
    ports: "5432/TCP (Isolated)",
    status: "HEALTHY",
    cost: "₹14,500 / mo",
    icon: Database,
    purpose: "Primary PostgreSQL 16 cluster with synchronous Multi-AZ standby replica",
    region: "ap-south-1 (Multi-AZ)",
    visibility: "Isolated",
    encryption: "AWS KMS Customer Managed Key (CMK)",
    backup: "Continuous WAL (5-min RPO) + 35-day automated snapshots",
    securityGroups: ["sg-0d331a (Inbound 5432 strictly from ECS Subnets)"],
    findingsCount: 1, // Route table risk
    compliance: ["ISO 27001 A.8.24", "SOC 2 CC6.1", "DPDP Sec 8, 9, 10"]
  },

  // SECURITY & SERVICES
  {
    id: "node-s3",
    name: "S3 KMS Encrypted Vault",
    service: "Amazon S3",
    category: "Object Storage",
    tier: "SECURITY_SERVICES",
    ports: "HTTPS IAM Restricted",
    status: "HEALTHY",
    cost: "₹1,850 / mo",
    icon: Archive,
    purpose: "Encrypted storage for tenant uploads, audit evidence, and compliance documents",
    region: "ap-south-1",
    visibility: "Private",
    encryption: "SSE-KMS with Bucket Key Enabled",
    backup: "Cross-Region Replication + Versioning",
    securityGroups: ["IAM Bucket Policy Strict SSL Only"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.10", "SOC 2 CC6.1", "DPDP Sec 8"]
  },
  {
    id: "node-secrets",
    name: "AWS Secrets Manager",
    service: "Secrets Manager",
    category: "Secrets & Keys",
    tier: "SECURITY_SERVICES",
    ports: "VPC Endpoint IAM",
    status: "ACTIVE",
    cost: "₹650 / mo",
    icon: Key,
    purpose: "Zero hardcoded credentials: auto-rotates DB credentials and third-party API tokens",
    region: "ap-south-1",
    visibility: "Private",
    encryption: "AWS KMS Dedicated Key",
    backup: "30-day recovery window",
    securityGroups: ["VPC Endpoint Security Group"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.9", "SOC 2 CC6.1"]
  },
];

export function ArchitectureCanvas() {
  const [selectedNode, setSelectedNode] = useState<NodeData>(NODES[4]); // Default to ECS
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden relative">
      {/* Top Action & Legend Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-20 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              AWS Production Architecture Map
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                High Availability (Multi-AZ)
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Region: <span className="text-slate-200 font-mono">ap-south-1 (Mumbai)</span> • VPC:{" "}
              <span className="text-slate-200 font-mono">10.0.0.0/16</span> • Est:{" "}
              <span className="text-cyan-400 font-semibold">₹38,500/month</span>
            </p>
          </div>
        </div>

        {/* Canvas Controls */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-1 flex items-center gap-1 text-slate-300">
            <button
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-1.5">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
              className="p-1.5 hover:bg-slate-700 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1.5 hover:bg-slate-700 rounded transition-colors ml-1"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs rounded-lg shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            Download Architecture Package
          </button>
        </div>
      </div>

      {/* Main Canvas & Detail Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Visual Architecture Board */}
        <div
          className="flex-1 overflow-auto p-8 bg-grid-pattern flex flex-col gap-6"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top left" }}
        >
          {/* TIER 1: PUBLIC CLOUD EDGE */}
          <div className="border border-cyan-500/30 bg-cyan-950/20 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Public Cloud Edge (Global PoPs)
              </span>
              <span className="text-[11px] font-mono text-cyan-300/70">DDoS Mitigation & Caching Tier</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {NODES.filter((n) => n.tier === "PUBLIC_EDGE").map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNode.id === node.id}
                  onClick={() => setSelectedNode(node)}
                />
              ))}
            </div>
          </div>

          {/* Traffic Flow Indicator */}
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400 py-0.5">
            <div className="h-6 w-[2px] bg-gradient-to-b from-cyan-500 to-blue-500 animate-pulse" />
            <span className="text-[10px] tracking-widest uppercase">Strict TLS 1.3 Terminated Ingress</span>
            <div className="h-6 w-[2px] bg-gradient-to-b from-cyan-500 to-blue-500 animate-pulse" />
          </div>

          {/* TIER 2: AWS VPC CONTAINER */}
          <div className="border border-blue-500/30 bg-slate-900/60 rounded-xl p-5 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  Customer AWS Virtual Private Cloud (VPC 10.0.0.0/16)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Isolated VPC in ap-south-1</span>
            </div>

            <div className="space-y-4">
              {/* Public Subnet */}
              <div className="border border-slate-700/80 bg-slate-850/70 rounded-lg p-3">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Public Subnets (10.0.1.0/24 & 10.0.2.0/24)</span>
                  <span className="text-[10px] text-amber-400 font-mono">Internet Facing Ingress</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {NODES.filter((n) => n.tier === "PUBLIC_SUBNET").map((node) => (
                    <NodeCard
                      key={node.id}
                      node={node}
                      isSelected={selectedNode.id === node.id}
                      onClick={() => setSelectedNode(node)}
                    />
                  ))}
                </div>
              </div>

              {/* Private Application Subnet */}
              <div className="border border-indigo-500/30 bg-indigo-950/20 rounded-lg p-3">
                <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Private Application Subnets (10.0.10.0/24 & 10.0.11.0/24)</span>
                  <span className="text-[10px] text-indigo-400 font-mono">Zero Direct Public IP Access</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {NODES.filter((n) => n.tier === "PRIVATE_APP").map((node) => (
                    <NodeCard
                      key={node.id}
                      node={node}
                      isSelected={selectedNode.id === node.id}
                      onClick={() => setSelectedNode(node)}
                    />
                  ))}
                </div>
              </div>

              {/* Database Isolated Subnet */}
              <div className="border border-emerald-500/30 bg-emerald-950/20 rounded-lg p-3">
                <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Isolated Database Subnets (10.0.20.0/24 & 10.0.21.0/24)</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Multi-AZ Synchronous Replication</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {NODES.filter((n) => n.tier === "DATABASE_ISOLATED").map((node) => (
                    <NodeCard
                      key={node.id}
                      node={node}
                      isSelected={selectedNode.id === node.id}
                      onClick={() => setSelectedNode(node)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TIER 3: SECURITY, AUDIT & STORAGE */}
          <div className="border border-purple-500/30 bg-purple-950/20 rounded-xl p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-3 flex items-center justify-between">
              <span>Platform Security, Encryption & Storage Services</span>
              <span className="text-[11px] font-mono text-purple-400">AWS KMS AES-256 Customer Managed Keys</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {NODES.filter((n) => n.tier === "SECURITY_SERVICES").map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNode.id === node.id}
                  onClick={() => setSelectedNode(node)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Node Inspector Slide-out Drawer */}
        <div className="w-96 bg-slate-900 border-l border-slate-800 p-5 overflow-y-auto flex flex-col z-20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <selectedNode.icon className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">Resource Inspector</span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                selectedNode.visibility === "Public"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : selectedNode.visibility === "Private"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {selectedNode.visibility}
            </span>
          </div>

          {/* Main Info */}
          <div className="space-y-4 text-xs">
            <div>
              <div className="text-slate-400 text-[11px]">Resource Name</div>
              <div className="text-sm font-bold text-white">{selectedNode.name}</div>
              <div className="text-slate-400 font-mono text-[11px]">{selectedNode.service}</div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="text-slate-400 text-[11px]">Architectural Purpose</div>
              <div className="text-slate-300 leading-relaxed">{selectedNode.purpose}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Monthly Cost</div>
                <div className="text-cyan-400 font-bold font-mono mt-0.5">{selectedNode.cost}</div>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Ports & Protocol</div>
                <div className="text-white font-mono mt-0.5 truncate">{selectedNode.ports}</div>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="text-slate-400 text-[11px]">Security & Encryption</div>
              <div className="text-white font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                {selectedNode.encryption}
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="text-slate-400 text-[11px]">Backup & Disaster Recovery</div>
              <div className="text-white font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                {selectedNode.backup}
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="text-slate-400 text-[11px]">Security Groups & Rules</div>
              {selectedNode.securityGroups.map((sg, i) => (
                <div key={i} className="text-[11px] font-mono text-cyan-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  {sg}
                </div>
              ))}
            </div>

            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="text-slate-400 text-[11px]">Mapped Compliance Requirements</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedNode.compliance.map((c, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {selectedNode.findingsCount > 0 ? (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-200 text-xs">Security Advisory Detected</div>
                  <div className="text-[11px] text-rose-300/80 mt-0.5">
                    This component has 1 open security finding awaiting remediation review.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-300">No active security findings</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Architecture Package Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Archive className="w-5 h-5 text-cyan-400" />
                  Download Complete Architecture Package
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Production-grade blueprints, data flows, and Infrastructure-as-Code for enterprise procurement.
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { name: "architecture.pdf", desc: "Executive Architecture Blueprint", size: "1.4 MB" },
                  { name: "infrastructure-inventory.csv", desc: "Complete Cloud Asset Register", size: "48 KB" },
                  { name: "network-and-data-flow.pdf", desc: "Data Flow & VPC Subnet Map", size: "1.1 MB" },
                  { name: "security-summary.pdf", desc: "Security Controls & Encryption Spec", size: "950 KB" },
                  { name: "backup-dr-runbook.pdf", desc: "Disaster Recovery & Restore Runbook", size: "640 KB" },
                  { name: "main.tf (Terraform)", desc: "Production IaC Terraform Template", size: "14 KB" },
                ].map((item, i) => (
                  <div key={i} className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-200">{item.name}</div>
                      <div className="text-[11px] text-slate-400">{item.desc}</div>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                      {item.size}
                    </span>
                  </div>
                ))}
              </div>

              {/* Terraform Snippet Preview */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Code2 className="w-3.5 h-3.5" />
                    main.tf preview
                  </span>
                  <span>AWS Provider v5.0+</span>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-32">
{`module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  name    = "launchcomply-prod-vpc"
  cidr    = "10.0.0.0/16"
  azs     = ["ap-south-1a", "ap-south-1b"]
  enable_nat_gateway = true
}`}
                </pre>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Close
                </button>
                <a
                  href="/api/backend/architecture/export-package"
                  target="_blank"
                  download
                  onClick={() => {
                    alert("Architecture Package Manifest downloaded successfully!");
                    setShowExportModal(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-lg shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  Download ZIP Package (.zip)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NodeCard({
  node,
  isSelected,
  onClick
}: {
  node: NodeData;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = node.icon;
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
        isSelected
          ? "bg-cyan-950/60 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]"
          : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-slate-800 border border-slate-700">
            <Icon className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 truncate max-w-[130px]">{node.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{node.ports}</div>
          </div>
        </div>
        {node.findingsCount > 0 && (
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Open Security Finding" />
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 mt-1.5">
        <span className="text-slate-400 font-mono text-[10px]">{node.cost}</span>
        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {node.status}
        </span>
      </div>
    </div>
  );
}
