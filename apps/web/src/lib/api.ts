import { DashboardData, ArchitectureNode, ArchitectureEdge, SecurityFinding, VAPTProject, ServiceItem } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export const fallbackDemoData: DashboardData = {
  organization_id: "demo-org-acmecloud-987",
  organization_name: "AcmeCloud SaaS",
  application_name: "Acme SaaS Web Platform",
  environment: "Production",
  application_status: "HEALTHY",
  production_readiness: "84%",
  security_posture: "81%",
  compliance_readiness: "67%",
  backup_status: "HEALTHY",
  domain: "app.acmecloud.io",
  domain_verified: true,
  https_active: true,
  critical_findings: 1,
  high_findings: 3,
  medium_findings: 8,
  aws_monthly_estimate: "₹38,500",
  frameworks: ["React / Vite", "FastAPI (Python 3.11)", "PostgreSQL 16 Multi-AZ"],
  infrastructure: ["CloudFront", "AWS WAF", "ALB", "ECS Fargate", "RDS Multi-AZ", "Redis", "S3 KMS"],
  compliance_scores: [
    { framework_code: "DPDP", framework_name: "India DPDP Act (2023)", readiness_percentage: "76%", passing_controls: "38", total_controls: "50" },
    { framework_code: "ISO27001", framework_name: "ISO/IEC 27001:2022", readiness_percentage: "64%", passing_controls: "60", total_controls: "93" },
    { framework_code: "SOC2", framework_name: "SOC 2 Type II", readiness_percentage: "58%", passing_controls: "41", total_controls: "71" },
  ],
  recent_findings: [
    {
      id: "sec-01",
      title: "PostgreSQL Public Accessibility Risk in Backup Subnet Route Table",
      severity: "CRITICAL",
      status: "OPEN",
      cvss_score: "9.1",
      category: "Database Security",
      owasp_mapping: "A05:2021-Security Misconfiguration",
      description: "The secondary DB subnet has a legacy 0.0.0.0/0 route via an Internet Gateway instead of exclusively communicating over Private NAT.",
      suggested_fix: "Revoke 0.0.0.0/0 route in rt-08992a. Ensure DB Subnet Group is exclusively associated with isolated private route table.",
      affected_asset: "AWS RouteTable / RDS Subnet Group",
    },
    {
      id: "sec-02",
      title: "CORS Policy Allows Wildcard Origin on Sensitive Authentication Endpoints",
      severity: "HIGH",
      status: "OPEN",
      cvss_score: "7.8",
      category: "API Security",
      owasp_mapping: "A01:2021-Broken Access Control",
      description: "FastAPI CORS middleware is currently permitting Access-Control-Allow-Origin: * for /api/v1/auth and /api/v1/billing routes.",
      suggested_fix: "Restrict allowed origins strictly to ['https://app.acmecloud.io'] in app/core/config.py.",
      affected_asset: "FastAPI /api/v1/* routes",
    },
    {
      id: "sec-03",
      title: "IAM Role Lacks Boundary on ECS Task Execution Role",
      severity: "HIGH",
      status: "IN_PROGRESS",
      cvss_score: "7.4",
      category: "Identity & Access",
      owasp_mapping: "A04:2021-Insecure Design",
      description: "ECS task execution role has broad s3:* write permissions without resource ARN scoping.",
      suggested_fix: "Scope S3 policy down to arn:aws:s3:::acmecloud-app-uploads/* and apply AWS IAM Permissions Boundary.",
      affected_asset: "IAM Role / acmecloud-ecs-execution-role",
    },
  ],
};

export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const res = await fetch(`${API_BASE}/dashboard/overview`, { cache: "no-store" });
    if (!res.ok) throw new Error("Backend response error");
    return await res.json();
  } catch {
    return fallbackDemoData;
  }
}
