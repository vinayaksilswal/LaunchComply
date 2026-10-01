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
  FileText,
  DollarSign,
  Activity,
  Network,
  Share2,
  Check,
  HelpCircle,
  Clock,
  Sparkles
} from "lucide-react";

export type ArchitectureTab = "PRODUCTION" | "APPLICATION" | "SECURITY" | "DATA_FLOW" | "COST";
export type ArchitectureProfile = "LEAN" | "BALANCED" | "HIGH_AVAILABILITY";

export interface NodeData {
  id: string;
  name: string;
  type: string;
  provider: string;
  category: string;
  tier: "PUBLIC_EDGE" | "PUBLIC_SUBNET" | "PRIVATE_APP" | "DATABASE_ISOLATED" | "SECURITY_SERVICES" | "EXTERNAL_SERVICE";
  ports: string;
  status: string;
  costInr: number;
  costUsd: number;
  icon: any;
  purpose: string;
  region: string;
  visibility: "Public" | "Private" | "Isolated";
  networkZone: string;
  inbound: string;
  outbound: string;
  encryption: string;
  secrets: string;
  backup: string;
  monitoring: string;
  dependencies: string[];
  findingsCount: number;
  compliance: string[];
  detectedFrom: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  architectureReason: string;
  alternative: string;
  securityRationale: string;
}

const NODES: NodeData[] = [
  // PUBLIC EDGE
  {
    id: "node-dns",
    name: "Route 53 Managed DNS",
    type: "DNS & Traffic Routing",
    provider: "AWS",
    category: "DNS & Routing",
    tier: "PUBLIC_EDGE",
    ports: "53/UDP, 53/TCP",
    status: "HEALTHY",
    costInr: 450,
    costUsd: 5.4,
    icon: Globe,
    purpose: "Latency-based DNS routing with health-check failover for app.acmecloud.io",
    region: "Global Edge",
    visibility: "Public",
    networkZone: "Global Anycast Edge Network",
    inbound: "Any public client queries on UDP/TCP port 53",
    outbound: "Alias records to CloudFront Distribution CDN",
    encryption: "DNSSEC Signed with AWS Key Management",
    secrets: "No direct secrets stored; IAM controlled domain registration",
    backup: "Zone configuration synchronized across all AWS global points of presence",
    monitoring: "Route 53 Health Checks & CloudWatch DNS Query Metrics",
    dependencies: ["node-cdn"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.20", "SOC 2 CC6.6"],
    detectedFrom: "Custom domain configuration and CNAME verification",
    confidence: "HIGH",
    architectureReason: "Required for resilient public entry point with automatic sub-second DNS failover and DNSSEC verification.",
    alternative: "Cloudflare DNS or self-hosted BIND (rejected: lacks native AWS IAM and automated alias record health sync).",
    securityRationale: "Mitigates DNS spoofing, cache poisoning, and amplification attacks via managed Anycast network."
  },
  {
    id: "node-cdn",
    name: "CloudFront CDN Distribution",
    type: "Content Delivery Network",
    provider: "AWS",
    category: "Content Delivery",
    tier: "PUBLIC_EDGE",
    ports: "443/HTTPS (TLS 1.3)",
    status: "HEALTHY",
    costInr: 1800,
    costUsd: 21.6,
    icon: Layers,
    purpose: "Edge caching, HTTP/3 & Brotli compression, SNI SSL termination via ACM",
    region: "Global (450+ PoPs)",
    visibility: "Public",
    networkZone: "CloudFront Global Edge Locations",
    inbound: "Client HTTPS 443 via strict TLS 1.3 protocol",
    outbound: "Custom origin ALB over encrypted port 443 with Origin Custom Headers",
    encryption: "TLS 1.3 Strict, ACM Certificate with automated 60-day renewal",
    secrets: "ACM Private Key (Managed inside AWS KMS / HSM)",
    backup: "Multi-origin failover configured to standby S3 static maintenance page",
    monitoring: "CloudWatch 4xx/5xx alarms, Cache Hit Ratio metrics (target > 85%)",
    dependencies: ["node-waf", "node-alb"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.24", "SOC 2 CC6.7", "DPDP Sec 8"],
    detectedFrom: "Next.js static assets manifest (.next/static) and CDN cache headers",
    confidence: "HIGH",
    architectureReason: "Offloads static asset traffic from container cluster and enforces edge SSL termination closest to users.",
    alternative: "Direct ALB traffic (rejected: higher compute cost, higher latency for international visitors).",
    securityRationale: "Hides origin IP addresses behind AWS edge infrastructure; blocks direct network reconnaissance on ALB."
  },
  {
    id: "node-waf",
    name: "AWS WAF Web ACL",
    type: "Application Firewall",
    provider: "AWS",
    category: "Edge Protection",
    tier: "PUBLIC_EDGE",
    ports: "Inline Inspection",
    status: "ACTIVE",
    costInr: 2500,
    costUsd: 30.0,
    icon: Shield,
    purpose: "OWASP Top 10 rule enforcement, rate-limiting (100 req/min per IP), bot mitigation",
    region: "Global / ap-south-1",
    visibility: "Public",
    networkZone: "Inline CloudFront & ALB Filter",
    inbound: "All HTTP/HTTPS payloads entering CloudFront distribution",
    outbound: "Allowed traffic forwarded to target origin; blocked payloads return HTTP 403",
    encryption: "Payload inspection in-memory; logs encrypted via CloudWatch KMS",
    secrets: "Managed ruleset credentials and HMAC tokens",
    backup: "AWS WAF WebACL configuration defined in Infrastructure as Code (Terraform)",
    monitoring: "Blocked request telemetry, IP rate violations, Bot Control dashboard",
    dependencies: ["node-cdn", "node-alb"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.23", "SOC 2 CC6.6", "DPDP Sec 8", "PCI DSS 6.4"],
    detectedFrom: "Security requirement: Public API ingress requires OWASP Top 10 protection",
    confidence: "HIGH",
    architectureReason: "Mandatory defense-in-depth shield against SQL injection, cross-site scripting, and credential stuffing before requests hit backend.",
    alternative: "Software WAF inside container (rejected: adds CPU overhead and latency to application layer).",
    securityRationale: "Inspects headers, query strings, and body signatures at wire speed with zero origin degradation."
  },

  // PUBLIC SUBNET
  {
    id: "node-alb",
    name: "Application Load Balancer",
    type: "Load Balancer",
    provider: "AWS",
    category: "Traffic Distribution",
    tier: "PUBLIC_SUBNET",
    ports: "80->443 Redirect, 443/HTTPS",
    status: "HEALTHY",
    costInr: 2200,
    costUsd: 26.5,
    icon: Server,
    purpose: "Reverse proxy routing to ECS Fargate private target groups with active health checks",
    region: "ap-south-1 (Mumbai)",
    visibility: "Public",
    networkZone: "Public Subnets (10.0.1.0/24 & 10.0.2.0/24)",
    inbound: "TCP 443 strictly from AWS CloudFront IP Prefix List",
    outbound: "TCP 8000 to ECS Fargate Private Application Subnets",
    encryption: "ELBSecurityPolicy-TLS13-1-2-2021-06 (Restricts weak ciphers)",
    secrets: "ACM Certificate arn:aws:acm:ap-south-1:... installed on HTTPS listener",
    backup: "Multi-AZ redundancy across 2 availability zones with cross-zone load balancing",
    monitoring: "TargetResponseTime, HTTPCode_Target_5XX_Count, ActiveConnectionCount",
    dependencies: ["node-ecs"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.20", "SOC 2 CC6.6"],
    detectedFrom: "Detected HTTP service on port 8000 requiring public HTTPS termination",
    confidence: "HIGH",
    architectureReason: "Distributes incoming traffic across redundant ECS tasks and provides graceful rolling deployments with zero downtime.",
    alternative: "Network Load Balancer (NLB) or Direct Elastic IPs (rejected: NLB lacks path-based HTTP routing).",
    securityRationale: "Security group restricts inbound port 443 exclusively to CloudFront origin prefix list, preventing bypass."
  },

  // PRIVATE APP VPC
  {
    id: "node-ecs",
    name: "ECS Fargate (FastAPI API)",
    type: "Serverless Container",
    provider: "AWS",
    category: "Container Compute",
    tier: "PRIVATE_APP",
    ports: "8000/TCP (Private)",
    status: "HEALTHY",
    costInr: 12400,
    costUsd: 149.4,
    icon: Cpu,
    purpose: "Serverless container cluster running FastAPI API tasks with auto-scaling (2-8 tasks)",
    region: "ap-south-1a / ap-south-1b",
    visibility: "Private",
    networkZone: "Private Application Subnets (10.0.10.0/24 & 10.0.11.0/24)",
    inbound: "TCP 8000 strictly from ALB Security Group (sg-0a4b92c)",
    outbound: "PostgreSQL 5432, Redis 6379, HTTPS 443 via VPC Gateway Endpoints to S3",
    encryption: "AWS KMS Ephemeral Task Storage Encryption (XTS-AES-256)",
    secrets: "Injected via AWS Secrets Manager ARN at container bootstrap",
    backup: "Immutable ECR container image tags with SHA-256 validation",
    monitoring: "CloudWatch Container Insights, Task CPU/Memory Utilization, HealthCheck /health",
    dependencies: ["node-rds", "node-redis", "node-s3", "node-secrets"],
    findingsCount: 1, // CORS finding
    compliance: ["ISO 27001 A.8.28", "SOC 2 CC6.8", "DPDP Sec 8"],
    detectedFrom: "Dockerfile (FastAPI uvicorn main:app --port 8000)",
    confidence: "HIGH",
    architectureReason: "FastAPI detected with uvicorn entrypoint; containerized workload running in serverless Fargate eliminates EC2 patching.",
    alternative: "AWS Lambda via Mangum (rejected: WebSocket and long-lived database connection pool requirements).",
    securityRationale: "Zero public IP addresses assigned. All compute tasks run in private subnets with strict egress control."
  },
  {
    id: "node-worker",
    name: "ECS Fargate (Celery Worker)",
    type: "Async Background Worker",
    provider: "AWS",
    category: "Container Compute",
    tier: "PRIVATE_APP",
    ports: "None (Outbound Only)",
    status: "HEALTHY",
    costInr: 6200,
    costUsd: 74.7,
    icon: Activity,
    purpose: "Dedicated asynchronous task processor executing report generation, VAPT scanning, and webhook events",
    region: "ap-south-1a / ap-south-1b",
    visibility: "Private",
    networkZone: "Private Application Subnets (10.0.10.0/24 & 10.0.11.0/24)",
    inbound: "None (Outbound event-driven queue consumer)",
    outbound: "Redis 6379 for job leasing, PostgreSQL 5432 for results persistence, S3 for report writes",
    encryption: "Ephemeral disk encrypted via AWS managed KMS key",
    secrets: "Database and Redis connection strings fetched from Secrets Manager",
    backup: "Stateless container tasks deployed from versioned ECR repository",
    monitoring: "Celery queue length metric, CloudWatch Task CPU, Failed task alert",
    dependencies: ["node-redis", "node-rds", "node-s3"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.28", "SOC 2 CC6.8"],
    detectedFrom: "celery worker -A app.tasks in Procfile / docker-compose.yml",
    confidence: "HIGH",
    architectureReason: "Decoupled asynchronous worker prevents heavy background compute jobs from starving user-facing API response threads.",
    alternative: "Running worker threads inside API web process (rejected: high risk of OOM crashes impacting web users).",
    securityRationale: "Has zero open inbound listening ports; strictly communicates outbound to internal queue and database."
  },
  {
    id: "node-redis",
    name: "ElastiCache Redis",
    type: "In-Memory Cache & Queue",
    provider: "AWS",
    category: "In-Memory Cache",
    tier: "PRIVATE_APP",
    ports: "6379/TCP (Private)",
    status: "HEALTHY",
    costInr: 2800,
    costUsd: 33.7,
    icon: HardDrive,
    purpose: "Distributed session cache, API rate limiting counters, and background job broker",
    region: "ap-south-1a",
    visibility: "Private",
    networkZone: "Private Application Subnets (10.0.10.0/24)",
    inbound: "TCP 6379 strictly from ECS API and Worker security groups",
    outbound: "None (Internal cache service)",
    encryption: "At Rest (KMS) & In Transit (TLS 1.2+ with Redis AUTH Token)",
    secrets: "Redis AUTH token managed in Secrets Manager",
    backup: "Daily automated backup snapshots with 7-day retention in S3",
    monitoring: "EngineCPUUtilization, CurrConnections, NetworkBytesIn/Out",
    dependencies: [],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.24", "SOC 2 CC6.1"],
    detectedFrom: "redis==5.0.0 in requirements.txt and REDIS_URL in .env.example",
    confidence: "HIGH",
    architectureReason: "Sub-millisecond latency store required for API token validation, rate-limiting, and Celery message broker.",
    alternative: "Self-hosted Redis container on EC2 (rejected: lacks automated patching, auto-failover, and snapshot management).",
    securityRationale: "Enforces TLS encryption in transit and mandatory AUTH token validation within private VPC."
  },

  // DATABASE ISOLATED
  {
    id: "node-rds",
    name: "RDS PostgreSQL Multi-AZ",
    type: "Managed Relational DB",
    provider: "AWS",
    category: "Relational Database",
    tier: "DATABASE_ISOLATED",
    ports: "5432/TCP (Isolated)",
    status: "HEALTHY",
    costInr: 14500,
    costUsd: 174.7,
    icon: Database,
    purpose: "Primary PostgreSQL 16 cluster with synchronous Multi-AZ standby replica and pgvector support",
    region: "ap-south-1 (Multi-AZ)",
    visibility: "Isolated",
    networkZone: "Isolated Database Subnets (10.0.20.0/24 & 10.0.21.0/24)",
    inbound: "TCP 5432 strictly from ECS API and Worker task subnets",
    outbound: "None (Strictly isolated from Internet and NAT Gateways)",
    encryption: "AWS KMS Customer Managed Key (CMK) AES-256 with auto-rotation",
    secrets: "Master credentials auto-rotated every 30 days via Secrets Manager",
    backup: "Continuous WAL archiving (5-min RPO) + 35-day automated snapshots",
    monitoring: "Performance Insights, CloudWatch CPU, DatabaseConnections, FreeStorageSpace",
    dependencies: ["node-secrets"],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.24", "SOC 2 CC6.1", "DPDP Sec 8, 9, 10", "HIPAA §164.312"],
    detectedFrom: "SQLAlchemy 2.0 with asyncpg/psycopg2 and alembic migrations in source",
    confidence: "HIGH",
    architectureReason: "Primary transactional data store. Multi-AZ synchronous standby ensures zero data loss during single-zone outages.",
    alternative: "AWS Aurora Serverless v2 (considered: higher cost at steady state, recommended when traffic exceeds 10k QPS).",
    securityRationale: "Completely isolated in non-routable subnets with zero default route to the Internet or NAT Gateways."
  },

  // SECURITY & SERVICES
  {
    id: "node-s3",
    name: "S3 KMS Encrypted Vault",
    type: "Object Storage",
    provider: "AWS",
    category: "Object Storage",
    tier: "SECURITY_SERVICES",
    ports: "HTTPS IAM Restricted",
    status: "HEALTHY",
    costInr: 1850,
    costUsd: 22.3,
    icon: Archive,
    purpose: "Encrypted storage for tenant uploads, audit evidence, and compliance documents",
    region: "ap-south-1",
    visibility: "Private",
    networkZone: "AWS Private Storage Network (VPC Gateway Endpoint)",
    inbound: "HTTPS requests authenticated via IAM Roles with SigV4",
    outbound: "None",
    encryption: "SSE-KMS with Bucket Key Enabled (Customer Managed Key)",
    secrets: "IAM Roles for Service Accounts (IRSA) / ECS Task Execution Role",
    backup: "Cross-Region Replication to ap-southeast-1 with S3 Object Lock & Versioning",
    monitoring: "S3 Storage Lens, CloudTrail Data Events, Object Access Logs",
    dependencies: [],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.10", "SOC 2 CC6.1", "DPDP Sec 8"],
    detectedFrom: "boto3 and S3_BUCKET_NAME references in backend services",
    confidence: "HIGH",
    architectureReason: "Durable 11 9s object storage with immutable object locking to satisfy compliance audit trail rules.",
    alternative: "Local container filesystem storage (rejected: ephemeral ECS task storage risks catastrophic data loss).",
    securityRationale: "Public Access Block enabled across all 4 AWS settings; bucket policy denies any non-HTTPS or unencrypted requests."
  },
  {
    id: "node-secrets",
    name: "AWS Secrets Manager",
    type: "Key & Secrets Store",
    provider: "AWS",
    category: "Secrets & Keys",
    tier: "SECURITY_SERVICES",
    ports: "VPC Endpoint IAM",
    status: "ACTIVE",
    costInr: 650,
    costUsd: 7.8,
    icon: Key,
    purpose: "Zero hardcoded credentials: auto-rotates DB credentials and third-party API tokens",
    region: "ap-south-1",
    visibility: "Private",
    networkZone: "Private VPC Interface Endpoint (privatelink)",
    inbound: "HTTPS API calls from ECS Task Role via AWS PrivateLink",
    outbound: "AWS Lambda rotation function executing periodic credential updates",
    encryption: "Dedicated AWS KMS Key with envelope encryption",
    secrets: "Stores DATABASE_URL, STRIPE_SECRET_KEY, RESEND_API_KEY, JWT_SECRET",
    backup: "30-day recovery window for deleted secrets; multi-region secret replica",
    monitoring: "CloudTrail audit logs for every secret retrieval event",
    dependencies: [],
    findingsCount: 0,
    compliance: ["ISO 27001 A.8.9", "SOC 2 CC6.1"],
    detectedFrom: "14 environment variable secrets identified during static manifest analysis",
    confidence: "HIGH",
    architectureReason: "Eliminates all plaintext secrets in git repositories, environment files, or container environment variables.",
    alternative: "HashiCorp Vault self-hosted (rejected: high operational maintenance overhead for startup scale).",
    securityRationale: "Secrets are fetched at runtime into memory and auto-rotated every 30 days without downtime."
  },

  // EXTERNAL SERVICES
  {
    id: "node-stripe",
    name: "Stripe Billing API",
    type: "SaaS Payment Provider",
    provider: "Stripe Inc.",
    category: "External Services",
    tier: "EXTERNAL_SERVICE",
    ports: "443/HTTPS",
    status: "CONNECTED",
    costInr: 0,
    costUsd: 0,
    icon: ExternalLink,
    purpose: "Payment processing, customer subscriptions, and PCI DSS Level 1 payment tokenization",
    region: "Global SaaS",
    visibility: "Public",
    networkZone: "External Payment Gateway",
    inbound: "Webhook events on /api/v1/billing/webhook with HMAC-SHA256 signature verification",
    outbound: "HTTPS API calls using restricted secret key",
    encryption: "TLS 1.3 Strict, PCI-DSS Level 1 Encrypted Cardholder Vault",
    secrets: "STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET stored in AWS Secrets Manager",
    backup: "Managed by Stripe globally",
    monitoring: "Webhook delivery failure alerts and webhook idempotency logs",
    dependencies: [],
    findingsCount: 0,
    compliance: ["PCI DSS 3.2.1", "SOC 1 / SOC 2"],
    detectedFrom: "stripe Python package and STRIPE_API_KEY in static code analysis",
    confidence: "HIGH",
    architectureReason: "Avoids storing raw credit card details on LaunchComply infrastructure, reducing PCI DSS scoping.",
    alternative: "Razorpay or Adyen (compatible via provider abstraction interface).",
    securityRationale: "Zero cardholder data touches application servers; webhooks cryptographically verified before processing."
  },
  {
    id: "node-resend",
    name: "Resend Email Delivery",
    type: "Transactional Email",
    provider: "Resend",
    category: "External Services",
    tier: "EXTERNAL_SERVICE",
    ports: "443/HTTPS",
    status: "CONNECTED",
    costInr: 1600,
    costUsd: 20.0,
    icon: ExternalLink,
    purpose: "Transactional email delivery for compliance audit alerts, invitations, and MFA codes",
    region: "Global SaaS",
    visibility: "Public",
    networkZone: "External API Integration",
    inbound: "Delivery and bounce tracking webhooks",
    outbound: "REST HTTPS API dispatch over port 443",
    encryption: "TLS 1.3 in-transit and DKIM/SPF/DMARC authenticated email delivery",
    secrets: "RESEND_API_KEY managed in AWS Secrets Manager",
    backup: "Managed by Resend SaaS",
    monitoring: "Bounce rate, delivery latency, and spam complaint metrics",
    dependencies: [],
    findingsCount: 0,
    compliance: ["SOC 2 Type II", "GDPR Article 28"],
    detectedFrom: "resend dependency in requirements.txt",
    confidence: "HIGH",
    architectureReason: "High-deliverability transactional messaging with verified custom domain DKIM and DMARC enforcement.",
    alternative: "Amazon SES directly (compatible; Resend provides superior developer ergonomics and template management).",
    securityRationale: "DKIM/SPF domain verification prevents outbound email spoofing and phishing."
  }
];

export function ArchitectureCanvas() {
  const [activeTab, setActiveTab] = useState<ArchitectureTab>("PRODUCTION");
  const [profile, setProfile] = useState<ArchitectureProfile>("BALANCED");
  const [selectedNode, setSelectedNode] = useState<NodeData>(NODES[4]); // Default to ECS API
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [architectureApproved, setArchitectureApproved] = useState<boolean>(false);

  // Profile-adjusted total costs
  const profileMultipliers = {
    LEAN: 0.52,
    BALANCED: 1.0,
    HIGH_AVAILABILITY: 2.05
  };

  const currentMultiplier = profileMultipliers[profile];
  const baseCostInr = NODES.reduce((acc, n) => acc + n.costInr, 0);
  const totalCostInr = Math.round(baseCostInr * currentMultiplier);
  const totalCostUsd = Math.round((totalCostInr / 83) * 10) / 10;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden relative">
      {/* Top Header & Navigation Bar */}
      <div className="bg-slate-900/95 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between z-20 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                LaunchComply Architecture Engine
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-semibold font-mono">
                v2.4 • Dynamic Synthesis
              </span>
              {architectureApproved ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  APPROVED FOR DEPLOYMENT
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
                  RECOMMENDED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Source: <span className="text-slate-200 font-mono">github.com/acmecloud/saas-core</span> (branch: <span className="text-cyan-400 font-mono">main</span> @ <span className="text-slate-300 font-mono">9c4f12d</span>)
            </p>
          </div>

          {/* Profile Switcher */}
          <div className="hidden lg:flex items-center bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2">Profile:</span>
            <button
              onClick={() => setProfile("LEAN")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                profile === "LEAN"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Lean / Startup
            </button>
            <button
              onClick={() => setProfile("BALANCED")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                profile === "BALANCED"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Balanced (Recommended)
            </button>
            <button
              onClick={() => setProfile("HIGH_AVAILABILITY")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                profile === "HIGH_AVAILABILITY"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              High Availability
            </button>
          </div>
        </div>

        {/* Action Controls & Total Cost */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Estimated Monthly Cost</div>
            <div className="text-sm font-bold font-mono text-cyan-400">
              ₹{totalCostInr.toLocaleString()} <span className="text-xs text-slate-400 font-normal">(${totalCostUsd}/mo)</span>
            </div>
          </div>

          {!architectureApproved && (
            <button
              onClick={() => setArchitectureApproved(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              Approve Architecture
            </button>
          )}

          <button
            onClick={() => setShowExportModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs rounded-lg shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            Export Package
          </button>
        </div>
      </div>

      {/* Sub-header: 5 View Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("PRODUCTION")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "PRODUCTION"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            Production Architecture (AWS)
          </button>

          <button
            onClick={() => setActiveTab("APPLICATION")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "APPLICATION"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Application Architecture (Code/Runtime)
          </button>

          <button
            onClick={() => setActiveTab("SECURITY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "SECURITY"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            Security & Trust Boundaries
          </button>

          <button
            onClick={() => setActiveTab("DATA_FLOW")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "DATA_FLOW"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Network className="w-3.5 h-3.5 text-emerald-400" />
            Data Flow View
          </button>

          <button
            onClick={() => setActiveTab("COST")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === "COST"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            Itemized Cost View
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-md border border-slate-800 text-slate-300">
          <button
            onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono px-1">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel(100)}
            className="p-1 hover:bg-slate-800 rounded transition-colors ml-0.5"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas & Detail Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Content Board depending on activeTab */}
        <div
          className="flex-1 overflow-auto p-8 bg-grid-pattern flex flex-col gap-6"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top left" }}
        >
          {activeTab === "PRODUCTION" && (
            <ProductionArchitectureView
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              profile={profile}
            />
          )}

          {activeTab === "APPLICATION" && (
            <ApplicationArchitectureView
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          )}

          {activeTab === "SECURITY" && (
            <SecurityTrustBoundaryView
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          )}

          {activeTab === "DATA_FLOW" && (
            <DataFlowArchitectureView
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
            />
          )}

          {activeTab === "COST" && (
            <CostEstimatorView
              profile={profile}
              multiplier={currentMultiplier}
              onSelectNode={setSelectedNode}
            />
          )}
        </div>

        {/* Node Inspector Drawer */}
        <div className="w-[410px] bg-slate-900 border-l border-slate-800 p-5 overflow-y-auto flex flex-col z-20 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <selectedNode.icon className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">Node Inspector</span>
                <span className="text-[10px] text-slate-400 font-mono">{selectedNode.provider} • {selectedNode.type}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
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
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-semibold">
                {selectedNode.confidence} Conf.
              </span>
            </div>
          </div>

          {/* Deep Node Attributes */}
          <div className="space-y-4 text-xs">
            <div>
              <div className="text-slate-400 text-[11px]">Component Name</div>
              <div className="text-sm font-bold text-white mt-0.5">{selectedNode.name}</div>
              <div className="text-cyan-400 font-mono text-[11px] mt-0.5">{selectedNode.networkZone}</div>
            </div>

            {/* Architecture Reason & Deterministic Evidence */}
            <div className="bg-cyan-950/30 p-3 rounded-lg border border-cyan-800/40 space-y-2">
              <div className="text-cyan-400 font-bold text-[11px] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Architectural Reasoning
              </div>
              <div className="text-slate-200 text-[11px] leading-relaxed">
                {selectedNode.architectureReason}
              </div>
              <div className="pt-1.5 border-t border-cyan-900/60 text-[10px] text-slate-400">
                <span className="font-semibold text-cyan-300">Detected From: </span>
                <span className="font-mono text-slate-300">{selectedNode.detectedFrom}</span>
              </div>
            </div>

            {/* Security Rationale */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="text-emerald-400 font-bold text-[11px] flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Security Rationale
              </div>
              <div className="text-slate-300 text-[11px] leading-relaxed">
                {selectedNode.securityRationale}
              </div>
            </div>

            {/* Architecture Alternatives Considered */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="text-slate-400 font-bold text-[11px] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                Evaluated Alternative
              </div>
              <div className="text-slate-400 text-[11px] leading-relaxed">
                {selectedNode.alternative}
              </div>
            </div>

            {/* Ports & Cost */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Estimated Monthly Cost</div>
                <div className="text-cyan-400 font-bold font-mono mt-0.5">
                  ₹{Math.round(selectedNode.costInr * currentMultiplier).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  ${Math.round((selectedNode.costUsd * currentMultiplier) * 10) / 10} USD
                </div>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <div className="text-slate-400 text-[10px]">Listening Ports</div>
                <div className="text-white font-mono mt-0.5 truncate">{selectedNode.ports}</div>
                <div className="text-[10px] text-emerald-400 font-mono">Strict VPC Rules</div>
              </div>
            </div>

            {/* Inbound & Outbound Traffic */}
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="text-slate-400 text-[11px] font-semibold">Network Inbound & Outbound</div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-bold text-[10px] uppercase min-w-[50px]">Inbound:</span>
                  <span className="text-slate-300 font-mono text-[10px]">{selectedNode.inbound}</span>
                </div>
                <div className="flex items-start gap-1.5 pt-1 border-t border-slate-900">
                  <span className="text-cyan-400 font-bold text-[10px] uppercase min-w-[50px]">Outbound:</span>
                  <span className="text-slate-300 font-mono text-[10px]">{selectedNode.outbound}</span>
                </div>
              </div>
            </div>

            {/* Encryption & Secrets */}
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="text-slate-400 text-[11px] font-semibold">Encryption & Secrets</div>
              <div className="text-white font-medium flex items-center gap-1.5 text-[11px]">
                <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{selectedNode.encryption}</span>
              </div>
              <div className="text-slate-300 flex items-start gap-1.5 text-[10px] font-mono pt-1 border-t border-slate-900">
                <Key className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                <span>{selectedNode.secrets}</span>
              </div>
            </div>

            {/* Backup & Disaster Recovery */}
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="text-slate-400 text-[11px] font-semibold">Backup & DR Strategy</div>
              <div className="text-slate-200 text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{selectedNode.backup}</span>
              </div>
            </div>

            {/* Monitoring & Observability */}
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="text-slate-400 text-[11px] font-semibold">Monitoring & Telemetry</div>
              <div className="text-slate-300 text-[10px] font-mono">
                {selectedNode.monitoring}
              </div>
            </div>

            {/* Compliance Mappings */}
            <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1.5">
              <div className="text-slate-400 text-[11px] font-semibold">Mapped Compliance Standards</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedNode.compliance.map((c, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* Security Finding Status */}
            {selectedNode.findingsCount > 0 ? (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-200 text-xs">Security Finding Detected</div>
                  <div className="text-[11px] text-rose-300/80 mt-0.5">
                    Wildcard CORS origin configured in FastAPI middleware. Remediation recommended before production launch.
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-300">Clean security posture • 0 open findings</span>
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
                    main.tf preview (AWS Provider v5.0+)
                  </span>
                  <span className="text-emerald-400">Validated</span>
                </div>
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-32">
{`module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  name    = "launchcomply-prod-vpc"
  cidr    = "10.0.0.0/16"
  azs     = ["ap-south-1a", "ap-south-1b"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24"]
  database_subnets = ["10.0.20.0/24", "10.0.21.0/24"]
  enable_nat_gateway = true
  single_nat_gateway = ${profile === "LEAN" ? "true" : "false"}
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
                <button
                  onClick={() => {
                    alert("Architecture Package downloaded successfully! All manifests verified.");
                    setShowExportModal(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-lg shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  Download ZIP Package (.zip)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// VIEW 1: PRODUCTION ARCHITECTURE (AWS RESOURCES)
// ----------------------------------------------------
function ProductionArchitectureView({
  selectedNode,
  onSelectNode,
  profile
}: {
  selectedNode: NodeData;
  onSelectNode: (node: NodeData) => void;
  profile: ArchitectureProfile;
}) {
  return (
    <>
      {/* TIER 1: PUBLIC CLOUD EDGE */}
      <div className="border border-cyan-500/30 bg-cyan-950/20 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Tier 1: Public Cloud Edge (Global PoPs)
          </span>
          <span className="text-[11px] font-mono text-cyan-300/70">DDoS Mitigation & Caching Tier</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {NODES.filter((n) => n.tier === "PUBLIC_EDGE").map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isSelected={selectedNode.id === node.id}
              onClick={() => onSelectNode(node)}
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
          <span className="text-[11px] font-mono text-slate-400">
            Isolated VPC in ap-south-1 ({profile === "LEAN" ? "Single NAT" : "Multi-AZ Redundant NAT"})
          </span>
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
                  onClick={() => onSelectNode(node)}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {NODES.filter((n) => n.tier === "PRIVATE_APP").map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNode.id === node.id}
                  onClick={() => onSelectNode(node)}
                />
              ))}
            </div>
          </div>

          {/* Database Isolated Subnet */}
          <div className="border border-emerald-500/30 bg-emerald-950/20 rounded-lg p-3">
            <div className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide mb-2 flex items-center justify-between">
              <span>Isolated Database Subnets (10.0.20.0/24 & 10.0.21.0/24)</span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {profile === "LEAN" ? "Single Instance" : "Multi-AZ Synchronous Replication"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {NODES.filter((n) => n.tier === "DATABASE_ISOLATED").map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNode.id === node.id}
                  onClick={() => onSelectNode(node)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NODES.filter((n) => n.tier === "SECURITY_SERVICES").map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isSelected={selectedNode.id === node.id}
              onClick={() => onSelectNode(node)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ----------------------------------------------------
// VIEW 2: APPLICATION ARCHITECTURE (CODE / RUNTIME TOPOLOGY)
// ----------------------------------------------------
function ApplicationArchitectureView({
  selectedNode,
  onSelectNode
}: {
  selectedNode: NodeData;
  onSelectNode: (node: NodeData) => void;
}) {
  const appComponents = [
    {
      name: "Next.js 15 Web Frontend",
      runtime: "Node.js 20 LTS",
      framework: "Next.js App Router (React 19)",
      role: "Client UI & Server Actions",
      file: "apps/web/package.json",
      mappedNodeId: "node-cdn"
    },
    {
      name: "FastAPI Core REST API",
      runtime: "Python 3.11",
      framework: "FastAPI + SQLAlchemy 2",
      role: "Authentication, Business Logic, DB Gateway",
      file: "apps/api/requirements.txt",
      mappedNodeId: "node-ecs"
    },
    {
      name: "Celery Async Worker",
      runtime: "Python 3.11",
      framework: "Celery 5.3 + Redis",
      role: "VAPT Engine, Audit Events, PDF Generation",
      file: "apps/api/app/tasks.py",
      mappedNodeId: "node-worker"
    },
    {
      name: "PostgreSQL 16 Engine",
      runtime: "PostgreSQL Relational",
      framework: "Alembic Migrations",
      role: "Multi-tenant persistence, Audit Logs, Findings",
      file: "apps/api/alembic.ini",
      mappedNodeId: "node-rds"
    },
    {
      name: "Redis Cache & Broker",
      runtime: "Redis 7.2",
      framework: "Redis Streams & Pub/Sub",
      role: "Rate-Limiting, Session Storage, Celery Broker",
      file: "docker-compose.yml",
      mappedNodeId: "node-redis"
    },
    {
      name: "S3 Object Store",
      runtime: "AWS S3 API",
      framework: "Boto3 Client",
      role: "Evidence Uploads, Architecture Artifacts, PDFs",
      file: "apps/api/app/services/s3.py",
      mappedNodeId: "node-s3"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Detected Code & Runtime Topology
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic source code inspection across repository manifests, Dockerfiles, and package configurations.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/40 font-semibold">
            6 Internal Services • 2 External APIs
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appComponents.map((comp, idx) => {
            const matchedNode = NODES.find((n) => n.id === comp.mappedNodeId) || NODES[4];
            return (
              <div
                key={idx}
                onClick={() => onSelectNode(matchedNode)}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/60 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {comp.name}
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {comp.runtime}
                  </span>
                </div>
                <div className="text-[11px] text-cyan-300 font-medium mb-1">{comp.framework}</div>
                <div className="text-xs text-slate-400 mb-3">{comp.role}</div>
                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px]">
                  <span className="font-mono text-slate-500 truncate max-w-[170px]">{comp.file}</span>
                  <span className="text-cyan-400 flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform">
                    Inspect AWS Mapping →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* External SaaS Integrations */}
      <div className="border border-slate-800 bg-slate-900/60 rounded-xl p-5 shadow-lg">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
          <span>Detected External SaaS Integrations</span>
          <span className="text-[11px] font-mono text-slate-400">Strict TLS 1.3 Outbound Egress</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {NODES.filter((n) => n.tier === "EXTERNAL_SERVICE").map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              isSelected={selectedNode.id === node.id}
              onClick={() => onSelectNode(node)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// VIEW 3: SECURITY & TRUST BOUNDARIES VIEW
// ----------------------------------------------------
function SecurityTrustBoundaryView({
  selectedNode,
  onSelectNode
}: {
  selectedNode: NodeData;
  onSelectNode: (node: NodeData) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Trust Boundary Summary Banner */}
      <div className="bg-purple-950/20 border border-purple-800/40 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-900/40 border border-purple-700/50">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Cryptographic Trust Boundaries & Zero-Trust Zones</div>
            <div className="text-xs text-purple-300/80 mt-0.5">
              Strict isolation: Databases and internal caches have ZERO public IP addresses and no direct Internet routing.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-slate-900 text-emerald-400 border border-emerald-800/50">
            TLS 1.3 Wire Encryption
          </span>
          <span className="px-2.5 py-1 rounded bg-slate-900 text-purple-400 border border-purple-800/50">
            AWS KMS AES-256
          </span>
        </div>
      </div>

      {/* 3 Explicit Security Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ZONE 1: PUBLIC INGRESS */}
        <div className="border border-amber-500/30 bg-amber-950/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-amber-800/30">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Zone 1: Public Entry Layer
            </span>
            <span className="text-[10px] font-mono text-amber-300">Untrusted Clients</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            All untrusted Internet traffic enters via Route 53 and CloudFront with AWS WAF inspection. Direct origin IP addresses are hidden behind AWS edge network.
          </p>
          <div className="space-y-2">
            {NODES.filter((n) => n.visibility === "Public").map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                isSelected={selectedNode.id === node.id}
                onClick={() => onSelectNode(node)}
              />
            ))}
          </div>
        </div>

        {/* ZONE 2: PRIVATE APPLICATION VPC */}
        <div className="border border-indigo-500/30 bg-indigo-950/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-800/30">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              Zone 2: Private Compute
            </span>
            <span className="text-[10px] font-mono text-indigo-300">Non-Routable Subnets</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            ECS Fargate and ElastiCache reside in private subnets (10.0.10.0/24). Inbound access is strictly limited to the ALB security group.
          </p>
          <div className="space-y-2">
            {NODES.filter((n) => n.visibility === "Private").map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                isSelected={selectedNode.id === node.id}
                onClick={() => onSelectNode(node)}
              />
            ))}
          </div>
        </div>

        {/* ZONE 3: ISOLATED DATA TIER */}
        <div className="border border-emerald-500/30 bg-emerald-950/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-emerald-800/30">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Zone 3: Isolated Data Tier
            </span>
            <span className="text-[10px] font-mono text-emerald-300">Air-Gapped from Internet</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            PostgreSQL Multi-AZ cluster resides in isolated subnets with zero NAT gateway access. Encryption at rest is enforced with Customer Managed Keys.
          </p>
          <div className="space-y-2">
            {NODES.filter((n) => n.visibility === "Isolated").map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                isSelected={selectedNode.id === node.id}
                onClick={() => onSelectNode(node)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// VIEW 4: DATA FLOW VIEW (INGRESS -> STORAGE -> EGRESS)
// ----------------------------------------------------
function DataFlowArchitectureView({
  selectedNode,
  onSelectNode
}: {
  selectedNode: NodeData;
  onSelectNode: (node: NodeData) => void;
}) {
  const dataFlowSteps = [
    {
      step: "01",
      title: "Public Client Request",
      protocol: "HTTPS / TLS 1.3",
      source: "End-user Web Browser / Mobile App",
      target: "Route 53 & CloudFront Edge",
      payload: "Encrypted HTTP requests with browser headers",
      security: "DDoS Mitigation & AWS WAF OWASP verification"
    },
    {
      step: "02",
      title: "Edge Forwarding & SSL Termination",
      protocol: "HTTPS port 443",
      source: "CloudFront CDN Distribution",
      target: "Application Load Balancer (ALB)",
      payload: "Validated HTTP requests + X-Forwarded headers",
      security: "ALB Security Group verifies CloudFront origin prefix list"
    },
    {
      step: "03",
      title: "Application Request Dispatch",
      protocol: "HTTP/1.1 port 8000",
      source: "ALB Target Group",
      target: "ECS Fargate (FastAPI API Tasks)",
      payload: "JSON API Requests, JWT Authorization tokens",
      security: "VPC Internal Private Subnet (No Public IP)"
    },
    {
      step: "04",
      title: "Session & Token Validation",
      protocol: "TCP port 6379",
      source: "FastAPI API Service",
      target: "ElastiCache Redis",
      payload: "Session cache lookups, rate limiting counters",
      security: "In-transit encryption with Redis AUTH password"
    },
    {
      step: "05",
      title: "Relational Data Transaction",
      protocol: "TCP port 5432",
      source: "FastAPI API & Celery Worker",
      target: "RDS PostgreSQL Multi-AZ",
      payload: "Tenant records, audit events, compliance scores",
      security: "KMS AES-256 Customer Managed Key + Synchronous Multi-AZ"
    },
    {
      step: "06",
      title: "Asynchronous Background Jobs",
      protocol: "Internal Queue / Redis Broker",
      source: "FastAPI Task Producer",
      target: "Celery Background Worker",
      payload: "Long-running VAPT scans, PDF reports, compliance sync",
      security: "Decoupled compute task running with restricted IAM role"
    },
    {
      step: "07",
      title: "Audit Evidence Storage",
      protocol: "HTTPS / AWS SigV4",
      source: "FastAPI API & Celery Tasks",
      target: "S3 KMS Encrypted Vault",
      payload: "Compliance evidence files, penetration test reports",
      security: "S3 Bucket Key enabled, Public Access Block, Object Lock"
    },
    {
      step: "08",
      title: "External SaaS Egress",
      protocol: "HTTPS port 443 Egress",
      source: "FastAPI API Tasks",
      target: "Stripe Billing & Resend Email APIs",
      payload: "Subscription payment triggers, transactional MFA emails",
      security: "NAT Gateway egress with Secrets Manager API credentials"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Network className="w-4 h-4 text-emerald-400" />
              End-to-End Application Data Flow Pipeline
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks how sensitive tenant data enters, moves through internal microservices, and is encrypted at rest.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded border border-cyan-800/40 font-semibold">
            8 Verified Flow Steps
          </span>
        </div>

        <div className="space-y-3">
          {dataFlowSteps.map((flow, i) => (
            <div
              key={i}
              className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-start gap-4 hover:border-emerald-500/40 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-xs font-mono font-bold text-emerald-400 shrink-0">
                {flow.step}
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-200">{flow.title}</div>
                  <div className="text-[10px] font-mono text-cyan-400 mt-0.5">{flow.protocol}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">From → To</div>
                  <div className="text-slate-300 text-[11px] truncate">{flow.source}</div>
                  <div className="text-emerald-400 text-[11px] truncate font-medium">→ {flow.target}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Data Payload</div>
                  <div className="text-slate-300 text-[11px]">{flow.payload}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Security Enforcement</div>
                  <div className="text-emerald-300 text-[11px] flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{flow.security}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// VIEW 5: ITEMIZED MONTHLY COST ESTIMATOR
// ----------------------------------------------------
function CostEstimatorView({
  profile,
  multiplier,
  onSelectNode
}: {
  profile: ArchitectureProfile;
  multiplier: number;
  onSelectNode: (node: NodeData) => void;
}) {
  const lineItems = NODES.map((node) => ({
    name: node.name,
    category: node.category,
    costInr: Math.round(node.costInr * multiplier),
    costUsd: Math.round((node.costUsd * multiplier) * 10) / 10,
    sizing:
      profile === "LEAN"
        ? "Minimal production size (t4g.small / 1-task)"
        : profile === "BALANCED"
        ? "Standard production size (Multi-AZ / 2-8 tasks)"
        : "Enterprise high-throughput (Multi-AZ 3-AZ / 4-16 tasks)",
    node
  }));

  const totalInr = lineItems.reduce((acc, item) => acc + item.costInr, 0);
  const totalUsd = Math.round((totalInr / 83) * 10) / 10;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              Itemized Infrastructure Cost Projection ({profile})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Derived dynamically from detected compute, storage, and database workloads in ap-south-1 (Mumbai).
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Projected: </span>
            <span className="text-base font-bold font-mono text-cyan-400">
              ₹{totalInr.toLocaleString()} / mo (${totalUsd} USD)
            </span>
          </div>
        </div>

        {/* Cost Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Resource Component</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Sizing Configuration</th>
                <th className="py-2.5 px-3 text-right">Cost (INR)</th>
                <th className="py-2.5 px-3 text-right">Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {lineItems.map((item, idx) => (
                <tr
                  key={idx}
                  onClick={() => onSelectNode(item.node)}
                  className="hover:bg-slate-850/60 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3 font-semibold text-slate-200 flex items-center gap-2">
                    <item.node.icon className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{item.name}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{item.category}</td>
                  <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">{item.sizing}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-cyan-400">
                    ₹{item.costInr.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-400">
                    ${item.costUsd}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-950 border-t-2 border-slate-700 font-bold">
              <tr>
                <td colSpan={3} className="py-3 px-3 text-right text-slate-200 uppercase font-mono">
                  Monthly Cloud Total:
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm text-cyan-400">
                  ₹{totalInr.toLocaleString()}
                </td>
                <td className="py-3 px-3 text-right font-mono text-sm text-slate-300">
                  ${totalUsd}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// NODE CARD COMPONENT
// ----------------------------------------------------
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
          ? "bg-cyan-950/60 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.01]"
          : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850"
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-slate-800 border border-slate-700">
            <Icon className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 truncate max-w-[150px]">{node.name}</div>
            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">{node.ports}</div>
          </div>
        </div>
        {node.findingsCount > 0 && (
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="Open Security Finding" />
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80 mt-1.5">
        <span className="text-cyan-400 font-mono text-[10px] font-semibold">₹{node.costInr.toLocaleString()} / mo</span>
        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {node.status}
        </span>
      </div>
    </div>
  );
}
