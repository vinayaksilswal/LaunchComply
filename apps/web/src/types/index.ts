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
