export interface ArchitectureNode {
  id: string;
  name: string;
  tier: "PUBLIC_EDGE" | "PUBLIC_SUBNET" | "PRIVATE_APP" | "DATABASE_ISOLATED" | "EXTERNAL_AWS";
  category: string;
  ports: string;
  status: "LIVE" | "PLANNING" | "STOPPED";
  cost: string;
  description?: string;
  securityGroups?: string[];
  encryption?: string;
  backup?: string;
  complianceMappings?: string[];
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label: string;
}

export interface SecurityFinding {
  id: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "ACCEPTED_RISK";
  cvss_score: string;
  category: string;
  owasp_mapping: string;
  description: string;
  suggested_fix?: string;
  affected_asset: string;
}

export interface ComplianceScore {
  framework_code: string;
  framework_name: string;
  readiness_percentage: string;
  passing_controls: string;
  total_controls: string;
}

export interface DashboardData {
  organization_id: string;
  organization_name: string;
  application_name: string;
  environment: string;
  application_status: string;
  production_readiness: string;
  security_posture: string;
  compliance_readiness: string;
  backup_status: string;
  domain: string;
  domain_verified: boolean;
  https_active: boolean;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  aws_monthly_estimate: string;
  frameworks: string[];
  infrastructure: string[];
  compliance_scores: ComplianceScore[];
  recent_findings: SecurityFinding[];
}

export interface VAPTProject {
  id: string;
  title: string;
  status: "REQUESTED" | "SCOPING" | "AUTHORIZED" | "TESTING" | "FINDINGS" | "REMEDIATION" | "RETEST" | "FINAL_REPORT" | "CLOSED";
  scope: string;
  methodology: string;
  lead_tester: string;
  critical_count: string;
  high_count: string;
  medium_count: string;
}

export interface Subprocessor {
  id: string;
  provider_name: string;
  purpose: string;
  data_processed: string;
  country: string;
  dpa_status: string;
  risk_level: string;
}

export interface ServiceItem {
  code: string;
  title: string;
  category: string;
  price_range: string;
  description: string;
  duration: string;
}

export interface SourceControlConnection {
  id: string;
  provider: "GITHUB" | "GITLAB" | "BITBUCKET";
  provider_account_name: string;
  installation_id: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  connected_at: string;
}

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  owner: string;
  default_branch: string;
  visibility: "public" | "private";
  html_url: string;
  language: string;
}

export interface RepositoryBranch {
  id: string;
  name: string;
  commit_sha: string;
  is_default: boolean;
}

export interface DetectedService {
  id: string;
  name: string;
  service_type: "frontend" | "backend" | "worker" | "scheduler" | "database" | "cache" | "queue" | "storage";
  framework: string;
  runtime: string;
  build_command?: string;
  start_command?: string;
  root_path: string;
  confidence_score: number;
}

export interface DetectedEnvironmentVariable {
  id: string;
  name: string;
  category: "REQUIRED" | "SECRET" | "PUBLIC_FRONTEND" | "BACKEND_ONLY" | "DATABASE" | "THIRD_PARTY";
  required: boolean;
  secret_likely: boolean;
  source_file?: string;
  description?: string;
}

export interface DetectedDataFlow {
  source_service: string;
  target_service: string;
  protocol: string;
  port?: number;
}

export interface AnalysisFinding {
  id: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  source_file?: string;
  recommendation: string;
}

export interface CostBreakdown {
  profile: string;
  currency: string;
  estimated_monthly_inr: string;
  range_inr: string;
  estimated_monthly_usd: string;
  breakdown: Record<string, string>;
  disclaimer: string;
}

export interface AnalysisRun {
  id: string;
  status: "QUEUED" | "FETCHING_REPOSITORY" | "INDEXING" | "DETECTING_STACK" | "ANALYZING_SECURITY" | "GENERATING_ARCHITECTURE" | "COMPLETED" | "FAILED";
  progress_percent: number;
  current_stage: string;
  started_at: string;
  completed_at?: string;
  summary?: string;
  services?: DetectedService[];
  env_vars?: DetectedEnvironmentVariable[];
  findings?: AnalysisFinding[];
  data_flows?: DetectedDataFlow[];
}

