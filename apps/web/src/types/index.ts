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

export interface InfrastructureStack {
  id: string;
  application_id: string;
  environment_id: string;
  provider: string;
  region: string;
  profile: "LEAN" | "BALANCED" | "HIGH_AVAILABILITY";
  status: "DRAFT" | "READY_TO_PLAN" | "PLANNING" | "PLAN_READY" | "AWAITING_APPROVAL" | "APPROVED" | "PROVISIONING" | "READY" | "FAILED";
  current_version: string;
  resource_count: number;
  created_at?: string;
}

export interface InfrastructurePlan {
  id: string;
  stack_id: string;
  status: "READY" | "BLOCKED" | "APPROVED" | "APPLIED";
  plan_key: string;
  resources_add: number;
  resources_change: number;
  resources_destroy: number;
  estimated_cost_delta: string;
  policy_report?: {
    overall_status: "PASS" | "WARN" | "BLOCK";
    pass_count: number;
    warn_count: number;
    block_count: number;
    can_approve: boolean;
    policies: Array<{
      code: string;
      title: string;
      category: string;
      severity: string;
      status: string;
      message: string;
      frameworks: string[];
    }>;
  };
  summary?: Record<string, number>;
}

export interface ProvisioningStep {
  step: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  message: string;
  completed_at?: string;
}

export interface ProvisioningRun {
  id: string;
  status: "QUEUED" | "INITIALIZING" | "VALIDATING" | "APPLYING" | "DISCOVERING" | "VERIFYING" | "COMPLETED" | "FAILED";
  started_at: string;
  completed_at?: string;
  failure_reason?: string;
  steps: ProvisioningStep[];
}

export interface CloudResource {
  id: string;
  provider_resource_id: string;
  provider_resource_arn?: string;
  resource_type: string;
  category: string;
  region: string;
  availability_zone?: string;
  status: "AVAILABLE" | "HEALTHY" | "DRIFTED" | "CREATING";
  managed_by: "MANAGED" | "DISCOVERED" | "EXTERNAL";
  architecture_node_id?: string;
  tags?: Record<string, string>;
  last_verified_at: string;
}

export interface DriftReport {
  run_id: string;
  status: "NO_DRIFT" | "DRIFT_DETECTED";
  drift_count: number;
  summary: {
    total_resources_scanned: number;
    drift_count: number;
    status: string;
  };
  completed_at: string;
}

export interface InfrastructureEvidence {
  id: string;
  evidence_type: string;
  control_code: string;
  framework: string;
  title: string;
  sha256_hash: string;
  snapshot?: Record<string, any>;
  verified_at: string;
}

export interface AWSValidationReport {
  valid: boolean;
  account_id: string;
  role_arn: string;
  region: string;
  overall_status: string;
  capabilities: Array<{
    service: string;
    status: string;
    required: boolean;
    detail: string;
  }>;
}

export interface ApplicationRelease {
  id: string;
  organization_id: string;
  application_id: string;
  environment_id: string;
  repository_id?: string;
  branch: string;
  commit_sha: string;
  version: string;
  status:
    | "DRAFT"
    | "QUEUED"
    | "BUILDING"
    | "BUILD_FAILED"
    | "ARTIFACT_READY"
    | "SECURITY_SCANNING"
    | "SECURITY_BLOCKED"
    | "AWAITING_APPROVAL"
    | "APPROVED"
    | "MIGRATING"
    | "MIGRATION_FAILED"
    | "DEPLOYING"
    | "VERIFYING"
    | "TRAFFIC_SHIFTING"
    | "LIVE"
    | "FAILED"
    | "ROLLBACK_PENDING"
    | "ROLLING_BACK"
    | "ROLLED_BACK"
    | "SUPERSEDED";
  created_by: string;
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  deployed_at?: string;
  rollback_of_release_id?: string;
}

export interface BuildArtifact {
  id: string;
  service_name: string;
  artifact_type: string;
  image_repository: string;
  image_tag: string;
  image_digest: string;
  sbom_key?: string;
  size_bytes?: number;
  sha256: string;
  created_at: string;
}

export interface ContainerImage {
  id: string;
  service_name: string;
  ecr_repository: string;
  image_tag: string;
  image_digest: string;
  scan_status: "PASS" | "WARN" | "BLOCKED";
  critical_vulnerabilities: number;
  high_vulnerabilities: number;
  medium_vulnerabilities: number;
  created_at: string;
}

export interface BuildRun {
  id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  worker_job_id: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  builder_version: string;
  source_commit_sha: string;
  artifacts?: BuildArtifact[];
  images?: ContainerImage[];
  logs?: string[];
}

export interface DatabaseMigrationRun {
  id: string;
  application_release_id: string;
  environment_id: string;
  migration_type: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  started_at: string;
  completed_at?: string;
  output_summary?: string;
  migration_version_before?: string;
  migration_version_after?: string;
}

export interface DeploymentService {
  id?: string;
  service_name: string;
  service_type: string;
  ecs_service_arn?: string;
  task_definition_arn?: string;
  desired_count: number;
  running_count: number;
  healthy_count: number;
  status: string;
}

export interface ApplicationDeployment {
  id: string;
  application_release_id: string;
  environment_id: string;
  strategy: "BLUE_GREEN" | "ROLLING";
  status: "QUEUED" | "DEPLOYING" | "VERIFYING" | "COMPLETED" | "FAILED" | "ROLLED_BACK";
  started_at: string;
  completed_at?: string;
  previous_release_id?: string;
  target_release_id: string;
  traffic_percentage: number;
  services?: DeploymentService[];
  logs?: string[];
}

export interface ReleaseVerification {
  id: string;
  verification_type: string;
  status: "PASSED" | "FAILED" | "WARN";
  endpoint: string;
  response_code: number;
  latency_ms: number;
  details_json?: Record<string, any>;
  checked_at: string;
}

export interface DomainBinding {
  id: string;
  domain: string;
  dns_provider: string;
  status: "PENDING_DNS" | "ACTIVE" | "FAILED";
  certificate_id?: string;
  target_type: string;
  target_value: string;
  created_at: string;
  verified_at?: string;
  validation_records?: Array<{
    record_type: string;
    name: string;
    value: string;
    ttl: number;
    status: string;
  }>;
}

export interface RuntimeSecretBinding {
  id: string;
  service_name: string;
  environment_variable_name: string;
  secrets_manager_arn: string;
  required: boolean;
  configured: boolean;
  last_rotated_at?: string;
}


