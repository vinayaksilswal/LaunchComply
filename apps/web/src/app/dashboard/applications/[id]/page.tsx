"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Github,
  GitBranch,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Layers,
  ArrowRight,
  Database,
  Cpu,
  Server,
  Play,
  RotateCcw,
  Check,
  ShieldCheck,
  FileCode,
  DollarSign,
  Cloud,
  Terminal,
  Activity,
  Shield,
  Key,
  Archive,
  RefreshCw,
  ExternalLink,
  Info,
  Copy
} from "lucide-react";

export default function ApplicationDetailPage() {
  const [activeTab, setActiveTab] = useState<"analysis" | "contract" | "topology" | "infrastructure" | "drift" | "evidence">("infrastructure");
  const [analysisProgress, setAnalysisProgress] = useState<number>(100);
  const [analysisStage, setAnalysisStage] = useState<string>("Analysis complete. Architecture recommendation ready.");
  const [isReanalyzing, setIsReanalyzing] = useState<boolean>(false);
  const [isApproved, setIsApproved] = useState<boolean>(true);
  
  // Infrastructure state
  const [isPlanApproved, setIsPlanApproved] = useState<boolean>(true);
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [provisioningDone, setProvisioningDone] = useState<boolean>(true);
  const [showAWSModal, setShowAWSModal] = useState<boolean>(false);

  // AWS Connection Wizard V3 state (§5, §24-38, §51, §58)
  const [awsMethod, setAwsMethod] = useState<"CLOUDFORMATION" | "MANUAL" | "EXISTING_ROLE">("CLOUDFORMATION");
  const [awsExternalId, setAwsExternalId] = useState<string>("launchcomply-ext-demo-acme-9c4f12d8a");
  const [awsRoleArn, setAwsRoleArn] = useState<string>("arn:aws:iam::123456789012:role/LaunchComplyProvisioningRole");
  const [awsSimulateError, setAwsSimulateError] = useState<string>("NONE");
  const [awsVerifying, setAwsVerifying] = useState<boolean>(false);
  const [awsVerifyResult, setAwsVerifyResult] = useState<any | null>(null);
  const [awsHelpStatus, setAwsHelpStatus] = useState<string | null>(null);
  const [copiedTrust, setCopiedTrust] = useState<boolean>(false);
  const [copiedCorrectedTrust, setCopiedCorrectedTrust] = useState<boolean>(false);
  const [awsStep, setAwsStep] = useState<number>(1);
  const [awsEnvironment, setAwsEnvironment] = useState<"production" | "staging">("production");
  const [awsRegion, setAwsRegion] = useState<string>("ap-south-1");
  const [awsTargetAccount, setAwsTargetAccount] = useState<string>("123456789012");
  const [awsStackStatus, setAwsStackStatus] = useState<string>("CREATE_COMPLETE");
  const [awsStackObserving, setAwsStackObserving] = useState<boolean>(false);
  const [awsStackEvents, setAwsStackEvents] = useState<any[]>([
    { timestamp: "2026-10-06T10:00:00Z", resource: "LaunchComply-QuickSetup", type: "AWS::CloudFormation::Stack", status: "CREATE_COMPLETE", reason: "Stack creation complete" },
    { timestamp: "2026-10-06T09:59:45Z", resource: "LaunchComplyCrossAccountAccessRole", type: "AWS::IAM::Role", status: "CREATE_COMPLETE", reason: "Role created successfully" }
  ]);
  const [awsActiveProfile, setAwsActiveProfile] = useState<string>("DEPLOYMENT");
  const [showAdvancedInspect, setShowAdvancedInspect] = useState<boolean>(false);
  const [isDisconnected, setIsDisconnected] = useState<boolean>(false);
  const [disconnectMessage, setDisconnectMessage] = useState<string | null>(null);

  // Resume AWS Wizard State (§58, §59)
  const handleOpenWizard = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lc_aws_wizard_state");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.awsRoleArn) setAwsRoleArn(parsed.awsRoleArn);
          if (parsed.awsExternalId) setAwsExternalId(parsed.awsExternalId);
          if (parsed.awsStep) setAwsStep(parsed.awsStep);
          if (parsed.awsMethod) setAwsMethod(parsed.awsMethod);
        } catch {
          // ignore corrupted local state
        }
      }
    }
    setShowAWSModal(true);
  };

  const handleObserveStack = () => {
    setAwsStackObserving(true);
    setTimeout(() => {
      setAwsStackStatus("CREATE_COMPLETE");
      setAwsStackEvents([
        { timestamp: new Date().toISOString(), resource: "LaunchComply-QuickSetup", type: "AWS::CloudFormation::Stack", status: "CREATE_COMPLETE", reason: "Stack creation completed successfully" },
        { timestamp: new Date().toISOString(), resource: "LaunchComplyCrossAccountAccessRole", type: "AWS::IAM::Role", status: "CREATE_COMPLETE", reason: "Role creation complete" }
      ]);
      setAwsStackObserving(false);
    }, 500);
  };

  const handleVerifyAWSConnection = async () => {
    setAwsVerifying(true);
    setAwsHelpStatus(null);
    setTimeout(() => {
      if (awsSimulateError === "INVALID_PRINCIPAL") {
        setAwsVerifyResult({
          valid: false,
          error_code: "INVALID_PRINCIPAL",
          confidence: "CONFIRMED",
          human_friendly_message: "LaunchComply can see the role, but the Trust Policy does not allow our AWS account to assume it. Ensure Principal AWS is set to 'arn:aws:iam::012345678901:root'.",
          detected_issue: "Trust Policy missing or incorrect Principal 'arn:aws:iam::012345678901:root'",
          expected_trust_policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
              Effect: "Allow",
              Principal: { AWS: "arn:aws:iam::012345678901:root" },
              Action: "sts:AssumeRole",
              Condition: { StringEquals: { "sts:ExternalId": awsExternalId } }
            }]
          }, null, 2),
          fix_instructions: [
            "Open AWS IAM Console -> Roles -> select your role.",
            "Click the 'Trust relationships' tab, then click 'Edit trust policy'.",
            "Verify that Principal contains 'AWS': 'arn:aws:iam::012345678901:root'.",
            "Save policy and click 'Verify Connection' in LaunchComply."
          ]
        });
      } else if (awsSimulateError === "WRONG_EXTERNAL_ID") {
        setAwsVerifyResult({
          valid: false,
          error_code: "WRONG_EXTERNAL_ID",
          confidence: "CONFIRMED",
          human_friendly_message: `The role exists, but the sts:ExternalId condition does not match '${awsExternalId}'. This protects your account against confused deputy attacks, but the values must match exactly.`,
          detected_issue: "Mismatched ExternalId condition in IAM Trust Policy.",
          expected_trust_policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
              Effect: "Allow",
              Principal: { AWS: "arn:aws:iam::012345678901:root" },
              Action: "sts:AssumeRole",
              Condition: { StringEquals: { "sts:ExternalId": awsExternalId } }
            }]
          }, null, 2),
          fix_instructions: [
            "Open AWS IAM Console -> Roles -> select your role.",
            "Click 'Trust relationships' -> 'Edit trust policy'.",
            `Ensure StringEquals -> sts:ExternalId matches exactly: '${awsExternalId}' with no spaces.`,
            "Save policy and click 'Verify Connection' again."
          ]
        });
      } else {
        // Clean Pass (§34, §52)
        setAwsVerifyResult({
          valid: true,
          account_id: awsTargetAccount || "123456789012",
          overall_status: "READY_FOR_PROVISIONING",
          connection_state: "CONNECTED",
          evidence_hash: "sha256-e9c8f12a014bc990145f8a002bc45",
          capabilities: [
            { service: "STS AssumeRole", status: "PASS", required: true, detail: "Caller identity and ExternalId verified" },
            { service: "VPC & Networking", status: "PASS", required: true, detail: "Scoped VPC and Subnet management verified" },
            { service: "ECS Fargate", status: "PASS", required: true, detail: "Container task rights verified" },
            { service: "ECR Registry", status: "PASS", required: true, detail: "Image pull/push scoped verified" },
            { service: "RDS PostgreSQL", status: "PASS", required: true, detail: "Database management permitted" },
            { service: "S3 Vault", status: "PASS", required: true, detail: "Block Public Access enforced" },
            { service: "AWS WAF & CloudFront", status: "PASS", required: true, detail: "Edge security permitted" },
            { service: "KMS & Secrets Manager", status: "PASS", required: true, detail: "Key rotation verified" }
          ]
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("lc_aws_wizard_state", JSON.stringify({
            awsRoleArn,
            awsExternalId,
            awsStep: 11,
            awsMethod
          }));
        }
      }
      setAwsVerifying(false);
    }, 600);
  };

  const handleRequestSetupHelp = () => {
    setAwsHelpStatus("Support assistance dispatched. Context packaged safely without secrets (§37, §38). An engineer will contact your team.");
  };

  const handleCopyTrustPolicy = () => {
    const trustJson = JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow",
        Principal: { AWS: "arn:aws:iam::012345678901:root" },
        Action: "sts:AssumeRole",
        Condition: { StringEquals: { "sts:ExternalId": awsExternalId } }
      }]
    }, null, 2);
    navigator.clipboard.writeText(trustJson);
    setCopiedTrust(true);
    setTimeout(() => setCopiedTrust(false), 2000);
  };

  const handleCopyCorrectedTrustPolicy = () => {
    const correctedJson = JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
        Sid: "LaunchComplyCrossAccountAssumeRole",
        Effect: "Allow",
        Principal: { AWS: "arn:aws:iam::012345678901:root" },
        Action: "sts:AssumeRole",
        Condition: { StringEquals: { "sts:ExternalId": awsExternalId } }
      }]
    }, null, 2);
    navigator.clipboard.writeText(correctedJson);
    setCopiedCorrectedTrust(true);
    setTimeout(() => setCopiedCorrectedTrust(false), 2000);
  };

  const handleDisconnectAWS = () => {
    setIsDisconnected(true);
    setDisconnectMessage("AWS Connection successfully revoked. All LaunchComply STS access has been revoked. Your customer AWS infrastructure remains intact and running untouched (§101, §102).");
    setAwsVerifyResult(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("lc_aws_wizard_state");
    }
  };

  const handleTriggerReanalysis = () => {
    setIsReanalyzing(true);
    setAnalysisProgress(15);
    setAnalysisStage("Fetching and indexing repository archive...");

    setTimeout(() => {
      setAnalysisProgress(50);
      setAnalysisStage("Detecting runtimes, Dockerfiles, and dependencies...");
    }, 700);

    setTimeout(() => {
      setAnalysisProgress(80);
      setAnalysisStage("Auditing environment contracts, secrets, and database connections...");
    }, 1400);

    setTimeout(() => {
      setAnalysisProgress(100);
      setAnalysisStage("Analysis complete. Architecture recommendation ready.");
      setIsReanalyzing(false);
    }, 2100);
  };

  const handleApplyInfrastructure = () => {
    setIsProvisioning(true);
    setProvisioningDone(false);

    setTimeout(() => {
      setIsProvisioning(false);
      setProvisioningDone(true);
    }, 2500);
  };

  const detectedServices = [
    {
      name: "Next.js Web Frontend",
      type: "frontend",
      framework: "Next.js 15",
      runtime: "Node.js 20",
      root: "/apps/web",
      build: "npm run build",
      start: "npm start",
      ports: "3000/HTTP (Public Ingress)",
      confidence: "100%"
    },
    {
      name: "FastAPI Core API",
      type: "backend",
      framework: "FastAPI",
      runtime: "Python 3.11",
      root: "/apps/api",
      build: "pip install -r requirements.txt",
      start: "uvicorn app.main:app --port 8000",
      ports: "8000/HTTP (Private Ingress)",
      confidence: "100%"
    },
    {
      name: "Celery Background Worker",
      type: "worker",
      framework: "Celery / ARQ",
      runtime: "Python 3.11",
      root: "/apps/api",
      build: "pip install -r requirements.txt",
      start: "celery -A app.worker worker",
      ports: "Internal Compute Task",
      confidence: "90%"
    },
  ];

  const envVars = [
    { name: "DATABASE_URL", category: "DATABASE", required: true, secret: true, source: "apps/api/app/core/config.py", desc: "Async PostgreSQL connection URI" },
    { name: "REDIS_URL", category: "BACKEND_ONLY", required: true, secret: false, source: "apps/api/app/core/config.py", desc: "Redis cluster cache & queue endpoint" },
    { name: "JWT_SECRET", category: "SECRET", required: true, secret: true, source: "apps/api/app/core/config.py", desc: "HMAC-SHA256 user authentication signing secret" },
    { name: "NEXT_PUBLIC_API_URL", category: "PUBLIC_FRONTEND", required: true, secret: false, source: "apps/web/next.config.mjs", desc: "Public browser ingress URL" },
    { name: "STRIPE_SECRET_KEY", category: "SECRET", required: true, secret: true, source: "apps/api/app/core/config.py", desc: "Stripe payment webhook & charge key" },
    { name: "OPENAI_API_KEY", category: "SECRET", required: false, secret: true, source: "apps/api/app/core/config.py", desc: "AI summarization API token" },
  ];

  const cloudResources = [
    { name: "Virtual Private Cloud (VPC)", id: "vpc-0a4b8c9d1e", arn: "arn:aws:ec2:ap-south-1:012345678901:vpc/vpc-0a4b8c9d1e", type: "aws_vpc", category: "Networking", status: "AVAILABLE", az: "ap-south-1 (Multi-AZ)" },
    { name: "Application Load Balancer", id: "acme-prod-alb", arn: "arn:aws:elasticloadbalancing:ap-south-1:012345678901:loadbalancer/app/acme-prod-alb/50dc6c495c0c9188", type: "aws_lb", category: "Traffic Distribution", status: "HEALTHY", az: "ap-south-1a / ap-south-1b" },
    { name: "ECS Fargate Cluster", id: "acme-prod-cluster", arn: "arn:aws:ecs:ap-south-1:012345678901:cluster/acme-prod-cluster", type: "aws_ecs_cluster", category: "Compute", status: "HEALTHY", az: "ap-south-1a / ap-south-1b" },
    { name: "RDS PostgreSQL Multi-AZ", id: "acme-prod-postgres-primary", arn: "arn:aws:rds:ap-south-1:012345678901:db:acme-prod-postgres-primary", type: "aws_db_instance", category: "Database", status: "HEALTHY", az: "Multi-AZ Synchronous" },
    { name: "ElastiCache Redis", id: "acme-prod-redis-001", arn: "arn:aws:elasticache:ap-south-1:012345678901:cluster:acme-prod-redis", type: "aws_elasticache_cluster", category: "Cache", status: "HEALTHY", az: "ap-south-1a (Private)" },
    { name: "S3 KMS Encrypted Vault", id: "launchcomply-acme-saas-production-vault", arn: "arn:aws:s3:::launchcomply-acme-saas-production-vault", type: "aws_s3_bucket", category: "Storage", status: "HEALTHY", az: "ap-south-1" },
    { name: "AWS Secrets Manager", id: "acme-prod-env-secrets", arn: "arn:aws:secretsmanager:ap-south-1:012345678901:secret:acme-prod-env-secrets-12aB3c", type: "aws_secretsmanager_secret", category: "Secrets", status: "ACTIVE", az: "ap-south-1" },
    { name: "AWS WAF WebACL", id: "acme-prod-waf-acl", arn: "arn:aws:wafv2:ap-south-1:012345678901:regional/webacl/acme-prod-waf-acl/8a2b3c4d", type: "aws_wafv2_web_acl", category: "Edge & WAF", status: "ACTIVE", az: "Global Edge" }
  ];

  const provisioningSteps = [
    { time: "14:02:11", name: "INITIALIZE", msg: "Isolated OpenTofu execution environment initialized. State lock acquired on S3 backend." },
    { time: "14:02:15", name: "VALIDATE", msg: "Terraform configuration syntax validated. All 8 security policies passed with 0 BLOCK rules." },
    { time: "14:02:20", name: "APPLY", msg: "Plan applied successfully. 32 AWS resources created in ap-south-1." },
    { time: "14:02:50", name: "DISCOVERY", msg: "Discovered 8 primary cloud resources. Endpoints and ARNs registered." },
    { time: "14:03:02", "name": "EVIDENCE", msg: "Generated 4 cryptographically signed compliance evidence records." },
    { time: "14:03:15", name: "VERIFY", msg: "Infrastructure health verification passed. Environment READY_FOR_APPLICATION_DEPLOYMENT." }
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* App Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/dashboard/applications" className="hover:text-cyan-400 transition-colors">
              Applications
            </Link>
            <span>/</span>
            <span className="text-slate-200">Acme SaaS Platform</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Acme SaaS Platform</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              INFRASTRUCTURE READY
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-bold">
              v1.0.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <Github className="w-3.5 h-3.5" />
            <span className="font-mono text-slate-300">acmecloud/acme-core</span>
            <span>•</span>
            <GitBranch className="w-3.5 h-3.5" />
            <span className="font-mono text-cyan-400">main</span>
            <span>•</span>
            <span>Region: <strong className="text-slate-300">ap-south-1 (Mumbai)</strong></span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenWizard()}
            className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-medium text-slate-200 flex items-center gap-2 transition-all shadow-sm"
          >
            <Cloud className="w-4 h-4 text-amber-400" />
            AWS Account (012345678901)
          </button>
          <Link
            href="/dashboard/architecture"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
          >
            Open Architecture Canvas →
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("infrastructure")}
          className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "infrastructure"
              ? "border-cyan-400 text-cyan-300 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Server className="w-4 h-4 text-cyan-400" />
          Infrastructure & Cloud Resources
        </button>

        <button
          onClick={() => setActiveTab("analysis")}
          className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "analysis"
              ? "border-cyan-400 text-cyan-300 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-400" />
          Static Analysis & Services
        </button>

        <button
          onClick={() => setActiveTab("contract")}
          className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "contract"
              ? "border-cyan-400 text-cyan-300 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Lock className="w-4 h-4 text-emerald-400" />
          Environment Contract
        </button>

        <button
          onClick={() => setActiveTab("drift")}
          className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "drift"
              ? "border-cyan-400 text-cyan-300 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <RefreshCw className="w-4 h-4 text-amber-400" />
          Drift Detection
        </button>

        <button
          onClick={() => setActiveTab("evidence")}
          className={`px-4 py-2 rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
            activeTab === "evidence"
              ? "border-cyan-400 text-cyan-300 bg-slate-900/60"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          Compliance Evidence (ISO / SOC 2)
        </button>
      </div>

      {/* TAB 1: INFRASTRUCTURE & CLOUD PROVISIONING (PHASE 3) */}
      {activeTab === "infrastructure" && (
        <div className="space-y-6">
          {/* Plan Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Server className="w-5 h-5 text-cyan-400" />
                    AWS Infrastructure Plan: Balanced Profile
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    APPROVED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Generated via <span className="text-slate-200 font-mono">OpenTofu/Terraform engine</span> • Synthesized from verified repository architecture.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Projected AWS Cost</div>
                  <div className="text-sm font-bold font-mono text-cyan-400">
                    ₹38,500 <span className="text-xs text-slate-400 font-normal">($460/mo)</span>
                  </div>
                </div>

                <button
                  onClick={handleApplyInfrastructure}
                  disabled={isProvisioning}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isProvisioning ? "Provisioning AWS..." : "Deploy / Re-apply Infrastructure"}
                </button>
              </div>
            </div>

            {/* Metrics & Security Check */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Resources to Create</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">+32</div>
                <div className="text-[10px] text-slate-500">0 change • 0 destroy</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Policy Evaluation</div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">8 / 8 PASS</div>
                <div className="text-[10px] text-emerald-400">Zero BLOCK violations</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Target Region</div>
                <div className="text-xl font-bold font-mono text-slate-200 mt-0.5">ap-south-1</div>
                <div className="text-[10px] text-slate-500">Mumbai (Multi-AZ)</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">IaC Framework</div>
                <div className="text-xl font-bold font-mono text-purple-400 mt-0.5">OpenTofu</div>
                <div className="text-[10px] text-slate-500">v1.6+ Modular Spec</div>
              </div>
            </div>
          </div>

          {/* Provisioning Worker Step Logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Isolated Provisioning Execution Log (Worker Job #init-acme-01)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Safe ephemeral workspace execution • Zero plaintext credentials or state leaks.
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/40 font-bold">
                EXECUTION COMPLETED
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 font-mono text-xs max-h-56 overflow-y-auto">
              {provisioningSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 text-slate-300">
                  <span className="text-slate-500 shrink-0">{step.time}</span>
                  <span className="text-cyan-400 font-bold shrink-0">[{step.name}]</span>
                  <span className="text-slate-200">{step.msg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Materialized AWS Cloud Resources */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-cyan-400" />
                  Discovered & Managed AWS Cloud Resources ({cloudResources.length})
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Actual cloud resources provisioned in AWS account 012345678901 and tagged with LaunchComply ownership.
                </p>
              </div>
              <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-800/40">
                ap-south-1
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Resource Component</th>
                    <th className="py-2.5 px-3">Provider ID</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Placement</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {cloudResources.map((res, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/60 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-200">{res.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 truncate max-w-xs">{res.arn}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-400">{res.id}</td>
                      <td className="py-3 px-3 text-slate-300">{res.category}</td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{res.az}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {res.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STATIC ANALYSIS & SERVICES */}
      {activeTab === "analysis" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {detectedServices.map((svc, i) => (
              <div key={i} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white">{svc.name}</div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                    {svc.confidence} Conf.
                  </span>
                </div>
                <div className="text-xs text-slate-400">Framework: <strong className="text-slate-200">{svc.framework}</strong></div>
                <div className="text-xs text-slate-400">Runtime: <strong className="text-slate-200">{svc.runtime}</strong></div>
                <div className="text-[11px] font-mono text-slate-400">{svc.ports}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ENVIRONMENT CONTRACT */}
      {activeTab === "contract" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Variable Name</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">Required</th>
                  <th className="py-2.5 px-3">Source File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {envVars.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400">{v.name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                        {v.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-emerald-400">REQUIRED</td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{v.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DRIFT DETECTION */}
      {activeTab === "drift" && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                Infrastructure Drift Detection Engine
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Continuously audits real AWS resource configurations against the approved InfrastructureSpecification.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              NO DRIFT DETECTED
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-200">Last Drift Audit: Today at 14:03 UTC</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              All 8 active cloud resources (VPC, ALB, ECS Fargate, RDS PostgreSQL Multi-AZ, ElastiCache, S3 Vault, Secrets Manager, WAF) perfectly match the desired IaC state. Zero unauthorized manual modifications found.
            </p>
          </div>
        </div>
      )}

      {/* TAB 5: COMPLIANCE EVIDENCE (ISO / SOC 2) */}
      {activeTab === "evidence" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { code: "ISO-27001-A.8.24", fw: "ISO 27001", title: "RDS PostgreSQL Tablespace KMS CMK Encryption", hash: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2" },
              { code: "SOC2-CC6.6", fw: "SOC 2", title: "Air-Gapped Database Subnets Without Public Route", hash: "b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3" },
              { code: "DPDP-SEC-8", fw: "DPDP Act 2023", title: "S3 Bucket Public Access Block Strict Enforcement", hash: "c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" },
              { code: "ISO-27001-A.8.14", fw: "ISO 27001", title: "Synchronous Multi-AZ Standby Replica in ap-south-1", hash: "d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5" },
            ].map((ev, i) => (
              <div key={i} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-bold">
                    {ev.fw} • {ev.code}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                  </span>
                </div>
                <div className="text-xs font-bold text-white">{ev.title}</div>
                <div className="text-[10px] font-mono text-slate-500 truncate">SHA256: {ev.hash}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AWS Connection Wizard V3 (§5, §24-38, §51-57, §60) */}
      {showAWSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-indigo-400" />
                  AWS Connection Wizard V2 / AWS Connection Wizard V3 (Zero-Friction STS - §5, §24)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Least-privilege STS AssumeRole with cryptographic ExternalId. Zero root credentials (§25). Connect AWS securely in minutes.
                </p>
              </div>
              <button
                onClick={() => setShowAWSModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2.5 py-1 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Security Guarantee Summary (§138) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 py-2.5 border-b border-slate-800/80 text-[10px] text-slate-300 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">✓ No Root Keys</span>
              <span className="flex items-center gap-1 text-emerald-400">✓ No Long-Lived Keys</span>
              <span className="flex items-center gap-1 text-emerald-400">✓ Short STS Sessions</span>
              <span className="flex items-center gap-1 text-emerald-400">✓ ExternalId Protected</span>
              <span className="flex items-center gap-1 text-emerald-400">✓ Revoke Anytime</span>
            </div>

            {/* 11-Step Progress Checklist (§5, §60) */}
            <div className="py-2 overflow-x-auto flex items-center gap-1 text-[10px] text-slate-400 border-b border-slate-800 shrink-0 font-mono">
              <span className={`px-2 py-0.5 rounded ${awsStep >= 1 ? "bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold" : "text-slate-600"}`}>1. Env</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded ${awsStep >= 2 ? "bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold" : "text-slate-600"}`}>2. Account</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded ${awsStep >= 3 ? "bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold" : "text-slate-600"}`}>3. Region</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded ${awsStep >= 4 ? "bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold" : "text-slate-600"}`}>4. Method</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded ${awsStep >= 5 ? "bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold" : "text-slate-600"}`}>5. Role</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded ${awsStep >= 6 ? "bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold" : "text-slate-600"}`}>6. Stack</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded ${awsStep >= 7 ? "bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold" : "text-slate-600"}`}>7. Trust</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded ${awsStep >= 8 ? "bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold" : "text-slate-600"}`}>8. Perms</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded ${awsStep >= 9 ? "bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold" : "text-slate-600"}`}>9. STS</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded ${awsStep >= 10 ? "bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold" : "text-slate-600"}`}>10. Discover</span>
              <span>→</span>
              <span className={`px-2 py-0.5 rounded ${awsVerifyResult?.valid ? "bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold" : "text-slate-600"}`}>11. Connected</span>
            </div>

            <div className="overflow-y-auto flex-1 py-4 space-y-4 text-xs">
              {/* Method Selector (§6, §24) */}
              <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                <button
                  onClick={() => setAwsMethod("CLOUDFORMATION")}
                  className={`flex-1 py-2 rounded-md font-semibold text-xs transition ${
                    awsMethod === "CLOUDFORMATION"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Option A: CloudFormation Quick Setup (Recommended)
                </button>
                <button
                  onClick={() => setAwsMethod("MANUAL")}
                  className={`flex-1 py-2 rounded-md font-semibold text-xs transition ${
                    awsMethod === "MANUAL"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Option B: Manual IAM Role
                </button>
                <button
                  onClick={() => setAwsMethod("EXISTING_ROLE")}
                  className={`flex-1 py-2 rounded-md font-semibold text-xs transition ${
                    awsMethod === "EXISTING_ROLE"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Option C: Existing Compatible Role (§6)
                </button>
              </div>

              {/* Option A: CloudFormation (§25, §26) */}
              {awsMethod === "CLOUDFORMATION" && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Automated 1-Click AWS Setup</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                      Zero Manual JSON
                    </span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Clicking below opens the official AWS CloudFormation console with our pre-populated least-privilege provisioning template and tenant-specific ExternalId.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <a
                      href="https://ap-south-1.console.aws.amazon.com/cloudformation/home?region=ap-south-1#/stacks/quickcreate?stackName=LaunchComply-QuickSetup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open AWS CloudFormation Setup &rarr;
                    </a>
                    <span className="text-[11px] text-slate-500 font-mono">Region: ap-south-1</span>
                  </div>

                  {/* CloudFormation Stack Live Observation (§18, §19, §20) */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-300">Stack Status:</span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {awsStackStatus}
                        </span>
                      </div>
                      <button
                        onClick={handleObserveStack}
                        disabled={awsStackObserving}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px]"
                      >
                        <RefreshCw className={`w-3 h-3 ${awsStackObserving ? "animate-spin" : ""}`} />
                        Observe Stack Events
                      </button>
                    </div>
                    <div className="space-y-1">
                      {awsStackEvents.map((ev, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px] font-mono bg-slate-900 px-2 py-1 rounded border border-slate-800">
                          <span className="text-slate-300">{ev.resource}</span>
                          <span className="text-emerald-400 font-bold">{ev.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Option B: Manual IAM Role (§29, §32) */}
              {awsMethod === "MANUAL" && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Manual IAM Role &amp; Trust Policy</span>
                    <button
                      onClick={handleCopyTrustPolicy}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-mono"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedTrust ? "Copied!" : "Copy Trust Policy"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-slate-500">Target Role Name:</div>
                      <div className="font-mono text-slate-200">LaunchComplyProvisioningRole</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="text-slate-500">LaunchComply Principal:</div>
                      <div className="font-mono text-slate-200 truncate">arn:aws:iam::012345678901:root</div>
                    </div>
                  </div>
                  <pre className="font-mono text-[10px] bg-slate-900 p-3 rounded border border-slate-800 text-cyan-300 overflow-x-auto max-h-32">
{`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::012345678901:root" },
    "Action": "sts:AssumeRole",
    "Condition": { "StringEquals": { "sts:ExternalId": "${awsExternalId}" } }
  }]
}`}
                  </pre>
                </div>
              )}

              {/* Option C: Existing Compatible Role (§6, §23) */}
              {awsMethod === "EXISTING_ROLE" && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">Detect &amp; Validate Existing Role (§23)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded">
                      Zero Duplicate Roles
                    </span>
                  </div>
                  <p className="text-slate-400">
                    If your team already provisioned a LaunchComply cross-account IAM role, paste its ARN below. LaunchComply will inspect the trust relationship and validate ExternalId conditions without recreating resources.
                  </p>
                </div>
              )}

              {/* Step: Verify Connection (§33) */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-200">Role ARN &amp; STS AssumeRole Verification (§33)</span>
                <div>
                  <input
                    id="aws-role-arn-input"
                    type="text"
                    value={awsRoleArn}
                    onChange={(e) => setAwsRoleArn(e.target.value)}
                    placeholder="arn:aws:iam::123456789012:role/LaunchComplyProvisioningRole"
                    className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded font-mono text-slate-200 text-xs"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px]">Diagnostics Mode:</span>
                    <select
                      id="aws-error-simulation-select"
                      value={awsSimulateError}
                      onChange={(e) => setAwsSimulateError(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] rounded px-2 py-1 font-mono"
                    >
                      <option value="NONE">Real / Clean AssumeRole</option>
                      <option value="INVALID_PRINCIPAL">Simulate INVALID_PRINCIPAL</option>
                      <option value="WRONG_EXTERNAL_ID">Simulate WRONG_EXTERNAL_ID</option>
                    </select>
                  </div>

                  <button
                    id="verify-aws-connection-btn"
                    onClick={handleVerifyAWSConnection}
                    disabled={awsVerifying}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {awsVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    Verify Connection
                  </button>
                </div>
              </div>

              {/* Inline Diagnostics when STS fails (§30, §31) */}
              {awsVerifyResult && !awsVerifyResult.valid && (
                <div id="aws-sts-diagnostics-box" className="p-4 bg-rose-950/50 border-2 border-rose-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      STS Diagnostics: {awsVerifyResult.error_code} (§30)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-900 text-rose-200 font-bold">
                      Confidence: {awsVerifyResult.confidence || "CONFIRMED"} (§28)
                    </span>
                  </div>

                  <p className="text-rose-100 font-semibold text-xs leading-relaxed">
                    {awsVerifyResult.human_friendly_message}
                  </p>

                  <div className="p-2.5 bg-slate-950 rounded border border-rose-900/60 text-[11px] space-y-1">
                    <div className="text-slate-400 font-bold">Detected Root Cause:</div>
                    <div className="font-mono text-rose-200">{awsVerifyResult.detected_issue}</div>
                  </div>

                  {/* Trust Policy Diff Inspector (§29, §30) */}
                  <div className="p-3 bg-slate-950 rounded border border-rose-900/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300">Trust Policy Diff Inspector (§29, §30)</span>
                      <button
                        onClick={handleCopyCorrectedTrustPolicy}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-900/80 hover:bg-amber-800 text-amber-200 rounded text-[11px] font-mono font-bold"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedCorrectedTrust ? "Copied!" : "Copy Corrected Trust Policy (§31)"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-rose-400 font-bold block mb-1">Mismatched In Role:</span>
                        <div className="text-slate-300">{awsVerifyResult.detected_issue}</div>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-emerald-400 font-bold block mb-1">Required In Trust Policy:</span>
                        <div className="text-slate-300">sts:ExternalId = {awsExternalId}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div className="font-bold text-slate-200">Recommended Resolution Steps:</div>
                    {(awsVerifyResult.fix_instructions || []).map((step: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-400 font-mono font-bold">{idx + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-rose-900 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Need operator white-glove assistance?
                    </span>
                    <button
                      id="request-setup-help-btn"
                      onClick={handleRequestSetupHelp}
                      className="px-3 py-1.5 bg-rose-800 hover:bg-rose-700 text-white rounded font-bold text-xs transition"
                    >
                      Request Setup Help (§37)
                    </button>
                  </div>

                  {awsHelpStatus && (
                    <div id="setup-help-status-msg" className="p-2 bg-emerald-950 border border-emerald-800 rounded text-emerald-200 text-xs">
                      {awsHelpStatus}
                    </div>
                  )}
                </div>
              )}

              {/* Clean Connected State (§34, §52) */}
              {awsVerifyResult && awsVerifyResult.valid && (
                <div id="aws-connection-success-box" className="p-4 bg-emerald-950/50 border border-emerald-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      AWS Account Connected &amp; Permissions Audited (§34)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900 text-emerald-200">
                      Account: {awsVerifyResult.account_id}
                    </span>
                  </div>

                  {/* Least-Privilege Permission Manifest Profiles (§34-§38) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-200">Least-Privilege Enforcement & Profiles Audited (§34):</span>
                      <span className="font-mono text-[10px] text-emerald-400">Zero AdministratorAccess — No broad AdministratorAccess requested</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                      {["DISCOVERY", "DEPLOYMENT", "MONITORING", "SECURITY_READ", "BACKUP_READ", "COST_READ"].map((prof) => (
                        <button
                          key={prof}
                          onClick={() => setAwsActiveProfile(prof)}
                          className={`p-1.5 rounded border text-left transition ${
                            awsActiveProfile === prof
                              ? "bg-indigo-950 text-indigo-200 border-indigo-700"
                              : "bg-slate-900 text-slate-400 border-slate-800"
                          }`}
                        >
                          <div className="font-bold">{prof}</div>
                          <div className="text-[9px] text-emerald-400">STATUS: PASS</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Read-Only Resource Discovery Preview (§48, §49) */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-200">Discovered Existing AWS Infrastructure (§48):</span>
                      <span className="text-[10px] font-mono text-indigo-400">Read-Only</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                      <div className="p-2 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400">VPCs</div>
                        <div className="text-white font-bold text-xs">2 Discovered</div>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400">Subnets</div>
                        <div className="text-white font-bold text-xs">4 Mapped</div>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400">ECS Clusters</div>
                        <div className="text-white font-bold text-xs">1 Active</div>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800">
                        <div className="text-slate-400">RDS PostgreSQL</div>
                        <div className="text-white font-bold text-xs">1 Multi-AZ</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setShowAWSModal(false);
                      }}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
                    >
                      Save &amp; Complete Connection
                    </button>
                    <button
                      onClick={handleDisconnectAWS}
                      className="px-4 py-2 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 font-bold rounded-lg transition text-xs border border-slate-700"
                    >
                      Disconnect AWS (§101)
                    </button>
                  </div>
                </div>
              )}

              {/* Disconnected Message (§101, §102) */}
              {isDisconnected && disconnectMessage && (
                <div className="p-3 bg-amber-950/60 border border-amber-800 rounded-lg text-amber-200 text-xs">
                  {disconnectMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
